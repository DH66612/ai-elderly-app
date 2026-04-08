/**
 * 视频分析路由
 * 支持视频文件上传、FFmpeg 帧提取、MediaPipe 姿态检测
 */

import express from 'express';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { detectPoseBatch } from '../services/mediapipe-pose';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
const router = express.Router();

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/tmp/video-analysis';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `video_${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    // 允许常见视频格式
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('不支持的视频格式'));
    }
  }
});

/**
 * 视频跌倒检测
 * POST /api/v1/video-analysis/fall-detection
 */
router.post('/fall-detection', upload.single('video'), async (req: any, res: any) => {
  const tempVideoPath = req.file?.path;
  const userId = req.body.userId;
  const deviceId = req.body.deviceId;
  const client = getSupabaseClient();

  if (!tempVideoPath) {
    return res.status(400).json({ success: false, error: '请上传视频文件' });
  }

  const tempDir = path.join('/tmp/video-analysis', `frames_${Date.now()}`);
  const outputPattern = path.join(tempDir, 'frame_%04d.jpg');

  try {
    // 创建帧输出目录
    fs.mkdirSync(tempDir, { recursive: true });

    // 使用 FFmpeg 提取帧 (每秒1帧，最多30帧)
    console.log(`提取视频帧: ${tempVideoPath}`);
    await execAsync(
      `ffmpeg -i "${tempVideoPath}" -vf "fps=1" -vframes 30 -q:v 2 "${outputPattern}" -y`,
      { timeout: 60000 }
    );

    // 获取提取的帧文件
    const frameFiles = fs.readdirSync(tempDir)
      .filter(f => f.endsWith('.jpg'))
      .sort();

    console.log(`提取到 ${frameFiles.length} 帧`);

    if (frameFiles.length === 0) {
      return res.status(400).json({ success: false, error: '无法从视频中提取帧' });
    }

    // 批量检测姿态
    const frames = frameFiles.map((file, index) => {
      const imageBuffer = fs.readFileSync(path.join(tempDir, file));
      return {
        image: imageBuffer.toString('base64'),
        frame_id: `frame_${index + 1}`
      };
    });

    const detectionResult = await detectPoseBatch(frames);

    // 分析结果
    const fallFrames = detectionResult.results.filter(r => r.is_fall);
    const fallCount = fallFrames.length;
    const hasFall = fallCount >= 2; // 至少2帧跌倒才触发告警

    let alertId: string | null = null;

    // 如果检测到跌倒，创建告警记录
    if (hasFall && userId) {
      const { data: alert, error } = await client
        .from('fall_alerts')
        .insert({
          user_id: userId,
          device_id: deviceId || null,
          video_path: tempVideoPath,
          alert_type: 'video_analysis',
          confidence: detectionResult.fall_confidence,
          fall_frame_count: fallCount,
          total_frame_count: frameFiles.length,
          status: 'pending'
        })
        .select()
        .single();

      if (!error && alert) {
        alertId = alert.id;
      }
    }

    // 清理临时文件
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(tempVideoPath);

    return res.json({
      success: true,
      has_fall: hasFall,
      fall_frames: fallCount,
      total_frames: frameFiles.length,
      confidence: detectionResult.fall_confidence,
      alert_id: alertId,
      analysis: detectionResult.results.map(r => ({
        frame_id: r.frame_id,
        pose: r.pose,
        is_fall: r.is_fall,
        confidence: r.confidence,
        reason: r.reason
      }))
    });

  } catch (error: any) {
    console.error('视频跌倒检测失败:', error);

    // 清理临时文件
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError);
    }

    return res.status(500).json({
      success: false,
      error: `视频分析失败: ${error.message}`
    });
  }
});

/**
 * 获取跌倒告警列表
 * GET /api/v1/video-analysis/alerts
 */
router.get('/alerts', async (req: any, res: any) => {
  const userId = req.query.userId as string;
  const status = req.query.status as string;

  if (!userId) {
    return res.status(400).json({ success: false, error: '缺少 userId 参数' });
  }

  try {
    let query = client
      .from('fall_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: alerts, error } = await query.limit(50);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      alerts: alerts || []
    });

  } catch (error: any) {
    console.error('获取告警列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新跌倒告警状态
 * PATCH /api/v1/video-analysis/alerts/:id
 */
router.patch('/alerts/:id', async (req: any, res: any) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: '缺少 status 参数' });
  }

  try {
    const updateData: any = { status };
    if (notes) {
      updateData.notes = notes;
    }

    const { data: alert, error } = await client
      .from('fall_alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      alert
    });

  } catch (error: any) {
    console.error('更新告警状态失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * MediaPipe 服务健康检查
 * GET /api/v1/video-analysis/mediapipe-health
 */
router.get('/mediapipe-health', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${process.env.MEDIAPIPE_BASE_URL || 'http://127.0.0.1:5001'}/health`, {
      timeout: 5000
    });
    return res.json({
      success: true,
      ...response.data
    });
  } catch (error: any) {
    return res.json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

export default router;
