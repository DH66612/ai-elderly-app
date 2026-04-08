/**
 * Agora声网Token生成服务
 * 用于实时音视频通话
 */
import AgoraAccessToken from 'agora-access-token';

const { RtcTokenBuilder, RtcRole } = AgoraAccessToken;

// Agora配置（从环境变量读取）
const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

/**
 * 生成RTC Token
 * @param channelName 频道名称
 * @param uid 用户ID（0表示使用字符串uid）
 * @param role 角色（发布者/订阅者）
 * @param expireTimeInSeconds 过期时间（秒），默认24小时
 * @returns RTC Token
 */
export function generateRtcToken(
  channelName: string,
  uid: number | string,
  role: 'publisher' | 'subscriber' = 'publisher',
  expireTimeInSeconds: number = 86400
): string {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('Agora配置缺失：请检查AGORA_APP_ID和AGORA_APP_CERTIFICATE环境变量');
  }

  // 当前时间戳
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // 过期时间戳
  const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;

  // 角色转换
  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  // 生成Token
  let token: string;
  if (typeof uid === 'string') {
    // 字符串UID
    token = RtcTokenBuilder.buildTokenWithAccount(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs
    );
  } else {
    // 数字UID
    token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs
    );
  }

  return token;
}

/**
 * 获取Agora配置信息
 */
export function getAgoraConfig() {
  return {
    appId: APP_ID,
    // 注意：certificate不在前端暴露
  };
}

export { APP_ID };
