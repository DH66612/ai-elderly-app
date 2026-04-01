# 摄像头集成可行性分析报告

## 一、警视卫摄像头分析

### 1. 品牌背景
- **类型**：淘宝消费级品牌
- **定位**：低价家用监控
- **技术架构**：通常采用私有云P2P方案

### 2. 可能的连接方式

#### 方案A：尝试开启RTSP（需测试）
```
步骤：
1. 电脑连接与摄像头同一WiFi
2. 下载 "ONVIF Device Manager" 或 "IP Camera Viewer"
3. 扫描局域网设备
4. 如果能发现设备，查看是否支持ONVIF协议
5. 尝试RTSP地址格式：
   rtsp://admin:密码@IP地址:554/stream1
   rtsp://admin:密码@IP地址:554/h264/ch1/main/av_stream
```

#### 方案B：联系厂商
- 查看摄像头包装盒/说明书上的客服电话
- 询问是否支持RTSP或ONVIF协议
- 询问是否有开放API

#### 方案C：使用厂商App截图推送（变通方案）
- 部分摄像头App支持截图推送到手机
- 通过监听通知获取截图
- 不是实时视频，但可用于跌倒检测

### 3. 判断是否支持RTSP的方法
```bash
# Windows/Linux/Mac 终端执行
# 查找摄像头IP
ping 摄像头可能的IP

# 测试RTSP端口
telnet 摄像头IP 554

# 或使用nmap扫描
nmap -p 554,80,8080,8554 摄像头IP
```

## 二、各厂商SDK对接方案

### 1. 海康威视/萤石（推荐）

**萤石开放平台**：https://open.ys7.com/
- 提供API获取视频流地址
- 支持HLS/FLV格式（移动端友好）
- 有Android/iOS SDK

```typescript
// 萤石API示例
// 1. 注册开发者账号
// 2. 获取AppKey和AppSecret
// 3. 绑定设备后获取视频流

const YS7_API = 'https://open.ys7.com/api/lapp/live/address/get';
// 返回HLS地址，可直接播放
```

### 2. 大华/乐橙

**乐橙开放平台**：https://open.imoulife.com/
- 类似萤石，提供云API
- 支持实时预览地址获取

### 3. 小米/米家

- **无官方SDK**
- 社区方案：使用抓包获取token
- 不稳定，不推荐

## 三、技术解决方案

### 方案1：RTSP转码服务器（推荐）

使用MediaMTX或SRS将RTSP转为HLS/WebRTC：

```yaml
# docker-compose.yml
services:
  mediamtx:
    image: bluenviron/mediamtx:latest
    ports:
      - "8554:8554"  # RTSP
      - "8888:8888"  # HLS
      - "8889:8889"  # WebRTC
    volumes:
      - ./mediamtx.yml:/mediamtx.yml
```

**流程**：
```
摄像头(RTSP) → MediaMTX服务器 → HLS/WebRTC流 → 手机播放
```

### 方案2：使用VLC组件（原生）

需要在Expo项目中添加原生模块：

```typescript
// 需要expo prebuild后使用
// 安装 react-native-vlc-media-player
import VLCPlayer from 'react-native-vlc-media-player';

<VLCPlayer
  source={{ uri: 'rtsp://admin:pass@192.168.1.100:554/stream1' }}
  style={styles.video}
/>
```

### 方案3：萤石/乐橙云平台（最简单）

购买支持萤石/乐橙的摄像头：
1. 注册开放平台
2. 获取API Key
3. 调用API获取播放地址
4. 使用Video组件播放HLS

## 四、建议

### 短期方案（当前摄像头）
1. 尝试用ONVIF Device Manager扫描设备
2. 联系警视卫客服询问RTSP支持
3. 如果不支持，摄像头功能暂时用模拟数据演示

### 长期方案（更换硬件）
**推荐购买支持开放API的摄像头**：

| 推荐型号 | 价格 | 开放性 | 说明 |
|----------|------|--------|------|
| 海康威视 DS-2CD系列 | 200-500元 | ⭐⭐⭐⭐⭐ | 专业安防，RTSP默认开启 |
| 萤石C6CN | 150-300元 | ⭐⭐⭐⭐ | 有开放平台API |
| TP-Link TL-IPC系列 | 100-200元 | ⭐⭐⭐ | 可开启RTSP |

### 代码层面
我可以帮你：
1. 添加RTSP转码服务器配置
2. 集成萤石/乐橙开放平台API
3. 或者先用模拟数据演示功能

---

## 结论

**你的判断是对的**：警视卫这类淘宝品牌摄像头确实很难对接，原因是：
1. 采用私有云P2P协议，不暴露在局域网
2. 没有开放SDK
3. 可能不支持标准RTSP/ONVIF

**建议**：
- 先测试你的摄像头是否支持RTSP
- 如果不支持，考虑更换支持开放API的品牌
- 或者暂时用模拟数据演示功能，后续再对接真实硬件
