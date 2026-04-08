/**
 * 注册页面 - 区分老人端和监护人端（无验证码）
 * 老人端：基本信息 + 家庭地址 + 家人电话 + 身体状况/生活环境标签（选填）
 * 监护人端：基本信息 + 父母信息（选填）+ 备用紧急联系人（选填）
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { UserRole } from '@/constants/roles';
import { createStyles } from './styles';
import { HeartMeteors } from '@/components/HeartMeteors';
import { getApiBaseUrl } from '@/constants/api';

// 老人端 - 身体状况标签选项
const HEALTH_CONDITIONS = [
  { id: 'hypertension', label: '高血压' },
  { id: 'diabetes', label: '糖尿病' },
  { id: 'heart_disease', label: '心脏病' },
  { id: 'arthritis', label: '关节炎' },
  { id: 'asthma', label: '哮喘' },
  { id: 'stroke', label: '中风史' },
  { id: 'osteoporosis', label: '骨质疏松' },
  { id: 'other', label: '其他' },
];

// 老人端 - 环境标签选项
const LIVING_CONDITIONS = [
  { id: 'living_alone', label: '独居' },
  { id: 'with_spouse', label: '与配偶同住' },
  { id: 'with_children', label: '与子女同住' },
  { id: 'with_grandchildren', label: '照顾孙辈' },
  { id: 'with_pet', label: '有宠物' },
  { id: 'stairs', label: '有楼梯' },
  { id: 'no_elevator', label: '无电梯' },
  { id: 'rural', label: '农村' },
];

export default function RegisterScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { login } = useAuth();

  // 基本信息
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ELDERLY);
  
  // 老人端专属字段
  const [homeAddress, setHomeAddress] = useState('');
  const [contactPhone, setContactPhone] = useState(''); // 家人电话（必填）
  const [communityPhone, setCommunityPhone] = useState(''); // 社区电话（选填）
  const [healthConditions, setHealthConditions] = useState<string[]>([]); // 身体状况（选填）
  const [livingConditions, setLivingConditions] = useState<string[]>([]); // 环境标签（选填）
  
  // 监护人端专属字段
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [backupContactName, setBackupContactName] = useState('');
  const [backupContactPhone, setBackupContactPhone] = useState('');
  const [backupContactRelation, setBackupContactRelation] = useState('');
  
  const [loading, setLoading] = useState(false);

  // 验证手机号格式
  const isValidPhone = useMemo(() => {
    return /^1[3-9]\d{9}$/.test(phone);
  }, [phone]);

  // 切换身体状况标签
  const toggleHealthCondition = (id: string) => {
    setHealthConditions(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // 切换环境标签
  const toggleLivingCondition = (id: string) => {
    setLivingConditions(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleRegister = async () => {
    // 基本信息校验
    if (!name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }
    if (!phone.trim() || phone.length !== 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    // 老人端必填校验
    if (role === UserRole.ELDERLY) {
      if (!homeAddress.trim()) {
        Alert.alert('提示', '请填写家庭地址');
        return;
      }
      // 地址基本校验：至少包含省/市/区或具体地址
      const trimmedAddress = homeAddress.trim();
      if (trimmedAddress.length < 5) {
        Alert.alert('提示', '家庭地址至少需要5个字符，请输入详细地址');
        return;
      }
      // 检查是否包含无效字符或纯数字
      if (/^\d+$/.test(trimmedAddress)) {
        Alert.alert('提示', '请输入有效的家庭地址，不要只填写数字');
        return;
      }
      // 检查常见无效输入
      const invalidPatterns = ['哈基米', '测试', 'test', '123', '111', 'aaa', 'xxx'];
      if (invalidPatterns.some(p => trimmedAddress.toLowerCase().includes(p))) {
        Alert.alert('提示', '请输入真实的家庭地址');
        return;
      }
      if (!contactPhone.trim()) {
        Alert.alert('提示', '请填写家人电话');
        return;
      }
    }

    setLoading(true);
    try {
      // 构建请求体
      const body: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        role,
      };

      if (role === UserRole.ELDERLY) {
        // 老人端字段
        body.homeAddress = homeAddress.trim();
        body.contactPhone = contactPhone.trim();
        if (communityPhone.trim()) body.communityPhone = communityPhone.trim();
        if (healthConditions.length > 0) body.healthConditions = healthConditions;
        if (livingConditions.length > 0) body.livingConditions = livingConditions;
      } else {
        // 监护人端字段（全部选填）
        if (fatherName.trim()) body.father_name = fatherName.trim();
        if (fatherPhone.trim()) body.father_phone = fatherPhone.trim();
        if (motherName.trim()) body.mother_name = motherName.trim();
        if (motherPhone.trim()) body.mother_phone = motherPhone.trim();
        if (backupContactName.trim()) body.backup_contact_name = backupContactName.trim();
        if (backupContactPhone.trim()) body.backup_contact_phone = backupContactPhone.trim();
        if (backupContactRelation.trim()) body.backup_contact_relation = backupContactRelation.trim();
      }

      /**
       * 服务端文件：server/src/routes/auth.ts
       * 接口：POST /api/v1/auth/register
       * Body 参数：name: string, phone: string, role: string, 以及各角色专属字段
       */
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        await login(data.user, data.token);
        // 根据角色跳转到不同的主页
        if (role === UserRole.ELDERLY) {
          router.replace('/(elderly)/home');
        } else {
          router.replace('/(guardian)/home');
        }
      } else {
        Alert.alert('注册失败', data.error || '请稍后重试');
      }
    } catch (error) {
      Alert.alert('注册失败', '网络错误，请重试');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 渲染老人端专属表单
  const renderElderlyForm = () => (
    <View style={styles.roleSection}>
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
        老人端信息
      </ThemedText>

      {/* 家庭地址 - 必填 */}
      <View>
        <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
          家庭地址 <Text style={styles.labelRequired}>*</Text>
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="请输入家庭地址"
          placeholderTextColor={theme.textMuted}
          value={homeAddress}
          onChangeText={setHomeAddress}
        />
      </View>

      {/* 家人电话 - 必填 */}
      <View>
        <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
          家人电话 <Text style={styles.labelRequired}>*</Text>
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="请输入家人联系电话"
          placeholderTextColor={theme.textMuted}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />
      </View>

      {/* 社区电话 - 选填 */}
      <View>
        <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
          社区电话 <Text style={styles.labelOptional}>（选填）</Text>
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="请输入社区电话"
          placeholderTextColor={theme.textMuted}
          value={communityPhone}
          onChangeText={setCommunityPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />
      </View>

      {/* 身体状况标签 - 选填 */}
      <View style={styles.tagSection}>
        <ThemedText variant="label" color={theme.textPrimary} style={styles.tagSectionTitle}>
          身体状况 <Text style={styles.labelOptional}>（选填，可多选）</Text>
        </ThemedText>
        <View style={styles.tagContainer}>
          {HEALTH_CONDITIONS.map(condition => (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.tag,
                healthConditions.includes(condition.id) && styles.tagSelected,
              ]}
              onPress={() => toggleHealthCondition(condition.id)}
            >
              <Text
                style={[
                  styles.tagText,
                  healthConditions.includes(condition.id) && styles.tagTextSelected,
                ]}
              >
                {condition.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 环境标签 - 选填 */}
      <View style={styles.tagSection}>
        <ThemedText variant="label" color={theme.textPrimary} style={styles.tagSectionTitle}>
          生活环境 <Text style={styles.labelOptional}>（选填，可多选）</Text>
        </ThemedText>
        <View style={styles.tagContainer}>
          {LIVING_CONDITIONS.map(condition => (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.tag,
                livingConditions.includes(condition.id) && styles.tagSelected,
              ]}
              onPress={() => toggleLivingCondition(condition.id)}
            >
              <Text
                style={[
                  styles.tagText,
                  livingConditions.includes(condition.id) && styles.tagTextSelected,
                ]}
              >
                {condition.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 渲染监护人端专属表单
  const renderGuardianForm = () => (
    <View style={styles.roleSection}>
      <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
        监护人端信息
      </ThemedText>

      {/* 父母信息 - 全部选填 */}
      <View style={styles.subSection}>
        <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.subSectionTitle}>
          <FontAwesome6 name="users" size={14} color={theme.textSecondary} /> 父母信息（选填）
        </ThemedText>
        
        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            父亲姓名
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="请输入父亲姓名"
            placeholderTextColor={theme.textMuted}
            value={fatherName}
            onChangeText={setFatherName}
          />
        </View>

        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            父亲电话
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="请输入父亲电话"
            placeholderTextColor={theme.textMuted}
            value={fatherPhone}
            onChangeText={setFatherPhone}
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>

        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            母亲姓名
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="请输入母亲姓名"
            placeholderTextColor={theme.textMuted}
            value={motherName}
            onChangeText={setMotherName}
          />
        </View>

        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            母亲电话
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="请输入母亲电话"
            placeholderTextColor={theme.textMuted}
            value={motherPhone}
            onChangeText={setMotherPhone}
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>
      </View>

      {/* 备用紧急联系人 - 全部选填 */}
      <View style={styles.subSection}>
        <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.subSectionTitle}>
          <FontAwesome6 name="phone" size={14} color={theme.textSecondary} /> 备用紧急联系人（选填）
        </ThemedText>
        
        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            联系人姓名
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="请输入联系人姓名"
            placeholderTextColor={theme.textMuted}
            value={backupContactName}
            onChangeText={setBackupContactName}
          />
        </View>

        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            联系人电话
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="请输入联系人电话"
            placeholderTextColor={theme.textMuted}
            value={backupContactPhone}
            onChangeText={setBackupContactPhone}
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>

        <View>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
            与本人关系
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="如：兄弟、姐妹、朋友等"
            placeholderTextColor={theme.textMuted}
            value={backupContactRelation}
            onChangeText={setBackupContactRelation}
          />
        </View>
      </View>
    </View>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 爱心流星背景 */}
      <HeartMeteors count={8} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
            注册账号
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            填写信息创建新账号
          </ThemedText>
        </ThemedView>

        <ThemedView level="default" style={styles.form}>
          {/* 姓名 */}
          <View>
            <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
              姓名 <Text style={styles.labelRequired}>*</Text>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="请输入姓名"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 手机号 */}
          <View>
            <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
              手机号 <Text style={styles.labelRequired}>*</Text>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="请输入手机号"
              placeholderTextColor={theme.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          {/* 角色选择 */}
          <View>
            <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
              选择角色 <Text style={styles.labelRequired}>*</Text>
            </ThemedText>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === UserRole.ELDERLY ? styles.roleButtonActive : styles.roleButtonInactive,
                ]}
                onPress={() => setRole(UserRole.ELDERLY)}
              >
                <FontAwesome6
                  name="user"
                  size={16}
                  color={role === UserRole.ELDERLY ? theme.buttonPrimaryText : theme.textSecondary}
                />
                <ThemedText
                  variant="smallMedium"
                  color={role === UserRole.ELDERLY ? theme.buttonPrimaryText : theme.textSecondary}
                  style={styles.roleButtonText}
                >
                  老人端
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === UserRole.GUARDIAN ? styles.roleButtonActive : styles.roleButtonInactive,
                ]}
                onPress={() => setRole(UserRole.GUARDIAN)}
              >
                <FontAwesome6
                  name="user-shield"
                  size={16}
                  color={role === UserRole.GUARDIAN ? theme.buttonPrimaryText : theme.textSecondary}
                />
                <ThemedText
                  variant="smallMedium"
                  color={role === UserRole.GUARDIAN ? theme.buttonPrimaryText : theme.textSecondary}
                  style={styles.roleButtonText}
                >
                  监护人端
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* 角色专属表单 */}
          {role === UserRole.ELDERLY ? renderElderlyForm() : renderGuardianForm()}

          {/* 注册按钮 */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.buttonText}>
              {loading ? '注册中...' : '注册'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <View style={styles.footer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.footerText}>
            已有账号？{' '}
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText variant="body" color={theme.primary} style={styles.link}>
                立即登录
              </ThemedText>
            </TouchableOpacity>
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}
