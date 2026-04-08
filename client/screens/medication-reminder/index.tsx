/**
 * 用药提醒页面 - 监护人端
 * 为老人设置用药闹钟提醒
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { PageHeader } from '@/components/PageHeader';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#9aa9b7',
  border: '#d6e4f0',
  success: '#5cb85c',
  danger: '#d9534f',
  warning: '#f0ad4e',
  white: '#ffffff',
};

interface MedicationReminder {
  id: number;
  medicineName: string;
  dosage: string;
  time: string;
  frequency: 'daily' | 'weekly' | 'custom';
  days?: number[];
  notes?: string;
  isActive: boolean;
}

export default function MedicationReminderScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MedicationReminder | null>(null);
  const [form, setForm] = useState({
    medicineName: '',
    dosage: '',
    hour: '08',
    minute: '00',
    frequency: 'daily' as 'daily' | 'weekly' | 'custom',
    notes: '',
  });

  const elderId = user?.boundUserId;
  const guardianId = user?.id;
  const elderName = user?.boundUserName || '老人';

  // 加载提醒数据
  const loadReminders = useCallback(async () => {
    if (!elderId) return;

    try {
      setLoading(true);
      /**
       * 服务端文件：server/src/routes/medication.ts
       * 接口：GET /api/v1/medication/reminders/:elderId
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/medication/reminders/${elderId}`
      );
      const result = await response.json();

      if (result.success) {
        const formattedData = (result.data || []).map((item: any) => ({
          id: item.id,
          medicineName: item.medicine_name,
          dosage: item.dosage,
          time: item.reminder_time,
          frequency: item.frequency,
          days: item.days,
          notes: item.notes,
          isActive: item.is_active,
        }));
        setReminders(formattedData);
      }
    } catch (error) {
      console.error('[用药提醒] 加载失败:', error);
    } finally {
      setLoading(false);
    }
  }, [elderId]);

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [loadReminders])
  );

  // 打开新增/编辑弹窗
  const handleAdd = () => {
    setEditingReminder(null);
    setForm({
      medicineName: '',
      dosage: '',
      hour: '08',
      minute: '00',
      frequency: 'daily',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (reminder: MedicationReminder) => {
    setEditingReminder(reminder);
    const [hour, minute] = reminder.time.split(':');
    // 将分钟四舍五入到最近的15分钟间隔
    const minuteNum = parseInt(minute || '0', 10);
    const roundedMinute = Math.round(minuteNum / 15) * 15;
    const adjustedMinute = roundedMinute === 60 ? 45 : roundedMinute;
    
    setForm({
      medicineName: reminder.medicineName,
      dosage: reminder.dosage,
      hour: hour || '08',
      minute: adjustedMinute.toString().padStart(2, '0'),
      frequency: reminder.frequency,
      notes: reminder.notes || '',
    });
    setModalVisible(true);
  };

  // 保存提醒
  const handleSave = async () => {
    if (!form.medicineName.trim()) {
      Alert.alert('提示', '请输入药品名称');
      return;
    }
    if (!form.dosage.trim()) {
      Alert.alert('提示', '请输入服用剂量');
      return;
    }
    if (!elderId || !guardianId) {
      Alert.alert('提示', '请先绑定老人');
      return;
    }

    setSaving(true);
    const time = `${form.hour.padStart(2, '0')}:${form.minute.padStart(2, '0')}`;
    
    try {
      if (editingReminder) {
        // 编辑
        /**
         * 服务端文件：server/src/routes/medication.ts
         * 接口：PUT /api/v1/medication/reminders/:id
         * Body 参数：medicineName, dosage, reminderTime, frequency, notes, isActive
         */
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/medication/reminders/${editingReminder.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              medicineName: form.medicineName,
              dosage: form.dosage,
              reminderTime: time,
              frequency: form.frequency,
              notes: form.notes,
            }),
          }
        );
        const result = await response.json();
        if (result.success) {
          loadReminders();
          Alert.alert('成功', '用药提醒已更新');
        } else {
          Alert.alert('失败', result.error || '更新失败');
        }
      } else {
        // 新增
        /**
         * 服务端文件：server/src/routes/medication.ts
         * 接口：POST /api/v1/medication/reminders
         * Body 参数：elderId, guardianId, medicineName, dosage, reminderTime, frequency, notes
         */
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/medication/reminders`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              elderId,
              guardianId,
              medicineName: form.medicineName,
              dosage: form.dosage,
              reminderTime: time,
              frequency: form.frequency,
              notes: form.notes,
            }),
          }
        );
        const result = await response.json();
        if (result.success) {
          loadReminders();
          Alert.alert('成功', '用药提醒已添加');
        } else {
          Alert.alert('失败', result.error || '添加失败');
        }
      }

      setModalVisible(false);
    } catch (error) {
      console.error('[用药提醒] 保存失败:', error);
      Alert.alert('失败', '网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 切换提醒开关
  const handleToggle = async (reminder: MedicationReminder) => {
    try {
      /**
       * 服务端文件：server/src/routes/medication.ts
       * 接口：PUT /api/v1/medication/reminders/:id
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/medication/reminders/${reminder.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !reminder.isActive }),
        }
      );
      const result = await response.json();
      if (result.success) {
        setReminders(prev => prev.map(r => 
          r.id === reminder.id ? { ...r, isActive: !r.isActive } : r
        ));
      }
    } catch (error) {
      console.error('[用药提醒] 切换状态失败:', error);
    }
  };

  // 删除提醒
  const handleDelete = (reminder: MedicationReminder) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个用药提醒吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: async () => {
            try {
              /**
               * 服务端文件：server/src/routes/medication.ts
               * 接口：DELETE /api/v1/medication/reminders/:id
               */
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/medication/reminders/${reminder.id}`,
                { method: 'DELETE' }
              );
              const result = await response.json();
              if (result.success) {
                setReminders(prev => prev.filter(r => r.id !== reminder.id));
              }
            } catch (error) {
              console.error('[用药提醒] 删除失败:', error);
            }
          }
        },
      ]
    );
  };

  // 时间选择器 - 使用网格按钮
  const renderTimePicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45']; // 简化为15分钟间隔

    return (
      <View style={styles.timePickerContainer}>
        {/* 小时选择 */}
        <View style={styles.timeSection}>
          <ThemedText variant="smallMedium" color={colors.textMuted}>选择小时</ThemedText>
          <View style={styles.timeGrid}>
            {hours.map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.timeGridItem, form.hour === h && styles.timeGridItemActive]}
                onPress={() => setForm(f => ({ ...f, hour: h }))}
              >
                <Text style={[styles.timeGridText, form.hour === h && styles.timeGridTextActive]}>
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 分钟选择 */}
        <View style={styles.timeSection}>
          <ThemedText variant="smallMedium" color={colors.textMuted}>选择分钟</ThemedText>
          <View style={styles.minuteGrid}>
            {minutes.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.minuteItem, form.minute === m && styles.minuteItemActive]}
                onPress={() => setForm(f => ({ ...f, minute: m }))}
              >
                <Text style={[styles.minuteText, form.minute === m && styles.minuteTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 当前选择显示 */}
        <View style={styles.selectedTimeDisplay}>
          <FontAwesome6 name="clock" size={16} color={colors.primary} />
          <Text style={styles.selectedTimeText}>
            已选择: {form.hour}:{form.minute}
          </Text>
        </View>
      </View>
    );
  };

  const styles = createStyles();

  if (!elderId) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <PageHeader
          title="用药提醒"
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textMuted}
        />
        <View style={styles.emptyState}>
          <FontAwesome6 name="link-slash" size={48} color={colors.textMuted} />
          <ThemedText variant="bodyMedium" color={colors.textSecondary} style={{ marginTop: Spacing.lg }}>
            请先绑定老人账号
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 页面标题 */}
        <PageHeader
          title="用药提醒"
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textMuted}
          rightContent={
            <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
              <FontAwesome6 name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
          }
        />

        {/* 老人信息 */}
        <View style={styles.elderInfo}>
          <FontAwesome6 name="user" size={18} color={colors.primary} />
          <ThemedText variant="body" color={colors.textSecondary}>
            为 <ThemedText variant="bodyMedium" color={colors.textPrimary}>{elderName}</ThemedText> 设置用药提醒
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 提醒列表 */}
            {reminders.length > 0 ? (
              reminders.map(reminder => (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderHeader}>
                    <View style={styles.reminderLeft}>
                      <View style={[styles.timeBadge, !reminder.isActive && styles.timeBadgeInactive]}>
                        <FontAwesome6 name="clock" size={14} color={reminder.isActive ? colors.primary : colors.textMuted} />
                        <Text style={[styles.timeText, !reminder.isActive && styles.timeTextInactive]}>
                          {reminder.time}
                        </Text>
                      </View>
                      <View style={styles.reminderInfo}>
                        <ThemedText variant="bodyMedium" color={reminder.isActive ? colors.textPrimary : colors.textMuted}>
                          {reminder.medicineName}
                        </ThemedText>
                        <ThemedText variant="small" color={colors.textSecondary}>
                          {reminder.dosage} · {reminder.frequency === 'daily' ? '每天' : '每周'}
                        </ThemedText>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleSwitch, reminder.isActive && styles.toggleSwitchActive]}
                      onPress={() => handleToggle(reminder)}
                    >
                      <View style={[styles.toggleThumb, reminder.isActive && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.reminderActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleEdit(reminder)}
                    >
                      <FontAwesome6 name="pen" size={14} color={colors.primary} />
                      <ThemedText variant="small" color={colors.primary}>编辑</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDelete(reminder)}
                    >
                      <FontAwesome6 name="trash" size={14} color={colors.danger} />
                      <ThemedText variant="small" color={colors.danger}>删除</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome6 name="pills" size={64} color={colors.textMuted} />
                <ThemedText variant="bodyMedium" color={colors.textSecondary} style={{ marginTop: Spacing.lg }}>
                  暂无用药提醒
                </ThemedText>
                <ThemedText variant="small" color={colors.textMuted}>
                  点击右上角 + 添加提醒
                </ThemedText>
              </View>
            )}

            {/* 说明 */}
            <View style={styles.tipsCard}>
              <FontAwesome6 name="circle-info" size={16} color={colors.primary} />
              <View style={styles.tipsContent}>
                <ThemedText variant="smallMedium" color={colors.textPrimary}>温馨提示</ThemedText>
                <ThemedText variant="small" color={colors.textSecondary}>
                  设置后，老人端将在指定时间收到用药提醒通知，请确保老人端通知权限已开启。
                </ThemedText>
              </View>
            </View>
          </ScrollView>
        )}

        {/* 新增/编辑弹窗 */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h4" color={colors.textPrimary}>
                  {editingReminder ? '编辑提醒' : '新增提醒'}
                </ThemedText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* 药品名称 */}
                <View style={styles.formField}>
                  <ThemedText variant="smallMedium" color={colors.textPrimary}>药品名称 *</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="例如：降压药"
                    placeholderTextColor={colors.textMuted}
                    value={form.medicineName}
                    onChangeText={(text) => setForm(f => ({ ...f, medicineName: text }))}
                  />
                </View>

                {/* 服用剂量 */}
                <View style={styles.formField}>
                  <ThemedText variant="smallMedium" color={colors.textPrimary}>服用剂量 *</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="例如：1片"
                    placeholderTextColor={colors.textMuted}
                    value={form.dosage}
                    onChangeText={(text) => setForm(f => ({ ...f, dosage: text }))}
                  />
                </View>

                {/* 提醒时间 */}
                <View style={styles.formField}>
                  <ThemedText variant="smallMedium" color={colors.textPrimary}>提醒时间</ThemedText>
                  {renderTimePicker()}
                </View>

                {/* 重复频率 */}
                <View style={styles.formField}>
                  <ThemedText variant="smallMedium" color={colors.textPrimary}>重复频率</ThemedText>
                  <View style={styles.frequencyRow}>
                    {[
                      { value: 'daily', label: '每天' },
                      { value: 'weekly', label: '每周' },
                      { value: 'custom', label: '自定义' },
                    ].map(item => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.frequencyOption,
                          form.frequency === item.value && styles.frequencyOptionActive,
                        ]}
                        onPress={() => setForm(f => ({ ...f, frequency: item.value as any }))}
                      >
                        <Text style={[
                          styles.frequencyText,
                          form.frequency === item.value && styles.frequencyTextActive,
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 备注 */}
                <View style={styles.formField}>
                  <ThemedText variant="smallMedium" color={colors.textPrimary}>备注（选填）</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="例如：饭后服用"
                    placeholderTextColor={colors.textMuted}
                    value={form.notes}
                    onChangeText={(text) => setForm(f => ({ ...f, notes: text }))}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <ThemedText variant="body" color={colors.textSecondary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <ThemedText variant="bodyMedium" color={colors.white}>保存</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: { flex: 1 },
    addButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    elderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing['4xl'],
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 提醒卡片
    reminderCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reminderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reminderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    timeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(138, 179, 207, 0.15)',
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    timeBadgeInactive: {
      backgroundColor: colors.backgroundTertiary,
    },
    timeText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
      marginLeft: Spacing.xs,
    },
    timeTextInactive: {
      color: colors.textMuted,
    },
    reminderInfo: {
      marginLeft: Spacing.md,
      flex: 1,
    },
    
    // 开关
    toggleSwitch: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      padding: 2,
      justifyContent: 'center',
    },
    toggleSwitchActive: {
      backgroundColor: colors.success,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.white,
    },
    toggleThumbActive: {
      alignSelf: 'flex-end',
    },
    
    // 操作按钮
    reminderActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: Spacing.lg,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    // 空状态
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['3xl'],
    },

    // 提示卡片
    tipsCard: {
      flexDirection: 'row',
      backgroundColor: 'rgba(138, 179, 207, 0.1)',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
    },
    tipsContent: {
      marginLeft: Spacing.sm,
      flex: 1,
    },

    // 弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.white,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalBody: {
      padding: Spacing.lg,
      maxHeight: 450,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
    },
    saveButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
    },

    // 表单
    formField: {
      marginBottom: Spacing.lg,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      marginTop: Spacing.xs,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },

    // 时间选择器
    timePickerContainer: {
      marginTop: Spacing.sm,
    },
    timeSection: {
      marginBottom: Spacing.md,
    },
    timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: Spacing.sm,
      gap: 6,
    },
    timeGridItem: {
      width: 40,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    timeGridItemActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeGridText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timeGridTextActive: {
      color: colors.white,
      fontWeight: '600',
    },
    minuteGrid: {
      flexDirection: 'row',
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    minuteItem: {
      flex: 1,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    minuteItemActive: {
      backgroundColor: 'rgba(138, 179, 207, 0.2)',
      borderColor: colors.primary,
    },
    minuteText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    minuteTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    selectedTimeDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      backgroundColor: 'rgba(138, 179, 207, 0.1)',
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    selectedTimeText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
    },

    // 频率选择
    frequencyRow: {
      flexDirection: 'row',
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    frequencyOption: {
      flex: 1,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    frequencyOptionActive: {
      backgroundColor: 'rgba(138, 179, 207, 0.2)',
      borderColor: colors.primary,
    },
    frequencyText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    frequencyTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
