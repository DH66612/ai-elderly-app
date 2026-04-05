/**
 * Health Connect 授权组件
 * 
 * 显示授权状态和授权按钮
 */
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';
import { useHealthConnect } from '@/hooks/useHealthConnect';

interface Props {
  onPermissionGranted?: () => void;
  compact?: boolean;
}

export function HealthConnectPermission({ onPermissionGranted, compact = false }: Props) {
  const { theme } = useTheme();
  const {
    isAvailable,
    isLoading,
    permissions,
    hasAnyPermission,
    requestPermissions,
    openSettings,
  } = useHealthConnect();

  const handleRequestPermission = async () => {
    const result = await requestPermissions();
    if (Object.values(result).some((v) => v)) {
      onPermissionGranted?.();
    }
  };

  // iOS 或 Web 端显示不支持提示
  if (Platform.OS !== 'android') {
    if (compact) return null;
    
    return (
      <View
        style={{
          backgroundColor: theme.backgroundTertiary,
          borderRadius: BorderRadius.lg,
          padding: Spacing.lg,
          alignItems: 'center',
        }}
      >
        <FontAwesome6 name="heart-pulse" size={32} color={theme.textMuted} />
        <ThemedText
          variant="body"
          color={theme.textSecondary}
          style={{ marginTop: Spacing.md, textAlign: 'center' }}
        >
          {Platform.OS === 'web'
            ? '网页版不支持健康数据同步，请在手机App中使用'
            : 'iOS 版本即将支持 Apple Health 数据同步'}
        </ThemedText>
      </View>
    );
  }

  // Health Connect 不可用
  if (!isAvailable) {
    if (compact) return null;
    
    return (
      <View
        style={{
          backgroundColor: theme.backgroundTertiary,
          borderRadius: BorderRadius.lg,
          padding: Spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FontAwesome6 name="triangle-exclamation" size={24} color={theme.textMuted} />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <ThemedText variant="bodyMedium" color={theme.textPrimary}>
              Health Connect 未安装
            </ThemedText>
            <ThemedText variant="small" color={theme.textMuted} style={{ marginTop: Spacing.xs }}>
              请安装 Health Connect 应用以同步健康数据
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: BorderRadius.md,
            paddingVertical: Spacing.md,
            alignItems: 'center',
            marginTop: Spacing.lg,
          }}
          onPress={openSettings}
        >
          <ThemedText variant="bodyMedium" color={theme.buttonPrimaryText}>
            前往安装
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // 紧凑模式（仅显示状态图标）
  if (compact) {
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: hasAnyPermission ? theme.success + '20' : theme.backgroundTertiary,
          borderRadius: BorderRadius.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
        }}
        onPress={handleRequestPermission}
        disabled={isLoading}
      >
        <FontAwesome6
          name={hasAnyPermission ? 'check-circle' : 'circle'}
          size={16}
          color={hasAnyPermission ? theme.success : theme.textMuted}
        />
        <ThemedText
          variant="smallMedium"
          color={hasAnyPermission ? theme.success : theme.textMuted}
          style={{ marginLeft: Spacing.sm }}
        >
          {hasAnyPermission ? '已授权' : '未授权'}
        </ThemedText>
      </TouchableOpacity>
    );
  }

  // 完整模式
  return (
    <View
      style={{
        backgroundColor: theme.backgroundDefault,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {/* 标题 */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: BorderRadius.lg,
            backgroundColor: theme.primary + '15',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FontAwesome6 name="heart-pulse" size={24} color={theme.primary} />
        </View>
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <ThemedText variant="h4" color={theme.textPrimary}>
            Health Connect
          </ThemedText>
          <ThemedText variant="small" color={theme.textMuted}>
            {hasAnyPermission ? '健康数据同步已开启' : '授权后可同步更多健康数据'}
          </ThemedText>
        </View>
      </View>

      {/* 权限状态列表 */}
      <View style={{ marginTop: Spacing.lg }}>
        <PermissionItem
          icon="shoe-prints"
          label="步数"
          granted={permissions.steps}
          color={theme.primary}
        />
        <PermissionItem
          icon="heart"
          label="心率"
          granted={permissions.heartRate}
          color={theme.error}
        />
        <PermissionItem
          icon="droplet"
          label="血压"
          granted={permissions.bloodPressure}
          color={theme.accent}
        />
        <PermissionItem
          icon="lungs"
          label="血氧"
          granted={permissions.bloodOxygen}
          color={theme.success}
        />
        <PermissionItem
          icon="moon"
          label="睡眠"
          granted={permissions.sleep}
          color={theme.textSecondary}
        />
      </View>

      {/* 操作按钮 */}
      <TouchableOpacity
        style={{
          backgroundColor: hasAnyPermission ? theme.backgroundTertiary : theme.primary,
          borderRadius: BorderRadius.md,
          paddingVertical: Spacing.lg,
          alignItems: 'center',
          marginTop: Spacing.lg,
          flexDirection: 'row',
          justifyContent: 'center',
        }}
        onPress={handleRequestPermission}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={hasAnyPermission ? theme.textPrimary : theme.buttonPrimaryText} />
        ) : (
          <>
            <FontAwesome6
              name={hasAnyPermission ? 'rotate' : 'shield-check'}
              size={16}
              color={hasAnyPermission ? theme.textPrimary : theme.buttonPrimaryText}
            />
            <ThemedText
              variant="bodyMedium"
              color={hasAnyPermission ? theme.textPrimary : theme.buttonPrimaryText}
              style={{ marginLeft: Spacing.sm }}
            >
              {hasAnyPermission ? '管理权限' : '授权健康数据'}
            </ThemedText>
          </>
        )}
      </TouchableOpacity>

      {/* 提示 */}
      <ThemedText
        variant="caption"
        color={theme.textMuted}
        style={{ marginTop: Spacing.md, textAlign: 'center' }}
      >
        您的数据将安全地存储在您的设备上
      </ThemedText>
    </View>
  );
}

// 权限项组件
function PermissionItem({
  icon,
  label,
  granted,
  color,
}: {
  icon: string;
  label: string;
  granted: boolean;
  color: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.borderLight,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: BorderRadius.sm,
          backgroundColor: color + '15',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FontAwesome6 name={icon} size={14} color={color} />
      </View>
      <ThemedText
        variant="body"
        color={theme.textPrimary}
        style={{ marginLeft: Spacing.md, flex: 1 }}
      >
        {label}
      </ThemedText>
      <FontAwesome6
        name={granted ? 'check-circle' : 'circle'}
        size={20}
        color={granted ? theme.success : theme.textMuted}
      />
    </View>
  );
}
