/**
 * VoiceAssistant — AI 语音助手弹窗
 *
 * 功能：
 * ✅ 全屏遮罩 + 底部滑入面板（圆角顶部）
 * ✅ 对话消息列表（用户右绿气泡 + AI左白气泡）
 * ✅ "正在输入..." 跳动动画指示器
 * ✅ 快捷建议标签（点击自动填入）
 * ✅ 文本输入框 + 发送按钮
 * ✅ Mock AI 回复（预留真实API接口位置）
 */
import { View, Text, Input, ScrollView } from '@tarojs/components';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon';
import './index.scss';

// ===== 类型定义 =====
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  familyId?: string;
}

// Mock 回复库（根据关键词匹配）
const MOCK_RESPONSES: Record<string, string> = {
  '推荐': '根据最近的任务数据分析，我建议今天的重点安排是数学和英语阅读 📚\n\n要不要我帮你制定一个详细的学习计划？',
  '分析': '📊 本周任务完成情况：\n• 已完成任务 12 个\n• 待审核 2 个\n• 进行中 3 个\n\n完成率比上周提升 10%，继续保持哦～ 💪',
  '学习': '💡 学习效率建议：\n\n1. 番茄工作法很适合当前任务节奏\n2. 建议每25分钟休息5分钟\n3. 集中精力攻克1-2项重点任务\n4. 避免多任务切换导致注意力分散',
  '日程': '📅 今日推荐日程安排：\n\n09:00 - 数学作业 (30min)\n10:00 - 英语阅读 (20min)\n15:00 - 户外运动 (45min)\n19:00 - 复习预习 (40min)\n\n需要调整吗？',
  '星星': '⭐ 当前星星情况：\n\n本周获得星星 +86颗\n兑换消耗 -30颗\n净增长 +56颗\n\n按这个速度，下周末可以兑换那个大玩具啦！🎁',
  '默认': '我是星愿卡 AI 助手 ✨\n\n我可以帮你：\n• 推荐每日日程安排\n• 分析任务完成趋势\n• 给出学习建议\n• 查看星星收支情况\n\n试试发送「推荐」或「分析」吧！',
};

// 快捷建议标签
const QUICK_TAGS = ['推荐日程', '分析任务', '学习建议', '查看星星'];

export default function VoiceAssistant({ visible, onClose }: Props) {
  // ===== 状态 =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<any>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcomeMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: MOCK_RESPONSES['默认'],
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
    }
  }, [visible]);

  // 自动滚动到底部
  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          // Taro ScrollView 的 scrollToBottom
          try {
            scrollViewRef.current?.scrollTo({
              scrollTop: 99999,
              duration: 300,
            });
          } catch {}
        }
      }, 100);
    }
  }, [messages, isTyping]);

  // ===== 发送消息 =====
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    // 添加用户消息
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // 模拟AI思考时间
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

    // 匹配回复
    let reply = MOCK_RESPONSES['默认'];
    for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
      if (key !== '默认' && text.includes(key)) {
        reply = response;
        break;
      }
    }

    const aiMsg: Message = {
      id: `msg-ai-${Date.now()}`,
      role: 'ai',
      content: reply,
      timestamp: Date.now(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, aiMsg]);
  };

  // 点击快捷标签
  const handleQuickTag = (tag: string) => {
    setInputText(tag);
    // 自动触发发送
    setTimeout(() => handleSend(), 200);
  };

  // 关闭面板
  const handleClose = () => {
    onClose();
  };

  // ===== 渲染 =====
  if (!visible) return null;

  return (
    <View className="va-mask" onClick={handleClose}>
      <View className="va-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <View className="va-header">
          <View className="va-avatar-area">
            <Icon name="sparkles" size={28} color="#006e1c" />
            <Text className="va-title">AI 助手</Text>
          </View>
          <View className="va-close-btn" onClick={handleClose}>
            <Icon name="x" size={32} color="#666" />
          </View>
        </View>

        {/* 对话消息列表 */}
        <ScrollView
          ref={scrollViewRef}
          className="va-messages"
          scrollY
          showScrollbar={false}
          enhanced
        >
          <View className="va-messages-inner">
            {messages.map(msg => (
              <View key={msg.id} className={`va-msg-row ${msg.role}`}>
                {msg.role === 'ai' && (
                  <View className="va-ai-avatar">
                    <Icon name="sparkles" size={24} color="#006e1c" />
                  </View>
                )}
                <View className={`va-bubble ${msg.role}`}>
                  {msg.content.split('\n').map((line, i) => (
                    <Text key={i}>
                      {line}
                      {i < msg.content.split('\n').length - 1 ? '\n' : ''}
                    </Text>
                  ))}
                </View>
              </View>
            ))}

            {/* "正在输入..." 动画 */}
            {isTyping && (
              <View className="va-msg-row ai">
                <View className="va-ai-avatar">
                  <Icon name="sparkles" size={24} color="#006e1c" />
                </View>
                <View className="va-bubble ai typing">
                  <View className="va-dots">
                    <View className="va-dot va-dot-1" />
                    <View className="va-dot va-dot-2" />
                    <View className="va-dot va-dot-3" />
                  </View>
                  <Text className="va-typing-text">正在输入...</Text>
                </View>
              </View>
            )}

            <View style={{ height: '24rpx' }} />
          </View>
        </ScrollView>

        {/* 快捷标签 */}
        <View className="va-quick-tags">
          {QUICK_TAGS.map(tag => (
            <View
              key={tag}
              className="va-quick-tag"
              onClick={() => handleQuickTag(tag)}
            >
              <Text>{tag}</Text>
            </View>
          ))}
        </View>

        {/* 输入区域 */}
        <View className="va-input-area">
          <Input
            className="va-input"
            placeholder="输入你的问题..."
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            confirmType="send"
            onConfirm={() => handleSend()}
            confirmHold={false}
            maxlength={500}
          />
          <View
            className={`va-send-btn ${inputText.trim() ? '' : 'disabled'}`}
            onClick={inputText.trim() ? handleSend : undefined}
          >
            <Icon name="arrowUp" size={28} color="#ffffff" />
          </View>
        </View>
      </View>
    </View>
  );
}
