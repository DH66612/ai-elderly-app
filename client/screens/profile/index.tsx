/**
 * 个人中心页 - 清雅风格
 */
import React, { useState, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { UserRole } from '@/constants/roles';
import { createStyles, colors } from './styles';
import { HeartMeteors } from '@/components/HeartMeteors';

interface BindingRequest {
  id: number;
  requester_id: number;
  target_id: number;
  status: string;
  requesterName: string;
  requesterRole: string;
  targetName: string;
  targetRole: string;
}

interface SearchResult {
  id: number;
  name: string;
  phone: string;
  role: string;
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, logout, updateUser } = useAuth();

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [bindingRequests, setBindingRequests] = useState<BindingRequest[]>([]);

  const fetchUserInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${user.id}`
      );
      const data = await response.json();
      if (data.user) {
        updateUser(data.user);
      }
    } catch (error) {
      console.error('Fetch user info error:', error);
    }
  }, [user, updateUser]);

  const loadBindingRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/binding-requests?user_id=${user.id}&status=pending`
      );
      const data = await response.json();
      const receivedRequests = (data.requests || []).filter(
        (req: BindingRequest) => req.target_id === user.id
      );
      setBindingRequests(receivedRequests);
    } catch (error) {
      console.error('Load binding requests error:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchUserInfo();
      loadBindingRequests();
    }, [fetchUserInfo, loadBindingRequests])
  );

  const handleSearchUser = async () => {
    if (!searchPhone) {
      Alert.alert('提示', '请输入对方手机号');
      return;
    }
    try {
      const targetRole = user?.role === UserRole.ELDERLY ? UserRole.GUARDIAN : UserRole.ELDERLY;
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/search?phone=${searchPhone}&role=${targetRole}`
      );
      const data = await response.json();
      if (data.users && data.users.length > 0) {
        const foundUser = data.users[0];
        if (foundUser.id === user?.boundUserId) {
          Alert.alert('提示', '该用户已经是您的绑定用户');
          return;
        }
        setSearchResult(foundUser);
      } else {
        Alert.alert('提示', `未找到对应的${targetRole === UserRole.ELDERLY ? '老人' : '监护人'}账户`);
      }
    } catch (error) {
      console.error('Search user error:', error);
      Alert.alert('错误', '搜索失败，请重试');
    }
  };

  const handleSendBindingRequest = async () => {
    if (!searchResult || !user) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/binding-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: user.id,
            target_id: searchResult.id,
          }),
        }
      );
      if (response.ok) {
        setSearchModalVisible(false);
        setSearchResult(null);
        setSearchPhone('');
        Alert.alert('成功', '绑定请求已发送，等待对方确认');
      } else {
        Alert.alert('失败', '发送失败');
      }
    } catch (error) {
      console.error('Send binding request error:', error);
      Alert.alert('错误', '发送失败，请重试');
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/binding-requests/${requestId}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id }),
        }
      );
      if (response.ok) {
        await fetchUserInfo();
        await loadBindingRequests();
        Alert.alert('成功', '绑定成功');
      } else {
        Alert.alert('失败', '绑定失败');
      }
    } catch (error) {
      console.error('Accept binding request error:', error);
      Alert.alert('错误', '绑定失败，请重试');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/binding-requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id }),
        }
      );
      if (response.ok) {
        await loadBindingRequests();
        Alert.alert('提示', '已拒绝绑定请求');
      } else {
        Alert.alert('失败', '操作失败');
      }
    } catch (error) {
      console.error('Reject binding request error:', error);
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  const handleUnbind = () => {
    Alert.alert(
      '解除绑定',
      `确定要解除与 ${user?.boundUserName} 的绑定关系吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/unbind`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: user?.id }),
                }
              );
              if (response.ok) {
                await fetchUserInfo();
                Alert.alert('成功', '已解除绑定');
              } else {
                Alert.alert('失败', '解除绑定失败');
              }
            } catch (error) {
              console.error('Unbind error:', error);
              Alert.alert('错误', '解除绑定失败，请重试');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getRoleText = (role: string) => {
    return role === UserRole.ELDERLY ? '老人端' : '监护人端';
  };

  const isBound = !!user?.boundUserId;

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      {/* 渐变背景 */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* 爱心流星背景 */}
      <HeartMeteors count={8} />

      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.replace(user?.role === UserRole.ELDERLY ? '/(elderly)/home' : '/(guardian)/home')}
        >
          <FontAwesome6 name="house" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>个人中心</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push(user?.role === UserRole.ELDERLY ? '/(elderly)/settings' : '/(guardian)/settings')}
        >
          <FontAwesome6 name="gear" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 账号资料卡片 - 点击可编辑 */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.8}
        >
          <View style={styles.profileContent}>
            <View style={styles.avatar}>
              <FontAwesome6 name="user" size={32} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || '用户'}</Text>
              <Text style={styles.profilePhone}>{user?.phone || ''}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{getRoleText(user?.role || '')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.profileEditHint}>
            <FontAwesome6 name="pen" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* 整体卡片 - 绑定状态 & 功能菜单 */}
        <View style={styles.mainCard}>
          {/* 绑定状态显示 */}
          {isBound ? (
            <View style={styles.boundSection}>
              <View style={styles.boundUserHeader}>
                <View style={styles.linkIcon}>
                  <FontAwesome6 name="link" size={12} color={colors.primary} />
                </View>
                <Text style={styles.boundLabel}>已绑定</Text>
              </View>
              <View style={styles.boundUserContent}>
                <Text style={styles.boundUserName}>{user?.boundUserName || '用户'}</Text>
                <View style={styles.boundUserActions}>
                  <TouchableOpacity
                    style={styles.boundActionButton}
                    onPress={() => router.push('/binding-info')}
                  >
                    <FontAwesome6 name="eye" size={12} color={colors.textPrimary} />
                    <Text style={styles.boundActionButtonText}>详情</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.unbindButton} onPress={handleUnbind}>
                    <FontAwesome6 name="link-slash" size={12} color={colors.dangerText} />
                    <Text style={styles.unbindButtonText}>解绑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setSearchModalVisible(true)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <FontAwesome6 name="user-plus" size={12} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>绑定用户</Text>
                  <Text style={styles.menuItemSub}>绑定{user?.role === UserRole.ELDERLY ? '监护人' : '老人'}</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* 分隔线 */}
          {isBound && <View style={styles.divider} />}

          {/* 绑定请求列表 */}
          {bindingRequests.length > 0 && (
            <>
              <View style={styles.requestSection}>
                <Text style={styles.sectionHeader}>绑定请求 ({bindingRequests.length})</Text>
                {bindingRequests.map((request, index) => (
                  <View key={request.id} style={[styles.requestItem, index < bindingRequests.length - 1 && styles.requestItemBorder]}>
                    <View style={styles.requestContent}>
                      <FontAwesome6
                        name={request.requesterRole === UserRole.ELDERLY ? 'user' : 'user-shield'}
                        size={20}
                        color={colors.primary}
                        style={styles.requestIcon}
                      />
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestName}>{request.requesterName}</Text>
                        <Text style={styles.requestDesc}>{getRoleText(request.requesterRole)} 请求绑定</Text>
                      </View>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.requestButtonReject]}
                        onPress={() => handleRejectRequest(request.id)}
                      >
                        <Text style={styles.rejectText}>拒绝</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.requestButtonAccept]}
                        onPress={() => handleAcceptRequest(request.id)}
                      >
                        <Text style={styles.acceptText}>接受</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* 设置入口 */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push(user?.role === UserRole.ELDERLY ? '/(elderly)/settings' : '/(guardian)/settings')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <FontAwesome6 name="gear" size={12} color={colors.textSecondary} />
              </View>
              <Text style={styles.menuItemTitle}>设置</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 帮助中心 - 所有角色都显示 */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/help-center')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <FontAwesome6 name="circle-question" size={12} color={colors.primary} />
              </View>
              <Text style={styles.menuItemTitle}>帮助中心</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 用户协议 */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/user-agreement')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <FontAwesome6 name="file-contract" size={12} color={colors.primary} />
              </View>
              <Text style={styles.menuItemTitle}>用户协议</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 隐私政策 */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/privacy-policy')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <FontAwesome6 name="shield-halved" size={12} color={colors.primary} />
              </View>
              <Text style={styles.menuItemTitle}>隐私政策</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

        </View>

        {/* 醒目的退出登录按钮 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome6 name="right-from-bracket" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 搜索用户 Modal */}
      <Modal
        visible={searchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>取消</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>搜索用户</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder={`输入${user?.role === UserRole.ELDERLY ? '监护人' : '老人'}手机号`}
                placeholderTextColor={colors.textSecondary}
                value={searchPhone}
                onChangeText={setSearchPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchUser}>
                <FontAwesome6 name="magnifying-glass" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            {searchResult && (
              <View style={styles.searchResult}>
                <View style={styles.resultContent}>
                  <FontAwesome6
                    name={searchResult.role === UserRole.ELDERLY ? 'user' : 'user-shield'}
                    size={28}
                    color={colors.primary}
                    style={styles.resultIcon}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{searchResult.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{searchResult.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.resultButton} onPress={handleSendBindingRequest}>
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '500' }}>发送绑定请求</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
