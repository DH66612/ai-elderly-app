# ==================== 部署配置指南 ====================

## 方案1：内网穿透（最快，免费测试）

### 步骤：

1. 安装 ngrok
```bash
npm install -g ngrok
```

2. 注册免费账号：https://ngrok.com/
   获取 authtoken

3. 配置 ngrok
```bash
ngrok config add-authtoken 你的token
```

4. 启动后端
```bash
cd server && pnpm run dev
```

5. 另一个终端启动穿透
```bash
ngrok http 9091
```

6. 复制 ngrok 显示的公网地址，例如：
```
https://abc123.ngrok-free.app
```

7. 配置环境变量（二选一）：

   方式A - 修改 client/.env：
   ```
   EXPO_PUBLIC_BACKEND_BASE_URL=https://abc123.ngrok-free.app
   ```

   方式B - 修改 client/eas.json：
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_BACKEND_BASE_URL": "https://abc123.ngrok-free.app"
         }
       }
     }
   }
   ```

8. 重新构建 APP
```bash
cd client
eas build --platform android --profile production
```

---

## 方案2：Railway 免费部署（推荐长期使用）

### 步骤：

1. 访问 https://railway.app/ 用 GitHub 登录

2. 点击 "New Project" → "Deploy from GitHub repo"

3. 选择你的仓库

4. 配置环境变量（在 Variables 标签）：
   - DATABASE_URL: 你的 Supabase 数据库连接字符串
   - 其他环境变量从 server/.env 复制

5. Railway 会自动部署，给你一个公网地址

---

## 方案3：阿里云/腾讯云服务器

1. 购买云服务器（最低配置即可，约 50元/月）

2. 安装 Node.js + PM2

3. 上传代码，配置 nginx 反向代理

4. 配置域名 + HTTPS

---

## 当前后端环境变量（需要配置到公网服务器）

查看 server/.env 文件，主要包含：
- 数据库连接
- Agora 视频通话配置
- 高德地图 API Key
- 短信服务配置（可选）
