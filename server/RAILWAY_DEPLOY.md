# Railway 部署指南

## 步骤

### 1. 准备 GitHub 仓库

将代码推送到 GitHub（如果没有的话）

### 2. 登录 Railway

访问 https://railway.app/
点击 "Start a New Project"
使用 GitHub 账号登录

### 3. 创建项目

- 点击 "Deploy from GitHub repo"
- 选择你的仓库
- Railway 会自动检测到 `server/railway.json`

### 4. 配置环境变量（重要！）

在 Railway 项目页面，点击 "Variables" 标签，添加以下变量：

```
# 数据库（必填，你的 Supabase PostgreSQL 连接字符串）
DATABASE_URL=postgresql://postgres:密码@db.xxx.supabase.co:5432/postgres

# AI 服务 - DeepSeek
DEEPSEEK_API_KEY=sk-xxxxxxxx

# AI 服务 - 讯飞语音
XUNFEI_APP_ID=xxxxxxxx
XUNFEI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
XUNFEI_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 实时通信 - Agora
AGORA_APP_ID=7809bad23efd48ab9b8d1a9798c9909c
AGORA_APP_CERTIFICATE=c286858bb13c46b6afcaee5cff4ed69f

# 地图服务 - 高德地图
AMAP_KEY=cc26ee80c2a54bc565bbf0d2927d637e

# 萤石云（可选）
EZVIZ_APP_KEY=xxxxxxxx
EZVIZ_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 华为健康（可选）
HUAWEI_CLIENT_ID=xxxxxxxxxxxxxxxx
HUAWEI_CLIENT_SECRET=xxxxxxxxxxxxxxxx

# 推送通知
EXPO_ACCESS_TOKEN=your_expo_access_token

# 短信服务（可选，保持模拟模式）
SMS_MODE=mock
SMS_PROVIDER=aliyun
```

### 5. 部署

点击 "Deploy" 按钮，等待部署完成

Railway 会在构建时自动安装 FFmpeg（通过 railway.toml 配置），用于：
- 音频格式转换（WebM/AAC → PCM for 讯飞 ASR）
- 视频帧提取（用于 MediaPipe 姿态检测）
- 语音合成音频转换

### 6. 获取公网地址

部署成功后，在 "Settings" → "Domains" 添加一个域名
Railway 会给你一个地址，例如：
```
https://your-app.up.railway.app
```

### 7. 更新前端配置

修改 `client/.env`：
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-app.up.railway.app
```

或修改 `client/eas.json`：
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_BACKEND_BASE_URL": "https://your-app.up.railway.app"
      }
    }
  }
}
```

### 8. 重新构建 APP

```bash
cd client
eas build --platform android --profile production
```

---

## 费用

- 免费额度：每月 $5
- 小项目基本够用
- 超出后按量计费

## 注意事项

1. **FFmpeg 依赖**：Railway 配置中已包含 FFmpeg 安装，用于音频格式转换（语音识别需要）
2. 确保数据库（Supabase）允许 Railway 的 IP 访问
3. Railway 会自动分配端口，代码已适配
4. 首次部署可能需要几分钟
5. 所有 AI 相关功能需要配置对应的 API Key
