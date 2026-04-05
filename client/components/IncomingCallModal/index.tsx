/**
 * 视频通话请求弹窗 - 全屏来电界面
 * 用于老人端接收通话请求
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Modal, Animated, Easing } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

interface IncomingCallModalProps {
  visible: boolean;
  callerName: string;
  sessionId: number | null;
  onAccept: (sessionId: number) => void;
  onReject: (sessionId: number) => void;
}

export function IncomingCallModal({
  visible,
  callerName,
  sessionId,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [ringAnim] = React.useState(new Animated.Value(1));
  const [pulseAnim] = React.useState(new Animated.Value(1));
  const countdownRef = useRef(60);

  // 响铃动画 - 缩放效果
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 脉冲动画 - 背景扩散效果
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 重置倒计时
      countdownRef.current = 60;
      
      // 60秒超时自动拒绝
      const timer = setInterval(() => {
        countdownRef.current -= 1;
        if (countdownRef.current <= 0) {
          if (sessionId) onReject(sessionId);
          clearInterval(timer);
        }
      }, 1000);

      return () => {
        clearInterval(timer);
        ringAnim.setValue(1);
        pulseAnim.setValue(1);
      };
    }
  }, [visible, sessionId, onReject, ringAnim, pulseAnim]);

  const handleAccept = useCallback(() => {
    if (sessionId) {
      onAccept(sessionId);
    }
  }, [sessionId, onAccept]);

  const handleReject = useCallback(() => {
    if (sessionId) {
      onReject(sessionId);
    }
  }, [sessionId, onReject]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* 背景脉冲效果 */}
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
        
        <View style={styles.container}>
          {/* 头部图标 */}
          <View style={styles.header}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: ringAnim }] }]}>
              <FontAwesome6 name="phone-volume" size={56} color="#ffffff" />
            </Animated.View>
          </View>

          {/* 信息 */}
          <View style={styles.infoSection}>
            <Text style={styles.title}>视频通话</Text>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.hint}>正在呼叫您...</Text>
          </View>

          {/* 按钮 */}
          <View style={styles.buttonsRow}>
            {/* 拒绝按钮 */}
            <TouchableOpacity style={styles.rejectButton} onPress={handleReject} activeOpacity={0.8}>
              <View style={styles.rejectIconCircle}>
                <FontAwesome6 name="phone-slash" size={40} color="#ffffff" />
              </View>
              <Text style={styles.rejectText}>拒绝</Text>
            </TouchableOpacity>

            {/* 接受按钮 */}
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.8}>
              <View style={styles.acceptIconCircle}>
                <FontAwesome6 name="video" size={40} color="#ffffff" />
              </View>
              <Text style={styles.acceptText}>接听</Text>
            </TouchableOpacity>
          </View>

          {/* 提示 */}
          <Text style={styles.timeoutHint}>60秒后自动拒绝</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.sm,
  },
  callerName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  hint: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  rejectButton: {
    alignItems: 'center',
  },
  rejectIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  rejectText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    alignItems: 'center',
  },
  acceptIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4CAF50',
  },
  timeoutHint: {
    marginTop: Spacing['2xl'],
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

export default IncomingCallModal;
