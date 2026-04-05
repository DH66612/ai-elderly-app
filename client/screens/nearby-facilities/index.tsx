/**
 * 附近设施查询页面 - 清雅风格
 * 显示老人家附近的医院、药店、社区服务中心
 * 使用高德地图POI搜索API
 */
import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { GuardianBackground } from '@/components/GuardianBackground';
import { navigateToDestination } from '@/utils/mapNavigation';
import { colors, createStyles } from './styles';

// POI类型
type POIType = 'hospital' | 'pharmacy' | 'community';

// POI数据结构
interface POI {
  id: string;
  name: string;
  type: string;
  address: string;
  location: string;
  distance: string;
  tel?: string;
}

// 分类数据结构
interface CategoryData {
  type: POIType;
  typeName: string;
  pois: POI[];
}

export default function NearbyFacilitiesScreen() {
  const router = useSafeRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<POIType>('hospital');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [elderAddress, setElderAddress] = useState<string>('');
  const [elderLocation, setElderLocation] = useState<string>('');

  const styles = useMemo(() => createStyles(), []);

  // 老人信息
  const boundUser = user?.boundUser;
  const hasAddress = boundUser?.homeAddress || boundUser?.homeLocation;

  // 加载附近设施
  useEffect(() => {
    const loadFacilities = async () => {
      if (!boundUser) return;

      // 设置地址信息
      setElderAddress(boundUser.homeAddress || '未设置地址');
      
      // 如果有经纬度，直接使用
      let location: string | undefined = boundUser.homeLocation;
      
      // 如果没有经纬度但有地址，先地理编码
      if (!location && boundUser.homeAddress) {
        try {
          /**
           * 服务端文件：server/src/routes/poi.ts
           * 接口：GET /api/v1/poi/geocode
           * Query: address: string, city?: string
           */
          const geocodeUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/poi/geocode?address=${encodeURIComponent(boundUser.homeAddress)}`;
          const geocodeRes = await fetch(geocodeUrl);
          const geocodeData = await geocodeRes.json();

          if (geocodeData.location) {
            location = geocodeData.location;
            setElderLocation(geocodeData.location);
          }
        } catch (err) {
          console.error('Geocode error:', err);
        }
      } else if (location) {
        setElderLocation(location);
      }

      if (!location) {
        setError('请先在个人资料中设置老人家庭地址');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        /**
         * 服务端文件：server/src/routes/poi.ts
         * 接口：GET /api/v1/poi/search-all
         * Query: location: string (经度,纬度), radius?: string (米)
         */
        const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/poi/search-all?location=${location}&radius=3000`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.categories) {
          setCategories(data.categories);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Load facilities error:', err);
        setError('加载附近设施失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, [boundUser]);

  // 获取当前选中分类的数据
  const currentCategory = categories.find(c => c.type === activeTab);
  const currentPOIs = currentCategory?.pois || [];

  // 获取统计数字
  const stats = {
    hospital: categories.find(c => c.type === 'hospital')?.pois.length || 0,
    pharmacy: categories.find(c => c.type === 'pharmacy')?.pois.length || 0,
    community: categories.find(c => c.type === 'community')?.pois.length || 0,
  };

  // 获取POI图标样式
  const getPOIIconStyle = (type: POIType) => {
    switch (type) {
      case 'hospital':
        return { icon: 'hospital', color: '#ca7878', style: styles.poiIconHospital };
      case 'pharmacy':
        return { icon: 'pills', color: '#5a8a7a', style: styles.poiIconPharmacy };
      case 'community':
        return { icon: 'building', color: colors.primary, style: styles.poiIconCommunity };
    }
  };

  // 格式化距离
  const formatDistance = (distance: string) => {
    const meters = parseInt(distance, 10);
    if (isNaN(meters)) return distance;
    if (meters < 1000) {
      return `${meters}米`;
    }
    return `${(meters / 1000).toFixed(1)}公里`;
  };

  // 渲染POI卡片
  const renderPOICard = (poi: POI) => {
    const iconStyle = getPOIIconStyle(activeTab);

    // 解析经纬度 (location格式: "lng,lat")
    const parseLocation = (loc: string): { lat: number; lng: number } | null => {
      if (!loc) return null;
      const parts = loc.split(',');
      if (parts.length !== 2) return null;
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng };
    };

    const handleNavigate = () => {
      const coords = parseLocation(poi.location);
      if (coords) {
        navigateToDestination(coords.lat, coords.lng, poi.name);
      } else {
        // 没有坐标时，使用地址搜索
        // Web端打开高德地图搜索
        if (Platform.OS === 'web') {
          const url = `https://uri.amap.com/search?keyword=${encodeURIComponent(poi.name)}&city=北京`;
          window.open(url, '_blank');
        }
      }
    };

    return (
      <View key={poi.id} style={styles.poiCard}>
        <View style={styles.poiHeader}>
          <View style={[styles.poiIconWrapper, iconStyle.style]}>
            <FontAwesome6 name={iconStyle.icon as any} size={18} color={iconStyle.color} />
          </View>
          <View style={styles.poiInfo}>
            <Text style={styles.poiName} numberOfLines={1}>{poi.name}</Text>
            <Text style={styles.poiAddress} numberOfLines={2}>{poi.address || '暂无地址信息'}</Text>
            {poi.distance && (
              <Text style={styles.poiDistance}>距老人家庭约 {formatDistance(poi.distance)}</Text>
            )}
            {poi.tel && (
              <Text style={styles.poiPhone}>电话：{poi.tel}</Text>
            )}
          </View>
        </View>
        {/* 导航按钮 */}
        <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
          <FontAwesome6 name="location-arrow" size={14} color="#FFFFFF" />
          <Text style={styles.navigateButtonText}>导航前往</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 未绑定提示
  if (!boundUser) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="user-slash" size={40} color={colors.textMuted} />
          <ThemedText variant="body" style={styles.emptyText}>暂无绑定老人信息</ThemedText>
          <ThemedText variant="small" style={styles.emptySubText}>请先绑定老人后查看附近设施</ThemedText>
          <TouchableOpacity 
            style={{ 
              marginTop: 24, 
              backgroundColor: colors.primary, 
              paddingHorizontal: 24, 
              paddingVertical: 12, 
              borderRadius: 8 
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>返回</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" style={styles.headerTitle}>附近设施</ThemedText>
        </View>

        {/* 地址卡片 */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View style={styles.addressIcon}>
              <FontAwesome6 name="location-dot" size={14} color={colors.primary} />
            </View>
            <Text style={styles.addressLabel}>老人家庭地址</Text>
          </View>
          <Text style={styles.addressValue} numberOfLines={2}>
            {elderAddress}
          </Text>
          {!hasAddress && (
            <TouchableOpacity 
              style={{ marginTop: 8 }}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={{ color: colors.primary, fontSize: 13 }}>点击设置地址 →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 统计卡片 */}
        {categories.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: '#ca7878' }]}>
              <Text style={[styles.statNumber, { color: '#ca7878' }]}>{stats.hospital}</Text>
              <Text style={styles.statLabel}>医院</Text>
            </View>
            <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: '#5a8a7a' }]}>
              <Text style={[styles.statNumber, { color: '#5a8a7a' }]}>{stats.pharmacy}</Text>
              <Text style={styles.statLabel}>药店</Text>
            </View>
            <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.community}</Text>
              <Text style={styles.statLabel}>社区服务</Text>
            </View>
          </View>
        )}

        {/* Tab切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'hospital' && styles.tabActive]}
            onPress={() => setActiveTab('hospital')}
          >
            <Text style={[styles.tabText, activeTab === 'hospital' && styles.tabTextActive]}>
              医院
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pharmacy' && styles.tabActive]}
            onPress={() => setActiveTab('pharmacy')}
          >
            <Text style={[styles.tabText, activeTab === 'pharmacy' && styles.tabTextActive]}>
              药店
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'community' && styles.tabActive]}
            onPress={() => setActiveTab('community')}
          >
            <Text style={[styles.tabText, activeTab === 'community' && styles.tabTextActive]}>
              社区服务
            </Text>
          </TouchableOpacity>
        </View>

        {/* 加载状态 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>正在搜索附近设施...</Text>
          </View>
        )}

        {/* 错误提示 */}
        {error && !loading && (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="map-location-dot" size={40} color={colors.textMuted} />
            <ThemedText variant="body" style={styles.emptyText}>{error}</ThemedText>
          </View>
        )}

        {/* POI列表 */}
        {!loading && !error && currentPOIs.length > 0 && (
          <View>
            {currentPOIs.map(poi => renderPOICard(poi))}
          </View>
        )}

        {/* 空状态 */}
        {!loading && !error && currentPOIs.length === 0 && hasAddress && (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="building" size={40} color={colors.textMuted} />
            <ThemedText variant="body" style={styles.emptyText}>
              附近3公里内暂无{activeTab === 'hospital' ? '医院' : activeTab === 'pharmacy' ? '药店' : '社区服务中心'}
            </ThemedText>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}
