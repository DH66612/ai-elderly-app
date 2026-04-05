/**
 * 老人端相册页面 - 适老化设计
 * 
 * 功能：
 * 1. 拍照功能
 * 2. 相册展示
 * 3. 照片预览
 * 4. 删除照片
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { documentDirectory } from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { HeartMeteors } from '@/components/HeartMeteors';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调 - 与老人端其他页面一致
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  danger: '#c27878',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
  cardBg: 'rgba(255, 255, 255, 0.95)',
};

interface PhotoItem {
  id: string;
  uri: string;
  createdAt: string;
}

// 相册存储路径（按用户隔离）
const getAlbumDir = (userId?: number | string) => {
  const uid = userId || 'default';
  return `${documentDirectory}album_${uid}/`;
};

export default function ElderlyAlbumScreen() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 加载相册照片
  useEffect(() => {
    if (user?.id) {
      loadPhotos();
    }
  }, [user?.id]);

  // 加载本地照片
  const loadPhotos = async () => {
    try {
      const albumDir = getAlbumDir(user?.id);
      
      // 确保相册目录存在
      const dirInfo = await FileSystem.getInfoAsync(albumDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(albumDir, { intermediates: true });
        setPhotos([]);
        return;
      }

      // 读取目录内容
      const files = await FileSystem.readDirectoryAsync(albumDir);
      const photoItems: PhotoItem[] = [];

      for (const file of files) {
        if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
          const filePath = `${albumDir}${file}`;
          const info = await FileSystem.getInfoAsync(filePath);
          photoItems.push({
            id: file,
            uri: filePath,
            createdAt: (info as any).modificationTime || new Date().toISOString(),
          });
        }
      }

      // 按时间倒序排列
      photoItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPhotos(photoItems);
    } catch (error) {
      console.error('加载相册失败:', error);
    }
  };

  // 拍照
  const handleTakePhoto = async () => {
    try {
      // 请求相机权限
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相机权限才能拍照');
        return;
      }

      setIsLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await savePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('拍照失败:', error);
      Alert.alert('错误', '拍照失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 从相册选择
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择照片');
        return;
      }

      setIsLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        for (const asset of result.assets) {
          await savePhoto(asset.uri);
        }
      }
    } catch (error) {
      console.error('选择照片失败:', error);
      Alert.alert('错误', '选择照片失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存照片到本地
  const savePhoto = async (uri: string) => {
    try {
      const albumDir = getAlbumDir(user?.id);
      
      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(albumDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(albumDir, { intermediates: true });
      }

      // 生成文件名
      const timestamp = new Date().getTime();
      const fileName = `photo_${timestamp}.jpg`;
      const destPath = `${albumDir}${fileName}`;

      // 复制文件
      await FileSystem.copyAsync({
        from: uri,
        to: destPath,
      });

      console.log('照片保存成功:', destPath);
      
      // 刷新照片列表
      await loadPhotos();
    } catch (error) {
      console.error('保存照片失败:', error);
      throw error;
    }
  };

  // 删除照片
  const handleDeletePhoto = (photo: PhotoItem) => {
    Alert.alert(
      '删除照片',
      '确定要删除这张照片吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(photo.uri);
              setPhotos(photos.filter((p) => p.id !== photo.id));
              setPreviewVisible(false);
              setSelectedPhoto(null);
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  // 预览照片
  const handlePreview = (photo: PhotoItem) => {
    setSelectedPhoto(photo);
    setPreviewVisible(true);
  };

  // 渲染照片项
  const renderPhotoItem = useCallback(
    ({ item }: { item: PhotoItem }) => (
      <TouchableOpacity
        style={styles.photoItem}
        onPress={() => handlePreview(item)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={styles.photoImage} />
      </TouchableOpacity>
    ),
    []
  );

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <HeartMeteors count={6} />

      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>相册</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 操作按钮 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
            <View style={[styles.buttonIcon, { backgroundColor: '#e3f2fd' }]}>
              <FontAwesome6 name="camera" size={32} color="#2196F3" />
            </View>
            <Text style={styles.buttonText}>拍照</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
            <View style={[styles.buttonIcon, { backgroundColor: '#e8f5e9' }]}>
              <FontAwesome6 name="images" size={32} color="#4CAF50" />
            </View>
            <Text style={styles.buttonText}>选择</Text>
          </TouchableOpacity>
        </View>

        {/* 相册统计 */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>共 {photos.length} 张照片</Text>
        </View>

        {/* 相册网格 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>处理中...</Text>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="images" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>还没有照片</Text>
            <Text style={styles.emptyHint}>点击上方按钮拍照或选择照片</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhotoItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.photoGrid}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 照片预览弹窗 */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPreviewVisible(false)}
          >
            <FontAwesome6 name="times" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePhoto(selectedPhoto)}
              >
                <FontAwesome6 name="trash" size={24} color="#fff" />
                <Text style={styles.deleteButtonText}>删除</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  container: {
    flex: 1,
    paddingTop: Spacing.xl,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.lg,
  },
  backIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.sm,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  statsContainer: {
    marginBottom: Spacing.md,
  },
  statsText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: Spacing['4xl'],
  },
  emptyText: {
    fontSize: 20,
    color: colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptyHint: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: Spacing.sm,
  },
  photoGrid: {
    paddingBottom: Spacing['4xl'],
  },
  photoItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
  },
  photoImage: {
    flex: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  closeButton: {
    position: 'absolute' as const,
    top: Spacing['3xl'],
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },
  previewImage: {
    width: '90%' as const,
    height: '70%' as const,
  },
  deleteButton: {
    position: 'absolute' as const,
    bottom: Spacing['3xl'],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.danger,
    paddingHorizontal: 0,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    marginLeft: Spacing.sm,
  },
};
