/**
 * 老人端天气卡片 - 玻璃拟态风格 + 适老化设计
 * 毛玻璃效果 + 大字体 + 温暖配色 + 温馨提示
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiBaseUrl } from '@/constants/api';

// 天气图标映射 - 温暖色调
const WEATHER_ICONS: Record<string, { icon: string; color: string }> = {
  晴: { icon: 'sun', color: '#FBBF24' },
  多云: { icon: 'cloud-sun', color: '#60A5FA' },
  阴: { icon: 'cloud', color: '#94A3B8' },
  雨: { icon: 'cloud-rain', color: '#38BDF8' },
  雪: { icon: 'snowflake', color: '#A5F3FC' },
};

// 天气提示 - 温馨语气
const WEATHER_TIPS: Record<string, string> = {
  晴: '今天天气真好，适合出门走走',
  多云: '天上有云，出门记得带伞哦',
  阴: '阴天了，要注意保暖',
  雨: '下雨了，出门记得带伞',
};

interface WeatherData {
  city: string;
  temperature: string;
  weather: string;
  humidity: string;
  wind: string;
}

interface ElderlyWeatherCardProps {
  userName?: string;
  style?: any;
  onPress?: () => void;
}

/**
 * Web端使用浏览器原生定位API
 */
function getWebLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

export function ElderlyWeatherCard({ userName, style, onPress }: ElderlyWeatherCardProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const hasFetchedRef = useRef(false);

  const getLocationAndCity = useCallback(async () => {
    try {
      console.log('[Weather] 开始获取位置...');
      
      if (Platform.OS === 'web') {
        console.log('[Weather] Web平台，使用浏览器定位');
        const coords = await getWebLocation();
        if (coords) {
          console.log('[Weather] Web定位成功:', coords);
          coordsRef.current = coords;
          // 使用高德逆地理编码获取城市名
          const cityResult = await getCityByCoords(coords.lat, coords.lon);
          return cityResult || { lat: coords.lat, lon: coords.lon, city: '' };
        }
        console.log('[Weather] Web定位失败，使用IP定位');
        return await getIPLocation();
      }
      
      // 移动端定位
      console.log('[Weather] 请求定位权限...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[Weather] 定位权限状态:', status);
      
      if (status !== 'granted') {
        console.log('[Weather] 定位权限被拒绝，使用IP定位');
        return await getIPLocation();
      }

      let position: Location.LocationObject | null = null;
      
      // 尝试获取缓存位置
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && Date.now() - lastKnown.timestamp < 300000) {
          console.log('[Weather] 使用缓存位置');
          position = lastKnown;
        }
      } catch (e) {
        console.log('[Weather] 获取缓存位置失败:', e);
      }
      
      // 获取当前位置
      if (!position) {
        console.log('[Weather] 获取当前位置...');
        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000,
            maximumAge: 60000,
          });
          console.log('[Weather] 获取当前位置成功');
        } catch (e) {
          console.log('[Weather] 获取当前位置失败:', e);
        }
      }
      
      if (!position) {
        console.log('[Weather] GPS定位失败，使用IP定位');
        return await getIPLocation();
      }
      
      const { latitude, longitude } = position.coords;
      console.log('[Weather] GPS定位成功:', { lat: latitude, lon: longitude });
      coordsRef.current = { lat: latitude, lon: longitude };
      
      // 使用高德逆地理编码获取城市名
      const cityResult = await getCityByCoords(latitude, longitude);
      return cityResult || { lat: latitude, lon: longitude, city: '' };
    } catch (error) {
      console.error('[Weather] 定位异常:', error);
      return await getIPLocation();
    }
  }, []);

  // 使用高德逆地理编码API获取城市名
  const getCityByCoords = async (lat: number, lon: number): Promise<{ lat: number; lon: number; city: string } | null> => {
    try {
      const baseUrl = getApiBaseUrl();
      console.log('[Weather] 调用高德逆地理编码API...');
      const response = await fetch(`${baseUrl}/api/v1/weather/geocode?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      
      if (data.success && data.data?.city) {
        console.log('[Weather] 逆地理编码成功:', data.data.city);
        return { lat, lon, city: data.data.city };
      }
      
      console.log('[Weather] 逆地理编码失败:', data.error);
      return null;
    } catch (error) {
      console.error('[Weather] 逆地理编码请求失败:', error);
      return null;
    }
  };

  const getIPLocation = async (): Promise<{ lat: number; lon: number; city: string } | null> => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/weather/ip-locate`);
      const data = await response.json();
      
      // 检查是否是默认兜底数据（广州）
      if (data.data) {
        const isDefaultGuangzhou = data.data.city === '广州' && data.data.lat === 23.1291;
        if (isDefaultGuangzhou && !data.success) {
          console.log('[Weather] IP定位失败，使用默认位置（广州）');
        } else {
          console.log('[Weather] IP定位成功:', data.data.city);
        }
        coordsRef.current = { lat: data.data.lat, lon: data.data.lon };
        return { lat: data.data.lat, lon: data.data.lon, city: data.data.city };
      }
      return null;
    } catch (error) {
      console.error('[Weather] IP定位请求失败:', error);
      return null;
    }
  };

  const fetchWeather = useCallback(async (lat?: number, lon?: number, city?: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      let url = `${baseUrl}/api/v1/weather`;
      
      if (lat && lon) {
        url += `?lat=${lat}&lon=${lon}`;
      } else if (city) {
        url += `?city=${encodeURIComponent(city)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data) {
        setWeatherData(data.data);
      } else {
        setWeatherData(getMockData(city || '广州'));
      }
    } catch {
      setWeatherData(getMockData(city || '广州'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const init = async () => {
      setLoading(true);
      const location = await getLocationAndCity();
      if (location) {
        await fetchWeather(location.lat, location.lon, location.city);
      } else {
        await fetchWeather(undefined, undefined, '广州');
      }
    };
    
    init();
  }, [getLocationAndCity, fetchWeather]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (coordsRef.current) {
        fetchWeather(coordsRef.current.lat, coordsRef.current.lon);
      } else {
        fetchWeather();
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const formatTime = (date: Date) =>
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const getWeatherIcon = (weather: string): { icon: string; color: string } => {
    for (const key of Object.keys(WEATHER_ICONS)) {
      if (weather.includes(key)) return WEATHER_ICONS[key];
    }
    return WEATHER_ICONS['多云'];
  };

  const getWeatherTip = (weather: string): string => {
    for (const key of Object.keys(WEATHER_TIPS)) {
      if (weather.includes(key)) return WEATHER_TIPS[key];
    }
    return '注意保暖哦';
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  if (!weatherData) return null;

  const weatherIcon = getWeatherIcon(weatherData.weather);
  const weatherTip = getWeatherTip(weatherData.weather);

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} disabled={!onPress}>
      <View style={[styles.container, style]}>
        {/* 玻璃拟态渐变层 */}
        <LinearGradient
          colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassLayer}
        >
          {/* 第一行：问候 + 时间 */}
          <View style={styles.headerRow}>
            <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
              你好，{userName || '长辈'}
            </Text>
            <View style={styles.timeBox}>
              <FontAwesome6 name="clock" size={16} color="#94A3B8" />
              <Text style={styles.timeText} numberOfLines={1}>
                {formatTime(currentTime)}
              </Text>
            </View>
          </View>

          {/* 玻璃分割线 */}
          <View style={styles.glassDivider} />

          {/* 第二行：天气图标+温度（左） + 天气描述|湿度（右） */}
          <View style={styles.weatherRow}>
            {/* 左侧：天气图标 + 温度 */}
            <View style={styles.leftSection}>
              <View style={styles.weatherIconBubble}>
                <LinearGradient
                  colors={['rgba(251,191,36,0.2)', 'rgba(251,191,36,0.08)']}
                  style={styles.iconGradient}
                >
                  <FontAwesome6 name={weatherIcon.icon} size={36} color={weatherIcon.color} />
                </LinearGradient>
              </View>
              <Text style={styles.tempText} numberOfLines={1}>
                {weatherData.temperature}°
              </Text>
            </View>
            
            {/* 右侧：天气描述|湿度 + 定位 */}
            <View style={styles.rightSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoText} numberOfLines={1}>{weatherData.weather}</Text>
                <View style={styles.infoDivider} />
                <View style={styles.humidityItem}>
                  <FontAwesome6 name="droplet" size={14} color="#38BDF8" />
                  <Text style={styles.infoText} numberOfLines={1}>{weatherData.humidity}%</Text>
                </View>
              </View>
              <View style={styles.locationRow}>
                <FontAwesome6 name="location-dot" size={14} color="#34D399" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {weatherData.city}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

function getMockData(city: string): WeatherData {
  const weathers = ['晴', '多云', '阴', '小雨'];
  return {
    city,
    temperature: `${Math.floor(Math.random() * 15) + 15}`,
    weather: weathers[Math.floor(Math.random() * weathers.length)],
    humidity: `${Math.floor(Math.random() * 30) + 40}`,
    wind: '东南风3级',
  };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: 'hidden' as const,
    // 玻璃拟态阴影 - 温暖色调
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    // 高光边框
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  glassLayer: {
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#1E293B',
    flex: 1,
    marginRight: Spacing.md,
  },
  timeBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexShrink: 0,
    backgroundColor: 'rgba(148,163,184,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#475569',
    marginLeft: Spacing.xs,
  },
  glassDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.2)',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  weatherRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  // 左侧：天气图标 + 温度
  leftSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  weatherIconBubble: {
    borderRadius: 20,
    overflow: 'hidden' as const,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconGradient: {
    width: 64,
    height: 64,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tempText: {
    fontSize: 44,
    fontWeight: '800' as const,
    color: '#0F172A',
    marginLeft: Spacing.lg,
  },
  // 右侧：天气描述|湿度 + 定位
  rightSection: {
    alignItems: 'flex-end' as const,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  infoDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(148,163,184,0.3)',
    marginHorizontal: Spacing.sm,
  },
  infoText: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500' as const,
  },
  humidityItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  // 定位行
  locationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#34D399',
    fontWeight: '600' as const,
    marginLeft: 6,
  },
});

export default ElderlyWeatherCard;
