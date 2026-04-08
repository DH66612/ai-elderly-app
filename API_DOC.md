# AI 智慧助老系统 - API 接口文档

## 基础信息

- **Base URL**: `https://your-api-domain.com/api/v1`
- **认证方式**: JWT Token (Bearer Token)
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

---

## 目录

1. [认证接口](#1-认证接口)
2. [用户接口](#2-用户接口)
3. [AI 分析接口](#3-ai-分析接口)
4. [语音助手接口](#4-语音助手接口)
5. [语音识别接口](#5-语音识别接口)
6. [健康数据接口](#6-健康数据接口)
7. [备忘录接口](#7-备忘录接口)
8. [用药提醒接口](#8-用药提醒接口)
9. [设备管理接口](#9-设备管理接口)
10. [消息通知接口](#10-消息通知接口)
11. [视频通话接口](#11-视频通话接口)
12. [天气 POI 接口](#12-天气-poi-接口)
13. [其他接口](#13-其他接口)

---

## 1. 认证接口

### 1.1 用户登录

**POST** `/auth/login`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | ✅ | 手机号 |
| password | string | ✅ | 密码 |

**请求示例：**
```json
{
  "phone": "13800138000",
  "password": "password123"
}
```

**响应示例：**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "phone": "13800138000",
    "name": "张三",
    "role": "elderly",
    "avatar_url": "https://xxx.com/avatar.jpg"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "boundUserId": 2
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 请求是否成功 |
| user | object | 用户信息 |
| token | string | JWT Token |
| boundUserId | number | 绑定的老人/监护人ID |

---

### 1.2 用户注册

**POST** `/auth/register`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | ✅ | 手机号 |
| password | string | ✅ | 密码（至少6位） |
| name | string | ✅ | 姓名 |
| role | string | ✅ | 角色：elderly / guardian |
| verificationCode | string | ❌ | 验证码（开发环境可省略） |

**请求示例：**
```json
{
  "phone": "13800138000",
  "password": "password123",
  "name": "李四",
  "role": "guardian"
}
```

**响应示例：**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "phone": "13800138000",
    "name": "李四",
    "role": "guardian"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.3 验证 Token

**GET** `/auth/verify`

**请求头：**
```
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": 1,
    "phone": "13800138000",
    "role": "elderly"
  }
}
```

---

## 2. 用户接口

### 2.1 获取用户信息

**GET** `/users/:id`

**响应示例：**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "phone": "13800138000",
    "name": "张三",
    "role": "elderly",
    "avatar_url": "https://xxx.com/avatar.jpg",
    "health_conditions": ["高血压", "糖尿病"],
    "living_conditions": ["独居", "有电梯"],
    "home_address": "北京市朝阳区xxx",
    "emergency_contact": "李四",
    "emergency_phone": "13900139000",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### 2.2 更新用户信息

**PUT** `/users/:id`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ❌ | 姓名 |
| avatar_url | string | ❌ | 头像URL |
| health_conditions | array | ❌ | 健康状况 |
| living_conditions | array | ❌ | 生活环境 |
| home_address | string | ❌ | 家庭地址 |
| emergency_contact | string | ❌ | 紧急联系人 |
| emergency_phone | string | ❌ | 紧急联系电话 |

---

### 2.3 获取绑定请求列表

**GET** `/users/binding-requests`

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| user_id | number | 用户ID |
| status | string | pending / accepted / rejected |

**响应示例：**
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "elder": {
        "id": 2,
        "name": "王五",
        "phone": "13800138001"
      },
      "guardian": {
        "id": 1,
        "name": "李四",
        "phone": "13800138000"
      },
      "relationship": "父子",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2.4 发起绑定请求

**POST** `/users/binding-requests`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| elder_id | number | ✅ | 老人ID |
| guardian_id | number | ✅ | 监护人ID |
| relationship | string | ✅ | 关系：父子 / 母子 / 其他 |

---

### 2.5 接受/拒绝绑定请求

**POST** `/users/binding-requests/:id/accept`

**POST** `/users/binding-requests/:id/reject`

---

## 3. AI 分析接口

### 3.1 健康数据分析

**POST** `/ai/analyze/:userId`

**请求头：**
```
Authorization: Bearer <token>
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| analysisType | string | ❌ | 分析类型，默认 health |
| healthTrend | object | ❌ | 健康趋势数据 |
| bluetoothData | array | ❌ | 蓝牙设备数据 |

**响应示例：**
```json
{
  "success": true,
  "analysis": {
    "id": 1,
    "analysis_type": "health",
    "risk_level": "medium",
    "created_at": "2024-01-01T00:00:00Z",
    "parsed_result": {
      "summary": "老人整体健康状况良好，部分指标需关注",
      "riskLevel": "medium",
      "indicators": [
        {
          "name": "心率",
          "value": "72 bpm",
          "status": "normal",
          "trend": "稳定",
          "comment": "心率在正常范围内"
        },
        {
          "name": "血压",
          "value": "145/92 mmHg",
          "status": "warning",
          "trend": "上升",
          "comment": "收缩压偏高，建议关注"
        }
      ],
      "alerts": [
        "血压偏高，建议咨询医生"
      ],
      "suggestions": [
        "建议每天测量血压并记录",
        "饮食清淡，减少盐分摄入",
        "可陪老人散步增加活动量"
      ],
      "followUp": "建议下周复查血压，如持续偏高请就医"
    }
  }
}
```

---

### 3.2 生成每日报告

**POST** `/ai/daily-report/:userId`

**响应示例：**
```json
{
  "success": true,
  "report": "尊敬的李先生，您好！\n\n今天是2024年1月15日，星期一。下面为您带来王爷爷今日的健康报告...\n\n【今日健康概述】\n王爷爷今日整体状态良好，各项指标基本正常...\n\n【护理建议】\n1. 建议提醒老人按时服用降压药\n2. 晚餐后可以陪老人散步15-20分钟\n3. 关注老人情绪，多陪伴交流",
  "generatedAt": "2024-01-15T18:00:00Z"
}
```

---

### 3.3 AI 健康对话

**POST** `/ai/chat`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | number | ✅ | 用户ID |
| message | string | ✅ | 消息内容 |
| history | array | ❌ | 对话历史 |

**请求示例：**
```json
{
  "user_id": 1,
  "message": "老人最近血压有点高，应该怎么调理？",
  "history": []
}
```

**响应示例：**
```json
{
  "success": true,
  "reply": "您好！根据王爷爷最近的血压数据，收缩压确实偏高一些..."
}
```

---

### 3.4 获取 AI 分析历史

**GET** `/ai/history/:userId`

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| analysis_type | string | 分析类型 |
| limit | number | 返回数量，默认10 |

---

## 4. 语音助手接口

### 4.1 对话（流式）

**POST** `/voice-assistant/chat-stream`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | ✅ | 消息内容 |
| session_id | string | ❌ | 会话ID |
| role | string | ❌ | 角色：elderly / guardian |
| user_id | number | ❌ | 用户ID |

**响应类型：** `text/event-stream`

**响应示例：**
```
data: {"content": "您"}
data: {"content": "好，"}
data: {"content": "今天"}
data: {"content": "天气"}
...
data: [DONE]
```

---

### 4.2 语音合成（TTS）

**POST** `/voice-assistant/tts`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | ✅ | 要合成的文本（最多1000字） |
| speaker | string | ❌ | 发音人：xiaoyan / aisjiuxu |
| speechRate | number | ❌ | 语速：-500~500 |
| loudnessRate | number | ❌ | 音量：-500~500 |

**响应示例：**
```json
{
  "success": true,
  "audioUri": "https://xxx.com/audio.mp3",
  "audioSize": 12345
}
```

---

## 5. 语音识别接口

### 5.1 语音识别

**POST** `/asr/recognize`

**请求头：**
```
Content-Type: application/json
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| audio | string | ✅ | Base64 编码的音频数据 |
| dialect | string | ❌ | 方言代码，默认 mandarin |
| uid | string | ❌ | 用户标识 |

**方言代码：**

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

**响应示例：**
```json
{
  "success": true,
  "text": "帮我查一下明天的天气",
  "duration": 3000,
  "dialect": "mandarin"
}
```

---

## 6. 健康数据接口

### 6.1 获取今日健康数据

**GET** `/health-data/today/:userId`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "heart_rate": 72,
    "systolic": 120,
    "diastolic": 80,
    "blood_oxygen": 98,
    "steps": 5800,
    "sleep_hours": 7.5,
    "temperature": 36.5,
    "blood_sugar": 5.2,
    "body_fat": 22.5,
    "calories": 450
  }
}
```

---

### 6.2 获取健康趋势

**GET** `/health-data/trend/:userId`

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| days | number | 天数，默认7 |

**响应示例：**
```json
{
  "success": true,
  "trend": [
    {
      "date": "2024-01-09",
      "heart_rate": 70,
      "steps": 5200
    },
    {
      "date": "2024-01-10",
      "heart_rate": 72,
      "steps": 6800
    }
  ]
}
```

---

### 6.3 上传健康数据

**POST** `/health-data/upload`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | number | ✅ | 用户ID |
| heart_rate | number | ❌ | 心率 |
| systolic | number | ❌ | 收缩压 |
| diastolic | number | ❌ | 舒张压 |
| blood_oxygen | number | ❌ | 血氧 |
| steps | number | ❌ | 步数 |
| sleep_hours | number | ❌ | 睡眠时长 |
| temperature | number | ❌ | 体温 |
| blood_sugar | number | ❌ | 血糖 |
| body_fat | number | ❌ | 体脂率 |

---

## 7. 备忘录接口

### 7.1 获取备忘录列表

**GET** `/memos`

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| binding_id | number | 绑定用户ID |

---

### 7.2 创建备忘录

**POST** `/memos`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | number | ✅ | 用户ID |
| title | string | ✅ | 标题 |
| content | string | ❌ | 内容 |
| category | string | ❌ | 分类：日常 / 提醒 / 重要 |
| remind_at | string | ❌ | 提醒时间 |

---

### 7.3 更新备忘录

**PUT** `/memos/:id`

**请求参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| title | string | 标题 |
| content | string | 内容 |
| is_completed | boolean | 是否完成 |
| is_pinned | boolean | 是否置顶 |

---

### 7.4 删除备忘录

**DELETE** `/memos/:id`

---

## 8. 用药提醒接口

### 8.1 获取用药提醒列表

**GET** `/medication/reminders/:userId`

**响应示例：**
```json
{
  "success": true,
  "reminders": [
    {
      "id": 1,
      "medicine_name": "降压药",
      "dosage": "1片",
      "frequency": "每日",
      "times": ["08:00", "20:00"],
      "is_active": true,
      "notes": "饭后服用"
    }
  ]
}
```

---

### 8.2 创建用药提醒

**POST** `/medication/reminders`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | number | ✅ | 用户ID |
| medicine_name | string | ✅ | 药品名称 |
| dosage | string | ❌ | 剂量 |
| frequency | string | ❌ | 频率：每日 / 每周 |
| times | array | ✅ | 服药时间 |
| start_date | string | ❌ | 开始日期 |
| end_date | string | ❌ | 结束日期 |
| notes | string | ❌ | 备注 |

---

## 9. 设备管理接口

### 9.1 获取蓝牙设备列表

**GET** `/bluetooth/devices/:userId`

**响应示例：**
```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "device_type": "bracelet",
      "device_name": "华为手环6",
      "device_id": "XX:XX:XX:XX:XX:XX",
      "status": "online",
      "last_sync": "2024-01-15T18:00:00Z"
    }
  ]
}
```

---

### 9.2 上传手环数据

**POST** `/device-data/bracelet`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | number | ✅ | 用户ID |
| heart_rate | number | ❌ | 心率 |
| blood_oxygen | number | ❌ | 血氧 |
| steps | number | ❌ | 步数 |
| sleep_data | object | ❌ | 睡眠数据 |

---

## 10. 消息通知接口

### 10.1 获取通知列表

**GET** `/notifications`

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| user_id | number | 用户ID |
| is_read | boolean | 是否已读 |
| limit | number | 返回数量 |

---

### 10.2 标记已读

**POST** `/notifications/:id/read`

**POST** `/notifications/read-all`

---

## 11. 视频通话接口

### 11.1 发起视频通话

**POST** `/video-calls/request`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| caller_id | number | ✅ | 呼叫方ID |
| callee_id | number | ✅ | 被呼叫方ID |

**响应示例：**
```json
{
  "success": true,
  "session_id": "abc123",
  "agora_token": "xxx"
}
```

---

### 11.2 获取 Agora Token

**POST** `/agora/token`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channel_name | string | ✅ | 频道名 |
| uid | number | ✅ | 用户ID |

---

## 12. 天气 POI 接口

### 12.1 获取天气信息

**GET** `/weather`

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| city | string | ❌ | 城市名称（不填自动获取定位） |

**响应示例：**
```json
{
  "success": true,
  "weather": {
    "city": "北京",
    "date": "2024-01-15",
    "type": "多云",
    "temperature": "2~8°C",
    "humidity": "45%",
    "wind": "北风3-4级",
    "aqi": 58,
    "aqi_level": "良",
    "suggestion": "今日天气较好，适合户外活动"
  }
}
```

---

### 12.2 搜索附近设施

**GET** `/poi/search-all`

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| location | string | ✅ | 经纬度，格式：lng,lat |
| radius | number | ❌ | 搜索半径，默认3000米 |

**响应示例：**
```json
{
  "success": true,
  "pois": {
    "hospitals": [
      {
        "name": "北京市第一医院",
        "distance": 1200,
        "address": "北京市朝阳区xxx",
        "location": { "lng": 116.4, "lat": 39.9 }
      }
    ],
    "pharmacies": [],
    "markets": []
  }
}
```

---

## 13. 其他接口

### 13.1 SSE 实时订阅

**GET** `/realtime/subscribe/:userId`

**事件类型：**

| 事件名 | 说明 | 数据结构 |
|--------|------|----------|
| notification | 通知消息 | `{ type, title, content }` |
| emergency | 紧急告警 | `{ alertId, deviceName }` |
| video_call_request | 视频通话请求 | `{ callerId, callerName }` |
| health_data | 健康数据更新 | `{ heartRate, steps }` |
| fall_alert | 跌倒告警 | `{ alertId, isEmergency }` |
| medication_reminder | 用药提醒 | `{ medicineName, dosage }` |

---

### 13.2 健康检查

**GET** `/health`

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T18:00:00Z"
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 / Token 过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式：**
```json
{
  "success": false,
  "error": "错误描述"
}
```
