/**
 * 天气卡片组件 - 监护人端 - 玻璃拟态风格
 * 毛玻璃透明效果 + 光影折射 + 轻盈通透
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiBaseUrl } from '@/constants/api';

// 天气图标映射
const WEATHER_ICONS: Record<string, { icon: string; color: string }> = {
  晴: { icon: 'sun', color: '#FBBF24' },
  多云: { icon: 'cloud-sun', color: '#60A5FA' },
  阴: { icon: 'cloud', color: '#94A3B8' },
  雨: { icon: 'cloud-rain', color: '#38BDF8' },
  雪: { icon: 'snowflake', color: '#A5F3FC' },
};

interface WeatherData {
  city: string;
  temperature: string;
  weather: string;
  humidity: string;
  wind: string;
  updateTime: string;
}

interface WeatherCardProps {
  userName?: string;
  subText?: string;
  style?: any;
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

export function WeatherCard({ userName, subText, style }: WeatherCardProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const hasFetchedRef = useRef(false);

  const getLocationAndCity = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const coords = await getWebLocation();
        if (coords) {
          coordsRef.current = coords;
          return { lat: coords.lat, lon: coords.lon, city: '' };
        }
        setLocationError('定位失败');
        return null;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return await getIPLocation();
      }

      let position: Location.LocationObject | null = null;
      
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && Date.now() - lastKnown.timestamp < 300000) {
          position = lastKnown;
        }
      } catch {}
      
      if (!position) {
        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 10000);
        });
        position = await Promise.race([positionPromise, timeoutPromise]) as Location.LocationObject | null;
      }
      
      if (!position) {
        return await getIPLocation();
      }
      
      const { latitude, longitude } = position.coords;
      coordsRef.current = { lat: latitude, lon: longitude };
      return { lat: latitude, lon: longitude, city: '' };
    } catch {
      return await getIPLocation();
    }
  }, []);

  const getIPLocation = async (): Promise<{ lat: number; lon: number; city: string } | null> => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/weather/ip-locate`);
      const data = await response.json();
      
      if (data.data) {
        coordsRef.current = { lat: data.data.lat, lon: data.data.lon };
        setLocationError(null);
        return { lat: data.data.lat, lon: data.data.lon, city: data.data.city };
      }
      setLocationError('定位失败');
      return null;
    } catch {
      setLocationError('定位失败');
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
        setWeatherData(getMockData(city || '北京'));
      }
    } catch {
      setWeatherData(getMockData(city || '北京'));
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
        await fetchWeather(undefined, undefined, '北京');
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

  const formatDate = (date: Date) => {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
  };

  const getWeatherIcon = (weather: string): { icon: string; color: string } => {
    for (const key of Object.keys(WEATHER_ICONS)) {
      if (weather.includes(key)) return WEATHER_ICONS[key];
    }
    return WEATHER_ICONS['多云'];
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#60A5FA" />
      </View>
    );
  }

  if (!weatherData) return null;

  const weatherIcon = getWeatherIcon(weatherData.weather);

  return (
    <View style={[styles.container, style]}>
      {/* 玻璃拟态渐变层 */}
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glassLayer}
      >
        {/* 第一行：问候 + 时间 */}
        <View style={styles.headerRow}>
          <View style={styles.greetingBox}>
            <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
              你好，{userName || '监护人'}
            </Text>
            {subText && (
              <Text style={styles.subText} numberOfLines={1} ellipsizeMode="tail">
                {subText}
              </Text>
            )}
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeText} numberOfLines={1}>
              {formatTime(currentTime)}
            </Text>
            <Text style={styles.dateText} numberOfLines={1}>
              {formatDate(currentTime)}
            </Text>
          </View>
        </View>

        {/* 玻璃分割线 */}
        <View style={styles.glassDivider} />

        {/* 第二行：天气信息 */}
        <View style={styles.weatherRow}>
          {/* 天气图标容器 - 玻璃气泡 */}
          <View style={styles.weatherIconBubble}>
            <LinearGradient
              colors={['rgba(96,165,250,0.15)', 'rgba(96,165,250,0.05)']}
              style={styles.iconGradient}
            >
              <FontAwesome6 name={weatherIcon.icon} size={28} color={weatherIcon.color} />
            </LinearGradient>
          </View>
          
          <Text style={styles.tempText} numberOfLines={1}>
            {weatherData.temperature}°
          </Text>
          <Text style={styles.weatherText} numberOfLines={1}>
            {weatherData.weather}
          </Text>
          
          <View style={styles.weatherDetails}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBg}>
                <FontAwesome6 name="droplet" size={10} color="#38BDF8" />
              </View>
              <Text style={styles.detailText} numberOfLines={1}>{weatherData.humidity}%</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBg}>
                <FontAwesome6 name="wind" size={10} color="#94A3B8" />
              </View>
              <Text style={styles.detailText} numberOfLines={1}>{weatherData.wind}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBg}>
                <FontAwesome6 
                  name={locationError ? "location-crosshairs" : "location-dot"} 
                  size={10} 
                  color={locationError ? "#94A3B8" : "#34D399"} 
                />
              </View>
              <Text style={[styles.detailText, !locationError && styles.locationText]} numberOfLines={1}>
                {locationError || weatherData.city}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function getMockData(city: string): WeatherData {
  const weathers = ['晴', '多云', '阴', '小雨'];
  const now = new Date();

  return {
    city,
    temperature: `${Math.floor(Math.random() * 15) + 15}`,
    weather: weathers[Math.floor(Math.random() * weathers.length)],
    humidity: `${Math.floor(Math.random() * 30) + 40}`,
    wind: '东南风3级',
    updateTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
  };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    // 玻璃拟态阴影
    shadowColor: '#6C9BCF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    // 高光边框
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  glassLayer: {
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  greetingBox: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  timeBox: {
    alignItems: 'flex-end' as const,
    flexShrink: 0,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
  },
  weatherIconBubble: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    // 微妙阴影
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  iconGradient: {
    width: 48,
    height: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tempText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#0F172A',
    marginLeft: Spacing.md,
  },
  weatherText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: Spacing.sm,
    fontWeight: '500' as const,
  },
  weatherDetails: {
    flex: 1,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginLeft: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginLeft: Spacing.md,
  },
  detailIconBg: {
    width: 20,
    height: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(148,163,184,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500' as const,
  },
  locationText: {
    color: '#34D399',
    fontWeight: '600' as const,
  },
});

export default WeatherCard;
