import express from "express";
import cors from "cors";
import 'dotenv/config';
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import bluetoothRouter from "./routes/bluetooth";
import aiRouter from "./routes/ai";
import videoCallsRouter from "./routes/video-calls";
import realtimeRouter from "./routes/realtime";
import weatherRouter from "./routes/weather";
import notificationsRouter from "./routes/notifications";
import pushRouter from "./routes/push";
import asrRouter from "./routes/asr";
import agoraRouter from "./routes/agora";
import voiceAssistantRouter from "./routes/voice-assistant";
import devicesRouter from "./routes/devices";
import deviceDataRouter from "./routes/device-data";
import cameraRouter from "./routes/camera";
import fallDetectionRouter from "./routes/fall-detection";
import poiRouter from "./routes/poi";
import memosRouter from "./routes/memos";
import medicationRouter from "./routes/medication";
import smsRouter from "./routes/sms";
import ezvizRouter from "./routes/ezviz";
import healthDataRouter from "./routes/health-data";
import ocrRouter from "./routes/ocr";
import healthWarningRouter from "./routes/health-warning";
import schedulerRouter from "./routes/scheduler";
import pushNotificationsRouter from "./routes/push-notifications";
import huaweiHealthRouter from "./routes/huawei-health";
import legalRouter from "./routes/legal";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/bluetooth', bluetoothRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/video-calls', videoCallsRouter);
app.use('/api/v1/realtime', realtimeRouter);
app.use('/api/v1/weather', weatherRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/push', pushRouter);
app.use('/api/v1/asr', asrRouter);
app.use('/api/v1/agora', agoraRouter);
app.use('/api/v1/voice-assistant', voiceAssistantRouter);
app.use('/api/v1/devices', devicesRouter);
app.use('/api/v1/device-data', deviceDataRouter);
app.use('/api/v1/camera', cameraRouter);
app.use('/api/v1/fall-detection', fallDetectionRouter);
app.use('/api/v1/poi', poiRouter);
app.use('/api/v1/memos', memosRouter);
app.use('/api/v1/medication', medicationRouter);
app.use('/api/v1/sms', smsRouter);
app.use('/api/v1/ezviz', ezvizRouter);
app.use('/api/v1/health-data', healthDataRouter);
app.use('/api/v1/ocr', ocrRouter);
app.use('/api/v1/health-warning', healthWarningRouter);
app.use('/api/v1/scheduler', schedulerRouter);
app.use('/api/v1/push-notifications', pushNotificationsRouter);
app.use('/api/v1/huawei-health', huaweiHealthRouter);
app.use('/api/v1/legal', legalRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
  
  // 启动用药提醒定时任务（每分钟检查一次）
  startMedicationReminderScheduler();
  
  // 启动消息推送定时任务
  startMessagePushScheduler();
});

// 用药提醒定时任务
function startMedicationReminderScheduler() {
  console.log('[用药提醒] 定时任务已启动');
  
  // 每分钟检查一次
  setInterval(async () => {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      console.log(`[用药提醒] 检查时间: ${currentTime}`);
      
      // 调用触发接口
      const response = await fetch(`http://localhost:${port}/api/v1/medication/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTime }),
      });
      
      const result = await response.json() as { success: boolean; triggered: number };
      if (result.success && result.triggered > 0) {
        console.log(`[用药提醒] 已触发 ${result.triggered} 条提醒`);
      }
    } catch (error) {
      console.error('[用药提醒] 定时任务错误:', error);
    }
  }, 60000); // 每分钟
}

// 消息推送定时任务
function startMessagePushScheduler() {
  console.log('[消息推送] 定时任务已启动');
  
  // 立即运行一次（启动时）
  runMessagePushTasks();
  
  // 每小时运行一次
  setInterval(async () => {
    runMessagePushTasks();
  }, 60 * 60 * 1000); // 每小时
}

async function runMessagePushTasks() {
  try {
    const now = new Date();
    const hour = now.getHours();
    
    console.log(`[消息推送] 运行定时任务 - ${now.toISOString()}`);
    
    // 天气提醒：早上7-9点运行
    if (hour >= 7 && hour <= 9) {
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/scheduler/weather-reminder`);
        const data = await res.json() as { success: boolean; pushed: number };
        if (data.success && data.pushed > 0) {
          console.log(`[消息推送] 天气提醒推送了 ${data.pushed} 条`);
        }
      } catch (e) {
        console.error('[消息推送] 天气提醒失败:', e);
      }
    }
    
    // 早安推送：早上6-8点运行
    if (hour >= 6 && hour <= 8) {
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/scheduler/morning-greeting`);
        const data = await res.json() as { success: boolean; pushed: number };
        if (data.success && data.pushed > 0) {
          console.log(`[消息推送] 早安推送了 ${data.pushed} 条`);
        }
      } catch (e) {
        console.error('[消息推送] 早安推送失败:', e);
      }
    }
    
    // 晚安推送：晚上21-23点运行
    if (hour >= 21 && hour <= 23) {
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/scheduler/evening-greeting`);
        const data = await res.json() as { success: boolean; pushed: number };
        if (data.success && data.pushed > 0) {
          console.log(`[消息推送] 晚安推送了 ${data.pushed} 条`);
        }
      } catch (e) {
        console.error('[消息推送] 晚安推送失败:', e);
      }
    }
    
    // 节日提醒：每天早上8点运行
    if (hour === 8) {
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/scheduler/festival-reminder`);
        const data = await res.json() as { success: boolean; pushed: number };
        if (data.success && data.pushed > 0) {
          console.log(`[消息推送] 节日提醒推送了 ${data.pushed} 条`);
        }
      } catch (e) {
        console.error('[消息推送] 节日提醒失败:', e);
      }
      
      // 二十四节气提醒：每天早上8点运行
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/scheduler/solar-term-reminder`);
        const data = await res.json() as { success: boolean; pushed: number };
        if (data.success && data.pushed > 0) {
          console.log(`[消息推送] 节气提醒推送了 ${data.pushed} 条`);
        }
      } catch (e) {
        console.error('[消息推送] 节气提醒失败:', e);
      }
    }
    
    // 健康预警：每小时检查
    try {
      const res = await fetch(`http://localhost:${port}/api/v1/scheduler/health-warning`);
      const data = await res.json() as { success: boolean; pushed: number };
      if (data.success && data.pushed > 0) {
        console.log(`[消息推送] 健康预警推送了 ${data.pushed} 条`);
      }
    } catch (e) {
      console.error('[消息推送] 健康预警失败:', e);
    }
    
    // 设备告警：每小时检查
    try {
      const res = await fetch(`http://localhost:${port}/api/v1/scheduler/device-alert`);
      const data = await res.json() as { success: boolean; pushed: number };
      if (data.success && data.pushed > 0) {
        console.log(`[消息推送] 设备告警推送了 ${data.pushed} 条`);
      }
    } catch (e) {
      console.error('[消息推送] 设备告警失败:', e);
    }
  } catch (error) {
    console.error('[消息推送] 定时任务错误:', error);
  }
}
