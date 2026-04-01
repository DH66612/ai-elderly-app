/**
 * 监护人端记事本页面 - 书页横线纸风格
 * 白色横线纸 + 蓝色边框 + 锯齿边缘
 * 与老人端备忘录数据互通（但不能互删）
 */
import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { HeartMeteors } from '@/components/HeartMeteors';
import { colors, categoryColors, createStyles } from './styles';
import { Spacing } from '@/constants/theme';

// 分类配置
const CATEGORIES = [
  { type: 'all', name: '全部' },
  { type: 'general', name: '日常' },
  { type: 'health', name: '健康' },
  { type: 'important', name: '重要' },
  { type: 'todo', name: '待办' },
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

export default function GuardianNotesScreen() {
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(), []);

  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');

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
    setFormTitle('');
    setFormContent('');
    setFormCategory('general');
    setShowModal(true);
  };

  const handleEdit = (memo: Memo) => {
    setEditingMemo(memo);
    setFormTitle(memo.title || '');
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
      Alert.alert('提示', '请先绑定老人');
      return;
    }
    try {
      const url = editingMemo
        ? `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos/${editingMemo.id}`
        : `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/memos`;
      const method = editingMemo ? 'PATCH' : 'POST';
      const body = editingMemo
        ? { title: formTitle, content: formContent, category: formCategory }
        : { binding_id: bindingId, creator_id: user.id, title: formTitle, content: formContent, category: formCategory };

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
    if (memo.creatorId !== user?.id) {
      Alert.alert('提示', '只能删除自己创建的记事');
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

  const getCategoryColor = (type: string) => {
    const colorMap: Record<string, string> = {
      general: categoryColors.general,
      health: categoryColors.health,
      important: categoryColors.important,
      todo: categoryColors.todo,
    };
    return colorMap[type] || colors.primary;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 固定显示底部空行数量（横线纸效果）
  const EMPTY_LINES_COUNT = 10;
  
  // 生成空行
  const renderEmptyLines = () => {
    const lines = [];
    for (let i = 0; i < EMPTY_LINES_COUNT; i++) {
      lines.push(
        <View key={`empty-${i}`} style={styles.emptyLine} />
      );
    }
    return lines;
  };

  // 将文本按字数拆分成多行（每行12个中文字，忽略空格）
  const splitTextToLines = (text: string, maxChars: number = 12): string[] => {
    if (!text) return [];
    // 去除所有空格
    const cleanText = text.replace(/\s/g, '');
    if (!cleanText) return [];
    
    const lines: string[] = [];
    let currentLine = '';
    
    for (const char of cleanText) {
      currentLine += char;
      if (currentLine.length >= maxChars) {
        lines.push(currentLine);
        currentLine = '';
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const renderLine = (memo: Memo, index: number) => {
    const categoryColor = getCategoryColor(memo.category);
    const isMyMemo = memo.creatorId === user?.id;
    
    // 只显示内容，不显示标题
    const displayText = memo.content || memo.title || '';
    
    // 拆分内容为多行
    const textLines = splitTextToLines(displayText);
    // 如果没有内容行，显示占位
    const displayLines = textLines.length > 0 ? textLines : ['（无内容）'];
    
    // 判断最后一行是否需要单独显示时间行（超过6个字）
    const lastLine = displayLines[displayLines.length - 1];
    const needSeparateTimeLine = lastLine.length > 6;

    return (
      <React.Fragment key={memo.id}>
        {/* 渲染内容横线行 */}
        {displayLines.map((lineText, lineIndex) => {
          const isLastContentLine = lineIndex === displayLines.length - 1;
          const showTimeOnThisLine = isLastContentLine && !needSeparateTimeLine;
          
          return (
            <View key={`${memo.id}-${lineIndex}`} style={styles.line}>
              {/* 第一行显示圆点，后续行显示缩进 */}
              {lineIndex === 0 ? (
                <View style={[styles.lineDot, { backgroundColor: categoryColor }]} />
              ) : (
                <View style={styles.lineIndent} />
              )}
              
              {/* 内容 */}
              <View style={styles.lineContent}>
                <Text
                  style={[
                    styles.lineText,
                    memo.isCompleted ? styles.lineTextCompleted : null,
                  ]}
                >
                  {lineText}
                </Text>
              </View>
              
              {/* 如果最后一行不超过6个字，在这里显示时间和按钮 */}
              {showTimeOnThisLine ? (
                <View style={styles.lineRight}>
                  <Text style={styles.lineTime}>
                    {formatTime(memo.createdAt)} · {memo.creatorName}{!isMyMemo ? ' (老人)' : ''}
                  </Text>
                  <View style={styles.lineActions}>
                    {memo.category === 'todo' ? (
                      <TouchableOpacity style={styles.lineActionBtn} onPress={() => handleToggleComplete(memo)}>
                        <FontAwesome6
                          name={memo.isCompleted ? 'check-circle' : 'circle'}
                          size={16}
                          color={memo.isCompleted ? colors.success : colors.textMuted}
                        />
                      </TouchableOpacity>
                    ) : null}
                    {isMyMemo ? (
                      <>
                        <TouchableOpacity style={styles.lineActionBtn} onPress={() => handleEdit(memo)}>
                          <FontAwesome6 name="pen" size={12} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.lineActionBtn} onPress={() => handleDelete(memo)}>
                          <FontAwesome6 name="trash" size={12} color={colors.error} />
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        
        {/* 如果最后一行超过6个字，单独显示时间行 */}
        {needSeparateTimeLine ? (
          <View key={`${memo.id}-time`} style={styles.line}>
            <View style={styles.lineIndent} />
            <View style={styles.lineContent}>
              <Text style={styles.lineTime}>
                {formatTime(memo.createdAt)} · {memo.creatorName}{!isMyMemo ? ' (老人)' : ''}
              </Text>
            </View>
            <View style={styles.lineRight}>
              <View style={styles.lineActions}>
                {memo.category === 'todo' ? (
                  <TouchableOpacity style={styles.lineActionBtn} onPress={() => handleToggleComplete(memo)}>
                    <FontAwesome6
                      name={memo.isCompleted ? 'check-circle' : 'circle'}
                      size={16}
                      color={memo.isCompleted ? colors.success : colors.textMuted}
                    />
                  </TouchableOpacity>
                ) : null}
                {isMyMemo ? (
                  <>
                    <TouchableOpacity style={styles.lineActionBtn} onPress={() => handleEdit(memo)}>
                      <FontAwesome6 name="pen" size={12} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.lineActionBtn} onPress={() => handleDelete(memo)}>
                      <FontAwesome6 name="trash" size={12} color={colors.error} />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </React.Fragment>
    );
  };

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      {/* 背景 */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <HeartMeteors count={6} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 页面标题 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <FontAwesome6 name="chevron-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>记事本</Text>
        </View>

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

        {/* 纸张 */}
        <View style={styles.paperContainer}>
          <View style={styles.paperWrapper}>
            {/* 垫纸（底层，蓝色横条纹纸被遮住剩余的部分）*/}
            <View style={styles.underlayPaper}>
              <View style={styles.underlayStripesContainer}>
                {/* 蓝色横条纹，条纹和间距相等，延伸到底部 */}
                {[...Array(30)].map((_, i) => (
                  <View key={i} style={i % 2 === 0 ? styles.underlayStripe : styles.underlayGap} />
                ))}
              </View>
            </View>
            
            {/* 顶部锯齿边缘 */}
            <View style={styles.paperEdgeTop}>
              {[...Array(25)].map((_, i) => (
                <View key={i} style={styles.paperEdgeTooth} />
              ))}
            </View>
            
            {/* 底部锯齿边缘 */}
            <View style={styles.paperEdgeBottom}>
              {[...Array(25)].map((_, i) => (
                <View key={i} style={styles.paperEdgeToothBottom} />
              ))}
            </View>
            
            {/* 纸张主体 */}
            <View style={styles.paper}>
              {/* 横线区域 */}
              <View style={styles.linedArea}>
                {/* 第一行：标题 */}
                <View style={styles.line}>
                  <View style={[styles.lineDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.paperSubtitle}>与老人共享记事</Text>
                </View>
                
                {loading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
                ) : (
                  <>
                    {/* 记事内容行 */}
                    {filteredMemos.map((memo, index) => renderLine(memo, index))}
                    {/* 空行填充（横线纸效果）*/}
                    {renderEmptyLines()}
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 浮动添加按钮 */}
      <TouchableOpacity style={styles.fabButton} onPress={handleAdd}>
        <FontAwesome6 name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 编辑弹窗 - 底部弹出面板 */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 拖动条 */}
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingMemo ? '编辑记事' : '新建记事'}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
                <FontAwesome6 name="xmark" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="输入内容..."
              value={formContent}
              onChangeText={setFormContent}
              multiline
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.categoryLabel}>选择分类：</Text>
            <View style={styles.categorySelector}>
              {CATEGORIES.filter(c => c.type !== 'all').map(cat => (
                <TouchableOpacity
                  key={cat.type}
                  style={[
                    styles.categoryOption,
                    { backgroundColor: getCategoryColor(cat.type) },
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
