# AI 智慧助老系统 - 设计文档

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [功能模块](#3-功能模块)
4. [数据库设计](#4-数据库设计)
5. [API 接口文档](#5-api-接口文档)
6. [第三方服务集成](#6-第三方服务集成)
7. [部署指南](#7-部署指南)
8. [环境变量配置](#8-环境变量配置)

---

## 1. 项目概述

### 1.1 项目背景

随着中国人口老龄化程度加深，空巢老人、独居老人的照护问题日益突出。子女因工作等原因无法时刻陪伴在父母身边，对老人的健康状况、安全保障等方面的关注存在诸多不便。

### 1.2 项目目标

打造一款专为老年人设计的智能陪护应用，实现：

- **健康管理**：实时监测老人健康数据，AI 分析健康趋势
- **安全保障**：跌倒检测、视频通话、紧急求助
- **便捷服务**：语音助手、用药提醒、服务预约
- **情感连接**：方便子女远程照护，增强家庭情感纽带

### 1.3 系统角色

| 角色 | 说明 |
|------|------|
| **老人端** | 被照护者，使用语音助手、查看健康数据、发起视频通话 |
| **监护人端** | 子女/亲属，查看老人健康数据、接收告警、远程视频通话 |

### 1.4 核心特性

| 特性 | 说明 |
|------|------|
| 双角色系统 | 老人端 + 监护人端，数据互通 |
| 语音交互 | 8 种方言支持，语音助手 |
| AI 健康分析 | DeepSeek 大模型，智能健康报告 |
| 实时通信 | Agora 视频通话，SSE 消息推送 |
| 智能硬件 | 蓝牙手环、健康设备接入 |
| 隐私保护 | 数据加密传输，隐私政策合规 |

---

## 2. 技术架构

### 2.1 技术栈

#### 前端 (移动端)

| 技术 | 版本 | 说明 |
|------|------|------|
| Expo | 54 | React Native 开发框架 |
| React Native | 0.76+ | 跨平台移动开发 |
| TypeScript | 5.x | 类型安全 |
| Expo Router | 6.x | 文件路由系统 |
| React Native Reanimated | 3.x | 动画库 |
| expo-av | - | 音视频处理 |
| expo-location | - | 位置服务 |
| expo-sensors | - | 传感器（跌倒检测） |
| react-native-gifted-charts | - | 图表展示 |

#### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 20.x | 运行时 |
| Express.js | 4.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| Supabase | - | PostgreSQL 数据库 |
| Drizzle ORM | - | ORM 框架 |
| FFmpeg | - | 音视频转换 |

#### AI 服务

| 服务 | 用途 |
|------|------|
| DeepSeek | LLM 大语言模型（AI 分析、对话） |
| 讯飞 ASR | 语音识别（8 种方言） |
| 讯飞 TTS | 语音合成 |

#### 第三方服务

| 服务 | 用途 |
|------|------|
| Supabase | 数据库、认证、存储 |
| Agora | 实时视频通话 |
| 高德地图 | POI 搜索、导航 |
| 萤石云 | 智能摄像头接入 |
| 华为健康 | 健康数据同步 |
| Expo Push | 消息推送 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         移动端 App                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   老人端    │  │  监护人端   │  │  共享功能   │             │
│  │  elderly-* │  │ guardian-* │  │ voice-asst  │             │
│  │  health-*  │  │  ai-       │  │ camera-*    │             │
│  │  memo-*    │  │  analysis   │  │ bluetooth-* │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                      Expo Router (路由)                         │
│                      React Native (UI)                          │
│                      expo-av (音频)                             │
│                      expo-sensors (传感器)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         后端服务                                 │
│                    Express.js + TypeScript                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API 路由层                            │   │
│  │  auth | users | ai | voice-assistant | health-data     │   │
│  │  bluetooth | devices | notifications | video-calls     │   │
│  │  memos | medication | weather | poi | camera           │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ DeepSeek LLM │  │  讯飞 ASR    │  │  讯飞 TTS    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Supabase   │  │   Agora      │  │   高德地图   │         │
│  │  PostgreSQL  │  │  Video SDK   │  │   POI API    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 目录结构

```
/workspace/projects/
├── client/                          # React Native 前端
│   ├── app/                         # Expo Router 路由目录
│   │   ├── _layout.tsx             # 根布局
│   │   ├── index.tsx               # 首页重定向
│   │   ├── (tabs)/                # Tab 导航
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx          # 首页
│   │   │   ├── health.tsx         # 健康
│   │   │   ├── services.tsx       # 服务
│   │   │   └── settings.tsx       # 设置
│   │   └── **/*.tsx               # 其他页面
│   ├── screens/                    # 页面实现
│   │   ├── elderly-home/          # 老人首页
│   │   ├── guardian-home/         # 监护人首页
│   │   ├── voice-assistant/       # 语音助手
│   │   ├── ai-analysis/           # AI 健康分析
│   │   ├── health-data/           # 健康数据
│   │   ├── bluetooth-*/           # 蓝牙设备
│   │   ├── camera-*/              # 摄像头相关
│   │   ├── video-call/            # 视频通话
│   │   └── ...
│   ├── components/                  # 公共组件
│   │   ├── Screen.tsx             # 页面容器
│   │   ├── HeartMeteors.tsx       # 流星动画
│   │   └── ...
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useVoiceRecorder.ts    # 录音 Hook
│   │   ├── useSSE.ts              # SSE 推送 Hook
│   │   └── ...
│   ├── contexts/                   # React Context
│   │   └── AuthContext.tsx        # 认证上下文
│   ├── constants/                  # 常量
│   │   ├── theme.ts               # 主题配置
│   │   └── api.ts                 # API 配置
│   └── services/                   # 服务层
│       └── pushNotifications.ts    # 推送服务
│
├── server/                          # Express 后端
│   ├── src/
│   │   ├── index.ts               # 入口文件
│   │   ├── routes/                 # API 路由
│   │   │   ├── auth.ts            # 认证
│   │   │   ├── users.ts           # 用户管理
│   │   │   ├── ai.ts              # AI 分析
│   │   │   ├── voice-assistant.ts # 语音助手
│   │   │   ├── asr.ts             # 语音识别
│   │   │   ├── health-data.ts      # 健康数据
│   │   │   ├── bluetooth.ts        # 蓝牙设备
│   │   │   ├── notifications.ts    # 消息通知
│   │   │   ├── video-calls.ts      # 视频通话
│   │   │   ├── memos.ts           # 备忘录
│   │   │   ├── medication.ts       # 用药提醒
│   │   │   ├── weather.ts          # 天气查询
│   │   │   ├── poi.ts             # POI 搜索
│   │   │   ├── camera.ts          # 摄像头
│   │   │   ├── ezviz.ts           # 萤石云
│   │   │   ├── fall-detection.ts   # 跌倒检测
│   │   │   ├── ocr.ts             # OCR 识别
│   │   │   ├── huawei-health.ts    # 华为健康
│   │   │   └── ...
│   │   ├── services/               # 业务服务
│   │   │   ├── deepseek.ts        # DeepSeek LLM
│   │   │   ├── xunfei-asr.ts      # 讯飞 ASR
│   │   │   ├── xunfei-tts.ts      # 讯飞 TTS
│   │   │   ├── fall-detection.ts   # 跌倒检测
│   │   │   └── ...
│   │   ├── storage/                # 数据存储
│   │   │   └── database/          # 数据库
│   │   │       ├── supabase-client.ts
│   │   │       └── schema.ts      # Drizzle Schema
│   │   ├── utils/                  # 工具函数
│   │   │   ├── audio-converter.ts # 音频格式转换
│   │   │   └── ...
│   │   └── middleware/             # 中间件
│   │       └── auth.ts            # 认证中间件
│   └── package.json
│
└── package.json                     # Workspace 根配置
```

---

## 3. 功能模块

### 3.1 老人端功能

| 模块 | 功能 | 说明 |
|------|------|------|
| **首页** | 健康概览、快捷入口 | 心率、血压、步数等核心数据展示 |
| **语音助手** | 8 种方言识别 | 普通话、粤语、四川话、东北话、河南话、陕西话、上海话、湖南话 |
| **健康数据** | 手环数据、设备数据 | 实时心率、血压、血氧、睡眠等 |
| **备忘录** | 记事本 | 支持语音输入，数据与监护人互通 |
| **用药提醒** | 定时提醒 | 自定义用药时间和剂量 |
| **视频通话** | 发起/接听 | 与监护人进行视频通话 |
| **附近设施** | POI 搜索 | 医院、药店、超市等 |
| **设置** | 个人资料、通知设置 | 绑定监护人、隐私设置 |

### 3.2 监护人端功能

| 模块 | 功能 | 说明 |
|------|------|------|
| **首页** | 老人状态总览 | 实时了解老人健康状况 |
| **AI 健康分析** | 智能分析报告 | DeepSeek 大模型生成分析报告 |
| **健康趋势** | 数据图表 | 心率、血压、步数等趋势图 |
| **记事本** | 共享备忘录 | 与老人数据互通 |
| **华为健康** | 健康数据同步 | 华为设备数据接入 |
| **设备管理** | 绑定设备 | 手环、摄像头等设备 |
| **视频通话** | 发起/接听 | 主动联系老人 |
| **摄像头** | 实时预览 | 萤石云摄像头集成 |
| **消息通知** | 告警推送 | 跌倒、异常等实时通知 |

### 3.3 共享功能

| 模块 | 功能 | 说明 |
|------|------|------|
| **登录注册** | 角色区分 | 老人/监护人，支持手机号 |
| **用户绑定** | 关系绑定 | 监护人绑定老人账号 |
| **相册** | 照片管理 | 老人端照片存储 |
| **图片识字** | OCR 识别 | 拍照识别文字 |
| **隐私政策** | 合规展示 | 服务协议、隐私保护 |
| **爱心动画** | UI 特效 | 流星动画背景 |

### 3.4 核心业务流程

#### 3.4.1 语音助手流程

```
┌─────────┐     录音      ┌─────────┐    Base64    ┌─────────┐
│  用户   │ ───────────▶ │  前端   │ ───────────▶ │  后端   │
│         │   说话       │         │   音频数据    │         │
└─────────┘              └─────────┘              └────┬────┘
                                                         │
                                                         ▼
┌─────────┐    文字+语音    ┌─────────┐    转换PCM    ┌─────────┐
│  用户   │ ◀───────────── │  前端   │ ◀─────────── │ 讯飞    │
│         │   回复播放     │         │   识别结果   │ ASR/TTS │
└─────────┘                └─────────┘              └─────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │  DeepSeek   │
                          │    LLM      │
                          └─────────────┘
```

#### 3.4.2 AI 健康分析流程

```
┌─────────┐              ┌─────────┐              ┌─────────┐
│ 监护人  │ ─── 请求 ───▶ │  后端   │ ─── 查询 ───▶ │Supabase │
│         │   分析报告    │         │   健康数据    │         │
└─────────┘              └────┬────┘              └─────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  DeepSeek   │
                       │    LLM      │
                       │  (分析+报告) │
                       └─────────────┘
```

#### 3.4.3 视频通话流程

```
┌─────────┐              ┌─────────┐              ┌─────────┐
│  老人   │ ◀───────────▶ │  后端   │ ◀───────────▶ │ 监护人  │
│  端 App │   WebSocket  │  Agora  │   WebSocket  │  端 App │
└─────────┘   信令通道    │  Token  │   信令通道    └─────────┘
       │                 └─────────┘                 │
       │                                             │
       └───────────────── P2P ──────────────────────┘
                        音视频流
```

---

## 4. 数据库设计

### 4.1 核心表结构

#### users（用户表）

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) NOT NULL, -- 'elderly' | 'guardian'
  avatar_url TEXT,
  health_conditions TEXT[], -- 健康状况数组
  living_conditions TEXT[], -- 生活环境数组
  home_address TEXT,
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### user_bindings（用户绑定表）

```sql
CREATE TABLE user_bindings (
  id SERIAL PRIMARY KEY,
  elder_id INTEGER REFERENCES users(id),
  guardian_id INTEGER REFERENCES users(id),
  relationship VARCHAR(50), -- 关系：父子、母子、其他
  status VARCHAR(20) DEFAULT 'pending', -- pending | active | rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### health_trend（健康趋势表）

```sql
CREATE TABLE health_trend (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  time_point TIME,
  heart_rate INTEGER, -- 心率 bpm
  systolic INTEGER, -- 收缩压 mmHg
  diastolic INTEGER, -- 舒张压 mmHg
  blood_oxygen INTEGER, -- 血氧 %
  steps INTEGER, -- 步数
  sleep_hours DECIMAL(4,1), -- 睡眠时长
  temperature DECIMAL(4,1), -- 体温
  blood_sugar DECIMAL(5,2), -- 血糖
  body_fat DECIMAL(5,2), -- 体脂率
  calories INTEGER, -- 消耗热量
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### memos（备忘录表）

```sql
CREATE TABLE memos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  related_user_id INTEGER REFERENCES users(id), -- 关联用户（监护人可查看）
  title VARCHAR(200),
  content TEXT,
  category VARCHAR(50), -- 分类：日常、提醒、重要
  is_completed BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  remind_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### medication_reminders（用药提醒表）

```sql
CREATE TABLE medication_reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  medicine_name VARCHAR(200) NOT NULL,
  dosage VARCHAR(100), -- 剂量
  frequency VARCHAR(50), -- 频率：每日、每周
  times TEXT[], -- 具体时间 ["08:00", "20:00"]
  start_date DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### notifications（消息通知表）

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50), -- health_warning | medication | emergency | system
  title VARCHAR(200),
  content TEXT,
  data JSONB, -- 附加数据
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### ai_analysis（AI 分析记录表）

```sql
CREATE TABLE ai_analysis (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  analysis_type VARCHAR(50), -- health | daily_report
  result JSONB, -- 分析结果
  risk_level VARCHAR(20), -- low | medium | high
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### devices（设备表）

```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_type VARCHAR(50), -- bracelet | camera | scale
  device_name VARCHAR(100),
  device_id VARCHAR(100), -- 设备唯一标识
  status VARCHAR(20) DEFAULT 'online',
  last_sync TIMESTAMP,
  config JSONB, -- 设备配置
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 ER 关系图

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │  user_bindings   │       │    users     │
│──────────────│◀──────│──────────────────│──────▶│ (as elder)   │
│ id (PK)      │ 1   N │ id               │ N   1 │ id (PK)      │
│ phone        │       │ elder_id (FK)    │       │ role='elder' │
│ role         │       │ guardian_id (FK) │       └──────────────┘
│ name         │       │ relationship     │              │
└──────────────┘       └──────────────────┘              │
     │                        │                          │
     │ 1                      │                          │
     ▼                        ▼                          ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│health_trend  │       │   memos      │       │   devices    │
│──────────────│       │──────────────│       │──────────────│
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ user_id (FK) │       │ user_id (FK) │       │ user_id (FK) │
│ heart_rate   │       │ related_     │       │ device_type  │
│ blood_oxygen │       │   user_id    │       │ device_id    │
│ ...          │       │ ...          │       │ ...          │
└──────────────┘       └──────────────┘       └──────────────┘

┌──────────────────────┐       ┌──────────────┐
│   ai_analysis        │       │notifications │
│──────────────────────│       │──────────────│
│ id (PK)              │       │ id (PK)      │
│ user_id (FK)         │       │ user_id (FK) │
│ analysis_type        │       │ type         │
│ result (JSONB)       │       │ title        │
│ risk_level           │       │ is_read      │
└──────────────────────┘       └──────────────┘
```

---

## 5. API 接口文档

### 5.1 认证相关

#### POST /api/v1/auth/login
登录

**请求参数：**
```json
{
  "phone": "13800138000",
  "password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "phone": "13800138000",
    "name": "张三",
    "role": "elderly"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/v1/auth/register
注册

**请求参数：**
```json
{
  "phone": "13800138000",
  "password": "password123",
  "name": "李四",
  "role": "guardian"
}
```

### 5.2 用户相关

#### GET /api/v1/users/:id
获取用户信息

#### PUT /api/v1/users/:id
更新用户信息

#### POST /api/v1/users/binding-requests
发起绑定请求

#### POST /api/v1/users/binding-requests/:id/accept
接受绑定请求

### 5.3 AI 分析

#### POST /api/v1/ai/analyze/:userId
健康数据分析

**响应：**
```json
{
  "success": true,
  "analysis": {
    "summary": "老人整体健康状况良好",
    "riskLevel": "low",
    "indicators": [
      {
        "name": "心率",
        "value": "72 bpm",
        "status": "normal",
        "trend": "稳定",
        "comment": "心率正常"
      }
    ],
    "alerts": [],
    "suggestions": ["建议每天散步30分钟"],
    "followUp": "继续保持良好生活习惯"
  }
}
```

#### POST /api/v1/ai/daily-report/:userId
生成每日健康报告

#### POST /api/v1/ai/chat
AI 健康对话

### 5.4 语音助手

#### POST /api/v1/voice-assistant/chat
对话（非流式）

#### POST /api/v1/voice-assistant/chat-stream
对话（流式，SSE）

#### POST /api/v1/voice-assistant/tts
语音合成

### 5.5 语音识别

#### POST /api/v1/asr/recognize
语音识别

**请求参数：**
```json
{
  "audio": "base64_encoded_audio",
  "dialect": "mandarin"
}
```

**支持方言：**
| 值 | 名称 |
|----|------|
| mandarin | 普通话 |
| cantonese | 粤语 |
| sichuan | 四川话 |
| dongbei | 东北话 |
| henan | 河南话 |
| shaanxi | 陕西话 |
| shanghai | 上海话 |
| hunan | 湖南话 |

### 5.6 健康数据

#### GET /api/v1/health-data/today/:userId
获取今日健康数据

#### GET /api/v1/health-data/trend/:userId
获取健康趋势

#### POST /api/v1/health-data/upload
上传健康数据

### 5.7 备忘录

#### GET /api/v1/memos
获取备忘录列表

#### POST /api/v1/memos
创建备忘录

#### PUT /api/v1/memos/:id
更新备忘录

#### DELETE /api/v1/memos/:id
删除备忘录

### 5.8 用药提醒

#### GET /api/v1/medication/reminders/:userId
获取用药提醒列表

#### POST /api/v1/medication/reminders
创建用药提醒

#### DELETE /api/v1/medication/reminders/:id
删除用药提醒

### 5.9 视频通话

#### POST /api/v1/video-calls/request
发起视频通话请求

#### POST /api/v1/video-calls/accept
接受视频通话

#### POST /api/v1/video-calls/reject
拒绝视频通话

#### POST /api/v1/agora/token
获取 Agora Token

### 5.10 设备管理

#### GET /api/v1/bluetooth/devices/:userId
获取蓝牙设备列表

#### POST /api/v1/device-data/bracelet
上传手环数据

### 5.11 天气

#### GET /api/v1/weather
获取天气信息

### 5.12 POI 搜索

#### GET /api/v1/poi/search-all
搜索附近设施

### 5.13 实时推送

#### GET /api/v1/realtime/subscribe/:userId
SSE 实时消息订阅

**事件类型：**
- `notification` - 通知消息
- `emergency` - 紧急告警
- `video_call_request` - 视频通话请求
- `health_data` - 健康数据更新
- `fall_alert` - 跌倒告警
- `medication_reminder` - 用药提醒

---

## 6. 第三方服务集成

### 6.1 DeepSeek（大语言模型）

**用途：**
- AI 健康分析报告生成
- 每日健康报告生成
- 语音助手对话（老人端/监护人端）

**配置：**
```env
DEEPSEEK_API_KEY=your_api_key
```

### 6.2 讯飞语音（ASR/TTS）

**ASR 用途：** 语音识别，支持 8 种方言

**TTS 用途：** 语音合成，语音播报

**配置：**
```env
XUNFEI_APP_ID=your_app_id
XUNFEI_API_KEY=your_api_key
XUNFEI_API_SECRET=your_api_secret
```

### 6.3 Supabase

**用途：**
- PostgreSQL 数据库
- 用户认证
- 数据存储

**配置：**
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
```

### 6.4 Agora（视频通话）

**用途：** 实时视频通话

**配置：**
```env
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
```

### 6.5 高德地图

**用途：**
- POI 搜索（医院、药店等）
- 地理编码
- 导航

**配置：**
```env
AMAP_KEY=your_key
```

### 6.6 萤石云

**用途：** 智能摄像头接入

**配置：**
```env
EZVIZ_APP_KEY=your_key
EZVIZ_APP_SECRET=your_secret
```

### 6.7 华为健康

**用途：** 华为设备健康数据同步

**配置：**
```env
HUAWEI_CLIENT_ID=your_client_id
HUAWEI_CLIENT_SECRET=your_client_secret
```

---

## 7. 部署指南

### 7.1 前端部署（Expo/EAS）

#### 开发环境

```bash
cd client
npx expo start
```

#### 生产构建

```bash
# Android
cd client
eas build --platform android --profile production

# iOS（需要 Apple 开发者账号）
eas build --platform ios --profile production
```

### 7.2 后端部署（Railway）

#### 1. 创建 Railway 项目

访问 https://railway.app/，使用 GitHub 登录

#### 2. 部署后端

```bash
# 推送代码到 GitHub
git push origin main
```

Railway 会自动检测并部署

#### 3. 配置环境变量

在 Railway Dashboard 中配置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| DATABASE_URL | Supabase 数据库连接字符串 |
| SUPABASE_URL | Supabase 项目 URL |
| SUPABASE_ANON_KEY | Supabase Anon Key |
| SUPABASE_SERVICE_KEY | Supabase Service Key |
| DEEPSEEK_API_KEY | DeepSeek API Key |
| XUNFEI_APP_ID | 讯飞 App ID |
| XUNFEI_API_KEY | 讯飞 API Key |
| XUNFEI_API_SECRET | 讯飞 API Secret |
| AGORA_APP_ID | Agora App ID |
| AGORA_APP_CERTIFICATE | Agora Certificate |
| AMAP_KEY | 高德地图 Key |
| EZVIZ_APP_KEY | 萤石 App Key |
| EZVIZ_APP_SECRET | 萤石 App Secret |
| HUAWEI_CLIENT_ID | 华为 Client ID |
| HUAWEI_CLIENT_SECRET | 华为 Client Secret |

#### 4. 配置前端环境变量

更新 `client/.env.production`：

```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-railway-app.railway.app
```

### 7.3 本地开发

#### 启动所有服务

```bash
coze dev
```

#### 仅启动后端

```bash
cd server
pnpm run dev
```

#### 仅启动前端

```bash
cd client
npx expo start
```

---

## 8. 环境变量配置

### 8.1 后端环境变量（server/.env）

```env
# ===========================================
# 数据库配置 (Supabase PostgreSQL)
# ===========================================
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# AI 服务 (DeepSeek + 讯飞)
# ===========================================
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# 讯飞语音听写 (ASR)
XUNFEI_APP_ID=xxxxxxxx
XUNFEI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
XUNFEI_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===========================================
# 实时通信 (Agora)
# ===========================================
AGORA_APP_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_APP_CERTIFICATE=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===========================================
# 地图服务 (高德地图)
# ===========================================
AMAP_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===========================================
# 萤石云摄像头
# ===========================================
EZVIZ_APP_KEY=xxxxxxxxxxxxxxxx
EZVIZ_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===========================================
# 华为健康
# ===========================================
HUAWEI_CLIENT_ID=xxxxxxxxxxxxxxxx
HUAWEI_CLIENT_SECRET=xxxxxxxxxxxxxxxx

# ===========================================
# 服务器配置
# ===========================================
PORT=9091
NODE_ENV=development
CORS_ORIGIN=*

# ===========================================
# 推送通知
# ===========================================
EXPO_ACCESS_TOKEN=your_expo_access_token
```

### 8.2 前端环境变量（client/.env）

```env
# 后端 API 地址
EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:9091

# 本地开发（局域网 IP，用于真机调试）
# EXPO_PUBLIC_LOCAL_IP=192.168.1.100
```

---

## 附录

### A. 技术选型理由

| 选择 | 理由 |
|------|------|
| Expo | 简化 RN 开发，支持 Web，一套代码三端运行 |
| Supabase | 免费开源，PostgreSQL 成熟稳定，实时功能 |
| DeepSeek | 国产大模型，API 稳定，价格实惠 |
| 讯飞语音 | 方言支持全面，识别准确率高 |
| Agora | 实时通信领导者，SDK 成熟 |

### B. 性能优化建议

1. **前端**
   - 使用 `useCallback` / `useMemo` 避免不必要的重渲染
   - 图片使用 CDN 压缩
   - 列表使用虚拟滚动

2. **后端**
   - 数据库添加适当索引
   - 使用 Redis 缓存热点数据
   - 开启 gzip 压缩

### C. 安全建议

1. **认证**
   - JWT Token 定期刷新
   - 敏感操作二次验证

2. **数据传输**
   - 全站 HTTPS
   - 敏感数据加密存储

3. **隐私保护**
   - 遵循《个人信息保护法》
   - 用户数据收集需明示同意
