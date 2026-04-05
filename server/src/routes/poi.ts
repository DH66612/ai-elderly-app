import express from 'express';
import { z } from 'zod';

const router = express.Router();

// 高德地图API Key（需要从环境变量获取）
const AMAP_KEY = process.env.AMAP_KEY || '';

// POI类型编码
const POI_TYPES = {
  hospital: '090100|090200|090300|090400', // 综合医院、专科医院、诊所、急救中心
  pharmacy: '090600', // 药店
  community: '180100|180200|180300', // 社区服务中心、养老院、福利院
};

// POI类型中文名称
const POI_TYPE_NAMES: Record<string, string> = {
  hospital: '医院',
  pharmacy: '药店',
  community: '社区服务中心',
};

// 模拟数据（当API Key未配置时使用）
const MOCK_POIS = {
  hospital: [
    { id: 'h1', name: '北京市海淀区中医院', address: '海淀区中关村南大街甲12号', distance: '450', tel: '010-62563322' },
    { id: 'h2', name: '北京大学第三医院', address: '海淀区花园北路49号', distance: '1200', tel: '010-82266699' },
    { id: 'h3', name: '海淀区社区卫生服务中心', address: '海淀区中关村大街28号', distance: '800', tel: '010-62551234' },
    { id: 'h4', name: '中关村医院', address: '海淀区中关村南路8号', distance: '650', tel: '010-62558888' },
    { id: 'h5', name: '北京市海淀医院', address: '海淀区海淀路19号', distance: '1500', tel: '010-62551133' },
  ],
  pharmacy: [
    { id: 'p1', name: '同仁堂药店(中关村店)', address: '海淀区中关村大街18号', distance: '120', tel: '010-62551234' },
    { id: 'p2', name: '大参林药房', address: '海淀区中关村南大街5号', distance: '350', tel: '010-62558888' },
    { id: 'p3', name: '金象大药房', address: '海淀区海淀路12号', distance: '580', tel: '010-62556666' },
    { id: 'p4', name: '国大药房(中关村店)', address: '海淀区中关村大街22号', distance: '200', tel: '010-62557777' },
    { id: 'p5', name: '百姓阳光药店', address: '海淀区中关村南路3号', distance: '420', tel: '010-62559999' },
  ],
  community: [
    { id: 'c1', name: '中关村街道办事处', address: '海淀区中关村南三街8号', distance: '300', tel: '010-62552222' },
    { id: 'c2', name: '海淀街道社区服务中心', address: '海淀区海淀路15号', distance: '550', tel: '010-62553333' },
    { id: 'c3', name: '中关村社区养老服务站', address: '海淀区中关村大街25号', distance: '280', tel: '010-62554444' },
    { id: 'c4', name: '海淀区老年活动中心', address: '海淀区中关村南大街10号', distance: '720', tel: '010-62555555' },
  ],
};

// 搜索参数校验
const searchSchema = z.object({
  location: z.string().regex(/^\d+\.\d+,\d+\.\d+$/, '经纬度格式错误，应为：经度,纬度'),
  type: z.enum(['hospital', 'pharmacy', 'community']),
  radius: z.string().optional().default('3000'), // 默认3公里
});

// 地理编码参数校验
const geocodeSchema = z.object({
  address: z.string().min(1, '地址不能为空'),
  city: z.string().optional(),
});

// POI数据结构
interface POIItem {
  id: string;
  name: string;
  type?: string;
  typecode?: string;
  address: string;
  location?: string;
  pname?: string; // 省
  cityname?: string; // 市
  adname?: string; // 区
  distance?: string;
  tel?: string;
}

/**
 * 根据地址获取经纬度（地理编码）
 * GET /api/v1/poi/geocode
 */
router.get('/geocode', async (req, res) => {
  try {
    const { address, city } = geocodeSchema.parse(req.query);

    if (!AMAP_KEY) {
      // 无API Key时返回模拟数据（北京中关村坐标）
      console.log('[POI] 使用模拟地理编码数据');
      return res.json({
        location: '116.310003,39.991957', // 北京中关村坐标
        formattedAddress: address,
        province: '北京市',
        city: '北京市',
        district: '海淀区',
        _mock: true,
      });
    }

    const url = new URL('https://restapi.amap.com/v3/geocode/geo');
    url.searchParams.set('key', AMAP_KEY);
    url.searchParams.set('address', address);
    if (city) {
      url.searchParams.set('city', city);
    }

    const response = await fetch(url.toString());
    const data = await response.json() as any;

    if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
      return res.status(404).json({ error: '未找到该地址对应的坐标' });
    }

    const geocode = data.geocodes[0];
    res.json({
      location: geocode.location, // 经度,纬度
      formattedAddress: geocode.formatted_address,
      province: geocode.province,
      city: geocode.city,
      district: geocode.district,
    });
  } catch (error) {
    console.error('Geocode error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: '地理编码失败' });
  }
});

/**
 * 周边POI搜索
 * GET /api/v1/poi/search
 */
router.get('/search', async (req, res) => {
  try {
    const { location, type, radius } = searchSchema.parse(req.query);

    if (!AMAP_KEY) {
      // 无API Key时返回模拟数据
      console.log(`[POI] 使用模拟${POI_TYPE_NAMES[type]}数据`);
      const mockPois = MOCK_POIS[type] || [];
      return res.json({
        type,
        typeName: POI_TYPE_NAMES[type],
        center: location,
        radius,
        count: mockPois.length,
        pois: mockPois.map(poi => ({ ...poi, location, type: POI_TYPE_NAMES[type] })),
        _mock: true,
      });
    }

    const types = POI_TYPES[type];
    const url = new URL('https://restapi.amap.com/v3/place/around');
    url.searchParams.set('key', AMAP_KEY);
    url.searchParams.set('location', location);
    url.searchParams.set('types', types);
    url.searchParams.set('radius', radius);
    url.searchParams.set('sortrule', 'distance'); // 按距离排序
    url.searchParams.set('offset', '20'); // 每页数量
    url.searchParams.set('page', '1');
    url.searchParams.set('extensions', 'all'); // 返回详细信息

    const response = await fetch(url.toString());
    const data = await response.json() as any;

    if (data.status !== '1') {
      return res.status(500).json({ error: 'POI搜索失败' });
    }

    // 处理POI数据
    const pois: POIItem[] = (data.pois || []).map((poi: any) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      typecode: poi.typecode,
      address: poi.address,
      location: poi.location,
      pname: poi.pname,
      cityname: poi.cityname,
      adname: poi.adname,
      distance: poi.distance,
      tel: poi.tel,
    }));

    res.json({
      type,
      typeName: POI_TYPE_NAMES[type],
      center: location,
      radius,
      count: pois.length,
      pois,
    });
  } catch (error) {
    console.error('POI search error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: 'POI搜索失败' });
  }
});

/**
 * 批量搜索多种类型的POI
 * GET /api/v1/poi/search-all
 */
router.get('/search-all', async (req, res) => {
  try {
    const { location, radius } = req.query;

    if (!location || typeof location !== 'string') {
      return res.status(400).json({ error: '缺少location参数' });
    }

    if (!AMAP_KEY) {
      // 无API Key时返回模拟数据
      console.log('[POI] 使用模拟附近设施数据');
      const types = ['hospital', 'pharmacy', 'community'] as const;
      return res.json({
        center: location,
        radius: radius || '3000',
        categories: types.map(type => ({
          type,
          typeName: POI_TYPE_NAMES[type],
          pois: (MOCK_POIS[type] || []).map(poi => ({ ...poi, location, type: POI_TYPE_NAMES[type] })),
        })),
        _mock: true,
      });
    }

    // 并行搜索三种类型
    const types = ['hospital', 'pharmacy', 'community'] as const;
    const searchRadius = (radius as string) || '3000';

    const results = await Promise.all(
      types.map(async (type) => {
        const typesCode = POI_TYPES[type];
        const url = new URL('https://restapi.amap.com/v3/place/around');
        url.searchParams.set('key', AMAP_KEY);
        url.searchParams.set('location', location);
        url.searchParams.set('types', typesCode);
        url.searchParams.set('radius', searchRadius);
        url.searchParams.set('sortrule', 'distance');
        url.searchParams.set('offset', '10'); // 每种类型返回10条
        url.searchParams.set('page', '1');
        url.searchParams.set('extensions', 'all');

        try {
          const response = await fetch(url.toString());
          const data = await response.json() as any;

          if (data.status !== '1') {
            return { type, typeName: POI_TYPE_NAMES[type], pois: [] };
          }

          const pois = (data.pois || []).map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            type: poi.type,
            address: poi.address,
            location: poi.location,
            distance: poi.distance,
            tel: poi.tel,
          }));

          return { type, typeName: POI_TYPE_NAMES[type], pois };
        } catch {
          return { type, typeName: POI_TYPE_NAMES[type], pois: [] };
        }
      })
    );

    res.json({
      center: location,
      radius: searchRadius,
      categories: results,
    });
  } catch (error) {
    console.error('POI search-all error:', error);
    res.status(500).json({ error: 'POI搜索失败' });
  }
});

export default router;
