/**
 * AI 助手引擎 - 小程序版
 * 连接 Supabase Edge Function 调用真实 AI
 * 本地规则引擎作为 fallback（离线或API失败时）
 */
import Taro from '@tarojs/taro';

// ==================== 类型定义 ====================
interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  apiEndpoint: string;
}

interface AIContext {
  starBalance?: number;
  todayTasks?: any[];
  members?: any[];
  userName?: string;
  recentExchanges?: any[];
}

// ==================== 配置管理 ====================
const DEFAULT_CONFIG: AIConfig = {
  provider: 'minimax',
  model: 'MiniMax-M2.7',
  apiKey: '',
  apiEndpoint: '',
};

let cachedConfig: AIConfig | null = null;

function normalizeConfig(config: Partial<AIConfig> = {}): AIConfig {
  const provider = ['minimax', 'openai', 'custom'].includes(config.provider || '')
    ? config.provider!
    : DEFAULT_CONFIG.provider;
  const model = provider === 'minimax' && config.model?.startsWith('MiniMax-')
    ? config.model
    : provider === 'minimax'
      ? DEFAULT_CONFIG.model
      : config.model || 'gpt-4o-mini';

  return {
    provider,
    model,
    apiKey: '',
    apiEndpoint: config.apiEndpoint || '',
  };
}

/** 从本地存储或环境获取配置 (exported for AISettings page) */
export async function getAIConfig(): Promise<AIConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    // 尝试从本地存储读取
    const stored = Taro.getStorageSync('ai_config');
    if (stored) {
      cachedConfig = normalizeConfig(JSON.parse(stored) as AIConfig);
      return cachedConfig!;
    }
  } catch {}

  // 尝试从 Supabase app_config 表读取
  try {
    const { supabase } = require('@/utils/supabase');
    const { data } = await supabase
      .from('app_config')
      .select('key, value')
      .like('key', 'ai_%');

    if (data && data.length > 0) {
      const map: Record<string, string> = {};
      data.forEach((item: any) => { map[item.key] = item.value; });
      cachedConfig = normalizeConfig({
        provider: map['ai_provider'] || 'minimax',
        model: map['ai_model'] || 'MiniMax-M2.7',
        apiEndpoint: map['ai_api_endpoint'] || '',
      });
      return cachedConfig!;
    }
  } catch {}

  cachedConfig = { ...DEFAULT_CONFIG };
  return cachedConfig!;
}

// ==================== 意图识别 + 响应生成 ====================

/** 系统提示词：定义AI助手角色和行为边界 */
const SYSTEM_PROMPT = `你是星愿卡的 AI 家庭助手。你的职责是帮助家庭成员管理任务、查询数据、提供建议。

## 你的能力范围：
1. **星星查询** — 查询用户当前的星星余额、今日获得/消耗
2. **任务管理** — 查看待完成任务、创建任务、任务总结
3. **习惯打卡** — 查看今日习惯完成情况
4. **兑换记录** — 查看最近的心愿兑换历史
5. **家庭信息** — 成员列表、排行榜
6. **智能建议** — 根据孩子的情况给出教育建议
7. **日程分析** — 四象限优先级分析
8. **日历同步** — 引导用户同步到系统日历

## 回复风格：
- 温暖、鼓励性语气，像一个贴心的家庭管家
- 使用 Emoji 让回复更生动
- 回答简洁，不超过 200 字
- 如果涉及操作（如创建任务），明确告诉用户需要确认
- 不知道的诚实说不知道，不要编造

## 重要约束：
- 你不能执行实际数据库操作，只能建议和查询展示已有数据
- 不要透露系统内部细节（如 API、数据库结构）
- 保护用户隐私，不询问敏感信息`;

// ==================== 核心：发送消息并获取AI回复 ====================

/**
 * 发送消息给 AI 并返回回复
 * @param userMessage 用户输入的文字
 * @param context 当前上下文数据（星星余额、任务列表等）
 * @returns AI 的文本回复
 */
export async function sendToAI(
  userMessage: string,
  context: AIContext = {}
): Promise<string> {
  const config = await getAIConfig();

  try {
    // 构建 context 信息注入到 prompt 中
    const contextInfo = buildContextString(context);

    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n## 当前用户上下文：\n' + contextInfo },
      { role: 'user', content: userMessage },
    ];

    // 调用 Supabase Edge Function（统一入口）
    const result = await callEdgeFunction(messages, config);

    if (result && typeof result === 'string') {
      return result;
    }

    throw new Error('Edge Function returned empty response');
  } catch (err: any) {
    console.warn('[AI] API调用失败，使用本地规则引擎:', err?.message || err);
    return localFallback(userMessage, context);
  }
}

// ==================== Supabase Edge Function 调用 ====================

async function callEdgeFunction(
  messages: AIMessage[],
  config: AIConfig
): Promise<string | null> {
  try {
    const { supabase } = require('@/utils/supabase');

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        messages,
        provider: config.provider,
        model: config.model,
        temperature: 0.9,
        max_tokens: 8192,
      },
    });

    if (error) throw error;

    // 解析返回结果
    if (data && data.content) {
      return data.content;
    }
    if (data && typeof data === 'string') {
      return data;
    }
    if (data && data.choices && data.choices[0]) {
      return data.choices[0].message?.content || data.choices[0].text || null;
    }

    return null;
  } catch (err: any) {
    console.error('[AI] Edge Function error:', err?.message);
    return null;
  }
}

// ==================== 构建上下文字符串 ====================

function buildContextString(ctx: AIContext): string {
  const parts: string[] = [];
  if (ctx.userName) parts.push(`当前用户名：${ctx.userName}`);
  if (ctx.starBalance !== undefined) parts.push(`星星余额：${ctx.starBalance}`);
  if (ctx.todayTasks && ctx.todayTasks.length > 0) {
    const pending = ctx.todayTasks.filter(t => t.status === 'pending' || t.status === 'reviewing');
    parts.push(`今日待完成任务：${pending.length} 个`);
    parts.push(`今日任务详情：\n${pending.map((t, i) => `${i + 1}. ${t.title} (+${t.reward_stars || 0}⭐)`).join('\n')}`);
  }
  if (ctx.members && ctx.members.length > 0) {
    parts.push(`家庭成员：${ctx.members.map(m => `${m.name}(${m.role === 'parent' ? '家长' : '孩子'})`).join('、')}`);
  }
  if (ctx.recentExchanges && ctx.recentExchanges.length > 0) {
    parts.push(`最近兑换：${ctx.recentExchanges.slice(0, 5).map(e => e.reward_name || e.name).join('、')}`);
  }
  return parts.join('\n') || '暂无上下文信息';
}

// ==================== 本地 Fallback 规则引擎 ====================

function localFallback(text: string, ctx: AIContext): string {
  const t = text.trim().toLowerCase();
  const name = ctx.userName || '用户';
  const stars = ctx.starBalance || 0;
  const todayEarned = (ctx.todayTasks || []).reduce((sum, task) => sum + (task.reward_stars || 0), 0);
  const pending = (ctx.todayTasks || []).filter(task => task.status === 'pending' || task.status === 'reviewing');

  // 星星相关
  if (t.includes('星星') || t.includes('star') || t.includes('余额') || t.includes('积分')) {
    return `⭐ ${name}，你当前有 **${stars}** 颗星星！今天已获得 ${todayEarned} 颗，继续加油哦！💪`;
  }

  // 任务相关
  if (t.includes('任务') || t.includes('task') || t.includes('今日') || t.includes('今天')) {
    if (pending.length > 0) {
      return `📋 ${name}，今天有 ${pending.length} 个待完成任务：\n` +
        pending.map((task, i) => `${i + 1}. ${task.title} (+${task.reward_stars || 0}⭐)`).join('\n') +
        '\n\n加油，每完成一项都能获得星星奖励！🌟';
    }
    return `🎉 ${name}，今天所有任务都已完成！可以放松一下啦～`;
  }

  // 问候
  if (/(你好|嗨|hello|hi|hey|早|早上好|晚上好)/.test(t)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    return `${greeting}，${name}！🌱 我是你的森林家族 AI 管家。\n\n我可以帮你：\n• 查询「我的星星」\n• 查看「今日任务」\n• 分析「四象限」\n• 查看「排行榜」\n\n试试在下方输入框问我吧～`;
  }

  // 四象限
  if (t.includes('四象限') || t.includes('象限')) {
    return `📊 四象限分析法可以帮助你按「重要/紧急」分类任务。\n\n**重要且紧急** → 立刻做\n**重要不紧急** → 计划做\n**紧急不重要** → 委托做\n**不重要不紧急** → 不做\n\n点击下方快捷按钮即可前往任务页查看详细分析。`;
  }

  // 日历
  if (t.includes('日历') || t.includes('同步')) {
    return `📅 日历同步功能可以将任务同步到手机系统日历。\n\n操作步骤：\n1. 进入「我的」→「同步日历」\n2. 选择要同步的任务类型\n\n目前小程序端正在开发完整功能，你可以先去 Web 端体验哦～`;
  }

  // 待审核
  if (t.includes('待审核') || t.includes('review')) {
    const reviewing = pending.filter(task => task.status === 'reviewing');
    if (reviewing.length > 0) {
      return `⏳ 有 ${reviewing.length} 个任务等待审核：\n` +
        reviewing.map((task, i) => `${i + 1}. ${task.title}`).join('\n') +
        '\n\n请家长及时处理哦～';
    }
    return `✅ 目前没有待审核的任务，太棒了！`;
  }

  // 排行榜
  if (t.includes('排行') || t.includes('排名') || t.includes('podium')) {
    const sorted = [...(ctx.members || [])].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    if (sorted.length === 0) return '暂无成员数据';
    return `🏆 **家庭排行榜**\n` +
      sorted.slice(0, 5).map((m, i) =>
        `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} ${m.name} — ${m.stars || 0}⭐`
      ).join('\n');
  }

  // 成员/家人
  if (t.includes('成员') || t.includes('家人') || t.includes('家庭')) {
    if (!ctx.members || ctx.members.length === 0) return '暂无成员信息';
    return `👨‍👩‍👧‍👦 家庭共有 ${ctx.members.length} 位成员：\n` +
      ctx.members.map(m => `• ${m.name}（${m.role === 'parent' ? '管理员' : '宝贝'}）${m.stars || 0}⭐`).join('\n');
  }

  // 总结
  if (t.includes('总结') || t.includes('摘要')) {
    return `📝 **${name}的今日总结**\n\n📅 ${new Date().toLocaleDateString('zh-CN')}\n⭐ 今日获得：${todayEarned} 颗星星\n📋 待完成：${pending.length} 个任务\n👥 家庭成员：${(ctx.members || []).length} 人\n💰 星星余额：${stars} 颗\n\n${stars > 50 ? '今天的星星收获很棒！继续保持！💪' : '再多完成一些任务就能攒够心仪的心愿了！🎯'}`;
  }

  // 建议/帮助
  if (t.includes('建议') || t.includes('智能') || /help|帮助/.test(t)) {
    return `💡 **我能帮你做什么？**\n\n🔸 **查一查**\n• 「我的星星」— 查余额\n• 「今日任务」— 看待办\n• 「排行榜」— 看排名\n\n🔸 **管一管**\n• 「帮我创建一个XX任务」— 我帮你填写\n• 「兑换冰淇淋」— 我帮你发起\n\n🔸 **看一看**\n• 「四象限分析」— 任务优先级\n• 「总结」— 今日概况\n\n直接打字告诉我你想要什么就行～`;
  }

  // 创建任务意图
  if (/创建|新建|加个?|添加/.test(t) && /(任务|习惯|打卡)/.test(t)) {
    return `📝 收到！我来帮你创建任务/习惯。\n\n请告诉我：\n1. 任务名称是什么？\n2. 多少颗星星作为奖励？\n3. 给谁做的？\n\n或者你也可以直接去「任务页」手动创建更灵活哦～`;
  }

  // 兑换意图
  if (/兑换|想要|我要/.test(t) && /(心愿|礼物|奖励)/.test(t)) {
    return `🎁 想要兑换心愿吗？\n\n当前你有 **${stars}** 颗星星。\n\n去「奖励商店」看看有哪些心仪的心愿吧！如果星星不够，多完成一些任务就能攒够啦～🌟`;
  }

  // 默认回复
  return `🤔 我还在学习中，暂时不太理解「${text}」的意思。\n\n试试这些关键词：\n• 「我的星星」→ 查余额\n• 「今日任务」→ 看待办\n• 「排行榜」→ 看排名\n• 「总结」→ 今日概况\n• 「帮助」→ 所有功能`;
}
