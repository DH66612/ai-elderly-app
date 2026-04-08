/**
 * 地图导航工具
 * 支持调起高德地图、百度地图、苹果地图进行导航
 */
import { Linking, Platform, ActionSheetIOS, Alert } from 'react-native';

// 地图App配置
const MAP_APPS = {
  amap: {
    name: '高德地图',
    scheme: Platform.OS === 'ios' ? 'iosamap://' : 'androidamap://',
    urlTemplate: {
      ios: (lat: number, lng: number, name: string) => 
        `iosamap://viewMap?sourceApplication=AI助老&poiname=${encodeURIComponent(name)}&lat=${lat}&lon=${lng}&dev=0`,
      android: (lat: number, lng: number, name: string) =>
        `androidamap://viewMap?sourceApplication=AI助老&poiname=${encodeURIComponent(name)}&lat=${lat}&lon=${lng}&dev=0`,
    },
    storeUrl: 'https://apps.apple.com/cn/app/id461703208',
  },
  baidu: {
    name: '百度地图',
    scheme: 'baidumap://',
    urlTemplate: {
      ios: (lat: number, lng: number, name: string) =>
        `baidumap://map/marker?location=${lat},${lng}&title=${encodeURIComponent(name)}&src=AI助老`,
      android: (lat: number, lng: number, name: string) =>
        `baidumap://map/marker?location=${lat},${lng}&title=${encodeURIComponent(name)}&src=AI助老`,
    },
    storeUrl: 'https://apps.apple.com/cn/app/id452186370',
  },
  apple: {
    name: '苹果地图',
    scheme: 'maps://',
    urlTemplate: {
      ios: (lat: number, lng: number, name: string) =>
        `maps://?q=${encodeURIComponent(name)}&ll=${lat},${lng}`,
      android: () => '', // Android不支持
    },
    storeUrl: '',
  },
};

/**
 * 检查地图App是否已安装
 */
async function isAppInstalled(scheme: string): Promise<boolean> {
  try {
    return await Linking.canOpenURL(scheme);
  } catch {
    return false;
  }
}

/**
 * 获取已安装的地图App列表
 */
async function getInstalledMaps(): Promise<{ key: string; name: string }[]> {
  const installed: { key: string; name: string }[] = [];

  for (const [key, app] of Object.entries(MAP_APPS)) {
    // 苹果地图只在iOS上可用
    if (key === 'apple' && Platform.OS !== 'ios') continue;
    
    const isInstalled = await isAppInstalled(app.scheme);
    if (isInstalled) {
      installed.push({ key, name: app.name });
    }
  }

  return installed;
}

/**
 * 打开地图App进行导航
 */
async function openMapApp(
  appKey: string,
  lat: number,
  lng: number,
  name: string
): Promise<boolean> {
  const app = MAP_APPS[appKey as keyof typeof MAP_APPS];
  if (!app) return false;

  const url = Platform.OS === 'ios'
    ? app.urlTemplate.ios(lat, lng, name)
    : app.urlTemplate.android(lat, lng, name);

  if (!url) return false;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch (error) {
    console.error('Open map app error:', error);
  }

  return false;
}

/**
 * 调起地图导航（显示选择器）
 * @param lat 目的地纬度
 * @param lng 目的地经度
 * @param name 目的地名称
 */
export async function navigateToDestination(
  lat: number,
  lng: number,
  name: string
): Promise<void> {
  // Web端：打开网页版高德地图
  if (Platform.OS === 'web') {
    const webUrl = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&coordinate=wgs84`;
    window.open(webUrl, '_blank');
    return;
  }

  // 获取已安装的地图App
  const installedMaps = await getInstalledMaps();

  if (installedMaps.length === 0) {
    Alert.alert(
      '提示',
      '未检测到地图应用，请先安装高德地图或百度地图',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '下载高德地图',
          onPress: () => Linking.openURL(MAP_APPS.amap.storeUrl),
        },
      ]
    );
    return;
  }

  // iOS: 使用ActionSheet
  if (Platform.OS === 'ios') {
    const options = [...installedMaps.map(m => m.name), '取消'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: '选择地图应用',
        options,
        cancelButtonIndex: options.length - 1,
      },
      async (buttonIndex) => {
        if (buttonIndex < installedMaps.length) {
          const selected = installedMaps[buttonIndex];
          const success = await openMapApp(selected.key, lat, lng, name);
          if (!success) {
            Alert.alert('错误', '打开地图应用失败');
          }
        }
      }
    );
    return;
  }

  // Android: 使用Alert
  const buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = 
    installedMaps.map(m => ({
      text: m.name,
      onPress: async () => {
        const success = await openMapApp(m.key, lat, lng, name);
        if (!success) {
          Alert.alert('错误', '打开地图应用失败');
        }
      },
    }));

  buttons.push({ text: '取消', style: 'cancel' });

  Alert.alert('选择地图应用', '', buttons);
}

/**
 * 直接调起高德地图导航
 */
export async function navigateWithAmap(
  lat: number,
  lng: number,
  name: string
): Promise<boolean> {
  return openMapApp('amap', lat, lng, name);
}

/**
 * 直接调起百度地图导航
 */
export async function navigateWithBaidu(
  lat: number,
  lng: number,
  name: string
): Promise<boolean> {
  return openMapApp('baidu', lat, lng, name);
}
