/**
 * 跌倒告警弹窗组件 - 监护人端
 * 显示跌倒告警详情，包括设备名称、时间、建议操作等
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface FallAlert {
  alertId: string;
  deviceName: string;
  deviceId?: string;
  title: string;
  message: string;
  isEmergency: boolean;
  timestamp: string;
}

interface FallAlertModalProps {
  visible: boolean;
  alert: FallAlert | null;
  onClose: () => void;
  onViewCamera?: (deviceId: string, deviceName: string) => void;
}

export function FallAlertModal({ visible, alert, onClose, onViewCamera }: FallAlertModalProps) {
  const { theme } = useTheme();

  if (!alert) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundDefault }]}>
          {/* 头部 */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <FontAwesome6 name="person-falling" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.subtitle}>检测到异常情况</Text>
          </View>

          {/* 内容 */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 告警信息卡片 */}
            <View style={[styles.infoCard, { backgroundColor: theme.backgroundTertiary }]}>
              <View style={styles.infoRow}>
                <FontAwesome6 name="video" size={16} color={theme.primary} />
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>设备</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{alert.deviceName}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <FontAwesome6 name="clock" size={16} color={theme.primary} />
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>时间</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{formatTime(alert.timestamp)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <FontAwesome6 name="triangle-exclamation" size={16} color={alert.isEmergency ? '#e74c3c' : theme.warning} />
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>级别</Text>
                <Text style={[styles.infoValue, { color: alert.isEmergency ? '#e74c3c' : theme.textPrimary }]}>
                  {alert.isEmergency ? '紧急' : '一般'}
                </Text>
              </View>
            </View>

            {/* 告警详情 */}
            <View style={styles.detailSection}>
              <Text style={[styles.detailTitle, { color: theme.textSecondary }]}>告警详情</Text>
              <Text style={[styles.detailText, { color: theme.textPrimary }]}>{alert.message}</Text>
            </View>

            {/* 建议操作 */}
            <View style={styles.suggestionSection}>
              <Text style={[styles.suggestionTitle, { color: theme.textSecondary }]}>建议操作</Text>
              <View style={styles.suggestionItem}>
                <FontAwesome6 name="phone" size={14} color={theme.success} />
                <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>
                  立即联系老人确认情况
                </Text>
              </View>
              <View style={styles.suggestionItem}>
                <FontAwesome6 name="video" size={14} color={theme.primary} />
                <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>
                  打开摄像头查看实时画面
                </Text>
              </View>
              <View style={styles.suggestionItem}>
                <FontAwesome6 name="house-chimney-medical" size={14} color="#e74c3c" />
                <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>
                  如无法联系，请尽快前往查看或联系急救
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* 底部按钮 */}
          <View style={styles.footer}>
            {/* 查看摄像头按钮 */}
            {alert?.deviceId && onViewCamera && (
              <TouchableOpacity
                style={[styles.cameraButton]}
                onPress={() => onViewCamera(alert.deviceId!, alert.deviceName)}
              >
                <FontAwesome6 name="video" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.cameraButtonText}>查看摄像头</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={onClose}
            >
              <FontAwesome6 name="check" size={16} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>我已知晓</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    backgroundColor: '#e74c3c',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    maxHeight: 350,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: Spacing.xs,
  },
  detailSection: {
    marginBottom: Spacing.lg,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
  },
  suggestionSection: {
    marginBottom: Spacing.lg,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  suggestionText: {
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    gap: Spacing.sm,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#4A90D9',
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
