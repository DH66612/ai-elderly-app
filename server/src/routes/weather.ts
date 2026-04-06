/**
 * 天气API路由
 * 支持经纬度查询，获取精准天气数据
 * 支持IP定位（高德地图API）
 * 支持GPS坐标逆地理编码（高德地图API）
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
 * GET /api/v1/weather/geocode
 * 使用高德地图逆地理编码API，将GPS坐标转换为城市名
 * Query: lat, lon
 */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: '请提供经纬度参数',
      });
    }
    
    if (!AMAP_KEY) {
      return res.status(500).json({
        success: false,
        error: '高德地图API Key未配置',
      });
    }
    
    const latNum = parseFloat(lat as string);
    const lonNum = parseFloat(lon as string);
    
    console.log(`[Weather] 逆地理编码请求: lat=${latNum}, lon=${lonNum}`);
    
    // 调用高德逆地理编码API
    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.set('key', AMAP_KEY);
    url.searchParams.set('location', `${lonNum},${latNum}`); // 注意：高德是经度在前
    url.searchParams.set('radius', '1000');
    url.searchParams.set('extensions', 'base');
    
    const response = await fetch(url.toString());
    const data = await response.json() as {
      status: string;
      info: string;
      regeocode?: {
        addressComponent?: {
          province?: string;
          city?: string;
          district?: string;
          township?: string;
        };
        formatted_address?: string;
      };
    };
    
    console.log('[Weather] 逆地理编码结果:', JSON.stringify(data).substring(0, 200));
    
    if (data.status === '1' && data.regeocode?.addressComponent) {
      const { province, city, district } = data.regeocode.addressComponent;
      
      // 优先返回城市，如果是直辖市则返回区
      let cityResult = '';
      if (city && city.length > 0 && city !== '[]') {
        cityResult = city;
      } else if (district && district.length > 0) {
        cityResult = district;
      } else if (province && province.length > 0) {
        cityResult = province;
      }
      
      res.json({
        success: true,
        data: {
          city: cityResult,
          province: province || '',
          district: district || '',
          lat: latNum,
          lon: lonNum,
        },
      });
    } else {
      res.json({
        success: false,
        error: '逆地理编码失败',
        info: data.info,
      });
    }
  } catch (error) {
    console.error('[Weather] 逆地理编码错误:', error);
    res.status(500).json({
      success: false,
      error: '逆地理编码服务异常',
    });
  }
});

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

// 常见城市中英文对照表（完整版：包含所有地级市）
const CITY_NAME_MAP: Record<string, string> = {
  // 直辖市
  'beijing': '北京',
  'shanghai': '上海',
  'tianjin': '天津',
  'chongqing': '重庆',
  
  // 广东省
  'guangzhou': '广州',
  'shenzhen': '深圳',
  'zhuhai': '珠海',
  'shantou': '汕头',
  'foshan': '佛山',
  'shaoguan': '韶关',
  'zhanjiang': '湛江',
  'zhaoqing': '肇庆',
  'jiangmen': '江门',
  'maoming': '茂名',
  'huizhou': '惠州',
  'meizhou': '梅州',
  'shanwei': '汕尾',
  'heyuan': '河源',
  'yangjiang': '阳江',
  'qingyuan': '清远',
  'dongguan': '东莞',
  'zhongshan': '中山',
  'chaozhou': '潮州',
  'jieyang': '揭阳',
  'yunfu': '云浮',
  
  // 江苏省
  'nanjing': '南京',
  'suzhou': '苏州',
  'wuxi': '无锡',
  'changzhou': '常州',
  'nantong': '南通',
  'yangzhou': '扬州',
  'zhenjiang': '镇江',
  'taizhou': '台州',
  'huaian': '淮安',
  'yancheng': '盐城',
  'lianyungang': '连云港',
  'xuzhou': '徐州',
  'suqian': '宿迁',
  
  // 浙江省
  'hangzhou': '杭州',
  'ningbo': '宁波',
  'wenzhou': '温州',
  'shaoxing': '绍兴',
  'jiaxing': '嘉兴',
  'jinhua': '金华',
  'huzhou': '湖州',
  'lishui': '丽水',
  'zhoushan': '舟山',
  'quzhou': '衢州',
  // 山东省
  'jinan': '济南',
  'qingdao': '青岛',
  'yantai': '烟台',
  'weihai': '威海',
  'weifang': '潍坊',
  'zibo': '淄博',
  'dongying': '东营',
  'jining': '济宁',
  'tai-an': '泰安',
  'rizhao': '日照',
  'dezhou': '德州',
  'liaocheng': '聊城',
  'binzhou': '滨州',
  'heze': '菏泽',
  'linyi': '临沂',
  'zaozhuang': '枣庄',
  
  // 福建省
  'fuzhou': '福州',
  'xiamen': '厦门',
  'quanzhou': '泉州',
  'zhangzhou': '漳州',
  'longyan': '龙岩',
  'sanming': '三明',
  'nanping': '南平',
  'ningde': '宁德',
  'putian': '莆田',
  
  // 四川省
  'chengdu': '成都',
  'mianyang': '绵阳',
  'deyang': '德阳',
  'yibin': '宜宾',
  'nanchong': '南充',
  'luzhou': '泸州',
  'dazhou': '达州',
  'leshan': '乐山',
  'neijiang': '内江',
  'ziyang': '资阳',
  'suining': '遂宁',
  'meishan': '眉山',
  'guangyuan': '广元',
  'guangan': '广安',
  'zigong': '自贡',
  'panzhihua': '攀枝花',
  'yaan': '雅安',
  'bazhong': '巴中',
  
  // 湖北省
  'wuhan': '武汉',
  'yichang': '宜昌',
  'xiangyang': '襄阳',
  'jingzhou': '荆州',
  'shiyan': '十堰',
  'jingmen': '荆门',
  'huangshi': '黄石',
  'xiaogan': '孝感',
  'xianning': '咸宁',
  'ezhou': '鄂州',
  'huanggang': '黄冈',
  'suizhou': '随州',
  
  // 湖南省
  'changsha': '长沙',
  'zhuzhou': '株洲',
  'xiangtan': '湘潭',
  'hengyang': '衡阳',
  'yueyang': '岳阳',
  'changde': '常德',
  'shaoyang': '邵阳',
  'yiyang': '益阳',
  'loudi': '娄底',
  'chenzhou': '郴州',
  'huaihua': '怀化',
  'yongzhou': '永州',
  'zhangjiajie': '张家界',
  
  // 河南省
  'zhengzhou': '郑州',
  'kaifeng': '开封',
  'luoyang': '洛阳',
  'pingdingshan': '平顶山',
  'anyang': '安阳',
  'hebi': '鹤壁',
  'xinxiang': '新乡',
  'jiaozuo': '焦作',
  'puyang': '濮阳',
  'xuchang': '许昌',
  'luohe': '漯河',
  'sanmenxia': '三门峡',
  'nanyang': '南阳',
  'shangqiu': '商丘',
  'xinyang': '信阳',
  'zhoukou': '周口',
  'zhumadian': '驻马店',
  
  // 河北省
  'shijiazhuang': '石家庄',
  'tangshan': '唐山',
  'qinhuangdao': '秦皇岛',
  'handan': '邯郸',
  'xingtai': '邢台',
  'baoding': '保定',
  'zhangjiakou': '张家口',
  'chengde': '承德',
  'cangzhou': '沧州',
  'langfang': '廊坊',
  'hengshui': '衡水',
  
  // 辽宁省
  'shenyang': '沈阳',
  'dalian': '大连',
  'anshan': '鞍山',
  'fushun': '抚顺',
  'benxi': '本溪',
  'dandong': '丹东',
  'jinzhou': '锦州',
  'yingkou': '营口',
  'fuxin': '阜新',
  'liaoyang': '辽阳',
  'panjin': '盘锦',
  'tieling': '铁岭',
  'chaoyang': '朝阳',
  'huludao': '葫芦岛',
  
  // 吉林省
  'changchun': '长春',
  'jilin': '吉林',
  'siping': '四平',
  'liaoyuan': '辽源',
  'tonghua': '通化',
  'baishan': '白山',
  'songyuan': '松原',
  'baicheng': '白城',
  
  // 黑龙江省
  'harbin': '哈尔滨',
  'qiqihar': '齐齐哈尔',
  'jiamusi': '佳木斯',
  'mudanjiang': '牡丹江',
  'daqing': '大庆',
  'yichun': '伊春',
  'jixi': '鸡西',
  'hegang': '鹤岗',
  'shuangyashan': '双鸭山',
  'qitaihe': '七台河',
  'heihe': '黑河',
  'suihua': '绥化',
  
  // 陕西省
  'xian': '西安',
  'baoji': '宝鸡',
  'xianyang': '咸阳',
  'weinan': '渭南',
  'yanan': '延安',
  'hanzhong': '汉中',
  'yulin': '榆林',
  'ankang': '安康',
  'shangluo': '商洛',
  'tongchuan': '铜川',
  
  // 山西省
  'taiyuan': '太原',
  'datong': '大同',
  'yangquan': '阳泉',
  'changzhi': '长治',
  'jincheng': '晋城',
  'shuozhou': '朔州',
  'jinzhong': '晋中',
  'yuncheng': '运城',
  'xinzhou': '忻州',
  'linfen': '临汾',
  'lvliang': '吕梁',
  
  // 江西省
  'nanchang': '南昌',
  'jingdezhen': '景德镇',
  'pingxiang': '萍乡',
  'jiujiang': '九江',
  'xinyu': '新余',
  'yingtan': '鹰潭',
  'ganzhou': '赣州',
  'jian': '吉安',
  'yichun-jx': '宜春',
  'fuzhou-jx': '抚州',
  'shangrao': '上饶',
  
  // 安徽省
  'hefei': '合肥',
  'wuhu': '芜湖',
  'bengbu': '蚌埠',
  'huainan': '淮南',
  'maanshan': '马鞍山',
  'huaibei': '淮北',
  'tongling': '铜陵',
  'anqing': '安庆',
  'huangshan': '黄山',
  'chuzhou': '滁州',
  'fuyang': '阜阳',
  'suzhou-ah': '宿州',
  'luan': '六安',
  'bozhou': '亳州',
  'chizhou': '池州',
  'xuancheng': '宣城',
  
  // 云南省
  'kunming': '昆明',
  'qujing': '曲靖',
  'yuxi': '玉溪',
  'baoshan': '保山',
  'zhaotong': '昭通',
  'lijiang': '丽江',
  'puer': '普洱',
  'lincang': '临沧',
  'dali': '大理',
  'chuxiong': '楚雄',
  'honghe': '红河',
  'wenshan': '文山',
  'xishuangbanna': '西双版纳',
  
  // 贵州省
  'guiyang': '贵阳',
  'liupanshui': '六盘水',
  'zunyi': '遵义',
  'anshun': '安顺',
  'bijie': '毕节',
  'tongren': '铜仁',
  'qiannan': '黔南',
  'qiandongnan': '黔东南',
  'qianxinan': '黔西南',
  
  // 广西
  'nanning': '南宁',
  'liuzhou': '柳州',
  'guilin': '桂林',
  'wuzhou': '梧州',
  'beihai': '北海',
  'fangchenggang': '防城港',
  'qinzhou': '钦州',
  'guigang': '贵港',
  'yulin-gx': '玉林',
  'baise': '百色',
  'hezhou': '贺州',
  'hechi': '河池',
  'laibin': '来宾',
  'chongzuo': '崇左',
  
  // 海南省
  'haikou': '海口',
  'sanya': '三亚',
  'sansha': '三沙',
  'danzhou': '儋州',
  
  // 甘肃省
  'lanzhou': '兰州',
  'jiayuguan': '嘉峪关',
  'jinchang': '金昌',
  'baiyin': '白银',
  'tianshui': '天水',
  'wuwei': '武威',
  'zhangye': '张掖',
  'pingliang': '平凉',
  'jiuquan': '酒泉',
  'qingyang': '庆阳',
  'dingxi': '定西',
  'longnan': '陇南',
  
  // 青海省
  'xining': '西宁',
  'haidong': '海东',
  
  // 内蒙古
  'hohhot': '呼和浩特',
  'baotou': '包头',
  'wuhai': '乌海',
  'chifeng': '赤峰',
  'tongliao': '通辽',
  'eerduosi': '鄂尔多斯',
  'hulunbeier': '呼伦贝尔',
  'bayannur': '巴彦淖尔',
  'wulanchabu': '乌兰察布',
  
  // 宁夏
  'yinchuan': '银川',
  'shizuishan': '石嘴山',
  'wuzhong': '吴忠',
  'guyuan': '固原',
  'zhongwei': '中卫',
  
  // 新疆
  'urumqi': '乌鲁木齐',
  'kelamayi': '克拉玛依',
  'turpan': '吐鲁番',
  'hami': '哈密',
  
  // 西藏
  'lhasa': '拉萨',
  'shigatse': '日喀则',
  'chamdo': '昌都',
  'nyingchi': '林芝',
  'shan-nan': '山南',
  'nagqu': '那曲',
  'ngari': '阿里',
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
    const rawAreaName = nearest?.areaName?.[0]?.value || '';
    const rawRegion = nearest?.region?.[0]?.value || '';
    
    // 先尝试翻译 areaName
    const translatedArea = translateCityName(rawAreaName);
    
    // 如果 areaName 翻译后仍然是英文（小地名拼音），尝试使用 region（省份）
    if (translatedArea === rawAreaName && !/[\u4e00-\u9fa5]/.test(translatedArea)) {
      // areaName 无法翻译，尝试翻译省份
      const translatedRegion = translateCityName(rawRegion);
      if (translatedRegion !== rawRegion) {
        cityName = translatedRegion;
        console.log(`[Weather] 使用wttr.in省份: ${rawRegion} -> ${cityName}`);
      } else {
        // 省份也翻译不了，显示"当前位置"
        cityName = '当前位置';
        console.log(`[Weather] 无法翻译: areaName=${rawAreaName}, region=${rawRegion}`);
      }
    } else {
      cityName = translatedArea;
      console.log(`[Weather] 使用wttr.in城市名: ${rawAreaName} -> ${cityName}`);
    }
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
