/**
 * 来电视频通话弹窗组件
 * 显示来电信息，支持接听和拒绝
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

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
  onReject 
}: IncomingCallModalProps) {
  // 动画值
  const [ringAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // 来电铃声动画
  useEffect(() => {
    if (visible) {
      // 铃声抖动动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: -1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 脉冲动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, ringAnim, pulseAnim]);

  const handleAccept = () => {
    if (sessionId !== null) {
      onAccept(sessionId);
    }
  };

  const handleReject = () => {
    if (sessionId !== null) {
      onReject(sessionId);
    }
  };

  if (!visible || sessionId === null) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleReject}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 铃声图标 */}
          <Animated.View 
            style={[
              styles.ringIcon,
              {
                transform: [
                  { 
                    rotate: ringAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ['-20deg', '20deg'],
                    }) 
                  }
                ]
              }
            ]}
          >
            <FontAwesome6 name="bell" size={48} color="#fff" />
          </Animated.View>

          {/* 来电信息 */}
          <Text style={styles.title}>视频通话来电</Text>
          <Animated.View style={[styles.callerNameContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.callerName}>{callerName}</Text>
          </Animated.View>
          <Text style={styles.subtitle}>邀请您进行视频通话</Text>

          {/* 操作按钮 */}
          <View style={styles.buttonsContainer}>
            {/* 拒绝按钮 */}
            <TouchableOpacity style={styles.rejectButton} onPress={handleReject} activeOpacity={0.8}>
              <View style={styles.rejectIcon}>
                <FontAwesome6 name="phone-slash" size={28} color="#fff" />
              </View>
              <Text style={styles.rejectText}>拒绝</Text>
            </TouchableOpacity>

            {/* 接听按钮 */}
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.8}>
              <View style={styles.acceptIcon}>
                <FontAwesome6 name="phone" size={28} color="#fff" />
              </View>
              <Text style={styles.acceptText}>接听</Text>
            </TouchableOpacity>
          </View>
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
  container: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  ringIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8ab3cf',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  callerNameContainer: {
    backgroundColor: '#8ab3cf',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 12,
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 50,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
  },
  rejectButton: {
    alignItems: 'center',
  },
  rejectIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e08b8b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rejectText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  acceptButton: {
    alignItems: 'center',
  },
  acceptIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#5a8a7a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
