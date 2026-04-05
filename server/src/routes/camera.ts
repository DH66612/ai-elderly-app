/**
 * WiFi摄像头管理路由
 * 支持摄像头连接测试、状态监控
 */
import express from 'express';
import net from 'net';

const router = express.Router();

/**
 * 测试摄像头连接
 * POST /api/v1/camera/test
 * 
 * Body: {
 *   ip_address: string,     // 摄像头IP地址
 *   port: number,           // RTSP端口
 *   username: string,       // 用户名
 *   password: string,       // 密码
 *   brand: string          // 品牌
 * }
 */
router.post('/test', async (req, res) => {
  try {
    const { ip_address, port, username, password, brand } = req.body;

    if (!ip_address || !port) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少IP地址或端口' 
      });
    }

    console.log(`[Camera] 测试连接: ${ip_address}:${port} (${brand || 'unknown'})`);

    // 尝试TCP连接测试端口是否开放
    const isPortOpen = await testTcpConnection(ip_address, port);

    if (!isPortOpen) {
      return res.json({
        success: true,
        isOnline: false,
        message: '端口无法访问，请检查IP地址和端口是否正确，以及摄像头是否开机',
      });
    }

    // 端口开放，认为摄像头在线
    // 实际的RTSP认证需要更复杂的实现，这里简化为端口可达即认为在线
    res.json({
      success: true,
      isOnline: true,
      message: '摄像头在线，端口可访问',
      details: {
        ip: ip_address,
        port: port,
        brand: brand,
        rtsp_supported: true,
      }
    });

  } catch (error) {
    console.error('[Camera] 测试连接失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '测试连接失败' 
    });
  }
});

/**
 * 测试TCP连接
 * @param host 主机地址
 * @param port 端口号
 * @param timeout 超时时间（毫秒）
 */
function testTcpConnection(host: string, port: number, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * 获取摄像头状态
 * GET /api/v1/camera/status/:deviceId
 */
router.get('/status/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // TODO: 从数据库获取摄像头信息并测试连接
    
    res.json({
      success: true,
      deviceId,
      isOnline: false,
      message: '功能开发中',
    });
  } catch (error) {
    console.error('[Camera] 获取状态失败:', error);
    res.status(500).json({ success: false, error: '获取状态失败' });
  }
});

export default router;
