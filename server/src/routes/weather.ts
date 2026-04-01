/**
 * 天气API路由
 * 支持经纬度查询，获取精准天气数据
 * 支持IP定位（高德地图API）
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// 高德地图API Key
const AMAP_KEY = process.env.AMAP_KEY || '';

/**
 * 使用高德地图IP定位获取城市信息
 * @param ip 用户IP地址（可选，不传则自动获取）
 * @returns 城市信息和经纬度
 */
async function getLocationByIP(ip?: string): Promise<{ city: string; lat: number; lon: number } | null> {
  if (!AMAP_KEY) {
    console.log('[Weather] 高德地图API Key未配置');
    return null;
  }
  
  try {
    const url = new URL('https://restapi.amap.com/v3/ip');
    url.searchParams.set('key', AMAP_KEY);
    if (ip) {
      url.searchParams.set('ip', ip);
    }
    
    const response = await fetch(url.toString());
    const data = await response.json() as {
      status: string;
      province?: string;
      city?: string;
      rectangle?: string; // "左下经度,左下纬度;右上经度,右上纬度"
    };
    
    console.log('[Weather] IP定位结果:', data);
    
    if (data.status === '1' && data.city) {
      // 从rectangle中提取中心点坐标
      let lat = 0, lon = 0;
      if (data.rectangle) {
        const coords = data.rectangle.split(';');
        if (coords.length === 2) {
          const [lon1, lat1] = coords[0].split(',').map(Number);
          const [lon2, lat2] = coords[1].split(',').map(Number);
          lon = (lon1 + lon2) / 2;
          lat = (lat1 + lat2) / 2;
        }
      }
      
      return {
        city: data.city,
        lat,
        lon,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Weather] IP定位失败:', error);
    return null;
  }
}

/**
 * GET /api/v1/weather/ip-locate
 * 使用IP定位获取用户位置
 */
router.get('/ip-locate', async (req: Request, res: Response) => {
  try {
    // 获取客户端IP
    const clientIP = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string ||
                     req.socket.remoteAddress || '';
    
    // 清理IP地址（移除端口号等）
    const cleanIP = clientIP.split(',')[0].trim().replace(/::ffff:/, '');
    
    console.log('[Weather] 客户端IP:', cleanIP);
    
    const location = await getLocationByIP(cleanIP);
    
    if (location) {
      res.json({
        success: true,
        data: location,
      });
    } else {
      res.json({
        success: false,
        error: '无法获取位置',
        data: { city: '北京', lat: 39.9042, lon: 116.4074 }, // 默认北京
      });
    }
  } catch (error) {
    console.error('[Weather] IP定位接口错误:', error);
    res.json({
      success: false,
      error: '定位失败',
      data: { city: '北京', lat: 39.9042, lon: 116.4074 },
    });
  }
});

/**
 * 使用高德地图逆地理编码获取城市名
 * @param lat 纬度
 * @param lon 经度
 * @returns 城市名（中文）
 */
async function getCityNameByCoords(lat: number, lon: number): Promise<string> {
  if (!AMAP_KEY) {
    console.log('[Weather] 高德地图API Key未配置，使用wttr.in返回的城市名');
    return '';
  }
  
  try {
    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.set('key', AMAP_KEY);
    url.searchParams.set('location', `${lon},${lat}`); // 注意：高德是经度在前
    url.searchParams.set('radius', '1000');
    url.searchParams.set('extensions', 'base');
    
    const response = await fetch(url.toString());
    const data = await response.json() as {
      status: string;
      regeocode?: {
        addressComponent?: {
          province?: string;
          city?: string;
          district?: string;
        };
      };
    };
    
    if (data.status === '1' && data.regeocode?.addressComponent) {
      const { province, city, district } = data.regeocode.addressComponent;
      // 优先返回城市，如果是直辖市则返回区
      if (city && city.length > 0) {
        return city;
      }
      if (district && district.length > 0) {
        return district;
      }
      if (province && province.length > 0) {
        return province;
      }
    }
    
    return '';
  } catch (error) {
    console.error('[Weather] 高德逆地理编码失败:', error);
    return '';
  }
}

// 常见城市中英文对照表
const CITY_NAME_MAP: Record<string, string> = {
  'beijing': '北京',
  'shanghai': '上海',
  'guangzhou': '广州',
  'shenzhen': '深圳',
  'hangzhou': '杭州',
  'nanjing': '南京',
  'chengdu': '成都',
  'wuhan': '武汉',
  'xian': '西安',
  'chongqing': '重庆',
  'tianjin': '天津',
  'suzhou': '苏州',
  'qingdao': '青岛',
  'dalian': '大连',
  'ningbo': '宁波',
  'xiamen': '厦门',
  'fuzhou': '福州',
  'changsha': '长沙',
  'zhengzhou': '郑州',
  'shenyang': '沈阳',
  'harbin': '哈尔滨',
  'changchun': '长春',
  'shijiazhuang': '石家庄',
  'jinan': '济南',
  'hefei': '合肥',
  'nanchang': '南昌',
  'kunming': '昆明',
  'guiyang': '贵阳',
  'nanning': '南宁',
  'haikou': '海口',
  'lhasa': '拉萨',
  'urumqi': '乌鲁木齐',
  'yinchuan': '银川',
  'xining': '西宁',
  'lanzhou': '兰州',
  'hohhot': '呼和浩特',
  'taiyuan': '太原',
  'dongguan': '东莞',
  'foshan': '佛山',
  'zhuhai': '珠海',
  'wuxi': '无锡',
  'wenzhou': '温州',
  'shaoxing': '绍兴',
  'jiaxing': '嘉兴',
  'yangzhou': '扬州',
  'zhenjiang': '镇江',
  'changzhou': '常州',
  'nantong': '南通',
  'taizhou': '台州',
  'jinhua': '金华',
  'huzhou': '湖州',
  'lishui': '丽水',
  'zhoushan': '舟山',
  'quzhou': '衢州',
};

/**
 * 翻译城市名（英文转中文）
 */
function translateCityName(name: string): string {
  const lowerName = name.toLowerCase().trim();
  
  // 直接匹配
  if (CITY_NAME_MAP[lowerName]) {
    return CITY_NAME_MAP[lowerName];
  }
  
  // 检查是否包含城市名
  for (const [en, cn] of Object.entries(CITY_NAME_MAP)) {
    if (lowerName.includes(en) || en.includes(lowerName)) {
      return cn;
    }
  }
  
  // 如果已经是中文，直接返回
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name;
  }
  
  // 无法翻译，返回原名
  return name;
}

interface WeatherResponse {
  success: boolean;
  data: {
    city: string;
    temperature: string;
    weather: string;
    humidity: string;
    wind: string;
    updateTime: string;
    forecast: Array<{
      day: string;
      weather: string;
      tempHigh: string;
      tempLow: string;
    }>;
  } | null;
  error?: string;
}

/**
 * GET /api/v1/weather
 * 获取实时天气数据
 * Query参数:
 * - lat: 纬度
 * - lon: 经度
 * - city: 城市名称（备选）
 */
router.get('/', async (req: Request, res: Response) => {
  const { lat, lon, city = '北京' } = req.query;

  try {
    let weatherData;
    
    // 优先使用经纬度查询（更精准）
    if (lat && lon) {
      weatherData = await fetchWeatherByCoords(
        parseFloat(lat as string), 
        parseFloat(lon as string)
      );
    } else {
      // 备选：使用城市名查询
      weatherData = await fetchWeatherByCity(city as string);
    }
    
    const response: WeatherResponse = {
      success: true,
      data: weatherData,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Weather API error:', error);
    
    // API失败时返回模拟数据
    const mockData = generateMockWeatherData(city as string);
    
    const response: WeatherResponse = {
      success: true,
      data: mockData,
    };
    
    res.json(response);
  }
});

/**
 * 根据经纬度获取天气（精准定位）
 */
async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherResponse['data']> {
  // 并行获取天气数据和城市名
  const [weatherResponse, amapCityName] = await Promise.all([
    fetch(`https://wttr.in/${lat},${lon}?format=j1`),
    getCityNameByCoords(lat, lon),
  ]);
  
  if (!weatherResponse.ok) {
    throw new Error('Weather API request failed');
  }
  
  const data = await weatherResponse.json() as {
    current_condition: Array<{
      temp_C: string;
      humidity: string;
      winddir16Point: string;
      windspeedKmph: string;
      weatherDesc: Array<{ value: string }>;
    }>;
    nearest_area: Array<{
      areaName: Array<{ value: string }>;
      region: Array<{ value: string }>;
    }>;
    weather: Array<{
      date: string;
      maxtempC: string;
      mintempC: string;
      hourly: Array<{
        weatherDesc: Array<{ value: string }>;
      }>;
    }>;
  };
  
  const current = data.current_condition[0];
  const forecast = data.weather.slice(0, 3);
  
  // 优先使用高德地图返回的城市名，否则使用wttr.in的并翻译
  let cityName: string;
  if (amapCityName && amapCityName.length > 0) {
    cityName = amapCityName;
    console.log(`[Weather] 使用高德地图城市名: ${cityName}`);
  } else {
    const nearest = data.nearest_area?.[0];
    const rawCityName = nearest?.areaName?.[0]?.value || nearest?.region?.[0]?.value || '当前位置';
    cityName = translateCityName(rawCityName);
    console.log(`[Weather] 使用wttr.in城市名: ${rawCityName} -> ${cityName}`);
  }
  
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const now = new Date();
  
  return {
    city: cityName,
    temperature: current.temp_C,
    weather: translateWeather(current.weatherDesc[0].value),
    humidity: current.humidity,
    wind: `${current.winddir16Point} ${current.windspeedKmph}km/h`,
    updateTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
    forecast: forecast.map((day) => {
      const date = new Date(day.date);
      return {
        day: weekDays[date.getDay()],
        weather: translateWeather(day.hourly[4].weatherDesc[0].value),
        tempHigh: day.maxtempC,
        tempLow: day.mintempC,
      };
    }),
  };
}

/**
 * 根据城市名获取天气
 */
async function fetchWeatherByCity(city: string): Promise<WeatherResponse['data']> {
  const response = await fetch(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1`
  );
  
  if (!response.ok) {
    throw new Error('Weather API request failed');
  }
  
  const data = await response.json() as {
    current_condition: Array<{
      temp_C: string;
      humidity: string;
      winddir16Point: string;
      windspeedKmph: string;
      weatherDesc: Array<{ value: string }>;
    }>;
    weather: Array<{
      date: string;
      maxtempC: string;
      mintempC: string;
      hourly: Array<{
        weatherDesc: Array<{ value: string }>;
      }>;
    }>;
  };
  
  const current = data.current_condition[0];
  const forecast = data.weather.slice(0, 3);
  
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const now = new Date();
  
  // 翻译城市名
  const translatedCity = translateCityName(city as string);
  
  return {
    city: translatedCity,
    temperature: current.temp_C,
    weather: translateWeather(current.weatherDesc[0].value),
    humidity: current.humidity,
    wind: `${current.winddir16Point} ${current.windspeedKmph}km/h`,
    updateTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
    forecast: forecast.map((day) => {
      const date = new Date(day.date);
      return {
        day: weekDays[date.getDay()],
        weather: translateWeather(day.hourly[4].weatherDesc[0].value),
        tempHigh: day.maxtempC,
        tempLow: day.mintempC,
      };
    }),
  };
}

/**
 * 翻译天气描述
 */
function translateWeather(desc: string): string {
  const lowerDesc = desc.toLowerCase();
  
  if (lowerDesc.includes('sunny') || lowerDesc.includes('clear')) return '晴';
  if (lowerDesc.includes('cloud') && lowerDesc.includes('sun')) return '多云';
  if (lowerDesc.includes('cloud') || lowerDesc.includes('overcast')) return '阴';
  if (lowerDesc.includes('rain') || lowerDesc.includes('shower')) return '雨';
  if (lowerDesc.includes('snow')) return '雪';
  if (lowerDesc.includes('fog')) return '雾';
  if (lowerDesc.includes('mist') || lowerDesc.includes('haze')) return '霾';
  if (lowerDesc.includes('thunder')) return '雷阵雨';
  if (lowerDesc.includes('drizzle')) return '小雨';
  if (lowerDesc.includes('heavy rain') || lowerDesc.includes('downpour')) return '大雨';
  if (lowerDesc.includes('sleet')) return '雨夹雪';
  if (lowerDesc.includes('ice')) return '冰雹';
  if (lowerDesc.includes('dust') || lowerDesc.includes('sand')) return '沙尘';
  if (lowerDesc.includes('wind') || lowerDesc.includes('gale')) return '大风';
  
  // 如果没有匹配，返回通用描述
  if (lowerDesc.includes('partly')) return '多云';
  
  return '多云';
}

/**
 * 生成模拟天气数据
 */
function generateMockWeatherData(city: string): WeatherResponse['data'] {
  const weathers = ['晴', '多云', '阴', '小雨'];
  const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
  const randomTemp = Math.floor(Math.random() * 15) + 15;
  const randomHumidity = Math.floor(Math.random() * 30) + 40;

  const now = new Date();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  return {
    city,
    temperature: `${randomTemp}`,
    weather: randomWeather,
    humidity: `${randomHumidity}`,
    wind: '东南风 3级',
    updateTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
    forecast: [
      {
        day: weekDays[(now.getDay() + 1) % 7],
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        tempHigh: `${randomTemp + 2}`,
        tempLow: `${randomTemp - 3}`,
      },
      {
        day: weekDays[(now.getDay() + 2) % 7],
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        tempHigh: `${randomTemp + 1}`,
        tempLow: `${randomTemp - 2}`,
      },
      {
        day: weekDays[(now.getDay() + 3) % 7],
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        tempHigh: `${randomTemp}`,
        tempLow: `${randomTemp - 4}`,
      },
    ],
  };
}

export default router;
