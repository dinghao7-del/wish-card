/**
 * AI 语音助手引擎
 * 支持 40+ 意图，覆盖 App 全部功能
 * 使用 Gemini AI 进行自然语言理解和指令执行
 * 支持从数据库读取配置，优先使用数据库配置，其次使用环境变量
 */

import { GoogleGenAI, Type } from "@google/genai";
import supabase from './supabase';
import { recognizeScheduleArrangementSkill } from './scheduleArrangementSkill';
import {
  buildFamilyButlerAdvice as buildFamilyButlerAdviceDomain,
  buildFamilyButlerContextSummary as buildFamilyButlerContextSummaryDomain,
  isFamilyPromiseLike,
} from '../domain/familyButlerAdvice';
import { inferHolidayPlayPreference } from './recommendationInventory';

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
  | 'create_plan'
  | 'holiday_play_preference'
  | 'schedule_arrangement'
  | 'public_calendar_query'
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
    type?: string; isHabit?: boolean; icon: string; startTime: string; endTime?: string; deadline?: string; planId?: string; createdAt?: string;
  }>;
  rewards: Array<{ id: string; name: string; cost: number; category: string; status?: string; redeemedBy?: string }>;
  currentUser: { id: string; name: string; role: 'parent' | 'child'; stars: number } | null;
  familyId: string | null;
}

// ==================== 意图识别 ====================

export async function recognizeIntent(userInput: string, context: AppContext, language: string = 'zh-CN'): Promise<VoiceCommand> {
  const localScheduleArrangementIntent = recognizeLocalScheduleArrangementIntent(userInput);
  if (localScheduleArrangementIntent) return localScheduleArrangementIntent;
  const localPublicCalendarIntent = recognizeLocalPublicCalendarIntent(userInput);
  if (localPublicCalendarIntent) return localPublicCalendarIntent;
  const localHolidayPlayPreferenceIntent = recognizeLocalHolidayPlayPreferenceIntent(userInput);
  if (localHolidayPlayPreferenceIntent) return localHolidayPlayPreferenceIntent;
  const localPlanIntent = recognizeLocalPlanIntent(userInput);
  if (localPlanIntent) return localPlanIntent;
  const localReportIntent = recognizeLocalReportIntent(userInput);
  if (localReportIntent) return localReportIntent;
  const localQuadrantIntent = recognizeLocalQuadrantIntent(userInput);
  if (localQuadrantIntent) return localQuadrantIntent;
  const localButlerIntent = recognizeLocalButlerIntent(userInput);
  if (localButlerIntent) return localButlerIntent;

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
**Family Plans**: create_plan
**Holiday Play Preference**: holiday_play_preference
**Schedule Arrangement Skill**: schedule_arrangement
**Public Calendar Intelligence**: public_calendar_query
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
- For create_plan, extract params.scene as weekday/holiday/exchange/custom and params.name when the user asks to create or make a plan. Default scene to custom.
- For holiday_play_preference, use it when the user describes holiday play/travel preference such as small/medium/big play, pure fun, science-oriented play, interest development, caregiver time, budget, or effort level. Extract holidayPlayScale, holidayPlayMode, caregiverLoad, budgetLevel, effortLevel.
- For schedule_arrangement, use it when the user asks to add weekly classes, change class time, pause, postpone, or shift extracurricular schedules because of travel, school changes, holidays, or temporary events. Extract params.operation as add_recurring_class or shift_schedule. For add_recurring_class, extract activityName, weekday, startTime, endTime. For shift_schedule, extract scope, shiftWeeks, reason.
- For public_calendar_query, use it when the user asks whether holidays, makeup workdays, school calendar, disasters, public events, opening school, vacation, or traffic/public changes will affect the family schedule. Extract params.range as week/month/year and params.direction as current/next.
- For quadrant_analysis, extract params.dateRange as today/week/month when the user says today, this week, or this month. Default to today.
- For weekly_report, extract params.period as week/month/term/year when the user asks for a family report, recap, review, or next-period schedule advice. Default to week.
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

function recognizeLocalButlerIntent(input: string): VoiceCommand | null {
  const text = input.toLowerCase();
  if (/(智能建议|管家建议|给.*建议|下一步|怎么办|整体看看|帮我看看|有什么建议|suggestion|advice)/.test(text)) {
    return {
      intent: 'smart_suggestion',
      params: {},
      confidence: 0.9,
      needsConfirmation: false,
    };
  }
  if (/(今日总结|今天总结|今天怎么样|今天表现|summary)/.test(text)) {
    return {
      intent: 'today_summary',
      params: {},
      confidence: 0.9,
      needsConfirmation: false,
    };
  }
  return null;
}

function recognizeLocalScheduleArrangementIntent(input: string): VoiceCommand | null {
  const command = recognizeScheduleArrangementSkill(input);
  if (!command) return null;

  return {
    intent: 'schedule_arrangement',
    params: command,
    confidence: command.confidence,
    needsConfirmation: true,
    confirmationMessage: command.summary,
  };
}

export type PublicCalendarRangeParam = 'week' | 'month' | 'year';
export type PublicCalendarDirectionParam = 'current' | 'next';

export function parsePublicCalendarRangeFromText(input: string): PublicCalendarRangeParam {
  const text = input.toLowerCase();
  if (/(全年|今年|明年|年度|year)/.test(text)) return 'year';
  if (/(本月|这个月|下月|下个月|月度|month)/.test(text)) return 'month';
  return 'week';
}

export function parsePublicCalendarDirectionFromText(input: string): PublicCalendarDirectionParam {
  const text = input.toLowerCase();
  return /(下周|下星期|下个月|明年|next)/.test(text) ? 'next' : 'current';
}

function recognizeLocalPublicCalendarIntent(input: string): VoiceCommand | null {
  const text = input.toLowerCase();
  const asksPublicTime = /(节假日|放假|调休|补班|补课|开学|校历|寒假|暑假|灾情|台风|暴雨|暴雪|极端天气|公共事件|交通管制|停课|public holiday|holiday|school calendar)/.test(text)
    && /(影响|安排|日程|提醒|看看|有没有|查一下|查询|注意|变化|改动|什么时候|哪天)/.test(text);
  if (!asksPublicTime) return null;

  return {
    intent: 'public_calendar_query',
    params: {
      range: parsePublicCalendarRangeFromText(input),
      direction: parsePublicCalendarDirectionFromText(input),
    },
    confidence: 0.88,
    needsConfirmation: false,
  };
}

function recognizeLocalHolidayPlayPreferenceIntent(input: string): VoiceCommand | null {
  const text = input.toLowerCase();
  const mentionsHolidayPlay = /(假期|暑假|寒假|小长假|周末|玩|旅行|出游|度假|营地|研学|科学馆|博物馆|vacation|holiday|trip)/.test(text);
  const mentionsPreference = /(小玩|中玩|大玩|纯玩|科学|兴趣|培养|预算|省心|省力|陪伴|家长忙|投入|托管|深度陪|低成本|高预算|big|science|budget|easy)/.test(text);
  if (!mentionsHolidayPlay || !mentionsPreference) return null;

  const preference = inferHolidayPlayPreference({ text: input });
  return {
    intent: 'holiday_play_preference',
    params: {
      holidayPlayScale: preference.scale,
      holidayPlayMode: preference.mode,
      caregiverLoad: preference.caregiverLoad,
      budgetLevel: preference.budgetLevel,
      effortLevel: preference.effortLevel,
      sourceText: input,
    },
    confidence: 0.9,
    needsConfirmation: false,
  };
}

export function parseQuadrantDateRangeFromText(input: string): QuadrantDateRange {
  const text = input.toLowerCase();
  if (/(本月|这个月|这月|月度|monthly|month)/.test(text)) return 'month';
  if (/(本周|这周|这星期|这个星期|周度|weekly|week)/.test(text)) return 'week';
  if (/(今天|今日|当天|现在|today)/.test(text)) return 'today';
  return 'today';
}

function recognizeLocalQuadrantIntent(input: string): VoiceCommand | null {
  const text = input.toLowerCase();
  const asksQuadrant = /(四象限|象限|轻重缓急|优先级|先做什么|先干什么|怎么安排|压力大不大|quadrant|priority)/.test(text);
  if (!asksQuadrant) return null;

  return {
    intent: 'quadrant_analysis',
    params: {
      dateRange: parseQuadrantDateRangeFromText(input),
    },
    confidence: 0.9,
    needsConfirmation: false,
  };
}

export type PlanSceneParam = 'weekday' | 'holiday' | 'exchange' | 'custom';

export function parsePlanSceneFromText(input: string): PlanSceneParam {
  const text = input.toLowerCase();
  if (/(暑假|寒假|假期|节假日|holiday|vacation|summer|winter)/.test(text)) return 'holiday';
  if (/(留学|交换|海外|时差|exchange|abroad|overseas)/.test(text)) return 'exchange';
  if (/(平日|工作日|上学日|日常作息|weekday|school day)/.test(text)) return 'weekday';
  return 'custom';
}

export function extractPlanNameFromText(input: string): string {
  const text = input.trim();
  const match = text.match(/(?:帮我|给.*?孩子|给孩子|制定|创建|做|生成|安排)?(.{2,24}?(?:计划|安排|方案))/);
  return match?.[1]
    ?.replace(/^(帮我|给.*?孩子|给孩子|制定|创建|做|生成|安排|一个|一份|一下)+/, '')
    .trim() || '';
}

function recognizeLocalPlanIntent(input: string): VoiceCommand | null {
  const text = input.toLowerCase();
  const asksCreatePlan = /(创建|制定|做一个|做一份|生成|帮我做|帮我制定|规划).{0,12}(计划|安排|方案)|(?:计划|安排|方案).{0,8}(创建|制定|生成)/.test(text);
  if (!asksCreatePlan) return null;

  const scene = parsePlanSceneFromText(input);
  return {
    intent: 'create_plan',
    params: {
      scene,
      name: extractPlanNameFromText(input) || (scene === 'holiday' ? '假期计划' : scene === 'weekday' ? '平日计划' : scene === 'exchange' ? '交换留学计划' : '自定义计划'),
    },
    confidence: 0.9,
    needsConfirmation: false,
  };
}

export type ReportPeriodParam = 'week' | 'month' | 'term' | 'year';

export function parseReportPeriodFromText(input: string): ReportPeriodParam {
  const text = input.toLowerCase();
  if (/(年度|全年|今年|年报|year)/.test(text)) return 'year';
  if (/(学期|本学期|这学期|term|semester)/.test(text)) return 'term';
  if (/(月报|本月|这个月|这月|下月|monthly|month)/.test(text)) return 'month';
  return 'week';
}

function recognizeLocalReportIntent(input: string): VoiceCommand | null {
  const text = input.toLowerCase();
  const asksReport = /(复盘|周报|月报|年报|学期报|总结|回顾|下周.*安排|下个周期|家庭安排建议|report|review|recap)/.test(text);
  if (!asksReport) return null;

  return {
    intent: 'weekly_report',
    params: {
      period: parseReportPeriodFromText(input),
      focus: /(下周|下月|下个周期|安排建议|next)/.test(text) ? 'next_period' : 'review',
    },
    confidence: 0.9,
    needsConfirmation: false,
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

export type QuadrantDateRange = 'all' | 'today' | 'next3days' | 'next7days' | 'week' | 'month' | 'next30days' | 'year';

export interface QuadrantAnalysis {
  urgentImportant: QuadrantItem[];     // 紧急且重要
  notUrgentImportant: QuadrantItem[];  // 重要不紧急
  urgentNotImportant: QuadrantItem[];  // 紧急不重要
  notUrgentNotImportant: QuadrantItem[]; // 不紧急不重要
  suggestions: string[];
  summary: string;
  periodLabel: string;
  coachingSummary: string;
  childEncouragement: string;
  parentAction: string;
}

export async function analyzeQuadrant(context: AppContext, dateRange: QuadrantDateRange = 'all'): Promise<QuadrantAnalysis> {
  const now = new Date();
  
  // 输入验证
  if (!context) {
    throw new Error('上下文数据为空');
  }
  
  if (!context.tasks || !Array.isArray(context.tasks)) {
    throw new Error('任务数据无效或为空');
  }
  
  const range = getQuadrantDateRange(dateRange, now);

  // 过滤任务
  const targetTasks = filterQuadrantTasksByDateRange(context.tasks, dateRange, now);

  if (context.familyId === 'guest-family') {
    const rangeLabel = range?.label || '全部任务';
    return localQuadrantAnalysis(context, targetTasks, rangeLabel);
  }

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
        endTime: t.endTime,
        deadline: t.deadline,
        planId: t.planId,
      }));

      const systemInstruction = `你是星愿卡的家庭 AI 管家，不是冷冰冰的项目经理。你的任务是帮助家长减少决策负担，也帮助孩子看到努力和下一步。

根据艾森豪威尔矩阵对家庭任务进行四象限分类：
- 紧急且重要：有明确截止日期且影响大的任务
- 重要不紧急：长期价值高但无紧迫截止日期的任务(如习惯养成)
- 紧急不重要：时间紧迫但价值较低的任务
- 不紧急不重要：既不紧迫也不重要的任务

分类依据：
1. 奖励星星数反映重要程度(星多=重要)
2. 习惯类任务通常属于"重要不紧急"
3. 待审核任务通常紧急
4. 长期未完成的待办可能紧急度上升

表达要求：
1. 建议要像家庭管家在帮忙做取舍，而不是生成报表。
2. 对孩子以鼓励为主，避免批评。
3. 对家长给出可执行动作，例如“今天先保住两件关键事”“把某件事延后到周末”。
4. 如果任务过多，要主动建议减法。

请用中文回答，返回JSON格式。`;

      const response = await callAI(
        `请分析${range?.label || '全部'}家庭任务的四象限分布。当前用户: ${context.currentUser?.name}，日期: ${now.toLocaleDateString('zh-CN')}。

待分析任务:
${JSON.stringify(taskList, null, 2)}

请按照艾森豪威尔矩阵(紧急-重要)分类，并给出建议。返回JSON格式，包含字段：
urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant(每个是包含taskId和reason的对象数组),
suggestions(字符串数组), summary(一句总结), coachingSummary(家庭管家式权衡建议), childEncouragement(给孩子的鼓励), parentAction(给家长的下一步动作)。`,
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
        periodLabel: range?.label || '全部任务',
        coachingSummary: analysis.coachingSummary || analysis.summary || '',
        childEncouragement: analysis.childEncouragement || '先把最重要的一小步做好，今天的努力就会被看见。',
        parentAction: analysis.parentAction || '建议先帮孩子确认今天最关键的一件事，再把不急的任务顺延。',
      };
    } catch (error) {
      console.warn('AI分析失败，使用本地规则分析:', error);
      // 如果 AI 分析失败，fallback 到本地规则
    }
  }

  // 本地规则分析（无 API Key 或 AI 失败时的备用方案）
  return localQuadrantAnalysis(context, targetTasks, range?.label || '全部任务');
}

// 本地规则分析函数
function localQuadrantAnalysis(context: AppContext, tasks: any[], periodLabel = '当前'): QuadrantAnalysis {
  const now = new Date();
  const urgentImportant: QuadrantItem[] = [];
  const notUrgentImportant: QuadrantItem[] = [];
  const urgentNotImportant: QuadrantItem[] = [];
  const notUrgentNotImportant: QuadrantItem[] = [];

  tasks.forEach(task => {
    const hasDeadline = task.deadline || task.endTime || task.startTime;
    const isUrgent = hasDeadline ? (() => {
      const deadline = new Date(task.deadline || task.endTime || task.startTime);
      const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24 || task.status === 'reviewing'; // 24小时内或待审核算紧急
    })() : false;
    
    const isImportant = task.rewardStars >= 10 || task.isHabit || isFamilyPromiseTask(task); // 高奖励、习惯或家庭承诺算重要
    
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
    suggestions.push(`先守住 ${urgentImportant.length} 个紧急重要任务，其他事项可以适当顺延`);
  }
  if (notUrgentImportant.length > 0) {
    suggestions.push(`${notUrgentImportant.length} 个重要不紧急任务适合稳定坚持，不要都挤到今天`);
  }
  if (urgentNotImportant.length > 3) {
    suggestions.push('紧急但不重要的事项偏多，建议家长帮孩子做一次减法');
  }

  // 生成总结
  const totalTasks = tasks.length;
  const summary = `${periodLabel}共有 ${totalTasks} 个待处理事项，优先关注 ${urgentImportant.length} 个紧急重要任务。`;
  const coachingSummary = urgentImportant.length > 0
    ? `${periodLabel}先不要追求全部完成，建议把最关键的 ${urgentImportant.length} 件事排在前面，让孩子知道“先做什么”比“什么都做”更重要。`
    : `${periodLabel}压力不高，可以把重心放在重要不紧急的习惯和成长任务上。`;
  const childEncouragement = notUrgentImportant.length > 0
    ? '你现在坚持的小习惯，虽然不一定马上紧急，但它们会慢慢变成真正的进步。'
    : '先完成眼前最清楚的一小步，就已经是在往前走了。';
  const parentAction = urgentNotImportant.length > 0
    ? '建议家长把紧急但价值不高的事情合并处理，给孩子留出专注完成关键任务的时间。'
    : '建议家长今天只强调一两个重点，减少反复催促，让孩子更容易进入状态。';

  return {
    urgentImportant,
    notUrgentImportant,
    urgentNotImportant,
    notUrgentNotImportant,
    suggestions,
    summary,
    periodLabel,
    coachingSummary,
    childEncouragement,
    parentAction,
  };
}

// 生成分类原因
function getClassificationReason(task: any, isUrgent: boolean, isImportant: boolean): string {
  if (isUrgent && isImportant) {
    if (isFamilyPromiseTask(task)) {
      return '这是孩子已经兑换的家庭承诺，建议家长优先安排兑现';
    }
    return `时间比较靠前，且对成长或当天节奏影响较大，建议优先完成`;
  }
  if (!isUrgent && isImportant) {
    if (isFamilyPromiseTask(task)) {
      return '这是需要父母兑现的心愿承诺，重要性来自亲子信任';
    }
    if (task.isHabit) {
      return '这是习惯养成类任务，长期价值高，适合稳定坚持';
    }
    return `这件事有较高成长价值，但不用挤占最紧急的时间`;
  }
  if (isUrgent && !isImportant) {
    return '时间比较近，但价值相对有限，适合快速处理或由家长协助简化';
  }
  return '暂时不需要占用主要精力，可以稍后处理或考虑删减';
}

export function isFamilyPromiseTask(task: { title?: string; description?: string; type?: string }): boolean {
  return isFamilyPromiseLike(task);
}

export function buildFamilyButlerContextSummary(context: AppContext) {
  return buildFamilyButlerContextSummaryDomain({
    tasks: context.tasks,
    rewards: context.rewards,
    currentStars: context.currentUser?.stars || 0,
  });
}

export function buildFamilyButlerSuggestions(context: AppContext): string[] {
  return buildFamilyButlerAdvice(context).suggestions;
}

export function buildFamilyButlerAdvice(context: AppContext) {
  return buildFamilyButlerAdviceDomain({
    tasks: context.tasks,
    rewards: context.rewards,
    currentStars: context.currentUser?.stars || 0,
  });
}

export function filterQuadrantTasksByDateRange<T extends { status?: string }>(
  tasks: T[],
  dateRange: QuadrantDateRange,
  now: Date = new Date(),
): T[] {
  const range = getQuadrantDateRange(dateRange, now);
  return tasks.filter(t => {
    if (!t || typeof t !== 'object') return false;
    if (t.status === 'completed') return false;
    if (!range) return true;
    const taskTime = getTaskReferenceDate(t);
    if (!taskTime) return false;
    return taskTime >= range.start.getTime() && taskTime <= range.end.getTime();
  });
}

export function getQuadrantDateRange(dateRange: QuadrantDateRange, now: Date): { start: Date; end: Date; label: string } | null {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (dateRange === 'today') return { start: startOfDay, end: endOfDay, label: '今天' };
  if (dateRange === 'next3days') return { start: startOfDay, end: addDaysEnd(startOfDay, 3), label: '未来3天' };
  if (dateRange === 'next7days') return { start: startOfDay, end: addDaysEnd(startOfDay, 7), label: '未来7天' };
  if (dateRange === 'next30days') return { start: startOfDay, end: addDaysEnd(startOfDay, 30), label: '未来30天' };
  if (dateRange === 'week') {
    const start = new Date(startOfDay);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { start, end: addDaysEnd(start, 7), label: '本周' };
  }
  if (dateRange === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: '本月' };
  }
  if (dateRange === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end, label: '今年' };
  }
  return null;
}

function addDaysEnd(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getTaskReferenceDate(task: any): number | null {
  const value = task.deadline || task.endTime || task.startTime || task.createdAt;
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
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
  const prodId = '-//星愿卡WishCard//AI语音助手//CN';

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
    `X-WR-CALNAME:${familyName} - 星愿卡`,
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
  const link = document.createElement('a');
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
      brandColor: 'var(--color-tertiary)',
      steps: [
        '打开「日历」App',
        '点击右下角「更多」→「订阅管理」',
        '点击「+」添加订阅',
        '粘贴星愿卡提供的 WebCal 订阅链接',
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
      brandColor: 'var(--color-primary)',
      steps: [
        '打开「日历」App',
        '点击右上角「⋮」→「订阅日历」',
        '点击「+」添加新的订阅',
        '粘贴星愿卡的 WebCal 订阅链接',
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
      brandColor: 'var(--color-amber-text)',
      steps: [
        '打开「日历」App',
        '点击右上角「⋮」→「设置」',
        '找到「日历账号管理」→「订阅日历」',
        '点击「添加订阅」',
        '粘贴星愿卡的 WebCal 订阅链接',
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
      brandColor: 'var(--color-primary-text)',
      steps: [
        '打开「日历」App',
        '点击右下角「我的」→「订阅管理」',
        '点击「添加订阅」',
        '粘贴星愿卡的 WebCal 订阅链接',
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
      brandColor: 'var(--color-purple-text)',
      steps: [
        '打开「日历」App',
        '点击右上角「⋮」→「设置」',
        '找到「订阅管理」→「添加订阅」',
        '粘贴星愿卡的 WebCal 订阅链接',
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
      brandColor: 'var(--color-primary)',
      steps: [
        '打开「Samsung Calendar」App',
        '点击左上角菜单 →「管理日历」',
        '点击「添加日历」→「订阅日历」',
        '粘贴星愿卡的 WebCal 订阅链接',
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
      brandColor: 'var(--color-on-surface-variant)',
      steps: [
        '在 Safari 中打开星愿卡提供的 webcal:// 链接',
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
    brandColor: 'var(--color-outline)',
    steps: [
      '打开手机日历 App',
      '查找「订阅管理」或「导入日历」功能',
      '粘贴星愿卡提供的 WebCal 订阅链接',
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
