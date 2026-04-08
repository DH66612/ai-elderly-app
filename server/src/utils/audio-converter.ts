/**
 * 音频格式转换工具
 * 将各种音频格式转换为讯飞ASR所需的PCM格式
 * 
 * 讯飞ASR要求：
 * - 原始PCM数据（不包含WAV头）
 * - 采样率：16000Hz
 * - 位深：16bit
 * - 声道：单声道
 * - 字节序：小端
 */
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough, Readable } from 'stream';
import { execSync } from 'child_process';

// 自动检测 FFmpeg 路径
function detectFfmpegPath(): string | null {
  // 可能的 FFmpeg 路径
  const possiblePaths = [
    'ffmpeg',                          // PATH 中的 ffmpeg
    '/usr/bin/ffmpeg',                // Linux 系统
    '/usr/local/bin/ffmpeg',          // 用户安装
    '/opt/homebrew/bin/ffmpeg',       // macOS Homebrew
  ];

  for (const path of possiblePaths) {
    try {
      execSync(`${path} -version`, { stdio: 'ignore' });
      console.log(`[AudioConverter] 找到 FFmpeg: ${path}`);
      return path;
    } catch {
      // 路径不存在或无权限，继续下一个
    }
  }
  
  return null;
}

// 检测并设置 FFmpeg 路径
const ffmpegPath = detectFfmpegPath();
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.warn('[AudioConverter] 未找到 FFmpeg，音频转换可能失败');
}

export interface AudioConversionResult {
  pcmBuffer: Buffer;      // PCM数据
  duration: number;       // 音频时长（毫秒）
  sampleRate: number;     // 采样率
  channels: number;       // 声道数
}

/**
 * 将音频Buffer转换为讯飞ASR所需的PCM格式
 * @param audioBuffer 原始音频数据（支持AAC, WebM, M4A, MP3等格式）
 * @returns PCM数据和音频信息
 */
export async function convertToPCM(audioBuffer: Buffer): Promise<AudioConversionResult> {
  return new Promise((resolve, reject) => {
    // 创建可读流 - 使用 Uint8Array 避免类型兼容性问题
    const inputStream = Readable.from(audioBuffer as unknown as Iterable<Buffer>);
    
    // 用于存储PCM数据
    const chunks: Uint8Array[] = [];
    let duration = 0;
    let sampleRate = 16000;
    let channels = 1;
    
    // 创建ffmpeg转换命令
    const command = ffmpeg(inputStream)
      .inputOptions([
        '-hide_banner',
        '-loglevel error',
      ])
      // 输出格式：16bit PCM, 16000Hz, 单声道
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec('pcm_s16le')  // 16bit signed little-endian PCM
      .format('s16le')          // 原始PCM格式（无WAV头）
      .on('start', (commandLine) => {
        console.log('[AudioConverter] FFmpeg命令:', commandLine);
      })
      .on('codecData', (data) => {
        console.log('[AudioConverter] 编解码信息:', data);
        // 解析时长
        if (data.duration) {
          const match = data.duration.match(/(\d+):(\d+):(\d+\.?\d*)/);
          if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = parseFloat(match[3]);
            duration = Math.floor((hours * 3600 + minutes * 60 + seconds) * 1000);
          }
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[AudioConverter] FFmpeg错误:', err.message);
        console.error('[AudioConverter] FFmpeg stderr:', stderr);
        reject(new Error(`音频转换失败: ${err.message}`));
      })
      .on('end', () => {
        const pcmBuffer = Buffer.concat(chunks);
        
        // 如果没有从codecData获取时长，从PCM数据计算
        if (duration === 0 && pcmBuffer.length > 0) {
          // PCM数据大小 = 采样率 * 时长(秒) * 声道数 * 位深/8
          // 时长(秒) = PCM大小 / (采样率 * 声道数 * 位深/8)
          // 位深=16, 所以除以2
          duration = Math.floor((pcmBuffer.length / (sampleRate * channels * 2)) * 1000);
        }
        
        console.log(`[AudioConverter] 转换完成: PCM大小=${pcmBuffer.length}字节, 时长=${duration}ms`);
        
        resolve({
          pcmBuffer,
          duration,
          sampleRate,
          channels,
        });
      });
    
    // 创建输出流并收集数据
    const outputStream = new PassThrough();
    outputStream.on('data', (chunk: Buffer) => {
      chunks.push(new Uint8Array(chunk));
    });
    
    // 设置输出
    command.output(outputStream).run();
  });
}

/**
 * 将Base64编码的音频转换为PCM
 * @param base64Audio Base64编码的音频数据
 * @returns PCM数据和音频信息
 */
export async function convertBase64ToPCM(base64Audio: string): Promise<AudioConversionResult> {
  // 将Base64转为Buffer
  const audioBuffer = Buffer.from(base64Audio, 'base64');
  console.log(`[AudioConverter] Base64音频大小: ${audioBuffer.length}字节`);
  
  return convertToPCM(audioBuffer);
}

/**
 * 检测音频格式
 * @param buffer 音频Buffer
 * @returns 音频格式
 */
export function detectAudioFormat(buffer: Buffer): string {
  // 检查文件头魔数
  if (buffer.length < 4) {
    return 'unknown';
  }
  
  // M4A/AAC (ftyp)
  if (buffer.slice(4, 8).toString() === 'ftyp') {
    return 'm4a';
  }
  
  // WebM
  if (buffer.slice(0, 4).toString() === '\x1a\x45\xdf\xa3') {
    return 'webm';
  }
  
  // MP3
  if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
    return 'mp3';
  }
  
  // WAV
  if (buffer.slice(0, 4).toString() === 'RIFF') {
    return 'wav';
  }
  
  // OGG
  if (buffer.slice(0, 4).toString() === 'OggS') {
    return 'ogg';
  }
  
  return 'unknown';
}
