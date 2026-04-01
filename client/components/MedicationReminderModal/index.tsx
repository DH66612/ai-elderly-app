/**
 * 用药提醒全屏弹窗 - 老人端
 * 类似视频通话的全屏提醒界面
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Modal, Animated, Easing, Vibration } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

interface MedicationReminderModalProps {
  visible: boolean;
  medicineName: string;
  dosage: string;
  time: string;
  notes?: string;
  message: string;
  onConfirm: () => void;
  onSnooze: () => void;
}

export function MedicationReminderModal({
  visible,
  medicineName,
  dosage,
  time,
  notes,
  message,
  onConfirm,
  onSnooze,
}: MedicationReminderModalProps) {
  const [pulseAnim] = React.useState(new Animated.Value(1));
  const [ringAnim] = React.useState(new Animated.Value(1));
  const vibrationRef = useRef<NodeJS.Timeout | null>(null);

  // 脉冲动画
  useEffect(() => {
    if (visible) {
      // 开始动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 图标缩放动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 振动提醒
      const startVibration = () => {
        Vibration.vibrate([500, 1000, 500, 1000, 500, 1000], true);
      };
      startVibration();

      // 30秒后自动停止振动
      vibrationRef.current = setTimeout(() => {
        Vibration.cancel();
      }, 30000);

      return () => {
        pulseAnim.setValue(1);
        ringAnim.setValue(1);
        Vibration.cancel();
        if (vibrationRef.current) {
          clearTimeout(vibrationRef.current);
        }
      };
    }
  }, [visible, pulseAnim, ringAnim]);

  const handleConfirm = useCallback(() => {
    Vibration.cancel();
    onConfirm();
  }, [onConfirm]);

  const handleSnooze = useCallback(() => {
    Vibration.cancel();
    onSnooze();
  }, [onSnooze]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* 背景脉冲效果 */}
        <Animated.View 
          style={[
            styles.pulseCircle, 
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        <Animated.View 
          style={[
            styles.pulseCircle2, 
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        
        <View style={styles.container}>
          {/* 头部图标 */}
          <View style={styles.header}>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: ringAnim }] }]}>
              <FontAwesome6 name="pills" size={64} color="#ffffff" />
            </Animated.View>
          </View>

          {/* 信息 */}
          <View style={styles.infoSection}>
            <Text style={styles.title}>💊 用药提醒</Text>
            <Text style={styles.medicineName}>{medicineName}</Text>
            <View style={styles.dosageBadge}>
              <FontAwesome6 name="syringe" size={16} color="#fff" />
              <Text style={styles.dosageText}>{dosage}</Text>
            </View>
            <View style={styles.timeRow}>
              <FontAwesome6 name="clock" size={18} color="#FF9500" />
              <Text style={styles.timeText}>{time}</Text>
            </View>
            {notes && (
              <Text style={styles.notes}>{notes}</Text>
            )}
          </View>

          {/* 提示消息 */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>

          {/* 按钮 */}
          <View style={styles.buttonsRow}>
            {/* 稍后提醒 */}
            <TouchableOpacity style={styles.snoozeButton} onPress={handleSnooze} activeOpacity={0.8}>
              <View style={styles.snoozeIconCircle}>
                <FontAwesome6 name="clock" size={36} color="#ffffff" />
              </View>
              <Text style={styles.snoozeText}>稍后提醒</Text>
            </TouchableOpacity>

            {/* 已服用 */}
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
              <View style={styles.confirmIconCircle}>
                <FontAwesome6 name="check" size={40} color="#ffffff" />
              </View>
              <Text style={styles.confirmText}>已服用</Text>
            </TouchableOpacity>
          </View>

          {/* 提示 */}
          <Text style={styles.hint}>请按时服药，保持健康</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 149, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  pulseCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.md,
  },
  medicineName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  dosageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dosageText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#ffffff',
  },
  notes: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing['2xl'],
  },
  messageText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  snoozeButton: {
    alignItems: 'center',
  },
  snoozeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  snoozeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButton: {
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default MedicationReminderModal;
