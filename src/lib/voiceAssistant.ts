/**
 * AI 语音助手引擎
 * 支持 40+ 意图，覆盖 App 全部功能
 * 使用 Gemini AI 进行自然语言理解和指令执行
 * 支持从数据库读取配置，优先使用数据库配置，其次使用环境变量
 */

import { GoogleGenAI, Type } from "@google/genai";
import supabase from './supabase';

// ==================== 类型定义 ====================

// AI配置接口
interface AIConfig {
  key: string;
  value: string;
}

// AI助手配置
interface AIAssistantConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  apiEndpoint: string;
  temperature: number;
  maxTokens: number;
}

// ==================== AI配置管理 ====================

// 缓存配置避免频繁请求
let configCache: AIAssistantConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取AI助手配置
 * 优先从数据库读取，其次使用环境变量
 */
export async function getAIConfig(): Promise<AIAssistantConfig> {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (configCache && now - configCacheTime < CONFIG_CACHE_TTL) {
    return configCache;
  }

  try {
    // 尝试从数据库获取配置
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .like('key', 'ai_%');

    if (!error && data && data.length > 0) {
      const configMap: Record<string, string> = {};
      data.forEach((item: AIConfig) => {
        configMap[item.key] = item.value;
      });

      configCache = {
        enabled: configMap['ai_enabled'] !== 'false',
        provider: configMap['ai_provider'] || 'gemini',
        model: configMap['ai_model'] || 'gemini-2.0-flash',
        apiKey: configMap['ai_api_key'] || import.meta.env.VITE_GEMINI_API_KEY || '',
        apiEndpoint: configMap['ai_api_endpoint'] || '',
        temperature: parseFloat(configMap['ai_temperature']) || 0.9,
        maxTokens: parseInt(configMap['ai_max_tokens']) || 2048,
      };
    } else {
      // 使用环境变量作为后备
      configCache = {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        apiEndpoint: '',
        temperature: 0.9,
        maxTokens: 2048,
      };
    }
  } catch (err) {
    console.warn('从数据库获取AI配置失败，使用环境变量:', err);
    // 使用环境变量作为后备
    configCache = {
      enabled: true,
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      apiEndpoint: '',
      temperature: 0.9,
      maxTokens: 2048,
    };
  }

  configCacheTime = now;
  return configCache!;
}

/**
 * 清除配置缓存，强制重新获取
 */
export function clearAIConfigCache(): void {
  configCache = null;
  configCacheTime = 0;
}

// ==================== 通用AI调用 ====================

interface AIResponse {
  text: string;
}

/**
 * 通用AI调用函数，支持多种服务商
 * @param prompt 提示词
 * @param systemInstruction 系统指令
 * @returns AI响应文本
 */
export async function callAI(prompt: string, systemInstruction?: string): Promise<AIResponse> {
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    throw new Error('AI助手未配置API密钥');
  }

  // MiniMax 使用 OpenAI 兼容格式
  if (config.provider === 'minimax') {
    const endpoint = config.apiEndpoint || 'https://api.minimax.chat';
    const model = config.model || 'MiniMax-M2.7';
    
    const response = await fetch(`${endpoint}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API错误: ${response.status} ${error}`);
    }

    const data = await response.json();
    return { text: data.choices?.[0]?.message?.content || '' };
  }

  // OpenAI 兼容格式 (包括自定义端点)
  if (config.provider === 'openai' || config.provider === 'custom' || config.apiEndpoint) {
    const endpoint = config.apiEndpoint || 'https://api.openai.com/v1';
    const model = config.model || 'gpt-4o-mini';
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API错误: ${response.status} ${error}`);
    }

    const data = await response.json();
    return { text: data.choices?.[0]?.message?.content || '' };
  }

  // Claude (如果未来需要支持)
  if (config.provider === 'claude') {
    throw new Error('Claude暂未支持，请使用其他服务商');
  }

  // 默认使用 Gemini
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model || 'gemini-2.0-flash';
  
  const result = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'text/plain',
    },
  });

  return { text: result.text || '' };
}

/**
 * 通用JSON AI调用 (带结构化输出)
 */
export async function callAIJson<T = any>(prompt: string, systemInstruction?: string): Promise<T> {
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    throw new Error('AI助手未配置API密钥');
  }

  // MiniMax
  if (config.provider === 'minimax') {
    const endpoint = config.apiEndpoint || 'https://api.minimax.chat';
    const model = config.model || 'MiniMax-M2.7';
    
    const response = await fetch(`${endpoint}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt + '\n\n请以JSON格式回复，不要包含其他文字。' }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API错误: ${response.status} ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
  }

  // OpenAI / Custom / Gemini (使用GoogleGenAI)
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model || 'gemini-2.0-flash';
  
  const result = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  try {
    return JSON.parse(result.text || '{}');
  } catch {
    throw new Error('AI返回的不是有效的JSON格式');
  }
}

export type VoiceIntent =
  | 'create_task' | 'edit_task' | 'delete_task' | 'complete_task' | 'approve_task' | 'query_tasks'
  | 'create_habit' | 'checkin_habit' | 'edit_habit' | 'delete_habit' | 'query_habits'
  | 'create_wish' | 'edit_wish' | 'redeem_wish' | 'query_wishes'
  | 'query_stars' | 'add_stars' | 'deduct_stars' | 'query_history'
  | 'quadrant_analysis' | 'smart_suggestion' | 'today_summary' | 'weekly_report' | 'conflict_detect'
  | 'start_pomodoro' | 'stop_pomodoro' | 'set_pomodoro_duration'
  | 'navigate' | 'switch_user' | 'toggle_dark_mode' | 'chat'
  | 'calendar_sync' | 'calendar_subscribe'
  | 'unknown';

export interface VoiceCommand {
  intent: VoiceIntent;
  params: Record<string, any>;
  confidence: number;
  needsConfirmation: boolean;
  confirmationMessage?: string;
}

export interface VoiceResult {
  success: boolean;
  message: string;
  data?: any;
  action?: () => void;
}

export interface AppContext {
  members: Array<{ id: string; name: string; role: 'parent' | 'child'; avatar: string; stars: number }>;
  tasks: Array<{
    id: string; title: string; description: string; status: string;
    rewardStars: number; assigneeIds: string[]; creatorId: string;
    isHabit?: boolean; icon: string; startTime: string; deadline?: string;
  }>;
  rewards: Array<{ id: string; name: string; cost: number; category: string }>;
  currentUser: { id: string; name: string; role: 'parent' | 'child'; stars: number } | null;
  familyId: string | null;
}

// ==================== 意图识别 ====================

export async function recognizeIntent(userInput: string, context: AppContext, language: string = 'zh-CN'): Promise<VoiceCommand> {
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    return {
      intent: 'unknown',
      params: {},
      confidence: 0,
      needsConfirmation: false,
      confirmationMessage: 'AI助手未配置API密钥，请联系管理员在后台设置。',
    };
  }

  const getLocalizedLabel = (key: string) => {
    // Simple mapping for role and status labels
    const labels: Record<string, Record<string, string>> = {
      'zh-CN': { parent: '家长', child: '孩子', pending: '待完成', completed: '已完成', reviewing: '待审核', isHabit: '是', notHabit: '否' },
      'en-US': { parent: 'parent', child: 'child', pending: 'pending', completed: 'completed', reviewing: 'reviewing', isHabit: 'yes', notHabit: 'no' },
      'ja-JP': { parent: '親', child: '子', pending: '保留', completed: '完了', reviewing: '承認待ち', isHabit: 'はい', notHabit: 'いいえ' },
      'ko-KR': { parent: '부모', child: '아이', pending: '대기', completed: '완료', reviewing: '승인대기', isHabit: '예', notHabit: '아니요' },
      'es-ES': { parent: 'padre', child: 'niño', pending: 'pendiente', completed: 'completada', reviewing: 'revisión', isHabit: 'sí', notHabit: 'no' },
      'fr-FR': { parent: 'parent', child: 'enfant', pending: 'en attente', completed: 'complétée', reviewing: 'révision', isHabit: 'oui', notHabit: 'non' },
    };
    const langLabels = labels[language] || labels['en-US'];
    return langLabels[key] || key;
  };

  const memberInfo = context.members.map(m => 
    `${m.name}(ID:${m.id}, ${getLocalizedLabel('role')}:${m.role === 'parent' ? getLocalizedLabel('parent') : getLocalizedLabel('child')}, ${getLocalizedLabel('stars')}:${m.stars})`
  ).join('\n');
  
  const taskInfo = context.tasks.slice(0, 20).map(t =>
    `${t.title}(ID:${t.id}, ${getLocalizedLabel('status')}:${t.status}, ${getLocalizedLabel('reward')}:${t.rewardStars}${getLocalizedLabel('stars')}, ${getLocalizedLabel('executor')}:${t.assigneeIds.map(id => context.members.find(m => m.id === id)?.name || id).join(',')}, ${getLocalizedLabel('isHabit')}:${t.isHabit ? getLocalizedLabel('isHabit') : getLocalizedLabel('notHabit')})`
  ).join('\n');

  const rewardInfo = context.rewards.slice(0, 10).map(r =>
    `${r.name}(ID:${r.id}, ${getLocalizedLabel('cost')}:${r.cost}${getLocalizedLabel('stars')}, ${getLocalizedLabel('category')}:${r.category})`
  ).join('\n');

  const systemInstruction = `You are the AI voice assistant for the WishCard App. Users control all App functions via voice commands.

Current user: ${context.currentUser?.name || 'Unknown'}(ID:${context.currentUser?.id}, role:${context.currentUser?.role})

Family members:
${memberInfo}

Current tasks (up to 20):
${taskInfo}

Current wishes:
${rewardInfo}

You need to recognize intents and extract parameters from the user's natural language. Supported intent types:

**Task Management**: create_task, edit_task, delete_task, complete_task, approve_task, query_tasks
**Habit Check-in**: create_habit, checkin_habit, edit_habit, delete_habit, query_habits
**Wish Rewards**: create_wish, edit_wish, redeem_wish, query_wishes
**Star System**: query_stars, add_stars, deduct_stars, query_history
**Schedule Analysis**: quadrant_analysis, smart_suggestion, today_summary, weekly_report, conflict_detect
**Pomodoro**: start_pomodoro, stop_pomodoro, set_pomodoro_duration
**Navigation**: navigate, switch_user, toggle_dark_mode
**Calendar Sync**: calendar_sync, calendar_subscribe
**Chat**: chat

Parameter extraction rules:
- Member name→ID: match based on member list
- Task/wish name→ID: match based on task/wish list
- Number extraction: star count, duration, etc.
- Time extraction: "tomorrow"→calculate date, "3pm"→time
- If operation involves dangerous actions like delete, deduct stars, set needsConfirmation=true
- If information is incomplete, explain what is missing in the missingInfo field

IMPORTANT: Respond in JSON format with fields: intent, params, confidence, needsConfirmation, confirmationMessage, missingInfo, chatResponse.

IMPORTANT: Respond to the user in the same language they used for input. If uncertain, respond in ${language}.

When intent is 'chat', provide a helpful response in the user's language in the chatResponse field.`;

  const result = await callAIJson(userInput, systemInstruction);

  if (result.missingInfo) {
    return {
      intent: 'unknown',
      params: {},
      confidence: 0.5,
      needsConfirmation: false,
      confirmationMessage: `还差一点信息：${result.missingInfo}。您可以补充一下吗？`,
    };
  }

  if (result.intent === 'chat' && result.chatResponse) {
    return {
      intent: 'chat',
      params: { response: result.chatResponse },
      confidence: result.confidence || 0.8,
      needsConfirmation: false,
    };
  }

  return {
    intent: result.intent || 'unknown',
    params: result.params || {},
    confidence: result.confidence || 0.8,
    needsConfirmation: result.needsConfirmation || false,
    confirmationMessage: result.confirmationMessage,
  };
}

// ==================== 四象限分析 ====================

export interface QuadrantItem {
  task: {
    id: string;
    title: string;
    rewardStars: number;
    status: string;
    assigneeIds: string[];
  };
  reason: string;
}

export interface QuadrantAnalysis {
  urgentImportant: QuadrantItem[];     // 紧急且重要
  notUrgentImportant: QuadrantItem[];  // 重要不紧急
  urgentNotImportant: QuadrantItem[];  // 紧急不重要
  notUrgentNotImportant: QuadrantItem[]; // 不紧急不重要
  suggestions: string[];
  summary: string;
}

export async function analyzeQuadrant(context: AppContext, dateRange?: 'today' | 'week' | 'month'): Promise<QuadrantAnalysis> {
  const now = new Date();
  
  // 输入验证
  if (!context) {
    throw new Error('上下文数据为空');
  }
  
  if (!context.tasks || !Array.isArray(context.tasks)) {
    throw new Error('任务数据无效或为空');
  }
  
  // 过滤任务
  const targetTasks = context.tasks.filter(t => {
    if (!t || typeof t !== 'object') return false;
    if (t.status === 'completed') return false;
    if (dateRange === 'today') {
      if (!t.startTime) return false;
      const taskDate = new Date(t.startTime);
      return taskDate.toDateString() === now.toDateString();
    }
    return true;
  });

  // 获取AI配置
  const config = await getAIConfig();
  const hasApiKey = config.apiKey && config.apiKey !== '';
  
  if (!hasApiKey) {
    console.log('AI助手未配置API密钥，使用本地规则分析');
  }
  
  if (hasApiKey) {
    try {
      const taskList = targetTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        rewardStars: t.rewardStars,
        assigneeNames: t.assigneeIds.map(id => context.members.find(m => m.id === id)?.name || '未知'),
        isHabit: t.isHabit,
        startTime: t.startTime,
      }));

      const systemInstruction = `你是时间管理专家。根据艾森豪威尔矩阵对任务进行四象限分类：
- 紧急且重要：有明确截止日期且影响大的任务
- 重要不紧急：长期价值高但无紧迫截止日期的任务(如习惯养成)
- 紧急不重要：时间紧迫但价值较低的任务
- 不紧急不重要：既不紧迫也不重要的任务

分类依据：
1. 奖励星星数反映重要程度(星多=重要)
2. 习惯类任务通常属于"重要不紧急"
3. 待审核任务通常紧急
4. 长期未完成的待办可能紧急度上升

请用中文回答，给出简洁有力的建议。返回JSON格式。`;

      const response = await callAI(
        `请分析以下任务的四象限分布。当前用户: ${context.currentUser?.name}，日期: ${now.toLocaleDateString('zh-CN')}。

待分析任务:
${JSON.stringify(taskList, null, 2)}

请按照艾森豪威尔矩阵(紧急-重要)分类，并给出建议。返回JSON格式，包含字段：urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant(每个是包含taskId和reason的对象数组), suggestions(字符串数组), summary(总结)。`,
        systemInstruction
      );

      const analysis = JSON.parse(response.text || '{}');
      const findTask = (id: string) => context.tasks.find(t => t.id === id);

      return {
        urgentImportant: (analysis.urgentImportant || []).map((item: any) => ({
          task: findTask(item.taskId) || { id: item.taskId, title: '未知任务', rewardStars: 0, status: 'pending', assigneeIds: [] },
          reason: item.reason,
        })),
        notUrgentImportant: (analysis.notUrgentImportant || []).map((item: any) => ({
          task: findTask(item.taskId) || { id: item.taskId, title: '未知任务', rewardStars: 0, status: 'pending', assigneeIds: [] },
          reason: item.reason,
        })),
        urgentNotImportant: (analysis.urgentNotImportant || []).map((item: any) => ({
          task: findTask(item.taskId) || { id: item.taskId, title: '未知任务', rewardStars: 0, status: 'pending', assigneeIds: [] },
          reason: item.reason,
        })),
        notUrgentNotImportant: (analysis.notUrgentNotImportant || []).map((item: any) => ({
          task: findTask(item.taskId) || { id: item.taskId, title: '未知任务', rewardStars: 0, status: 'pending', assigneeIds: [] },
          reason: item.reason,
        })),
        suggestions: analysis.suggestions || [],
        summary: analysis.summary || '',
      };
    } catch (error) {
      console.warn('AI分析失败，使用本地规则分析:', error);
      // 如果 AI 分析失败，fallback 到本地规则
    }
  }

  // 本地规则分析（无 API Key 或 AI 失败时的备用方案）
  return localQuadrantAnalysis(context, targetTasks);
}

// 本地规则分析函数
function localQuadrantAnalysis(context: AppContext, tasks: any[]): QuadrantAnalysis {
  const now = new Date();
  const urgentImportant: QuadrantItem[] = [];
  const notUrgentImportant: QuadrantItem[] = [];
  const urgentNotImportant: QuadrantItem[] = [];
  const notUrgentNotImportant: QuadrantItem[] = [];

  tasks.forEach(task => {
    const hasDeadline = task.endTime || task.startTime;
    const isUrgent = hasDeadline ? (() => {
      const deadline = new Date(task.endTime || task.startTime);
      const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24; // 24小时内算紧急
    })() : false;
    
    const isImportant = task.rewardStars >= 10 || task.isHabit; // 高奖励或习惯任务算重要
    
    const reason = getClassificationReason(task, isUrgent, isImportant);

    const item: QuadrantItem = {
      task,
      reason,
    };

    if (isUrgent && isImportant) {
      urgentImportant.push(item);
    } else if (!isUrgent && isImportant) {
      notUrgentImportant.push(item);
    } else if (isUrgent && !isImportant) {
      urgentNotImportant.push(item);
    } else {
      notUrgentNotImportant.push(item);
    }
  });

  // 生成建议
  const suggestions: string[] = [];
  if (urgentImportant.length > 0) {
    suggestions.push(`有 ${urgentImportant.length} 个紧急重要任务需要优先处理`);
  }
  if (notUrgentImportant.length > 0) {
    suggestions.push(`有 ${notUrgentImportant.length} 个重要不紧急任务，建议制定计划逐步完成`);
  }
  if (urgentNotImportant.length > 3) {
    suggestions.push('紧急不重要任务较多，考虑委托或快速处理');
  }

  // 生成总结
  const totalTasks = tasks.length;
  const summary = `当前共有 ${totalTasks} 个待处理任务。其中紧急重要 ${urgentImportant.length} 个，重要不紧急 ${notUrgentImportant.length} 个，紧急不重要 ${urgentNotImportant.length} 个，不紧急不重要 ${notUrgentNotImportant.length} 个。${suggestions.length > 0 ? '建议：' + suggestions[0] : ''}`;

  return {
    urgentImportant,
    notUrgentImportant,
    urgentNotImportant,
    notUrgentNotImportant,
    suggestions,
    summary,
  };
}

// 生成分类原因
function getClassificationReason(task: any, isUrgent: boolean, isImportant: boolean): string {
  if (isUrgent && isImportant) {
    return `截止时间临近（${task.endTime || task.startTime}），且奖励星星数为 ${task.rewardStars}，属于高优先级任务`;
  }
  if (!isUrgent && isImportant) {
    if (task.isHabit) {
      return '习惯养成类任务，长期价值高，建议每天坚持';
    }
    return `奖励星星数为 ${task.rewardStars}，重要但无紧迫截止日期`;
  }
  if (isUrgent && !isImportant) {
    return '时间紧迫，但任务价值较低，建议快速处理或委托他人';
  }
  return '既不紧迫也不重要，可以稍后处理或删除';
}

// ==================== 今日总结 ====================

export async function generateTodaySummary(context: AppContext): Promise<string> {
  const config = await getAIConfig();
  if (!config.apiKey) {
    return 'AI助手未配置API密钥，无法生成总结。';
  }

  const today = new Date().toDateString();
  const todayTasks = context.tasks.filter(t => new Date(t.startTime).toDateString() === today);
  const completed = todayTasks.filter(t => t.status === 'completed');
  const pending = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const reviewing = todayTasks.filter(t => t.status === 'reviewing');

  const response = await callAI(
    `生成今日总结。用户: ${context.currentUser?.name}，今日任务: ${todayTasks.length}个(已完成${completed.length}, 进行中${pending.length}, 待审核${reviewing.length})，当前星星: ${context.currentUser?.stars || 0}`,
    `你是温暖的家庭助手，用简短温馨的语言总结今日表现。包括：完成的任务、获得的星星、待完成的事项、鼓励语。不超过200字。用中文回答。`
  );

  return response.text || '今天又是充满活力的一天！继续加油 🌱';
}

// ==================== 智能建议 ====================

export async function getSmartSuggestions(context: AppContext): Promise<string[]> {
  const config = await getAIConfig();
  if (!config.apiKey) {
    return ['AI助手未配置API密钥，无法获取智能建议'];
  }

  const pendingTasks = context.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const reviewingTasks = context.tasks.filter(t => t.status === 'reviewing');

  const response = await callAIJson<string[]>(
    `给出智能建议。待办任务${pendingTasks.length}个，待审核${reviewingTasks.length}个，用户星星${context.currentUser?.stars}，可用心愿${context.rewards.length}个。返回JSON数组格式。`,
    `根据用户当前状态，给出3-5条简短实用的建议。例如：优先完成高奖励任务、审核待确认的打卡、兑换某个心愿等。每条建议不超过30字。用中文回答。返回JSON数组。`
  );

  return Array.isArray(response) ? response : [];
}

// ==================== 语音合成（TTS）====================

export function speak(text: string, lang = 'zh-CN'): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.1;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

// ==================== 语音识别（STT）====================

export function startListening(lang = 'zh-CN'): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('当前浏览器不支持语音识别，请使用Chrome浏览器'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`语音识别错误: ${event.error}`));
    };

    recognition.onend = () => {
      // 如果没有结果就结束，返回空字符串
      resolve('');
    };

    recognition.start();
  });
}

// ==================== .ics 日历生成 ====================

export function generateICSFile(tasks: AppContext['tasks'], members: AppContext['members'], familyName: string): string {
  const now = new Date();
  const timeStamp = formatICSDate(now);
  const prodId = '-//愿望卡WishCard//AI语音助手//CN';

  const events = tasks.filter(t => !t.isHabit && t.status !== 'completed').map(task => {
    const startDate = new Date(task.startTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 默认1小时
    const assigneeNames = task.assigneeIds.map(id => members.find(m => m.id === id)?.name || '').filter(Boolean).join(', ');

    return [
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `DTSTAMP:${timeStamp}`,
      `UID:${task.id}@wishcard.app`,
      `SUMMARY:${task.title}`,
      task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}\\n执行人: ${assigneeNames}\\n奖励: ${task.rewardStars}颗星星` : `DESCRIPTION:执行人: ${assigneeNames}\\n奖励: ${task.rewardStars}颗星星`,
      `STATUS:${task.status === 'pending' ? 'TENTATIVE' : task.status === 'reviewing' ? 'CONFIRMED' : 'CONFIRMED'}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    `X-WR-CALNAME:${familyName} - 愿望卡`,
    'X-WR-TIMEZONE:Asia/Shanghai',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function downloadICS(content: string, filename = 'wishcard-calendar.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a', { defaultValue: 'a' });
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== 手机品牌日历同步引导 ====================

export interface CalendarSyncGuide {
  brand: string;
  brandLogo: string;
  brandColor: string;
  steps: string[];
  tips: string[];
  supported: boolean;
}

export function getCalendarSyncGuide(brand: string): CalendarSyncGuide {
  const guides: Record<string, CalendarSyncGuide> = {
    '华为': {
      brand: '华为',
      brandLogo: '📱',
      brandColor: '#CF0A2C',
      steps: [
        '打开「日历」App',
        '点击右下角「更多」→「订阅管理」',
        '点击「+」添加订阅',
        '粘贴愿望卡提供的 WebCal 订阅链接',
        '点击「确认」完成订阅',
        '等待同步完成（约15分钟）',
      ],
      tips: [
        'HarmonyOS 3.0+ 支持日历订阅功能',
        '如找不到订阅入口，可通过浏览器打开 .ics 文件导入',
        '华为手机也可通过「备忘录」→「日历」关联',
      ],
      supported: true,
    },
    '荣耀': {
      brand: '荣耀',
      brandLogo: '📱',
      brandColor: '#1A6DB5',
      steps: [
        '打开「日历」App',
        '点击右上角「⋮」→「订阅日历」',
        '点击「+」添加新的订阅',
        '粘贴愿望卡的 WebCal 订阅链接',
        '点击「确认」完成订阅',
      ],
      tips: [
        'MagicOS 7.0+ 完整支持日历订阅',
        '操作方式与华为类似（同源系统）',
      ],
      supported: true,
    },
    '小米': {
      brand: '小米',
      brandLogo: '📱',
      brandColor: '#FF6900',
      steps: [
        '打开「日历」App',
        '点击右上角「⋮」→「设置」',
        '找到「日历账号管理」→「订阅日历」',
        '点击「添加订阅」',
        '粘贴愿望卡的 WebCal 订阅链接',
        '确认订阅，等待同步',
      ],
      tips: [
        'MIUI 13+ 支持最好，15分钟自动同步',
        '小米日历对 WebCal 支持最完善',
        '也可在日历中手动导入 .ics 文件',
      ],
      supported: true,
    },
    'OPPO': {
      brand: 'OPPO',
      brandLogo: '📱',
      brandColor: '#1D8348',
      steps: [
        '打开「日历」App',
        '点击右下角「我的」→「订阅管理」',
        '点击「添加订阅」',
        '粘贴愿望卡的 WebCal 订阅链接',
        '确认订阅',
      ],
      tips: [
        'ColorOS 13+ 支持日历订阅',
        '如无订阅入口，请用浏览器打开 .ics 文件',
        '可在「设置」→「日历」中调整同步频率',
      ],
      supported: true,
    },
    'vivo': {
      brand: 'vivo',
      brandLogo: '📱',
      brandColor: '#415FFF',
      steps: [
        '打开「日历」App',
        '点击右上角「⋮」→「设置」',
        '找到「订阅管理」→「添加订阅」',
        '粘贴愿望卡的 WebCal 订阅链接',
        '确认订阅',
      ],
      tips: [
        'OriginOS 3.0+ 支持日历订阅',
        '如找不到入口，请用浏览器打开 .ics 文件',
        '部分旧机型可能需要升级系统',
      ],
      supported: true,
    },
    '三星': {
      brand: '三星',
      brandLogo: '📱',
      brandColor: '#1428A0',
      steps: [
        '打开「Samsung Calendar」App',
        '点击左上角菜单 →「管理日历」',
        '点击「添加日历」→「订阅日历」',
        '粘贴愿望卡的 WebCal 订阅链接',
        '点击「确认」完成订阅',
      ],
      tips: [
        'One UI 5.0+ 支持日历订阅',
        '三星 S Planner 兼容 iCalendar 标准',
        '也可通过 Google Calendar 关联同步',
      ],
      supported: true,
    },
    'Apple': {
      brand: 'Apple',
      brandLogo: '🍎',
      brandColor: '#555555',
      steps: [
        '在 Safari 中打开愿望卡提供的 webcal:// 链接',
        '系统会自动弹出「订阅日历」确认框',
        '点击「订阅」完成添加',
        '前往「设置」→「日历」→「账户」查看订阅',
      ],
      tips: [
        'iOS 原生支持 webcal:// 协议',
        '也可以手动添加：设置→日历→账户→添加订阅日历',
        'macOS 同样支持，体验最佳',
      ],
      supported: true,
    },
  };

  return guides[brand] || {
    brand: brand || '通用',
    brandLogo: '📲',
    brandColor: '#6B7280',
    steps: [
      '打开手机日历 App',
      '查找「订阅管理」或「导入日历」功能',
      '粘贴愿望卡提供的 WebCal 订阅链接',
      '确认订阅，等待同步',
      '如果没有订阅功能，用浏览器打开 .ics 文件导入',
    ],
    tips: [
      '大多数智能手机都支持 iCalendar 标准',
      '建议使用系统自带浏览器打开订阅链接',
    ],
    supported: true,
  };
}
