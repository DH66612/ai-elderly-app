/**
 * 帮助中心页面 - 清雅风格
 * 统一清雅风格（与监护人端一致）
 * 扩展版：包含更多功能模块的帮助说明
 */
import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { createStyles, colors } from './styles';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: string;
  items: FAQItem[];
}

export default function HelpCenterScreen() {
  const router = useSafeRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqCategories: FAQCategory[] = [
    {
      title: '视频通话与语音助手',
      icon: 'video',
      items: [
        {
          question: '如何进行视频通话？',
          answer: '点击首页的"视频通话"按钮，系统会自动连接您的监护人。请确保网络畅通，首次使用需要授权摄像头和麦克风权限。视频通话支持Android、iOS和Web三端，通话过程中可以切换前后摄像头。',
        },
        {
          question: '视频通话无法连接怎么办？',
          answer: '请检查：1) 网络是否正常连接；2) 是否授权了摄像头和麦克风权限；3) 对方是否在线；4) 尝试退出后重新发起通话。如果问题持续，请联系客服。',
        },
        {
          question: '如何使用语音助手？',
          answer: '点击首页的"语音助手"按钮，按住麦克风按钮说话即可。您可以询问天气、设置提醒、拨打紧急电话等。语音助手支持普通话和7种方言（粤语、四川话、东北话、河南话、陕西话、上海话、湖南话）。',
        },
        {
          question: '语音助手能帮我做什么？',
          answer: '语音助手可以帮助您：1) 查询天气；2) 设置用药提醒；3) 拨打紧急电话；4) 查看健康数据；5) 设置备忘录；6) 语音聊天解闷；7) 查询生活服务信息等。系统会根据您的个人情况提供个性化建议。',
        },
      ],
    },
    {
      title: '健康数据管理',
      icon: 'heart-pulse',
      items: [
        {
          question: '健康数据如何同步？',
          answer: '连接智能手环或血压计后，健康数据会自动同步到App中。系统会自动读取心率、步数、血压、血氧等数据，并生成健康趋势图表。您也可以在健康数据页面手动添加数据。',
        },
        {
          question: '如何连接健康手环？',
          answer: '进入"设置"→"设备管理"→"蓝牙健康手环"，打开蓝牙开关后，系统会自动搜索附近的设备。选择您的手环进行配对，配对成功后手环数据会自动同步。注意：请确保手环已开启蓝牙且电量充足。',
        },
        {
          question: '健康手环能测量哪些数据？',
          answer: '健康手环可以测量：1) 实时心率（通过标准BLE心率服务）；2) 步数统计；3) 睡眠质量。其他数据如血压、血氧需要特定品牌手环支持。数据会实时推送给您的监护人。',
        },
        {
          question: '什么是AI健康分析？',
          answer: '当您连接健康手环且有健康趋势数据时，系统会自动根据一天6个时间点的健康数据生成AI分析报告。报告包含健康评估、异常提醒和改善建议。您可以在健康数据页面查看详细分析。',
        },
        {
          question: '如何使用手机传感器采集健康数据？',
          answer: '如果您没有健康手环，可以使用手机自带的计步器。进入"设置"→"设备管理"，开启"手机计步器"即可。系统会自动读取您的步数数据。Android用户还可以授权Health Connect读取更多健康数据。',
        },
      ],
    },
    {
      title: '设备管理',
      icon: 'bluetooth',
      items: [
        {
          question: '如何连接蓝牙设备？',
          answer: '进入"设置"→"设备管理"，选择要连接的设备类型：1) 蓝牙健康手环：用于采集健康数据；2) WiFi摄像头：用于远程看护。打开对应开关后，系统会自动搜索附近的设备，选择您的设备进行配对即可。',
        },
        {
          question: '如何添加萤石摄像头？',
          answer: '进入"设置"→"设备管理"→"WiFi摄像头"，点击"添加设备"，输入摄像头的设备序列号和验证码。添加成功后，您可以实时查看画面、进行抓拍、控制云台等操作。监护人端也可以远程查看摄像头画面。',
        },
        {
          question: '设备离线或连接不上怎么办？',
          answer: '请检查：1) 设备是否开机且电量充足；2) 蓝牙/WiFi是否正常；3) 设备是否被其他手机连接；4) 尝试重启设备和手机蓝牙；5) 删除配对记录后重新配对。如果持续离线超过12小时，系统会自动通知监护人。',
        },
        {
          question: '设备电量低会提醒吗？',
          answer: '会的。当设备电量低于20%时，系统会自动推送提醒给您和您的监护人，确保及时充电。您也可以在设备管理页面查看各设备的电量状态。',
        },
      ],
    },
    {
      title: '紧急求助与安全',
      icon: 'phone-volume',
      items: [
        {
          question: '紧急呼叫如何使用？',
          answer: '在紧急情况下，点击首页的"紧急呼叫"按钮，系统会自动拨打监护人的电话，并发送您的实时位置信息。监护人会收到紧急通知，可以立即查看您的位置和状态。',
        },
        {
          question: '什么是跌倒检测功能？',
          answer: '当您佩戴健康手环且开启跌倒检测后，系统会通过传感器监测您的活动状态。如果检测到异常跌倒，会触发30秒确认期。如果您未在30秒内确认安全，系统会自动通知监护人并发送您的位置。',
        },
        {
          question: '跌倒检测触发后如何操作？',
          answer: '当跌倒检测触发时，屏幕会显示全屏提醒：1) 如果您安全无恙，点击"我没事"按钮取消告警；2) 如果您需要帮助，点击"呼叫帮助"按钮，系统会立即联系监护人。请务必在30秒内响应。',
        },
        {
          question: '如何查看我的紧急联系人？',
          answer: '监护人可以在个人资料页面设置父母信息和备用紧急联系人。老人端的紧急呼叫会优先拨打主要监护人电话，无法接通时会依次拨打备用联系人。',
        },
      ],
    },
    {
      title: '日常生活服务',
      icon: 'hand-holding-heart',
      items: [
        {
          question: '如何使用备忘录功能？',
          answer: '点击底部导航的"备忘录"进入。您可以通过键盘输入或点击麦克风按钮语音输入备忘内容。备忘录支持分类（日常、健康、重要、待办），创建后会同步到监护人端，双方都能查看和编辑。',
        },
        {
          question: '如何使用相册功能？',
          answer: '点击底部导航的"相册"进入。您可以：1) 点击"拍照"按钮拍摄新照片；2) 点击"选择"从手机相册导入照片。照片会保存在本地，点击可全屏预览，长按可删除。所有照片仅保存在您的手机上，不会上传到云端。',
        },
        {
          question: '如何使用拍图识字功能？',
          answer: '在首页点击"拍图识字"按钮，可以拍照或选择图片，系统会自动识别图片中的文字并用语音朗读出来。适合识别药品说明书、书籍、标签等文字内容。',
        },
        {
          question: '如何使用用药提醒功能？',
          answer: '用药提醒由监护人在他们的App中设置。设置后，到达提醒时间时，您的手机会收到全屏提醒，提示您按时服药。您可以在提醒页面查看今日用药计划。',
        },
        {
          question: '如何查看附近的医院、药店？',
          answer: '点击首页的"附近设施"，系统会根据您的位置自动搜索附近的医院、药店、超市等生活设施。点击列表项可以查看详细信息，点击导航按钮可以跳转到地图App进行导航。',
        },
      ],
    },
    {
      title: '消息与通知',
      icon: 'bell',
      items: [
        {
          question: '如何查看消息通知？',
          answer: '点击首页顶部的消息图标进入消息中心。消息按时间分组显示（今天、昨天、本周、更早），包括：健康提醒、用药提醒、设备告警、系统通知等。点击消息可查看详情。',
        },
        {
          question: '消息通知会推送到手机吗？',
          answer: '会的。重要的消息（如紧急呼叫、跌倒告警、用药提醒等）会通过手机系统通知推送到您的手机，即使App在后台运行也能收到提醒。请确保已开启App的通知权限。',
        },
        {
          question: '如何清理已读消息？',
          answer: '目前消息会自动保留30天，超过30天的消息会自动清理。您可以在消息详情页点击"删除"按钮删除单条消息。后续版本会增加批量清理功能。',
        },
      ],
    },
    {
      title: '账户与设置',
      icon: 'gear',
      items: [
        {
          question: '如何修改个人信息？',
          answer: '目前个人信息修改需要联系您的监护人或客服人员进行修改，以保障账户安全。监护人可以在他们的App中修改您的部分信息（如家庭地址、健康状况等）。',
        },
        {
          question: '如何绑定监护人？',
          answer: '注册时系统会要求填写家人电话，您的家人（监护人）在他们的App中输入您的手机号即可完成绑定。绑定后双方可以共享健康数据、备忘录等信息。',
        },
        {
          question: '忘记密码怎么办？',
          answer: '在登录页面点击"忘记密码"，输入您的手机号，系统会发送重置链接到您的手机。您也可以联系监护人或客服帮助重置密码。',
        },
        {
          question: '如何开启或关闭某些功能？',
          answer: '进入"设置"页面，您可以：1) 开启/关闭跌倒检测；2) 设置用药提醒；3) 管理设备连接；4) 调整字体大小；5) 开启/关闭消息通知等。部分高级设置需要监护人权限。',
        },
        {
          question: '如何查看使用协议和隐私政策？',
          answer: '进入"设置"页面，点击"使用协议"或"隐私政策"即可查看详细内容。首次使用App时，系统会要求您阅读并同意这些协议。',
        },
      ],
    },
  ];

  const styles = useMemo(() => createStyles(), []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>帮助中心</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 快速帮助 */}
        <TouchableOpacity style={styles.contactButton}>
          <View style={styles.contactButtonIcon}>
            <FontAwesome6 name="phone" size={24} color={colors.primary} />
          </View>
          <View style={styles.contactButtonContent}>
            <Text style={styles.contactButtonTitle}>联系客服</Text>
            <Text style={styles.contactButtonSubtitle}>400-123-4567</Text>
          </View>
          <FontAwesome6 name="chevron-right" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 分类FAQ */}
        {faqCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <FontAwesome6 name={category.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>
            {category.items.map((item, itemIndex) => {
              const itemId = `${categoryIndex}-${itemIndex}`;
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.faqItem}
                  onPress={() => toggleExpand(itemId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <FontAwesome6
                      name={expandedId === itemId ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={colors.textMuted}
                    />
                  </View>
                  {expandedId === itemId && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* 联系方式卡片 */}
        <View style={styles.contactCard}>
          <Text style={styles.cardTitle}>联系我们</Text>
          <View style={styles.contactRow}>
            <FontAwesome6 name="phone" size={16} color={colors.primary} />
            <Text style={styles.contactLabel}>客服热线</Text>
            <Text style={styles.contactValue}>400-123-4567</Text>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <FontAwesome6 name="clock" size={16} color={colors.primary} />
            <Text style={styles.contactLabel}>服务时间</Text>
            <Text style={styles.contactValue}>每日 8:00 - 22:00</Text>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <FontAwesome6 name="envelope" size={16} color={colors.primary} />
            <Text style={styles.contactLabel}>邮箱</Text>
            <Text style={styles.contactValue}>help@ai-elderly.com</Text>
          </View>
        </View>

        {/* 温馨提示 */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <FontAwesome6 name="lightbulb" size={18} color={colors.warningText} />
            <Text style={styles.tipTitle}>温馨提示</Text>
          </View>
          <Text style={styles.tipText}>
            • 首次使用新功能时，系统会引导您完成必要的设置{'\n'}
            • 如遇到问题，可先尝试重启App或检查网络连接{'\n'}
            • 紧急情况请优先使用紧急呼叫功能{'\n'}
            • 定期检查设备电量和连接状态，确保正常使用
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
