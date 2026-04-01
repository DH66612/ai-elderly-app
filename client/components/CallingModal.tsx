/**
 * 呼叫中弹窗组件
 * 显示视频通话呼叫状态，等待对方接听
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

interface CallingModalProps {
  visible: boolean;
  calleeName: string;
  onCancel: () => void;
}

export function CallingModal({ visible, calleeName, onCancel }: CallingModalProps) {
  // 使用useState存储动画值，避免在render时访问ref.current
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [ringAnim1] = useState(() => new Animated.Value(0));
  const [ringAnim2] = useState(() => new Animated.Value(0));

  // 呼叫动画
  useEffect(() => {
    if (visible) {
      // 脉冲动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 波纹动画1
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim1, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 波纹动画2（延迟）
      const timer = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(ringAnim2, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(ringAnim2, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, 750);

      return () => clearTimeout(timer);
    }
  }, [visible, pulseAnim, ringAnim1, ringAnim2]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 波纹效果 */}
          <View style={styles.ringContainer}>
            <Animated.View
              style={[
                styles.ring,
                {
                  opacity: ringAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  }),
                  transform: [
                    {
                      scale: ringAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                {
                  opacity: ringAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  }),
                  transform: [
                    {
                      scale: ringAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View style={[styles.avatar, { transform: [{ scale: pulseAnim }] }]}>
              <FontAwesome6 name="user" size={48} color="#ffffff" />
            </Animated.View>
          </View>

          {/* 文字 */}
          <Text style={styles.title}>正在呼叫</Text>
          <Text style={styles.name}>{calleeName}</Text>
          <Text style={styles.subtitle}>等待对方接听...</Text>

          {/* 取消按钮 */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
            <View style={styles.cancelIcon}>
              <FontAwesome6 name="phone-slash" size={24} color="#ffffff" />
            </View>
            <Text style={styles.cancelText}>取消呼叫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  ringContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#8ab3cf',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8ab3cf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8ab3cf',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 40,
  },
  cancelButton: {
    alignItems: 'center',
  },
  cancelIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e08b8b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
