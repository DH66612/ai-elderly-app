#!/usr/bin/env python3
"""
MediaPipe 姿态检测后端服务
使用 Python + MediaPipe Tasks Vision API 进行人体姿态分析
适配 MediaPipe 0.10+
"""

import os
import sys
import math
import base64
import json
import tempfile
import logging
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS

# 配置日志
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 尝试导入 MediaPipe
try:
    import cv2
    import numpy as np
    from mediapipe import Image as MPImage, ImageFormat
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    MEDIA_PIPE_AVAILABLE = True
    logger.info("MediaPipe Tasks Vision 加载成功")
except ImportError as e:
    MEDIA_PIPE_AVAILABLE = False
    logger.warning(f"MediaPipe 不可用: {e}")
    MPImage = None
    vision = None

# 模型路径
MODEL_PATH = '/tmp/pose_landmarker.task'
MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

# 全局变量
pose_detector = None

# 跌倒检测阈值
FALL_ANGLE_THRESHOLD = 45

def download_model():
    """下载 Pose Landmark 模型"""
    if not os.path.exists(MODEL_PATH):
        logger.info(f"下载 MediaPipe 模型: {MODEL_URL}")
        try:
            import urllib.request
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
            logger.info(f"模型下载完成: {MODEL_PATH}")
        except Exception as e:
            logger.error(f"模型下载失败: {e}")
            return False
    return True

def create_pose_detector():
    """创建姿态检测器"""
    global pose_detector
    
    if not MEDIA_PIPE_AVAILABLE:
        return False
    
    try:
        # 确保模型存在
        if not download_model():
            logger.error("无法下载模型")
            return False
        
        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        pose_detector = vision.PoseLandmarker.create_from_options(options)
        logger.info("Pose 检测器创建成功")
        return True
    except Exception as e:
        logger.error(f"创建 Pose 检测器失败: {e}")
        import traceback
        traceback.print_exc()
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'mediapipe_available': MEDIA_PIPE_AVAILABLE,
        'pose_detector_ready': pose_detector is not None,
        'model_path': MODEL_PATH if os.path.exists(MODEL_PATH) else 'not_found'
    })

@app.route('/pose/detect', methods=['POST'])
def detect_pose():
    """检测单张图片中的人体姿态"""
    global pose_detector
    
    if not MEDIA_PIPE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'MediaPipe 不可用'
        }), 500
    
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': '缺少 image 参数'
            }), 400
        
        # 初始化 pose 检测器 (如果需要)
        if pose_detector is None:
            success = create_pose_detector()
            if not success:
                return jsonify({
                    'success': False,
                    'error': '初始化 Pose 检测器失败'
                }), 500
        
        # 解码图片
        image_data = base64.b64decode(data['image'])
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({
                'success': False,
                'error': '无法解码图片'
            }), 400
        
        # 转换为 RGB (MediaPipe 需要 RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # 保存为临时文件 (MediaPipe 需要从文件加载)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp_path = tmp.name
            cv2.imwrite(tmp_path, rgb_image)
        
        try:
            # 创建 MediaPipe Image
            mp_image = MPImage.create_from_file(tmp_path)
            
            # 检测姿态
            detection_result = pose_detector.detect(mp_image)
            
            if not detection_result.pose_landmarks or len(detection_result.pose_landmarks) == 0:
                return jsonify({
                    'success': True,
                    'found': False,
                    'pose': 'unknown',
                    'is_fall': False,
                    'confidence': 0,
                    'reason': '未检测到人体',
                    'landmarks': []
                })
            
            # 获取第一个检测到的人体
            pose_landmarks = detection_result.pose_landmarks[0]
            
            # 提取关键点
            landmarks = []
            for landmark in pose_landmarks:
                landmarks.append({
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z if hasattr(landmark, 'z') else 0,
                    'presence': landmark.presence if hasattr(landmark, 'presence') else 1.0
                })
            
            # 分析姿态
            pose_result = analyze_pose(landmarks)
            
            return jsonify({
                'success': True,
                'found': True,
                'frame_id': data.get('frame_id'),
                **pose_result,
                'landmarks': landmarks
            })
            
        finally:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except Exception as e:
        logger.error(f"姿态检测失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/pose/detect_batch', methods=['POST'])
def detect_pose_batch():
    """批量检测多帧图片"""
    global pose_detector
    
    if not MEDIA_PIPE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'MediaPipe 不可用'
        }), 500
    
    try:
        # 初始化 pose 检测器 (如果需要)
        if pose_detector is None:
            success = create_pose_detector()
            if not success:
                return jsonify({
                    'success': False,
                    'error': '初始化 Pose 检测器失败'
                }), 500
        
        data = request.get_json()
        if not data or 'frames' not in data:
            return jsonify({
                'success': False,
                'error': '缺少 frames 参数'
            }), 400
        
        results_list = []
        fall_detected = False
        fall_confidence = 0
        
        for frame_data in data['frames']:
            tmp_path = None
            try:
                image_data = base64.b64decode(frame_data['image'])
                nparr = np.frombuffer(image_data, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image is None:
                    continue
                
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
                # 保存为临时文件
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                    tmp_path = tmp.name
                    cv2.imwrite(tmp_path, rgb_image)
                
                mp_image = MPImage.create_from_file(tmp_path)
                detection_result = pose_detector.detect(mp_image)
                
                if detection_result.pose_landmarks and len(detection_result.pose_landmarks) > 0:
                    pose_landmarks = detection_result.pose_landmarks[0]
                    
                    landmarks = []
                    for landmark in pose_landmarks:
                        landmarks.append({
                            'x': landmark.x,
                            'y': landmark.y,
                            'z': landmark.z if hasattr(landmark, 'z') else 0,
                            'presence': landmark.presence if hasattr(landmark, 'presence') else 1.0
                        })
                    
                    pose_result = analyze_pose(landmarks)
                    
                    results_list.append({
                        'frame_id': frame_data.get('frame_id'),
                        'found': True,
                        **pose_result
                    })
                    
                    if pose_result['is_fall']:
                        fall_detected = True
                        fall_confidence = max(fall_confidence, pose_result['confidence'])
                else:
                    results_list.append({
                        'frame_id': frame_data.get('frame_id'),
                        'found': False,
                        'pose': 'unknown',
                        'is_fall': False,
                        'confidence': 0,
                        'reason': '未检测到人体'
                    })
                    
            except Exception as e:
                logger.error(f"帧 {frame_data.get('frame_id')} 处理失败: {e}")
                results_list.append({
                    'frame_id': frame_data.get('frame_id'),
                    'error': str(e)
                })
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        return jsonify({
            'success': True,
            'results': results_list,
            'fall_detected': fall_detected,
            'fall_confidence': fall_confidence
        })
        
    except Exception as e:
        logger.error(f"批量检测失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def analyze_pose(landmarks):
    """
    分析人体姿态
    
    关键点索引 (MediaPipe Pose):
    0: 鼻子
    11: 左肩
    12: 右肩
    23: 左髋
    24: 右髋
    25: 左膝
    26: 右膝
    27: 左踝
    28: 右踝
    """
    
    def get_lm(idx):
        if idx < len(landmarks):
            return landmarks[idx]
        return None
    
    # 获取关键点
    left_shoulder = get_lm(11)
    right_shoulder = get_lm(12)
    left_hip = get_lm(23)
    right_hip = get_lm(24)
    left_knee = get_lm(25)
    right_knee = get_lm(26)
    left_ankle = get_lm(27)
    right_ankle = get_lm(28)
    
    # 计算中心点
    if left_shoulder and right_shoulder:
        shoulder_center_y = (left_shoulder['y'] + right_shoulder['y']) / 2
        shoulder_center_x = (left_shoulder['x'] + right_shoulder['x']) / 2
    else:
        return {'pose': 'unknown', 'is_fall': False, 'confidence': 0.3, 'reason': '肩膀未检测到'}
    
    if left_hip and right_hip:
        hip_center_y = (left_hip['y'] + right_hip['y']) / 2
        hip_center_x = (left_hip['x'] + right_hip['x']) / 2
    else:
        return {'pose': 'unknown', 'is_fall': False, 'confidence': 0.3, 'reason': '髋部未检测到'}
    
    knee_y = None
    if left_knee and right_knee:
        knee_y = (left_knee['y'] + right_knee['y']) / 2
    
    ankle_y = None
    if left_ankle and right_ankle:
        ankle_y = (left_ankle['y'] + right_ankle['y']) / 2
    
    # 计算身体倾斜角度 (度)
    if hip_center_y != shoulder_center_y:
        body_tilt_angle = abs(math.atan2(hip_center_x - shoulder_center_x, hip_center_y - shoulder_center_y) * (180 / math.pi))
    else:
        body_tilt_angle = 0
    
    # 计算腿部水平度
    leg_level_diff = 1
    if knee_y and ankle_y:
        leg_level_diff = abs(ankle_y - knee_y)
    
    logger.info(f"姿态分析: 肩膀Y={shoulder_center_y:.2f}, 髋Y={hip_center_y:.2f}, 膝Y={knee_y}, 踝Y={ankle_y}, 倾斜={body_tilt_angle:.1f}°")
    
    # 姿态判断
    # 1. 站立：膝盖在脚踝上方，臀部在膝盖上方
    if knee_y and ankle_y and hip_center_y:
        if knee_y < ankle_y - 0.1 and hip_center_y < knee_y - 0.05:
            if body_tilt_angle < 30:
                return {
                    'pose': 'standing',
                    'is_fall': False,
                    'confidence': 0.95,
                    'reason': '站立姿态'
                }
    
    # 2. 坐着
    if knee_y and ankle_y and hip_center_y:
        if abs(knee_y - ankle_y) < 0.15 and hip_center_y < knee_y:
            if body_tilt_angle < 45:
                return {
                    'pose': 'sitting',
                    'is_fall': False,
                    'confidence': 0.9,
                    'reason': '坐姿'
                }
    
    # 3. 蹲下
    if knee_y and ankle_y and hip_center_y:
        if knee_y > ankle_y - 0.05 and hip_center_y > knee_y - 0.05:
            if body_tilt_angle < 60:
                return {
                    'pose': 'crouching',
                    'is_fall': False,
                    'confidence': 0.85,
                    'reason': '蹲下/弯腰'
                }
    
    # 4. 倒地检测
    if leg_level_diff < 0.15 and body_tilt_angle > FALL_ANGLE_THRESHOLD:
        if knee_y and ankle_y and abs(ankle_y - knee_y) < 0.2:
            return {
                'pose': 'lying',
                'is_fall': True,
                'confidence': 0.9,
                'reason': f'疑似跌倒! 身体倾斜{body_tilt_angle:.0f}°'
            }
    
    return {
        'pose': 'unknown',
        'is_fall': False,
        'confidence': 0.3,
        'reason': '姿态不明确'
    }


if __name__ == '__main__':
    port = int(os.environ.get('MEDIAPIPE_PORT', 5001))
    logger.info(f"启动 MediaPipe 服务，端口: {port}")
    
    # 预加载模型和检测器
    if MEDIA_PIPE_AVAILABLE:
        create_pose_detector()
    
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
