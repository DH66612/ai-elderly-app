/**
 * 老人端备忘录页面 - 便利贴风格（适老化设计）
 * 多彩便利贴 + 折角 + 胶条效果
 * 支持语音输入
 * 与监护人端记事本数据互通
 */
import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Modal, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { HeartMeteors } from '@/components/HeartMeteors';
import { colors, categoryColors, foldColors, createStyles } from './styles';
import { PageHeader } from '@/components/PageHeader';
import { Spacing } from '@/constants/theme';

// 分类配置
const CATEGORIES = [
  { type: 'all', name: '全部', color: '#8ab3cf' },
  { type: 'general', name: '日常', color: '#FFF9C4' },
  { type: 'health', name: '健康', color: '#E8F5E9' },
  { type: 'important', name: '重要', color: '#FCE4EC' },
  { type: 'todo', name: '待办', color: '#E3F2FD' },
];

interface Memo {
  id: number;
  bindingId: number;
  creatorId: number;
  creatorName: string;
  creatorRole: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isCompleted: boolean;
  reminderTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ElderlyMemoScreen() {
  const router = useSafeRouter();
  const { user } = useAuth();

  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recognizing, setRecognizing] = useState(false);

  const styles = useMemo(() => createStyles(), []);

  const bindingId = user?.boundUserId ? Math.min(user.id, user.boundUserId) * 1000 + Math.max(user.id, user.boundUserId) : null;

  const loadMemos = useCallback(async () => {
    if (!bindingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos?binding_id=${bindingId}`
      );
      const data = await response.json();
      if (data.memos) {
        const sorted = data.memos.sort((a: Memo, b: Memo) => {
          // 自己的内容排在前面
          const aIsMine = a.creatorId === user?.id;
          const bIsMine = b.creatorId === user?.id;
          if (aIsMine !== bIsMine) return aIsMine ? -1 : 1;
          // 同组内，置顶的在前
          if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
          // 最后按时间倒序
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setMemos(sorted);
      }
    } catch (error) {
      console.error('Load memos error:', error);
    } finally {
      setLoading(false);
    }
  }, [bindingId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMemos();
    }, [loadMemos])
  );

  const filteredMemos = activeCategory === 'all' ? memos : memos.filter(m => m.category === activeCategory);

  const stats = {
    total: memos.length,
    pinned: memos.filter(m => m.isPinned).length,
    todo: memos.filter(m => m.category === 'todo' && !m.isCompleted).length,
  };

  const handleAdd = () => {
    setEditingMemo(null);
    setFormContent('');
    setFormCategory('general');
    setShowModal(true);
  };

  const handleEdit = (memo: Memo) => {
    setEditingMemo(memo);
    setFormContent(memo.content);
    setFormCategory(memo.category);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formContent.trim()) {
      Alert.alert('提示', '请输入内容');
      return;
    }
    if (!user?.id || !bindingId) {
      Alert.alert('提示', '请先绑定监护人');
      return;
    }
    try {
      const url = editingMemo
        ? `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos/${editingMemo.id}`
        : `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos`;
      const method = editingMemo ? 'PATCH' : 'POST';
      const body = editingMemo
        ? { title: '', content: formContent, category: formCategory }
        : { binding_id: bindingId, creator_id: user.id, title: '', content: formContent, category: formCategory };

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setShowModal(false);
      loadMemos();
    } catch (error) {
      console.error('Save memo error:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  const handleTogglePin = async (memo: Memo) => {
    try {
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos/${memo.id}/toggle-pin`, { method: 'POST' });
      loadMemos();
    } catch (error) {
      console.error('Toggle pin error:', error);
    }
  };

  const handleToggleComplete = async (memo: Memo) => {
    try {
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos/${memo.id}/toggle-complete`, { method: 'POST' });
      loadMemos();
    } catch (error) {
      console.error('Toggle complete error:', error);
    }
  };

  const handleDelete = (memo: Memo) => {
    // 只能删除自己创建的备忘录
    if (memo.creatorId !== user?.id) {
      Alert.alert('提示', '只能删除自己创建的便利贴');
      return;
    }
    
    Alert.alert('确认删除', '删除后无法恢复，确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos/${memo.id}`, { method: 'DELETE' });
            loadMemos();
          } catch (error) {
            console.error('Delete memo error:', error);
          }
        },
      },
    ]);
  };

  // 开始录音
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要麦克风权限才能录音');
        return;
      }

      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 开始录音
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('错误', '录音失败，请重试');
    }
  };

  // 停止录音并识别
  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        Alert.alert('错误', '录音文件不存在');
        return;
      }

      setRecognizing(true);

      // 读取音频文件并转为base64
      let audioBase64: string;
      
      if (Platform.OS === 'web') {
        // Web端：fetch blob URL
        const response = await fetch(uri);
        const blob = await response.blob();
        audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // 去掉 data:audio/xxx;base64, 前缀
          };
          reader.readAsDataURL(blob);
        });
      } else {
        // 移动端：使用 FileSystem 读取
        audioBase64 = await (FileSystem as any).readAsStringAsync(uri, {
          encoding: 'base64',
        });
      }

      // 调用后端ASR接口
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/asr/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          dialect: 'mandarin',
          uid: user?.id?.toString() || 'elderly-user',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.text) {
        // 将识别结果追加到内容中
        setFormContent(prev => prev ? `${prev}${data.text}` : data.text);
      } else {
        Alert.alert('提示', '语音识别失败，请重试');
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('错误', '语音识别失败');
    } finally {
      setRecognizing(false);
    }
  };

  const getStickyColor = (type: string) => {
    const colorMap: Record<string, string> = {
      general: categoryColors.general,
      health: categoryColors.health,
      important: categoryColors.important,
      todo: categoryColors.todo,
    };
    return colorMap[type] || categoryColors.general;
  };

  const getFoldColor = (type: string) => {
    const colorMap: Record<string, string> = {
      general: foldColors.general,
      health: foldColors.health,
      important: foldColors.important,
      todo: foldColors.todo,
    };
    return colorMap[type] || foldColors.general;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const renderStickyNote = (memo: Memo, index: number) => {
    const stickyColor = getStickyColor(memo.category);
    // 奇数左倾靠左，偶数右斜靠右
    const rotate = index % 2 === 0 ? -1.5 : 1.5;
    const isLeft = index % 2 === 0;
    // 图钉位置：交替变化
    const pinPositions = ['left', 'right', 'center'];
    const pinPosition = pinPositions[index % 3];
    // 胶条位置：奇数左，偶数右
    const tapeLeft = index % 2 === 0;
    // 是否是自己创建的
    const isMyMemo = memo.creatorId === user?.id;

    return (
      <View
        key={memo.id}
        style={[
          styles.stickyNote,
          isLeft ? styles.stickyNoteLeft : styles.stickyNoteRight,
          {
            backgroundColor: stickyColor,
            transform: [{ rotate: `${rotate}deg` }],
          },
        ]}
      >
        {/* 胶条效果 */}
        <View style={[
          styles.stickyTape,
          tapeLeft ? styles.stickyTapeLeft : styles.stickyTapeRight,
        ]} />
        
        {/* 图钉 */}
        <View style={[
          styles.stickyPin,
          pinPosition === 'left' ? styles.stickyPinLeft : 
          pinPosition === 'right' ? styles.stickyPinRight : styles.stickyPinCenter,
        ]}>
          <FontAwesome6 name="thumbtack" size={14} color="#FFFFFF" />
        </View>

        {/* 内容 */}
        <View style={styles.stickyContent}>
          <Text
            style={[styles.stickyText, memo.isCompleted ? styles.stickyTextCompleted : null]}
          >
            {memo.content}
          </Text>
        </View>

        {/* 底部：时间 + 操作按钮 */}
        <View style={styles.stickyFooter}>
          <Text style={styles.stickyTime} numberOfLines={1}>
            {formatTime(memo.createdAt)} · {memo.creatorName}{!isMyMemo ? ' (监护人)' : ''}
          </Text>
          <View style={styles.stickyActions}>
            {memo.category === 'todo' ? (
              <TouchableOpacity style={styles.stickyActionBtn} onPress={() => handleToggleComplete(memo)}>
                <FontAwesome6
                  name={memo.isCompleted ? 'check-circle' : 'circle'}
                  size={22}
                  color={memo.isCompleted ? colors.success : colors.textMuted}
                />
              </TouchableOpacity>
            ) : null}
            {isMyMemo ? (
              <>
                <TouchableOpacity style={styles.stickyActionBtn} onPress={() => handleEdit(memo)}>
                  <FontAwesome6 name="pen" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.stickyActionBtn} onPress={() => handleDelete(memo)}>
                  <FontAwesome6 name="trash" size={20} color={colors.error} />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      {/* 背景与首页一致 */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <HeartMeteors count={6} />

      {/* 固定头部：返回按钮 + 标题 */}
      <PageHeader
        title="备忘录"
        titleColor={colors.textPrimary}
        buttonBgColor="rgba(255,255,255,0.9)"
        iconColor={colors.primary}
      />

      {/* 分类标签页 */}
      <View style={styles.categoryTabs}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.type;
          const activeBgColor = cat.type === 'all' ? colors.primary : (categoryColors as Record<string, string>)[cat.type] || colors.primary;
          return (
            <TouchableOpacity
              key={cat.type}
              style={[styles.categoryTab, isActive ? { backgroundColor: activeBgColor } : null]}
              onPress={() => setActiveCategory(cat.type)}
            >
              <Text style={[
                styles.categoryTabText,
                isActive ? styles.categoryTabTextActive : null,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 可滚动内容：便利贴列表 */}
      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing['3xl'] }} />
        ) : filteredMemos.length > 0 ? (
          <View style={styles.stickyList}>
            {filteredMemos.map((memo, index) => renderStickyNote(memo, index))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="note-sticky" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>暂无记事{'\n'}点击下方添加新便利贴</Text>
          </View>
        )}
      </ScrollView>

      {/* 浮动添加按钮 */}
      <TouchableOpacity style={styles.fabButton} onPress={handleAdd}>
        <FontAwesome6 name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 编辑弹窗 - 底部弹出面板 */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 拖动条 */}
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingMemo ? '编辑便利贴' : '新建便利贴'}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* 内容输入 + 语音按钮 */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="写下你想记住的事..."
                value={formContent}
                onChangeText={setFormContent}
                multiline
                placeholderTextColor={colors.textMuted}
              />
              {/* 语音输入按钮 */}
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isRecording ? styles.voiceButtonActive : null,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={recognizing}
              >
                {recognizing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FontAwesome6
                    name={isRecording ? 'stop' : 'microphone'}
                    size={28}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            </View>
            
            {/* 录音提示 */}
            {isRecording && (
              <Text style={styles.recordingHint}>正在录音，点击麦克风停止...</Text>
            )}
            
            <Text style={styles.categoryLabel}>选择颜色：</Text>
            <View style={styles.categorySelector}>
              {CATEGORIES.filter(c => c.type !== 'all').map(cat => (
                <TouchableOpacity
                  key={cat.type}
                  style={[
                    styles.categoryOption,
                    { backgroundColor: getStickyColor(cat.type) },
                    formCategory === cat.type ? styles.categoryOptionSelected : null,
                  ]}
                  onPress={() => setFormCategory(cat.type)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    formCategory === cat.type ? styles.categoryOptionTextSelected : null,
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
              <Text style={styles.submitButtonText}>保存</Text>
            </TouchableOpacity>
            
            {/* 统计栏 */}
            <View style={styles.statsBar}>
              <View style={styles.statsItem}>
                <Text style={styles.statsNumber}>{stats.total}</Text>
                <Text style={styles.statsLabel}>条</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsNumber}>{stats.pinned}</Text>
                <Text style={styles.statsLabel}>置顶</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsNumber}>{stats.todo}</Text>
                <Text style={styles.statsLabel}>待办</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
