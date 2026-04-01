/**
 * 编辑个人资料页面 - 区分监护人和老人
 * 监护人：基本信息 + 父母信息 + 备用紧急联系人
 * 老人：基本信息 + 健康情况 + 生活环境
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { createStyles, colors } from './styles';
import { GuardianBackground } from '@/components/GuardianBackground';
import { HEALTH_CONDITIONS_MAP, LIVING_CONDITIONS_MAP, UserRole } from '@/constants/roles';

// 老人 - 健康状态单选项
const HEALTH_STATUS_OPTIONS = [
  { value: 'healthy', label: '健康' },
  { value: 'chronic', label: '慢性病' },
  { value: 'recovery', label: '康复中' },
  { value: 'other', label: '其他' },
];

// 老人 - 居住情况单选项
const LIVING_STATUS_OPTIONS = [
  { value: 'alone', label: '独居' },
  { value: 'with_family', label: '与家人同住' },
  { value: 'nursing_home', label: '养老院' },
  { value: 'other', label: '其他' },
];

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, updateUser } = useAuth();

  const isGuardian = user?.role === UserRole.GUARDIAN;

  // 基本信息表单
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || user?.homeAddress || '');
  
  // 监护人专属字段
  const [fatherName, setFatherName] = useState(user?.father_name || '');
  const [fatherPhone, setFatherPhone] = useState(user?.father_phone || '');
  const [motherName, setMotherName] = useState(user?.mother_name || '');
  const [motherPhone, setMotherPhone] = useState(user?.mother_phone || '');
  const [backupContactName, setBackupContactName] = useState(user?.backup_contact_name || '');
  const [backupContactPhone, setBackupContactPhone] = useState(user?.backup_contact_phone || '');
  const [backupContactRelation, setBackupContactRelation] = useState(user?.backup_contact_relation || '');
  
  // 老人专属字段
  const [healthCondition, setHealthCondition] = useState(user?.health_condition || 'healthy');
  const [healthNotes, setHealthNotes] = useState(user?.health_notes || '');
  const [healthConditions, setHealthConditions] = useState<string[]>(user?.healthConditions || []);
  const [livingEnvironment, setLivingEnvironment] = useState(user?.living_environment || 'with_family');
  const [livingConditions, setLivingConditions] = useState<string[]>(user?.livingConditions || []);
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyPhone || '');

  const [loading, setLoading] = useState(false);

  // 切换身体状况标签
  const toggleHealthCondition = (value: string) => {
    setHealthConditions(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  // 切换环境标签
  const toggleLivingCondition = (value: string) => {
    setLivingConditions(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    setLoading(true);
    try {
      // 构建请求体
      const body: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        home_address: address.trim(),
      };

      if (isGuardian) {
        // 监护人专属字段
        body.father_name = fatherName.trim();
        body.father_phone = fatherPhone.trim();
        body.mother_name = motherName.trim();
        body.mother_phone = motherPhone.trim();
        body.backup_contact_name = backupContactName.trim();
        body.backup_contact_phone = backupContactPhone.trim();
        body.backup_contact_relation = backupContactRelation.trim();
      } else {
        // 老人专属字段
        body.health_condition = healthCondition;
        body.health_notes = healthNotes.trim();
        body.health_conditions = healthConditions;
        body.living_environment = livingEnvironment;
        body.living_conditions = livingConditions;
        body.emergency_contact = emergencyContact.trim();
        body.emergency_phone = emergencyPhone.trim();
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${user?.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        Alert.alert('成功', '个人资料已更新', [
          { text: '确定', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // 渲染单选组
  const renderRadioGroup = (
    options: { value: string; label: string }[],
    value: string,
    onChange: (val: string) => void
  ) => (
    <View style={styles.radioGroup}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.radioItem, value === option.value && styles.radioItemActive]}
          onPress={() => onChange(option.value)}
        >
          <View style={[styles.radioCircle, value === option.value && styles.radioCircleActive]}>
            {value === option.value && <View style={styles.radioDot} />}
          </View>
          <Text style={[styles.radioLabel, value === option.value && styles.radioLabelActive]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染多选标签组
  const renderMultiSelectTags = (
    optionsMap: Record<string, string>,
    selectedValues: string[],
    onToggle: (value: string) => void
  ) => (
    <View style={styles.tagsContainer}>
      {Object.entries(optionsMap).map(([value, label]) => (
        <TouchableOpacity
          key={value}
          style={[styles.tagItem, selectedValues.includes(value) && styles.tagItemActive]}
          onPress={() => onToggle(value)}
        >
          <Text style={[styles.tagLabel, selectedValues.includes(value) && styles.tagLabelActive]}>
            {label}
          </Text>
          {selectedValues.includes(value) && (
            <FontAwesome6 name="check" size={10} color={colors.white} style={styles.tagCheck} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染监护人专属表单
  const renderGuardianForm = () => (
    <>
      {/* 父母信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>父母信息</Text>
        <View style={styles.formCard}>
          {/* 父亲 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>父亲姓名</Text>
            <TextInput
              style={styles.formInput}
              value={fatherName}
              onChangeText={setFatherName}
              placeholder="请输入父亲姓名"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>父亲电话</Text>
            <TextInput
              style={styles.formInput}
              value={fatherPhone}
              onChangeText={setFatherPhone}
              placeholder="请输入父亲电话"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
          
          {/* 分隔 */}
          <View style={styles.sectionDivider} />
          
          {/* 母亲 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>母亲姓名</Text>
            <TextInput
              style={styles.formInput}
              value={motherName}
              onChangeText={setMotherName}
              placeholder="请输入母亲姓名"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>母亲电话</Text>
            <TextInput
              style={styles.formInput}
              value={motherPhone}
              onChangeText={setMotherPhone}
              placeholder="请输入母亲电话"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
        </View>
      </View>

      {/* 备用紧急联系人 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>备用紧急联系人</Text>
        <View style={styles.formCard}>
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>联系人姓名</Text>
            <TextInput
              style={styles.formInput}
              value={backupContactName}
              onChangeText={setBackupContactName}
              placeholder="请输入联系人姓名"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>联系人电话</Text>
            <TextInput
              style={styles.formInput}
              value={backupContactPhone}
              onChangeText={setBackupContactPhone}
              placeholder="请输入联系人电话"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>与本人关系</Text>
            <TextInput
              style={styles.formInput}
              value={backupContactRelation}
              onChangeText={setBackupContactRelation}
              placeholder="如：兄弟、姐妹、朋友等"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </View>
    </>
  );

  // 渲染老人专属表单
  const renderElderlyForm = () => (
    <>
      {/* 健康状况 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>健康状况</Text>
        <View style={styles.formCard}>
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>健康状态</Text>
            {renderRadioGroup(HEALTH_STATUS_OPTIONS, healthCondition, setHealthCondition)}
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>身体状况标签（可多选）</Text>
            {renderMultiSelectTags(HEALTH_CONDITIONS_MAP, healthConditions, toggleHealthCondition)}
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>健康备注</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={healthNotes}
              onChangeText={setHealthNotes}
              placeholder="请输入健康备注信息，如慢性病史、过敏史等"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* 生活环境 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>生活环境</Text>
        <View style={styles.formCard}>
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>居住情况</Text>
            {renderRadioGroup(LIVING_STATUS_OPTIONS, livingEnvironment, setLivingEnvironment)}
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>环境标签（可多选）</Text>
            {renderMultiSelectTags(LIVING_CONDITIONS_MAP, livingConditions, toggleLivingCondition)}
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>紧急联系人</Text>
            <TextInput
              style={styles.formInput}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="请输入紧急联系人姓名"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>紧急联系电话</Text>
            <TextInput
              style={styles.formInput}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="请输入紧急联系电话"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
        </View>
      </View>
    </>
  );

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* 顶部导航栏 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
              <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>个人资料</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 头像区域 */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <FontAwesome6 name="user" size={48} color={colors.primary} />
              </View>
              <TouchableOpacity style={styles.changeAvatarButton}>
                <Text style={styles.changeAvatarText}>更换头像</Text>
              </TouchableOpacity>
            </View>

            {/* 基本信息 - 所有角色都有 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>基本信息</Text>
              <View style={styles.formCard}>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>姓名</Text>
                  <TextInput
                    style={styles.formInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="请输入姓名"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>手机号</Text>
                  <TextInput
                    style={styles.formInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="请输入手机号"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>居住地址</Text>
                  <TextInput
                    style={styles.formInput}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="请输入居住地址"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* 角色专属表单 */}
            {isGuardian ? renderGuardianForm() : renderElderlyForm()}

            {/* 底部留白 */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* 底部按钮 */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>{loading ? '保存中...' : '保存'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
