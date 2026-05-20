import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Loader2, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Task, Reward } from '../types';
import {
  recognizeIntent,
  buildFamilyButlerAdvice,
  buildFamilyButlerContextSummary,
  parsePlanSceneFromText,
  speak,
  startListening,
  generateICSFile,
  downloadICS,
  type AppContext,
  type PlanSceneParam,
  type PublicCalendarDirectionParam,
  type PublicCalendarRangeParam,
  type QuadrantDateRange,
  type ReportPeriodParam,
  type VoiceCommand,
} from '../lib/voiceAssistant';
import {
  analyzeScheduleArrangementImpact,
  buildFamilyTravelBlockTask,
  buildRecurringClassTask,
  cancelScheduleTasksOnce,
  completePendingScheduleArrangement,
  filterScheduleArrangementTasksByRefinement,
  findFixedClassSetupPlaceholder,
  pauseCategoryTasks,
  parseScheduleArrangementRefinement,
  recognizeIncompleteScheduleArrangement,
  rescheduleTasks,
  shiftScheduleTasks,
  upgradeFixedClassSetupPlaceholder,
  type PendingScheduleArrangement,
  type ScheduleArrangementCommand,
  type ScheduleArrangementImpact,
} from '../lib/scheduleArrangementSkill';
import { getStoredPublicCalendarRegion, loadPublicCalendarSignalBundle } from '../lib/publicCalendarSources';
import { buildPublicCalendarAdjustments } from '../domain/publicCalendarIntelligence';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuadrant?: (dateRange?: QuadrantDateRange) => void;
  onOpenCalendarSync?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: string;
    label: string;
    onConfirm: () => void | Promise<void>;
  };
  quadrantData?: any;
}

interface PendingScheduleShiftPreview {
  operation: 'shift_schedule';
  command: ScheduleArrangementCommand;
  shiftedTasks: Task[];
  travelTask: Task | null;
  impact: ScheduleArrangementImpact;
}

type AssistantMode = 'idle' | 'listening' | 'processing' | 'answer' | 'text';

export function VoiceAssistant({ isOpen, onClose, onOpenQuadrant, onOpenCalendarSync }: VoiceAssistantProps) {
  const { members, tasks, rewards, currentUser, addTask, updateTask, completeTask, approveTask, deleteTask, redeemReward, addReward, stars, familyId } = useFamily();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [pendingScheduleCommand, setPendingScheduleCommand] = useState<PendingScheduleArrangement | null>(null);
  const [pendingSchedulePreview, setPendingSchedulePreview] = useState<PendingScheduleShiftPreview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t('voice_assistant.greeting', { defaultValue: '你好！我是你的语音助手' }) }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);
  const voiceLocale = getVoiceLocale(i18n.language);
  const vt = (key: VoiceCopyKey) => VOICE_COPY[key]?.[voiceLocale] || VOICE_COPY[key]?.zh || key;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAppContext = (): AppContext => ({
    members,
    tasks,
    rewards,
    currentUser,
    familyId,
  });

  const addMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleActionConfirm = async (action: NonNullable<ChatMessage['action']>) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await action.onConfirm();
    } catch (error: any) {
      addMessage({ role: 'assistant', content: vt('action_failed').replace('{{message}}', error?.message || vt('retry_later')) });
    } finally {
      setIsLoading(false);
    }
  };

  const getPageVoiceFlow = () => {
    const path = location.pathname;
    if (path.startsWith('/tasks')) {
      return {
        label: vt('flow_tasks_label'),
        title: vt('flow_tasks_title'),
        description: vt('flow_tasks_desc'),
        placeholder: vt('flow_tasks_placeholder'),
        fallbackCommand: vt('flow_tasks_fallback'),
      };
    }
    if (path.startsWith('/habits')) {
      return {
        label: vt('flow_habits_label'),
        title: vt('flow_habits_title'),
        description: vt('flow_habits_desc'),
        placeholder: vt('flow_habits_placeholder'),
        fallbackCommand: vt('flow_habits_fallback'),
      };
    }
    if (path.startsWith('/rewards')) {
      return {
        label: vt('flow_rewards_label'),
        title: vt('flow_rewards_title'),
        description: vt('flow_rewards_desc'),
        placeholder: vt('flow_rewards_placeholder'),
        fallbackCommand: vt('flow_rewards_fallback'),
      };
    }
    if (path.startsWith('/plans')) {
      return {
        label: vt('flow_plans_label'),
        title: vt('flow_plans_title'),
        description: vt('flow_plans_desc'),
        placeholder: vt('flow_plans_placeholder'),
        fallbackCommand: vt('flow_plans_fallback'),
      };
    }
    if (path.startsWith('/quadrant')) {
      return {
        label: vt('flow_quadrant_label'),
        title: vt('flow_quadrant_title'),
        description: vt('flow_quadrant_desc'),
        placeholder: vt('flow_quadrant_placeholder'),
        fallbackCommand: vt('flow_quadrant_fallback'),
      };
    }
    if (path.startsWith('/ai-analysis')) {
      return {
        label: vt('flow_ai_label'),
        title: vt('flow_ai_title'),
        description: vt('flow_ai_desc'),
        placeholder: vt('flow_ai_placeholder'),
        fallbackCommand: vt('flow_ai_fallback'),
      };
    }
    return {
      label: vt('flow_home_label'),
      title: vt('flow_home_title'),
      description: vt('flow_home_desc'),
      placeholder: vt('flow_home_placeholder'),
      fallbackCommand: vt('flow_home_fallback'),
    };
  };

  const getPageScopedCommand = (userInput: string) => {
    const trimmed = userInput.trim();
    const vagueRequest = /^(看看|帮我看看|下一步|继续|怎么办|有什么建议|分析一下|开始吧|你来安排|现在做什么)[。！!,.，\s]*$/.test(trimmed);
    const explicitCrossFlow = /打开|去|进入|切换|四象限|周报|月报|计划|心愿|任务|奖惩|番茄|日历|首页|我的|兑换|创建/.test(trimmed);
    if (vagueRequest && !explicitCrossFlow) {
      return getPageVoiceFlow().fallbackCommand;
    }
    return userInput;
  };

  // ==================== 语音识别 ====================
  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      setAssistantMode('text');
      return;
    }

    try {
      setAssistantMode('listening');
      setInput('');
      setRecognizedText('');
      setIsListening(true);
      const transcript = await startListening();
      setIsListening(false);

      if (transcript) {
        setRecognizedText(transcript);
        setAssistantMode('processing');
        await processCommand(transcript);
        setAssistantMode('answer');
      } else {
        setAssistantMode('text');
        setMessages([{ role: 'assistant', content: vt('not_heard') }]);
      }
    } catch (err: any) {
      setIsListening(false);
      setAssistantMode('text');
      setMessages([{ role: 'assistant', content: err?.message || vt('voice_unavailable') }]);
    }
  };

  useEffect(() => {
    if (isOpen && !openedRef.current) {
      openedRef.current = true;
      const pageFlow = getPageVoiceFlow();
      setMessages([{ role: 'assistant', content: pageFlow.description }]);
      setInput('');
      setRecognizedText('');
      window.setTimeout(() => {
        void toggleListening();
      }, 80);
    }
    if (!isOpen) {
      openedRef.current = false;
      setAssistantMode('idle');
      setIsListening(false);
      setInput('');
      setRecognizedText('');
    }
  }, [isOpen, location.pathname]);

  // ==================== 命令处理 ====================
  const processCommand = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    addMessage({ role: 'user', content: userInput });
    setInput('');
    setIsLoading(true);

    try {
      const context = getAppContext();
      const scopedInput = getPageScopedCommand(userInput);
      if (pendingSchedulePreview) {
        const trimmed = userInput.trim();
        if (/^(算了|取消|不用了|先不|先不用|不改了)/.test(trimmed)) {
          setPendingSchedulePreview(null);
          addMessage({ role: 'assistant', content: vt('schedule_preview_cancelled') });
          return;
        }

        const refinement = parseScheduleArrangementRefinement(trimmed);
        if (refinement) {
          const refinedShiftedTasks = filterScheduleArrangementTasksByRefinement(pendingSchedulePreview.shiftedTasks, refinement);
          if (refinedShiftedTasks.length === 0) {
            addMessage({ role: 'assistant', content: vt('schedule_refine_empty') });
            return;
          }
          const changedTasks = pendingSchedulePreview.travelTask ? [...refinedShiftedTasks, pendingSchedulePreview.travelTask] : refinedShiftedTasks;
          const impact = analyzeScheduleArrangementImpact(tasks, changedTasks);
          const nextPreview = {
            ...pendingSchedulePreview,
            shiftedTasks: refinedShiftedTasks,
            impact,
          };
          setPendingSchedulePreview(nextPreview);
          const result = buildScheduleShiftPreviewResponse(nextPreview, vt('schedule_refined_prefix'));
          addMessage({ role: 'assistant', content: result.message, action: result.action });
          return;
        }
      }

      if (pendingScheduleCommand) {
        if (/^(算了|取消|不用了|先不|先不用|不改了|不加了)/.test(userInput.trim())) {
          setPendingScheduleCommand(null);
          addMessage({ role: 'assistant', content: vt('schedule_command_cancelled') });
          return;
        }

        const completed = completePendingScheduleArrangement(pendingScheduleCommand, userInput);
        if (!completed) {
          addMessage({ role: 'assistant', content: pendingScheduleCommand.prompt });
          return;
        }
        setPendingScheduleCommand(null);
        setPendingSchedulePreview(null);
        const result = await executeCommand({
          intent: 'schedule_arrangement',
          params: completed,
          confidence: completed.confidence,
          needsConfirmation: true,
          confirmationMessage: completed.summary,
        }, context);

        if (result.message) {
          const msg: ChatMessage = { role: 'assistant', content: result.message };
          if (result.action) msg.action = result.action;
          addMessage(msg);
        }
        return;
      }

      const incompleteSchedule = recognizeIncompleteScheduleArrangement(scopedInput);
      if (incompleteSchedule) {
        setPendingScheduleCommand(incompleteSchedule);
        addMessage({ role: 'assistant', content: incompleteSchedule.prompt });
        return;
      }

      const command = await recognizeIntent(scopedInput, context, i18n.language);
      const result = await executeCommand(command, context);

      if (result.message) {
        const msg: ChatMessage = { role: 'assistant', content: result.message };
        if (result.action) {
          msg.action = result.action;
        }
        addMessage(msg);

        if (ttsEnabled && result.message) {
          speak(result.message.replace(/[📊📝⭐📅⏰💡✅❌🎤]/g, ''));
        }
      }
    } catch (error: any) {
      console.error('Voice assistant error:', error);
      addMessage({ role: 'assistant', content: t('voice_assistant.error', { defaultValue: '错误' }) });
    } finally {
      setIsLoading(false);
    }
  };

  const buildScheduleShiftPreviewResponse = (
    preview: PendingScheduleShiftPreview,
    prefix?: string,
  ): { message: string; action: NonNullable<ChatMessage['action']> } => {
    const riskText = formatScheduleImpactForConfirmation(preview.impact, voiceLocale);
    const affectedTitles = preview.shiftedTasks.slice(0, 5).map(task => `· ${task.title}`).join('\n');
    const moreText = preview.shiftedTasks.length > 5 ? `\n${vt('schedule_more_arrangements').replace('{{count}}', String(preview.shiftedTasks.length - 5))}` : '';
    return {
      message: `${prefix ? `${prefix}\n` : ''}${vt('schedule_understood').replace('{{summary}}', preview.command.summary)}\n${vt('schedule_shift_affect').replace('{{count}}', String(preview.shiftedTasks.length)).replace('{{travel}}', preview.travelTask ? vt('schedule_travel_anchor').replace('{{title}}', preview.travelTask.title) : '')}\n${affectedTitles}${moreText}\n${riskText}\n${preview.impact.requiresUserConfirmation ? vt('schedule_shift_confirm_risk') : vt('schedule_shift_after_confirm')}`,
      action: {
        type: 'confirm_schedule_shift',
        label: preview.impact.requiresUserConfirmation ? vt('schedule_confirm_shift_risky') : vt('schedule_confirm_shift'),
        onConfirm: async () => {
          for (const task of preview.shiftedTasks) {
            await updateTask(task);
          }
          if (preview.travelTask) {
            await addTask(preview.travelTask);
          }
          setPendingSchedulePreview(null);
          addMessage({
            role: 'assistant',
            content: vt('schedule_shift_done')
              .replace('{{count}}', String(preview.shiftedTasks.length))
              .replace('{{travel}}', preview.travelTask ? vt('schedule_added_travel').replace('{{title}}', preview.travelTask.title) : '') + `\n${preview.impact.recommendation}`,
          });
        }
      }
    };
  };

  // ==================== 指令执行 ====================
  const executeCommand = async (command: VoiceCommand, context: AppContext): Promise<{ message: string; action?: any }> => {
    const { intent, params, needsConfirmation, confirmationMessage } = command;

    switch (intent) {
      // === 任务管理 ===
      case 'create_task': {
        if (!params.title) return { message: t('voice_assistant.missing_task_name', { defaultValue: '请告诉我任务名称' }) };
        const assigneeIds = params.assigneeIds || [currentUser?.id || ''];
        const assigneeNames = assigneeIds.map(id => members.find(m => m.id === id)?.name || t('voice_assistant.me', { defaultValue: 'me' })).join(', ');
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: params.title,
          description: params.description || '',
          type: params.category || 'daily',
          startTime: params.date ? new Date(params.date).toISOString() : new Date().toISOString(),
          assigneeIds,
          creatorId: currentUser?.id || 'system',
          rewardStars: params.rewardStars || 10,
          status: 'pending',
          icon: params.icon || 'ClipboardList',
          isHabit: params.isHabit || false,
          targetCount: 1,
          currentCount: 0,
        };

        return {
          message: `📌 ${params.title}\n${t('voice_assistant.executor', { defaultValue: '执行人' })}：${assigneeNames}\n⭐ ${t('voice_assistant.reward_stars', { defaultValue: '奖励星星' })}：${params.rewardStars || 10}\n\n${t('voice_assistant.confirm_create', { defaultValue: '确认创建任务' })}？`,
          action: {
            type: 'confirm_create_task',
            label: t('voice_assistant.confirm_create', { defaultValue: '确认创建任务' }),
            onConfirm: async () => {
              await addTask(newTask);
              addMessage({ role: 'assistant', content: t('voice_assistant.task_created', { defaultValue: '任务已创建成功 🎉' }) });
            }
          }
        };
      }

      case 'complete_task': {
        const taskId = params.taskId;
        if (!taskId) return { message: t('voice_assistant.missing_task_for_complete', { defaultValue: '请告诉我哪个任务' }) };
        return {
          message: confirmationMessage || t('voice_assistant.confirm_complete_task', { defaultValue: '确认完成任务' }),
          action: {
            type: 'confirm_complete',
            label: t('voice_assistant.confirm_complete', { defaultValue: '确认完成' }),
            onConfirm: async () => {
              await completeTask(taskId);
              addMessage({ role: 'assistant', content: t('voice_assistant.task_completed', { defaultValue: '任务已完成' }) });
            }
          }
        };
      }

      case 'approve_task': {
        const taskId = params.taskId;
        if (!taskId) return { message: t('voice_assistant.missing_task_for_approve', { defaultValue: '请告诉我哪个打卡' }) };
        return {
          message: t('voice_assistant.confirm_approve_task', { defaultValue: '确认通过打卡' }),
          action: {
            type: 'confirm_approve',
            label: t('voice_assistant.confirm_approve', { defaultValue: '确认通过' }),
            onConfirm: async () => {
              await approveTask(taskId);
              addMessage({ role: 'assistant', content: t('voice_assistant.task_approved', { defaultValue: '打卡已通过 ✨' }) });
            }
          }
        };
      }

      case 'delete_task': {
        const taskId = params.taskId;
        if (!taskId) return { message: t('voice_assistant.missing_task_for_delete', { defaultValue: '请告诉我哪个任务' }) };
        return {
          message: t('voice_assistant.confirm_delete_task', { defaultValue: '确认删除任务' }),
          action: {
            type: 'confirm_delete',
            label: t('voice_assistant.confirm_delete', { defaultValue: '确认删除' }),
            onConfirm: async () => {
              await deleteTask(taskId);
              addMessage({ role: 'assistant', content: t('voice_assistant.task_deleted', { defaultValue: '任务已删除' }) });
            }
          }
        };
      }

      case 'query_tasks': {
        const pendingTasks = tasks.filter(t => !t.isHabit && t.status === 'pending');
        const reviewingTasks = tasks.filter(t => !t.isHabit && t.status === 'reviewing');
        const completedTasks = tasks.filter(t => !t.isHabit && t.status === 'completed');

        let msg = t('voice_assistant.task_overview', { defaultValue: '任务概览' });
        if (reviewingTasks.length > 0) {
          msg += t('voice_assistant.reviewing_tasks', { count: reviewingTasks.length }) + '\n';
          reviewingTasks.forEach(t => { msg += `  · ${t.title} (${t.rewardStars}⭐)\n`; });
          msg += '\n';
        }
        if (pendingTasks.length > 0) {
          msg += t('voice_assistant.pending_tasks', { count: pendingTasks.length }) + '\n';
          pendingTasks.slice(0, 5).forEach(t => { msg += `  · ${t.title} (${t.rewardStars}⭐)\n`; });
          if (pendingTasks.length > 5) msg += `  ...${t('voice_assistant.more_tasks', { count: pendingTasks.length - 5 })}`;
          msg += '\n';
        }
        msg += t('voice_assistant.completed_tasks_count', { count: completedTasks.length });
        return { message: msg };
      }

      // === 心愿奖励 ===
      case 'create_wish': {
        if (!params.title) return { message: t('voice_assistant.missing_wish_name', { defaultValue: '请告诉我心愿名称' }) };
        const newReward: Reward = {
          id: `reward-${Date.now()}`,
          name: params.title,
          description: params.description || '',
          cost: params.rewardStars || 100,
          icon: 'Gift',
          image: '',
          category: params.category || '常用',
        };
        return {
          message: t('voice_assistant.confirm_create_wish', { title: params.title, stars: params.rewardStars || 100 }),
          action: {
            type: 'confirm_create_wish',
            label: t('voice_assistant.confirm_create', { defaultValue: '确认创建任务' }),
            onConfirm: async () => {
              await addReward(newReward);
              addMessage({ role: 'assistant', content: t('voice_assistant.wish_created', { defaultValue: '心愿已创建' }) });
            }
          }
        };
      }

      case 'redeem_wish': {
        const rewardId = params.rewardId;
        const reward = rewards.find(r => r.id === rewardId);
        if (!reward) return { message: t('voice_assistant.wish_not_found', { defaultValue: '未找到该心愿' }) };
        if (stars < reward.cost) return { message: t('voice_assistant.insufficient_stars', { count: reward.cost - stars, name: reward.name }) };
        return {
          message: t('voice_assistant.confirm_redeem_wish', { name: reward.name, cost: reward.cost }),
          action: {
            type: 'confirm_redeem',
            label: t('voice_assistant.confirm_redeem', { defaultValue: '确认兑换' }),
            onConfirm: async () => {
              await redeemReward(rewardId);
              addMessage({ role: 'assistant', content: t('voice_assistant.redeem_success', { defaultValue: '兑换成功' }) + ' ' + t('voice_assistant.enjoy_wish', { name: reward.name }) });
            }
          }
        };
      }

      case 'query_wishes': {
        const affordable = rewards.filter(r => stars >= r.cost);
        let msg = t('voice_assistant.affordable_wishes', { count: affordable.length }) + '\n';
        if (affordable.length > 0) {
          affordable.slice(0, 5).forEach(r => { msg += `  · ${r.name} (${r.cost}⭐)\n`; });
          msg += '\n';
        }
        msg += t('voice_assistant.your_stars', { stars, total: rewards.length });
        return { message: msg };
      }

      case 'create_plan': {
        const scene = parsePlanSceneFromText(String(params.scene || params.name || '')) || 'custom';
        const name = typeof params.name === 'string' ? params.name : '';
        const sceneLabel = scene === 'holiday' ? vt('plan_scene_holiday') : scene === 'weekday' ? vt('plan_scene_weekday') : scene === 'exchange' ? vt('plan_scene_exchange') : vt('plan_scene_custom');
        const query = new URLSearchParams({ scene });
        if (name) query.set('name', name);
        if (scene === 'holiday') query.set('recommend', 'travel');
        return {
          message: scene === 'holiday'
            ? vt('create_plan_holiday_message').replace('{{name}}', name || sceneLabel)
            : vt('create_plan_regular_message').replace('{{scene}}', sceneLabel),
          action: {
            type: 'open_plan_wizard',
            label: vt('create_plan_action'),
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate(`/plans/wizard?${query.toString()}`), 300);
            }
          }
        };
      }

      case 'public_calendar_query': {
        const range = (params.range || 'week') as PublicCalendarRangeParam;
        const direction = (params.direction || 'current') as PublicCalendarDirectionParam;
        const { rangeStart, rangeEnd } = getPublicCalendarQueryRange(range, direction);
        const localizedLabel = getPublicCalendarLabel(range, direction, voiceLocale);
        const region = await getStoredPublicCalendarRegion();
        const bundle = await loadPublicCalendarSignalBundle({
          year: new Date(rangeStart).getFullYear(),
          region,
          includeRemote: isOnline(),
        });
        const summary = buildPublicCalendarAdjustments(bundle.signals, tasks, { region, rangeStart, rangeEnd });
        const details = summary.adjustments.length > 0
          ? summary.adjustments.slice(0, 3).map(item => `· ${item.title}：${item.message}`).join('\n')
          : vt('public_calendar_no_changes');

        return {
          message: vt('public_calendar_message')
            .replace('{{label}}', localizedLabel)
            .replace('{{headline}}', summary.headline)
            .replace('{{freshness}}', bundle.freshnessLabel)
            .replace('{{details}}', details),
          action: {
            type: 'open_ai_analysis',
            label: vt('public_calendar_action'),
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate('/ai-analysis'), 300);
            }
          }
        };
      }

      case 'schedule_arrangement': {
        const scheduleCommand = params as ScheduleArrangementCommand;
        if (!currentUser) return { message: vt('schedule_select_member') };
        const region = await getStoredPublicCalendarRegion();
        const publicCalendarBundle = await loadPublicCalendarSignalBundle({
          year: new Date().getFullYear(),
          region,
          includeRemote: isOnline(),
        });
        const publicCalendarSignals = publicCalendarBundle.signals;

        if (scheduleCommand.operation === 'add_recurring_class') {
          const childIds = members.filter(member => member.role === 'child').map(member => member.id);
          const assigneeIds = childIds.length > 0 ? childIds : [currentUser.id];
          const placeholder = findFixedClassSetupPlaceholder(tasks, scheduleCommand);
          const task = placeholder
            ? upgradeFixedClassSetupPlaceholder(placeholder, scheduleCommand, { creatorId: currentUser.id })
            : buildRecurringClassTask(scheduleCommand, {
                childIds: assigneeIds,
                creatorId: currentUser.id,
              });
          const impact = analyzeScheduleArrangementImpact(tasks, [task], { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact, voiceLocale);
          const actionVerb = placeholder ? vt('schedule_complete') : vt('schedule_add');

          return {
            message: `${vt('schedule_understood').replace('{{summary}}', scheduleCommand.summary)}\n${placeholder ? vt('schedule_placeholder_found') : ''}${placeholder ? '\n' : ''}${riskText}\n${impact.requiresUserConfirmation ? vt('schedule_confirm_risk') : vt('schedule_add_after_confirm').replace('{{verb}}', actionVerb)}`,
            action: {
              type: 'confirm_schedule_arrangement',
              label: (impact.requiresUserConfirmation ? vt('schedule_still_action') : vt('schedule_confirm_action')).replace('{{verb}}', actionVerb),
              onConfirm: async () => {
                if (placeholder) {
                  await updateTask(task);
                } else {
                  await addTask(task);
                }
                addMessage({ role: 'assistant', content: vt('schedule_added_done').replace('{{verb}}', actionVerb).replace('{{title}}', task.title) + `\n${impact.recommendation}` });
              }
            }
          };
        }

        if (scheduleCommand.operation === 'shift_schedule') {
          const shiftedTasks = shiftScheduleTasks(tasks, scheduleCommand);
          const travelTask = buildFamilyTravelBlockTask(scheduleCommand, {
            memberIds: members.map(member => member.id),
            creatorId: currentUser.id,
          });
          if (shiftedTasks.length === 0) {
            return { message: vt('schedule_no_shift_found') };
          }
          const changedTasks = travelTask ? [...shiftedTasks, travelTask] : shiftedTasks;
          const impact = analyzeScheduleArrangementImpact(tasks, changedTasks, { publicCalendarSignals, region });
          const preview: PendingScheduleShiftPreview = {
            operation: 'shift_schedule',
            command: scheduleCommand,
            shiftedTasks,
            travelTask,
            impact,
          };
          setPendingSchedulePreview(preview);
          return buildScheduleShiftPreviewResponse(preview);
        }

        if (scheduleCommand.operation === 'cancel_once') {
          const canceledTasks = cancelScheduleTasksOnce(tasks, scheduleCommand);
          if (canceledTasks.length === 0) {
            return { message: vt('schedule_no_cancel_found') };
          }
          const impact = analyzeScheduleArrangementImpact(tasks, canceledTasks, { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact, voiceLocale);

          return {
            message: `${vt('schedule_understood').replace('{{summary}}', scheduleCommand.summary)}\n${vt('schedule_affected_arrangements').replace('{{count}}', String(canceledTasks.length))}\n${riskText}\n${impact.requiresUserConfirmation ? vt('schedule_confirm_cancel_risk') : vt('schedule_cancel_after_confirm')}`,
            action: {
              type: 'confirm_schedule_cancel_once',
              label: impact.requiresUserConfirmation ? vt('schedule_still_cancel') : vt('schedule_confirm_cancel_once'),
              onConfirm: async () => {
                for (const task of canceledTasks) {
                  await updateTask(task);
                }
                addMessage({ role: 'assistant', content: vt('schedule_cancel_done').replace('{{count}}', String(canceledTasks.length)) + `\n${impact.recommendation}` });
              }
            }
          };
        }

        if (scheduleCommand.operation === 'reschedule_task') {
          const rescheduledTasks = rescheduleTasks(tasks, scheduleCommand);
          if (rescheduledTasks.length === 0) {
            return { message: vt('schedule_no_reschedule_found') };
          }
          const impact = analyzeScheduleArrangementImpact(tasks, rescheduledTasks, { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact, voiceLocale);

          return {
            message: `${vt('schedule_understood').replace('{{summary}}', scheduleCommand.summary)}\n${riskText}\n${impact.requiresUserConfirmation ? vt('schedule_confirm_reschedule_risk') : vt('schedule_reschedule_after_confirm').replace('{{count}}', String(rescheduledTasks.length))}`,
            action: {
              type: 'confirm_schedule_reschedule',
              label: impact.requiresUserConfirmation ? vt('schedule_still_reschedule') : vt('schedule_confirm_reschedule'),
              onConfirm: async () => {
                for (const task of rescheduledTasks) {
                  await updateTask(task);
                }
                addMessage({ role: 'assistant', content: vt('schedule_reschedule_done').replace('{{count}}', String(rescheduledTasks.length)) + `\n${impact.recommendation}` });
              }
            }
          };
        }

        if (scheduleCommand.operation === 'pause_category') {
          const pausedTasks = pauseCategoryTasks(tasks, scheduleCommand);
          if (pausedTasks.length === 0) {
            return { message: vt('schedule_no_pause_found') };
          }
          const impact = analyzeScheduleArrangementImpact(tasks, pausedTasks, { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact, voiceLocale);

          return {
            message: `${vt('schedule_understood').replace('{{summary}}', scheduleCommand.summary)}\n${vt('schedule_affected_tasks').replace('{{count}}', String(pausedTasks.length))}\n${riskText}\n${impact.requiresUserConfirmation ? vt('schedule_confirm_pause_risk') : vt('schedule_pause_after_confirm')}`,
            action: {
              type: 'confirm_schedule_pause_category',
              label: impact.requiresUserConfirmation ? vt('schedule_still_pause') : vt('schedule_confirm_pause'),
              onConfirm: async () => {
                for (const task of pausedTasks) {
                  await updateTask(task);
                }
                addMessage({ role: 'assistant', content: vt('schedule_pause_done').replace('{{count}}', String(pausedTasks.length)) + `\n${impact.recommendation}` });
              }
            }
          };
        }

        return { message: vt('schedule_unknown') };
      }

      // === 星星系统 ===
      case 'query_stars': {
        return { message: t('voice_assistant.star_count', { count: stars }) };
      }

      case 'query_history': {
        return { message: t('voice_assistant.star_history', { stars }) };
      }

      // === 日程分析 ===
      case 'quadrant_analysis': {
        const dateRange = (params.dateRange || 'today') as QuadrantDateRange;
        const dateLabel = dateRange === 'month' ? vt('range_month') : dateRange === 'week' ? vt('range_week') : vt('range_today');
        if (onOpenQuadrant) {
          return {
            message: vt('quadrant_ready_message').replace('{{range}}', dateLabel),
            action: {
              type: 'open_quadrant',
              label: vt('quadrant_label').replace('{{range}}', dateLabel),
              onConfirm: () => {
                onClose();
                setTimeout(() => onOpenQuadrant(dateRange), 300);
              }
            }
          };
        }
        navigate(`/quadrant?range=${dateRange}`);
        onClose();
        return { message: vt('quadrant_opened').replace('{{range}}', dateLabel) };
      }

      case 'today_summary': {
        const completed = tasks.filter(t => t.status === 'completed');
        const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        const reviewing = tasks.filter(t => t.status === 'reviewing');
        const butlerSummary = buildFamilyButlerContextSummary(context);
        const encouragement = pending.length > 0 ? t('voice_assistant.encouragement_continue', { defaultValue: '继续加油' }) : t('voice_assistant.encouragement_great', { defaultValue: '太棒了' });
        return {
          message: t('voice_assistant.today_summary', {
            completed: completed.length, 
            pending: pending.length, 
            reviewing: reviewing.length, 
            stars,
            encouragement 
          }) + `\n\n${vt('butler_reminder_title')}：${butlerSummary.familyPromiseTasks > 0 ? vt('butler_reminder_promises').replace('{{count}}', String(butlerSummary.familyPromiseTasks)) : vt('butler_reminder_default')}`
        };
      }

      case 'weekly_report': {
        const period = (params.period || 'week') as ReportPeriodParam;
        const label = period === 'year' ? vt('report_year') : period === 'term' ? vt('report_term') : period === 'month' ? vt('report_month') : vt('report_week');
        const focusText = params.focus === 'next_period'
          ? vt('report_focus_next')
          : vt('report_focus_review');
        return {
          message: vt('report_ready').replace('{{label}}', label).replace('{{focus}}', focusText),
          action: {
            type: 'open_reports',
            label,
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate(`/reports?period=${period}`), 300);
            }
          }
        };
      }

      case 'smart_suggestion': {
        const advice = buildFamilyButlerAdvice(context);
        const summary = advice.summary;
        const pressureText = summary.pressureLevel === 'busy' ? vt('pressure_busy') : summary.pressureLevel === 'balanced' ? vt('pressure_balanced') : vt('pressure_light');
        const primaryAction = advice.actions[0];
        return {
          message: `${advice.headline}\n\n${vt('smart_status')
            .replace('{{pressure}}', pressureText)
            .replace('{{pending}}', String(summary.pendingTasks))
            .replace('{{reviewing}}', String(summary.reviewingTasks))
            .replace('{{promises}}', String(summary.familyPromiseTasks))}\n\n${advice.suggestions.map(item => `· ${item}`).join('\n\n')}`,
          action: primaryAction
            ? {
                type: `butler_${primaryAction.actionTarget}`,
                label: primaryAction.actionLabel,
                onConfirm: () => {
                  onClose();
                  setTimeout(() => navigate(primaryAction.actionTarget === 'quadrant' ? '/quadrant?range=week' : primaryAction.actionTarget === 'rewards' ? '/rewards' : primaryAction.actionTarget === 'reports' ? '/reports' : '/tasks'), 300);
                }
              }
            : undefined,
        };
      }

      // === 番茄钟 ===
      case 'start_pomodoro': {
        return {
          message: t('voice_assistant.pomodoro_redirect', { defaultValue: '🍅 正在打开番茄钟...' }),
          action: {
            type: 'navigate',
            label: t('nav.pomodoro', { defaultValue: '番茄钟' }) || '番茄钟',
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate('/pomodoro'), 300);
            }
          }
        };
      }

      // === 导航 ===
      case 'navigate': {
        const pageMap: Record<string, string> = {
          '首页': '/', '任务': '/tasks', '习惯': '/habits',
          '心愿': '/rewards', '心愿商城': '/rewards', '我的': '/profile',
          '番茄': '/pomodoro', '番茄钟': '/pomodoro',
        };
        const path = pageMap[params.page] || params.page || '/';
        return {
          message: t('voice_assistant.navigating', { defaultValue: '正在前往...' }),
          action: {
            type: 'navigate',
            label: t('voice_assistant.confirm_navigate', { defaultValue: '确认前往' }) || '前往',
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate(path), 300);
            }
          }
        };
      }

      case 'switch_user': {
        return {
          message: t('voice_assistant.switch_user_redirect', { defaultValue: '正在切换用户...' }),
          action: {
            type: 'navigate',
            label: t('voice_assistant.confirm_switch_user', { defaultValue: '确认切换' }) || '切换用户',
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate('/switch-profile'), 300);
            }
          }
        };
      }

      case 'toggle_dark_mode': {
        return { message: t('voice_assistant.dark_mode_hint', { defaultValue: '深色模式请在设置中开启 🌙' }) };
      }

      // === 日历同步 ===
      case 'calendar_sync':
      case 'calendar_subscribe': {
        if (onOpenCalendarSync) {
          return {
            message: t('voice_assistant.calendar_sync_redirect', { defaultValue: '📅 正在打开日历同步...' }),
            action: {
              type: 'open_calendar_sync',
              label: t('voice_assistant.one_click_subscribe', { defaultValue: '一键订阅' }),
              onConfirm: () => {
                onClose();
                setTimeout(() => onOpenCalendarSync(), 300);
              }
            }
          };
        }
        // 如果没有页面跳转，直接导出
        const ics = generateICSFile(context.tasks, context.members, t('voice_assistant.calendar_default_name', { defaultValue: 'calendar default name' }) || '星愿卡');
        downloadICS(ics);
        return { message: t('voice_assistant.ics_downloaded', { defaultValue: '日历文件已下载，请在手机日历中导入' }) };
      }

      // === 闲聊 ===
      case 'chat': {
        return { message: params.response || t('voice_assistant.chat_default', { defaultValue: '你好！有什么可以帮助你的吗？' }) };
      }

      default:
        return { message: confirmationMessage || t('voice_assistant.unknown_command', { defaultValue: 'unknown command' }) + '\n' + vt('unknown_examples') };
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      const nextInput = input.trim();
      setRecognizedText(nextInput);
      setAssistantMode('processing');
      processCommand(nextInput).finally(() => setAssistantMode('answer'));
    }
  };

  const pageFlow = getPageVoiceFlow();
  const latestAssistantMessage = [...messages].reverse().find(msg => msg.role === 'assistant');
  const latestAction = latestAssistantMessage?.action;
  const assistantTitle =
    assistantMode === 'listening'
      ? vt('title_listening')
      : assistantMode === 'processing' || isLoading
        ? vt('title_processing')
        : assistantMode === 'answer'
          ? vt('title_answer')
          : pageFlow.title;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ui-voice-assistant-overlay fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="ui-voice-assistant-panel w-full max-w-lg bg-surface flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[85svh] max-h-[calc(100svh-1rem)] sm:h-[650px] shadow-2xl overflow-hidden border border-outline-variant/10"
            data-bottom-sheet="true"
          >
            {/* Header */}
            <div className="p-4 border-b border-outline-variant/10 flex items-start justify-between bg-surface-container shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className="relative h-14 w-14 shrink-0 rounded-full bg-primary text-white shadow-xl shadow-primary/25 active:scale-95 disabled:opacity-70"
                  aria-label={vt('start_voice')}
                >
                  <motion.span
                    className="absolute inset-[-0.45rem] rounded-full border border-primary/25"
                    animate={{ scale: assistantMode === 'listening' ? [1, 1.2, 1] : [1, 1.08, 1], opacity: assistantMode === 'listening' ? [0.8, 0.2, 0.8] : [0.5, 0.15, 0.5] }}
                    transition={{ duration: assistantMode === 'listening' ? 1 : 2.2, repeat: Infinity }}
                  />
                  <span className="relative flex h-full w-full items-center justify-center rounded-full bg-primary">
                    {assistantMode === 'listening' ? <MicOff size={25} /> : <Mic size={25} />}
                  </span>
                </button>
                <div>
                  <p className="text-[10px] font-black text-primary">{vt('brand')} · {pageFlow.label}</p>
                  <h3 className="font-black text-on-surface text-lg leading-tight mt-1">{assistantTitle}</h3>
                  <p className="text-[11px] text-on-surface-variant font-bold leading-relaxed mt-1">
                    {assistantMode === 'listening' ? vt('listening_page_priority') : pageFlow.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={cn("w-8 h-8 flex items-center justify-center rounded-full transition-all", ttsEnabled ? "bg-primary/10 text-primary" : "text-on-surface-variant/40")}
                  title={ttsEnabled ? t('voice_assistant.tts_off', { defaultValue: 'tts off' }) : t('voice_assistant.tts_on', { defaultValue: 'tts on' })}
                >
                  {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Unified Assistant Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-surface-container-low/30">
              <div className="rounded-[1.75rem] bg-surface/90 p-3 shadow-inner shadow-primary/5">
                {assistantMode === 'listening' && (
                  <div className="py-8 text-center">
                    <div className="mx-auto flex h-20 w-32 items-end justify-center gap-1.5">
                      {[0, 1, 2, 3, 4, 5].map((bar) => (
                        <motion.span
                          key={bar}
                          className="w-2 rounded-full bg-primary"
                          animate={{ height: [18, 50, 26, 58, 18] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: bar * 0.07 }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-black text-on-surface">{vt('listening_now')}</p>
                    <p className="mt-1 text-[11px] font-bold text-on-surface-variant/60">{pageFlow.placeholder}</p>
                  </div>
                )}

                {(assistantMode === 'processing' || isLoading) && (
                  <div className="py-8 text-center">
                    <Loader2 size={30} className="mx-auto animate-spin text-primary" />
                    <p className="mt-3 text-sm font-black text-on-surface">{vt('processing_now')}</p>
                    {recognizedText && (
                      <p className="mt-2 rounded-[1rem] bg-surface-container-low px-3 py-2 text-left text-xs font-bold leading-relaxed text-on-surface-variant">
                        {recognizedText}
                      </p>
                    )}
                  </div>
                )}

                {assistantMode === 'answer' && (
                  <div className="space-y-3">
                    {recognizedText && (
                      <div className="rounded-[1.2rem] bg-primary/10 px-3 py-2">
                        <p className="text-[10px] font-black text-primary">{vt('you_said')}</p>
                        <p className="mt-1 text-sm font-black leading-relaxed text-on-surface">{recognizedText}</p>
                      </div>
                    )}
                    <div className="rounded-[1.25rem] bg-surface-container-low px-3 py-3 text-sm font-bold leading-relaxed text-on-surface whitespace-pre-wrap">
                      {latestAssistantMessage?.content || pageFlow.description}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {latestAction && (
                        <button
                          type="button"
                          onClick={() => handleActionConfirm(latestAction)}
                          disabled={isLoading}
                          className="rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : <CheckCircle2 size={14} className="mr-1 inline" />}
                          {latestAction.label}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleListening}
                        disabled={isLoading}
                        className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95 disabled:opacity-50"
                      >
                        {vt('continue_speaking')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInput('');
                          setAssistantMode('text');
                        }}
                        className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95"
                      >
                        {vt('use_text')}
                      </button>
                    </div>
                  </div>
                )}

                {assistantMode === 'text' && (
                  <div className="space-y-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={pageFlow.placeholder}
                      rows={3}
                      className="w-full resize-none rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-low px-3 py-3 text-sm font-bold text-on-surface outline-none focus:border-primary"
                    />
                    <div className="flex flex-wrap gap-2">
                      {input.trim() && (
                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={isLoading}
                          className="rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                        >
                          {vt('run_sentence')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleListening}
                        disabled={isLoading}
                        className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95 disabled:opacity-50"
                      >
                        {vt('speak_by_voice')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-surface-container border-t border-outline-variant/5">
              <p className="text-center text-[10px] text-on-surface-variant/50 font-bold">
                {vt('footer_page_priority')}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function formatScheduleImpactForConfirmation(impact: ReturnType<typeof analyzeScheduleArrangementImpact>, locale: VoiceLocale): string {
  const text = impact.messages.join('\n');
  const prefix: Record<VoiceLocale, string> = {
    zh: '我先帮你检查了一下风险：',
    en: 'I checked the risks first:',
    ja: '先にリスクを確認しました：',
    ko: '먼저 위험 요소를 확인했어요:',
    es: 'Primero revisé los riesgos:',
    fr: 'J’ai d’abord vérifié les risques :',
  };
  return impact.requiresUserConfirmation ? `${prefix[locale]}\n${text}` : text;
}

function getPublicCalendarQueryRange(
  range: PublicCalendarRangeParam,
  direction: PublicCalendarDirectionParam,
): { rangeStart: string; rangeEnd: string; label: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === 'year') {
    const year = now.getFullYear() + (direction === 'next' ? 1 : 0);
    start.setFullYear(year, 0, 1);
    end.setFullYear(year, 11, 31);
  } else if (range === 'month') {
    const monthOffset = direction === 'next' ? 1 : 0;
    start.setMonth(now.getMonth() + monthOffset, 1);
    end.setMonth(now.getMonth() + monthOffset + 1, 0);
  } else {
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const extraWeek = direction === 'next' ? 7 : 0;
    start.setDate(now.getDate() + mondayOffset + extraWeek);
    end.setDate(start.getDate() + 6);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const label = `${direction === 'next' ? '下' : '本'}${range === 'year' ? '年' : range === 'month' ? '月' : '周'}`;
  return {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    label,
  };
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? false : navigator.onLine;
}

function getPublicCalendarLabel(
  range: PublicCalendarRangeParam,
  direction: PublicCalendarDirectionParam,
  locale: VoiceLocale,
): string {
  const labels: Record<VoiceLocale, Record<PublicCalendarRangeParam, Record<PublicCalendarDirectionParam, string>>> = {
    zh: {
      week: { current: '本周', next: '下周' },
      month: { current: '本月', next: '下月' },
      year: { current: '本年', next: '下年' },
    },
    en: {
      week: { current: 'this week', next: 'next week' },
      month: { current: 'this month', next: 'next month' },
      year: { current: 'this year', next: 'next year' },
    },
    ja: {
      week: { current: '今週', next: '来週' },
      month: { current: '今月', next: '来月' },
      year: { current: '今年', next: '来年' },
    },
    ko: {
      week: { current: '이번 주', next: '다음 주' },
      month: { current: '이번 달', next: '다음 달' },
      year: { current: '올해', next: '내년' },
    },
    es: {
      week: { current: 'esta semana', next: 'la próxima semana' },
      month: { current: 'este mes', next: 'el próximo mes' },
      year: { current: 'este año', next: 'el próximo año' },
    },
    fr: {
      week: { current: 'cette semaine', next: 'la semaine prochaine' },
      month: { current: 'ce mois-ci', next: 'le mois prochain' },
      year: { current: 'cette année', next: 'l’année prochaine' },
    },
  };
  return labels[locale]?.[range]?.[direction] || labels.zh[range][direction];
}

type VoiceLocale = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr';
type VoiceCopyKey = keyof typeof VOICE_COPY;

function getVoiceLocale(language?: string): VoiceLocale {
  const code = (language || 'zh').toLowerCase();
  if (code.startsWith('en')) return 'en';
  if (code.startsWith('ja')) return 'ja';
  if (code.startsWith('ko')) return 'ko';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('fr')) return 'fr';
  return 'zh';
}

const COPY_BASE = {
  action_failed: {
    zh: '操作没有完成：{{message}}',
    en: 'The action was not completed: {{message}}',
    ja: '操作が完了しませんでした：{{message}}',
    ko: '작업을 완료하지 못했습니다: {{message}}',
    es: 'La acción no se completó: {{message}}',
    fr: 'L’action n’a pas abouti : {{message}}',
  },
  retry_later: {
    zh: '请稍后重试',
    en: 'Please try again later',
    ja: 'あとでもう一度お試しください',
    ko: '잠시 후 다시 시도해 주세요',
    es: 'Inténtelo de nuevo más tarde',
    fr: 'Veuillez réessayer plus tard',
  },
  not_heard: {
    zh: '没有听清，可以直接打字补充，或者再点一次麦克风。',
    en: 'I did not catch that. You can type it, or tap the mic again.',
    ja: '聞き取れませんでした。文字で入力するか、もう一度マイクを押してください。',
    ko: '잘 듣지 못했어요. 글로 입력하거나 마이크를 다시 눌러 주세요.',
    es: 'No lo entendí bien. Puede escribirlo o tocar el micrófono otra vez.',
    fr: 'Je n’ai pas bien entendu. Vous pouvez écrire ou toucher à nouveau le micro.',
  },
  voice_unavailable: {
    zh: '语音输入暂时不可用，可以先用文字告诉我。',
    en: 'Voice input is unavailable right now. You can type instead.',
    ja: '音声入力は一時的に使えません。文字で教えてください。',
    ko: '현재 음성 입력을 사용할 수 없어요. 글로 알려 주세요.',
    es: 'La entrada por voz no está disponible. Puede escribirlo.',
    fr: 'La saisie vocale est indisponible pour le moment. Vous pouvez écrire.',
  },
  flow_tasks_label: {
    zh: '任务流程',
    en: 'Tasks',
    ja: 'タスク',
    ko: '작업',
    es: 'Tareas',
    fr: 'Tâches',
  },
  flow_tasks_title: {
    zh: '我先帮你处理任务',
    en: 'I can help with tasks first',
    ja: 'まずタスクを整理します',
    ko: '먼저 작업을 도와드릴게요',
    es: 'Primero puedo ayudar con tareas',
    fr: 'Je peux d’abord aider avec les tâches',
  },
  flow_tasks_desc: {
    zh: '可以新建、调整、打卡、审核或查看今天待处理事项。想换功能时直接说“打开心愿”或“去四象限”。',
    en: 'You can create, adjust, check in, approve, or review today’s tasks. To switch, say “open rewards” or “go to quadrant”.',
    ja: '作成、調整、記録、承認、今日の確認ができます。切り替える時は「願いを開く」などと言ってください。',
    ko: '생성, 조정, 체크인, 승인, 오늘 할 일 확인을 도와드릴 수 있어요. 전환하려면 “소원 열기”처럼 말해 주세요.',
    es: 'Puede crear, ajustar, marcar, aprobar o revisar las tareas de hoy. Para cambiar, diga “abrir deseos” o “ir a cuadrantes”.',
    fr: 'Vous pouvez créer, ajuster, valider, approuver ou consulter les tâches du jour. Pour changer, dites “ouvrir les souhaits”.',
  },
  flow_tasks_placeholder: {
    zh: '例如：看看今天哪些任务还没处理',
    en: 'Example: show me which tasks still need attention today',
    ja: '例：今日まだ処理していないタスクを見せて',
    ko: '예: 오늘 아직 처리할 일이 뭐가 있는지 봐줘',
    es: 'Ejemplo: muéstrame qué tareas quedan hoy',
    fr: 'Exemple : montre-moi les tâches restantes aujourd’hui',
  },
  flow_tasks_fallback: {
    zh: '有哪些任务待审核和待完成',
    en: 'Which tasks are pending review or completion?',
    ja: '承認待ちと未完了のタスクは何ですか',
    ko: '검토 대기와 미완료 작업이 뭐가 있나요',
    es: 'Qué tareas están pendientes de revisión o finalización',
    fr: 'Quelles tâches attendent une validation ou une réalisation',
  },
  flow_habits_label: { zh: '奖惩流程', en: 'Habits', ja: '習慣', ko: '습관', es: 'Hábitos', fr: 'Habitudes' },
  flow_habits_title: { zh: '我先帮你处理奖惩', en: 'I can help with habits and points', ja: '習慣とポイントを整理します', ko: '습관과 점수를 도와드릴게요', es: 'Puedo ayudar con hábitos y puntos', fr: 'Je peux aider avec les habitudes et points' },
  flow_habits_desc: {
    zh: '可以记录习惯打卡、扣分原因、家长确认或孩子给家长反馈。',
    en: 'You can record habit check-ins, point deductions, parent approvals, or child feedback for parents.',
    ja: '習慣の記録、減点理由、保護者確認、子どもから保護者へのフィードバックを扱えます。',
    ko: '습관 체크인, 감점 사유, 부모 확인, 아이의 부모 피드백을 기록할 수 있어요.',
    es: 'Puede registrar hábitos, deducciones, aprobaciones de padres o comentarios del niño a los padres.',
    fr: 'Vous pouvez noter les habitudes, retraits de points, validations parentales ou retours de l’enfant.',
  },
  flow_habits_placeholder: { zh: '例如：帮小红跳绳打卡，等家长确认', en: 'Example: check in jump rope for Emma, pending parent approval', ja: '例：縄跳びを記録して保護者承認待ちにする', ko: '예: 줄넘기 체크인하고 부모 확인 대기로 해줘', es: 'Ejemplo: registrar salto de cuerda y dejarlo para aprobación', fr: 'Exemple : valider la corde à sauter, en attente du parent' },
  flow_habits_fallback: { zh: '给我一些智能建议', en: 'Give me smart suggestions', ja: 'スマート提案をください', ko: '스마트 제안을 줘', es: 'Dame sugerencias inteligentes', fr: 'Donne-moi des suggestions intelligentes' },
  flow_rewards_label: { zh: '心愿流程', en: 'Wishes', ja: '願い', ko: '소원', es: 'Deseos', fr: 'Souhaits' },
  flow_rewards_title: { zh: '我先帮你处理心愿', en: 'I can help with wishes first', ja: 'まず願いを整理します', ko: '먼저 소원을 도와드릴게요', es: 'Puedo ayudar con deseos', fr: 'Je peux aider avec les souhaits' },
  flow_rewards_desc: {
    zh: '可以创建心愿、查看星星余额、兑换心愿，并提醒父母兑现承诺。',
    en: 'You can create wishes, check stars, redeem wishes, and remind parents to keep promises.',
    ja: '願いの作成、星の確認、交換、保護者への実行リマインドができます。',
    ko: '소원 만들기, 별 확인, 소원 교환, 부모 약속 알림을 도와드릴 수 있어요.',
    es: 'Puede crear deseos, revisar estrellas, canjear y recordar a los padres cumplir promesas.',
    fr: 'Vous pouvez créer des souhaits, voir les étoiles, échanger et rappeler les promesses.',
  },
  flow_rewards_placeholder: { zh: '例如：看看现在能兑换哪些心愿', en: 'Example: what wishes can we redeem now?', ja: '例：今交換できる願いを見せて', ko: '예: 지금 교환 가능한 소원을 보여줘', es: 'Ejemplo: qué deseos podemos canjear ahora', fr: 'Exemple : quels souhaits peut-on obtenir maintenant' },
  flow_rewards_fallback: { zh: '我还有多少星星，有哪些心愿可以兑换', en: 'How many stars do I have, and which wishes are redeemable?', ja: '星はいくつあり、どの願いを交換できますか', ko: '별이 몇 개 있고 어떤 소원을 교환할 수 있나요', es: 'Cuántas estrellas tengo y qué deseos puedo canjear', fr: 'Combien d’étoiles ai-je et quels souhaits sont disponibles' },
  flow_plans_label: { zh: '计划流程', en: 'Plans', ja: '計画', ko: '계획', es: 'Planes', fr: 'Plans' },
  flow_plans_title: { zh: '我先帮你梳理计划', en: 'I can help shape the plan', ja: '計画を一緒に整理します', ko: '계획을 함께 정리할게요', es: 'Puedo ayudar a ordenar el plan', fr: 'Je peux aider à structurer le plan' },
  flow_plans_desc: {
    zh: '可以从一句话需求开始，先问清目标、频率、限制，再生成计划草案。',
    en: 'Start with one sentence. I will clarify goals, frequency, and limits before drafting.',
    ja: '一言から始められます。目標、頻度、制約を確認してから下書きを作ります。',
    ko: '한 문장으로 시작하세요. 목표, 빈도, 제한을 확인한 뒤 초안을 만들게요.',
    es: 'Empiece con una frase. Aclararé objetivo, frecuencia y límites antes del borrador.',
    fr: 'Commencez par une phrase. Je clarifie objectif, rythme et limites avant le brouillon.',
  },
  flow_plans_placeholder: { zh: '例如：想让孩子每周练琴四次，每次30分钟', en: 'Example: my child should practice piano four times a week, 30 minutes each', ja: '例：週4回、1回30分ピアノを練習したい', ko: '예: 아이가 주 4회, 매번 30분 피아노 연습을 하게 하고 싶어요', es: 'Ejemplo: practicar piano 4 veces por semana, 30 minutos', fr: 'Exemple : piano 4 fois par semaine, 30 minutes' },
  flow_plans_fallback: { zh: '帮我制定一个平日计划', en: 'Help me create a weekday plan', ja: '平日の計画を作って', ko: '평일 계획을 만들어줘', es: 'Ayúdame a crear un plan entre semana', fr: 'Aide-moi à créer un plan de semaine' },
  flow_quadrant_label: { zh: '四象限流程', en: 'Quadrant', ja: '四象限', ko: '사분면', es: 'Cuadrantes', fr: 'Quadrants' },
  flow_quadrant_title: { zh: '我先帮你做取舍', en: 'I can help prioritize', ja: '優先順位を整理します', ko: '우선순위를 정리할게요', es: 'Puedo ayudar a priorizar', fr: 'Je peux aider à prioriser' },
  flow_quadrant_desc: { zh: '可以按今天、本周或本月检查哪些事要先做，哪些可以后移。', en: 'Check today, this week, or this month to decide what comes first and what can wait.', ja: '今日、今週、今月で先にやることと後回しにできることを確認します。', ko: '오늘, 이번 주, 이번 달 기준으로 먼저 할 일과 미룰 일을 정리합니다.', es: 'Revise hoy, esta semana o este mes para decidir qué va primero.', fr: 'Vérifiez aujourd’hui, cette semaine ou ce mois pour prioriser.' },
  flow_quadrant_placeholder: { zh: '例如：分析一下本周四象限', en: 'Example: analyze this week’s quadrant', ja: '例：今週の四象限を分析して', ko: '예: 이번 주 사분면을 분석해줘', es: 'Ejemplo: analiza los cuadrantes de esta semana', fr: 'Exemple : analyse les quadrants de la semaine' },
  flow_quadrant_fallback: { zh: '帮我分析本周的日程四象限', en: 'Analyze this week’s schedule quadrant', ja: '今週の日程四象限を分析して', ko: '이번 주 일정 사분면을 분석해줘', es: 'Analiza los cuadrantes de esta semana', fr: 'Analyse les quadrants de cette semaine' },
  flow_ai_label: { zh: '家庭管家流程', en: 'Family Steward', ja: '家庭アシスタント', ko: '가족 매니저', es: 'Gestor familiar', fr: 'Assistant famille' },
  flow_ai_title: { zh: '我先帮你做家庭管家分析', en: 'I can help analyze the family flow', ja: '家庭の流れを分析します', ko: '가족 흐름을 분석할게요', es: 'Puedo analizar el ritmo familiar', fr: 'Je peux analyser le rythme familial' },
  flow_ai_desc: { zh: '可以继续建档、复盘、日程优化或把当前家庭节奏整理成下一步。', en: 'Continue profiling, review progress, optimize schedules, or decide the next step.', ja: 'プロフィール、振り返り、日程最適化、次の一歩を整理できます。', ko: '프로필, 회고, 일정 최적화, 다음 단계를 정리할 수 있어요.', es: 'Continúe el perfil, revise avances, optimice agenda o decida el siguiente paso.', fr: 'Poursuivre le profil, faire le bilan, optimiser l’agenda ou choisir la suite.' },
  flow_ai_placeholder: { zh: '例如：帮我看看下一步应该先处理什么', en: 'Example: what should I handle next?', ja: '例：次に何を優先すべき？', ko: '예: 다음에 뭘 먼저 해야 할까?', es: 'Ejemplo: qué debo atender primero', fr: 'Exemple : que dois-je traiter en premier' },
  flow_ai_fallback: { zh: '给我一些智能建议', en: 'Give me smart suggestions', ja: 'スマート提案をください', ko: '스마트 제안을 줘', es: 'Dame sugerencias inteligentes', fr: 'Donne-moi des suggestions intelligentes' },
  flow_home_label: { zh: '首页流程', en: 'Home', ja: 'ホーム', ko: '홈', es: 'Inicio', fr: 'Accueil' },
  flow_home_title: { zh: '我先帮你看今天', en: 'I can help with today first', ja: '今日の流れを見ます', ko: '오늘 흐름을 먼저 볼게요', es: 'Puedo revisar el día primero', fr: 'Je peux d’abord regarder aujourd’hui' },
  flow_home_desc: { zh: '可以检查今日任务、待审核、星星、心愿兑现和下一步安排。', en: 'Check today’s tasks, pending approvals, stars, wishes, and next steps.', ja: '今日のタスク、承認待ち、星、願い、次の予定を確認できます。', ko: '오늘 할 일, 승인 대기, 별, 소원, 다음 단계를 확인할 수 있어요.', es: 'Revise tareas, aprobaciones, estrellas, deseos y siguientes pasos.', fr: 'Vérifiez tâches, validations, étoiles, souhaits et prochaines étapes.' },
  flow_home_placeholder: { zh: '例如：今天还有什么要先处理', en: 'Example: what needs attention first today?', ja: '例：今日は何を先に処理する？', ko: '예: 오늘 무엇을 먼저 처리해야 해?', es: 'Ejemplo: qué debo atender primero hoy', fr: 'Exemple : que faut-il traiter en premier aujourd’hui' },
  flow_home_fallback: { zh: '给我今日总结和智能建议', en: 'Give me today’s summary and smart suggestions', ja: '今日のまとめと提案をください', ko: '오늘 요약과 스마트 제안을 줘', es: 'Dame el resumen de hoy y sugerencias', fr: 'Donne-moi le résumé du jour et des suggestions' },
  brand: { zh: 'AI 家庭管家', en: 'AI Family Steward', ja: 'AI 家庭アシスタント', ko: 'AI 가족 매니저', es: 'AI gestor familiar', fr: 'Assistant famille IA' },
  title_listening: { zh: '我在听，直接说', en: 'I am listening', ja: '聞いています', ko: '듣고 있어요', es: 'Estoy escuchando', fr: 'J’écoute' },
  title_processing: { zh: '我在理解你的需求', en: 'I am understanding your request', ja: '内容を理解しています', ko: '요청을 이해하는 중이에요', es: 'Estoy entendiendo su pedido', fr: 'Je comprends votre demande' },
  title_answer: { zh: '我整理好了', en: 'I have organized it', ja: '整理できました', ko: '정리했어요', es: 'Lo he organizado', fr: 'C’est organisé' },
  start_voice: { zh: '开始语音输入', en: 'Start voice input', ja: '音声入力を開始', ko: '음성 입력 시작', es: 'Iniciar voz', fr: 'Démarrer la voix' },
  listening_page_priority: { zh: '我会优先按当前页面的流程处理；想换功能时直接说出来。', en: 'I will follow this page first. Say another feature if you want to switch.', ja: 'まずこのページの流れを優先します。切り替えたい時はそのまま言ってください。', ko: '현재 페이지 흐름을 우선 처리해요. 다른 기능은 바로 말해 주세요.', es: 'Seguiré primero esta página. Diga otra función si quiere cambiar.', fr: 'Je suis d’abord le flux de cette page. Dites une autre fonction pour changer.' },
  listening_now: { zh: '正在听...', en: 'Listening...', ja: '聞いています...', ko: '듣는 중...', es: 'Escuchando...', fr: 'Écoute...' },
  processing_now: { zh: '正在判断怎么执行...', en: 'Deciding how to handle it...', ja: '実行方法を判断しています...', ko: '처리 방법을 판단 중...', es: 'Decidiendo cómo hacerlo...', fr: 'Je décide comment agir...' },
  you_said: { zh: '你刚才说', en: 'You said', ja: 'あなたの発話', ko: '방금 말한 내용', es: 'Usted dijo', fr: 'Vous avez dit' },
  continue_speaking: { zh: '继续说', en: 'Keep speaking', ja: '続けて話す', ko: '계속 말하기', es: 'Seguir hablando', fr: 'Continuer' },
  use_text: { zh: '改用文字', en: 'Use text', ja: '文字で入力', ko: '글로 입력', es: 'Usar texto', fr: 'Utiliser le texte' },
  run_sentence: { zh: '执行这句话', en: 'Run this', ja: 'これを実行', ko: '이 문장 실행', es: 'Ejecutar', fr: 'Exécuter' },
  speak_by_voice: { zh: '用语音说', en: 'Speak by voice', ja: '音声で話す', ko: '음성으로 말하기', es: 'Hablar por voz', fr: 'Parler' },
  footer_page_priority: { zh: '当前页面优先 · 语音和文字都可以继续补充', en: 'Current page first · Continue by voice or text', ja: '現在のページ優先 · 音声でも文字でも続けられます', ko: '현재 페이지 우선 · 음성이나 글로 계속 입력 가능', es: 'Página actual primero · Continúe por voz o texto', fr: 'Page actuelle d’abord · Continuez par voix ou texte' },
} as const;

const VOICE_COPY = {
  ...COPY_BASE,
  plan_scene_holiday: { zh: '假期计划', en: 'holiday plan', ja: '休暇計画', ko: '방학 계획', es: 'plan de vacaciones', fr: 'plan de vacances' },
  plan_scene_weekday: { zh: '平日计划', en: 'weekday plan', ja: '平日計画', ko: '평일 계획', es: 'plan entre semana', fr: 'plan de semaine' },
  plan_scene_exchange: { zh: '交换留学计划', en: 'exchange study plan', ja: '交換留学計画', ko: '교환 학습 계획', es: 'plan de intercambio', fr: 'plan d’échange' },
  plan_scene_custom: { zh: '自定义计划', en: 'custom plan', ja: 'カスタム計画', ko: '맞춤 계획', es: 'plan personalizado', fr: 'plan personnalisé' },
  create_plan_holiday_message: { zh: '我会先按{{name}}打开行程引导，不用你单独起名字，家庭成员会直接用当前档案。下一步只需要确认玩多久、想怎么玩和预算大概感觉。页面里也会顺手问一句：要不要我推荐几种适合你家的行程；如果暂时没有精选资源，也可以先帮你搜全网灵感。', en: 'I will open a trip guide for {{name}}. You do not need to name it; family members come from the current profile. Next, just confirm the length, style, and rough budget. I can also ask whether you want trip recommendations; if no curated options are available, I can search the web for ideas.', ja: '{{name}} の行程ガイドを開きます。名前は不要で、家族情報は現在のプロフィールを使います。次に期間、遊び方、予算感を確認します。おすすめ行程も必要なら探せます。', ko: '{{name}} 일정 가이드를 열게요. 이름을 따로 만들 필요는 없고 가족 정보는 현재 프로필을 사용해요. 기간, 방식, 예산 느낌만 확인하면 됩니다. 추천 일정도 필요하면 찾아볼 수 있어요.', es: 'Abriré una guía para {{name}}. No hace falta poner nombre; usaré el perfil familiar actual. Luego confirme duración, estilo y presupuesto aproximado. También puedo recomendar opciones o buscar ideas en la web.', fr: 'J’ouvre un guide pour {{name}}. Pas besoin de nommer le plan ; les membres viennent du profil actuel. Confirmez durée, style et budget approximatif. Je peux aussi proposer des idées ou chercher sur le web.' },
  create_plan_regular_message: { zh: '我会先帮你打开{{scene}}创建入口，基础时间和日程会先自动带上，你再做少量确认就可以。', en: 'I will open the {{scene}} creation flow. Basic time and schedule details will be carried over first, then you only need a few confirmations.', ja: '{{scene}} の作成画面を開きます。基本時間と日程は先に引き継ぎ、少し確認するだけです。', ko: '{{scene}} 만들기 흐름을 열게요. 기본 시간과 일정은 먼저 가져오고, 몇 가지만 확인하면 됩니다.', es: 'Abriré el flujo para {{scene}}. La hora y agenda básicas se rellenan primero y solo necesita confirmar algunos puntos.', fr: 'J’ouvre la création de {{scene}}. Les horaires et données de base seront repris ; il restera quelques confirmations.' },
  create_plan_action: { zh: '创建计划', en: 'Create plan', ja: '計画を作成', ko: '계획 만들기', es: 'Crear plan', fr: 'Créer le plan' },
  public_calendar_no_changes: { zh: '暂时没有发现明显会影响家庭安排的节假日、调休、校历或公共事件变化。', en: 'No holiday, makeup workday, school calendar, or public event change seems to affect the family schedule right now.', ja: '家族予定に影響する祝日、振替、学校暦、公共イベントの変化は今のところ見つかりません。', ko: '가족 일정에 영향을 줄 공휴일, 대체근무, 학사일정, 공공 이벤트 변화는 아직 보이지 않아요.', es: 'No se detectan cambios de feriados, ajustes escolares o eventos públicos que afecten la agenda familiar.', fr: 'Aucun changement de vacances, calendrier scolaire ou événement public ne semble affecter l’agenda familial.' },
  public_calendar_message: { zh: '{{label}}日程环境检查：{{headline}}\n{{freshness}}\n\n{{details}}', en: '{{label}} schedule environment check: {{headline}}\n{{freshness}}\n\n{{details}}', ja: '{{label}} の日程環境チェック：{{headline}}\n{{freshness}}\n\n{{details}}', ko: '{{label}} 일정 환경 확인: {{headline}}\n{{freshness}}\n\n{{details}}', es: 'Revisión de agenda {{label}}: {{headline}}\n{{freshness}}\n\n{{details}}', fr: 'Vérification agenda {{label}} : {{headline}}\n{{freshness}}\n\n{{details}}' },
  public_calendar_action: { zh: '查看日程优化', en: 'View schedule optimization', ja: '日程最適化を見る', ko: '일정 최적화 보기', es: 'Ver optimización', fr: 'Voir optimisation' },
  schedule_preview_cancelled: { zh: '好的，这次待处理的日程变更先取消。', en: 'Okay, I cancelled this pending schedule change for now.', ja: '了解しました。この保留中の日程変更は一旦取り消しました。', ko: '좋아요, 이번 대기 중 일정 변경은 취소했어요.', es: 'De acuerdo, cancelé este cambio pendiente por ahora.', fr: 'D’accord, ce changement d’agenda est annulé pour l’instant.' },
  schedule_command_cancelled: { zh: '好的，这次日程调整先取消。', en: 'Okay, this schedule adjustment is cancelled for now.', ja: '了解しました。この日程調整は一旦取り消しました。', ko: '좋아요, 이번 일정 조정은 취소했어요.', es: 'De acuerdo, cancelé este ajuste.', fr: 'D’accord, cet ajustement est annulé.' },
  schedule_refine_empty: { zh: '我按你的限定条件过滤后，没有剩下可调整的日程。可以换一种说法，比如“只顺延钢琴和空手道”。', en: 'After applying your limits, no adjustable schedule remains. Try saying “only shift piano and karate”.', ja: '条件で絞り込むと調整できる日程が残りません。例：「ピアノと空手だけ延期」。', ko: '조건을 적용하니 조정할 일정이 남지 않았어요. “피아노와 태권도만 연기”처럼 말해 주세요.', es: 'Con esos límites no queda ninguna agenda ajustable. Pruebe “solo retrasar piano y kárate”.', fr: 'Avec ces limites, aucun créneau ajustable ne reste. Essayez “décaler seulement piano et karaté”.' },
  schedule_refined_prefix: { zh: '已按你的补充条件重新整理影响范围。', en: 'I recalculated the affected scope using your extra condition.', ja: '追加条件に合わせて影響範囲を整理しました。', ko: '추가 조건에 맞춰 영향 범위를 다시 정리했어요.', es: 'Reorganicé el alcance afectado con su condición adicional.', fr: 'J’ai recalculé la portée avec votre précision.' },
  schedule_understood: { zh: '我理解为：{{summary}}。', en: 'I understood this as: {{summary}}.', ja: '次のように理解しました：{{summary}}。', ko: '이렇게 이해했어요: {{summary}}.', es: 'Lo entendí así: {{summary}}.', fr: 'J’ai compris : {{summary}}.' },
  schedule_more_arrangements: { zh: '还有 {{count}} 个安排', en: '{{count}} more arrangements', ja: 'ほかに {{count}} 件の予定', ko: '그 외 {{count}}개 일정', es: '{{count}} arreglos más', fr: '{{count}} autres éléments' },
  schedule_shift_affect: { zh: '将影响 {{count}} 个课外班/兴趣安排{{travel}}。', en: 'This will affect {{count}} class or activity arrangements{{travel}}.', ja: '{{count}} 件の習い事や活動予定に影響します{{travel}}。', ko: '수업/활동 일정 {{count}}개에 영향을 줍니다{{travel}}.', es: 'Afectará {{count}} clases o actividades{{travel}}.', fr: 'Cela affectera {{count}} cours ou activités{{travel}}.' },
  schedule_travel_anchor: { zh: '，并新增“{{title}}”作为家庭日程锚点', en: ', and add “{{title}}” as a family schedule anchor', ja: '。「{{title}}」を家族予定の基準として追加します', ko: ', “{{title}}”을 가족 일정 기준으로 추가합니다', es: ', y agregará “{{title}}” como punto de agenda familiar', fr: ', et ajoute “{{title}}” comme repère familial' },
  schedule_shift_confirm_risk: { zh: '如果仍然要这样改，请确认。也可以继续说“只顺延钢琴，不动英语”。', en: 'Confirm if you still want this change. You can also refine it, for example “only shift piano, leave English”.', ja: 'このまま変更する場合は確認してください。例：「ピアノだけ延期、英語はそのまま」。', ko: '이대로 변경하려면 확인해 주세요. “피아노만 연기하고 영어는 그대로”처럼 범위를 좁힐 수 있어요.', es: 'Confirme si quiere hacerlo. También puede precisar: “solo retrasar piano, no inglés”.', fr: 'Confirmez si vous voulez continuer. Vous pouvez préciser : “décaler seulement piano, pas anglais”.' },
  schedule_shift_after_confirm: { zh: '确认后我会执行。你也可以继续限定范围。', en: 'I will apply it after confirmation. You can still narrow the scope.', ja: '確認後に実行します。範囲をさらに絞ることもできます。', ko: '확인 후 적용할게요. 범위를 더 좁힐 수도 있어요.', es: 'Lo aplicaré tras confirmar. Aún puede limitar el alcance.', fr: 'Je l’appliquerai après confirmation. Vous pouvez encore préciser.' },
  schedule_confirm_shift_risky: { zh: '确认这样顺延', en: 'Confirm this shift', ja: 'この延期を確認', ko: '이 연기 확인', es: 'Confirmar este cambio', fr: 'Confirmer ce décalage' },
  schedule_confirm_shift: { zh: '确认顺延', en: 'Confirm shift', ja: '延期を確認', ko: '연기 확인', es: 'Confirmar retraso', fr: 'Confirmer le décalage' },
  schedule_shift_done: { zh: '已顺延 {{count}} 个日程{{travel}}。', en: 'Shifted {{count}} schedule items{{travel}}.', ja: '{{count}} 件の日程を延期しました{{travel}}。', ko: '{{count}}개 일정을 연기했어요{{travel}}.', es: 'Se retrasaron {{count}} elementos{{travel}}.', fr: '{{count}} éléments décalés{{travel}}.' },
  schedule_added_travel: { zh: '，并加入“{{title}}”', en: ', and added “{{title}}”', ja: '。「{{title}}」も追加しました', ko: ', “{{title}}”도 추가했어요', es: ', y se agregó “{{title}}”', fr: ', et “{{title}}” a été ajouté' },
  schedule_select_member: { zh: '请先选择当前家庭成员', en: 'Please select the current family member first', ja: '先に現在の家族メンバーを選択してください', ko: '먼저 현재 가족 구성원을 선택해 주세요', es: 'Seleccione primero el miembro familiar actual', fr: 'Sélectionnez d’abord le membre actuel' },
  schedule_complete: { zh: '补全', en: 'complete', ja: '補完', ko: '보완', es: 'completar', fr: 'compléter' },
  schedule_add: { zh: '加入', en: 'add', ja: '追加', ko: '추가', es: 'agregar', fr: 'ajouter' },
  schedule_placeholder_found: { zh: '我找到了建档时留下的课外班占位，会优先补全它。', en: 'I found the placeholder from family profiling and will complete it first.', ja: '家族プロフィール時の習い事プレースホルダーを見つけたので、先に補完します。', ko: '가족 프로필에서 남긴 수업 자리표시자를 찾아 먼저 보완할게요.', es: 'Encontré el marcador del perfil familiar y lo completaré primero.', fr: 'J’ai trouvé l’emplacement prévu dans le profil et je le complète d’abord.' },
  schedule_confirm_risk: { zh: '如果仍然要这样安排，请确认。', en: 'Confirm if you still want this arrangement.', ja: 'このまま予定する場合は確認してください。', ko: '이대로 배치하려면 확인해 주세요.', es: 'Confirme si aún desea este arreglo.', fr: 'Confirmez si vous voulez garder cet arrangement.' },
  schedule_add_after_confirm: { zh: '确认后，我会把它{{verb}}到孩子的每周日程。', en: 'After confirmation, I will {{verb}} it to the child’s weekly schedule.', ja: '確認後、子どもの週間予定に{{verb}}します。', ko: '확인 후 아이의 주간 일정에 {{verb}}할게요.', es: 'Tras confirmar, lo voy a {{verb}} a la agenda semanal del niño.', fr: 'Après confirmation, je vais l’{{verb}} à l’agenda hebdomadaire.' },
  schedule_still_action: { zh: '仍然{{verb}}日程', en: 'Still {{verb}} schedule', ja: 'それでも日程を{{verb}}', ko: '그래도 일정 {{verb}}', es: 'Aun así {{verb}} agenda', fr: 'Tout de même {{verb}} l’agenda' },
  schedule_confirm_action: { zh: '确认{{verb}}日程', en: 'Confirm schedule {{verb}}', ja: '日程{{verb}}を確認', ko: '일정 {{verb}} 확인', es: 'Confirmar {{verb}} agenda', fr: 'Confirmer {{verb}} agenda' },
  schedule_added_done: { zh: '已{{verb}}：{{title}}。以后复盘和日历都会看到这项固定安排。', en: '{{verb}}ed: {{title}}. Reviews and calendar will include this fixed arrangement.', ja: '{{verb}}しました：{{title}}。今後の振り返りとカレンダーに表示されます。', ko: '{{verb}} 완료: {{title}}. 앞으로 회고와 달력에 표시됩니다.', es: '{{verb}}: {{title}}. Las revisiones y calendario incluirán este arreglo fijo.', fr: '{{verb}} : {{title}}. Les bilans et le calendrier l’incluront.' },
  schedule_no_shift_found: { zh: '我没有找到可顺延的课外班日程。可以先告诉我具体是哪几个课程，或者先添加固定课外班。', en: 'I did not find activity schedules to shift. Tell me which classes, or add fixed classes first.', ja: '延期できる習い事予定が見つかりません。どの授業か教えるか、固定予定を追加してください。', ko: '연기할 수업 일정을 찾지 못했어요. 어떤 수업인지 말하거나 고정 수업을 먼저 추가해 주세요.', es: 'No encontré clases para retrasar. Diga cuáles son o agregue clases fijas primero.', fr: 'Je n’ai pas trouvé d’activités à décaler. Précisez les cours ou ajoutez-les d’abord.' },
  schedule_no_cancel_found: { zh: '我没有找到要取消的那次日程。可以说得更具体一点，比如“取消这周钢琴课一次”。', en: 'I did not find the schedule item to cancel. Try “cancel piano once this week”.', ja: 'キャンセルする予定が見つかりません。例：「今週のピアノを1回キャンセル」。', ko: '취소할 일정을 찾지 못했어요. “이번 주 피아노 한 번 취소”처럼 말해 주세요.', es: 'No encontré el evento a cancelar. Pruebe “cancelar piano una vez esta semana”.', fr: 'Je n’ai pas trouvé l’élément à annuler. Essayez “annuler le piano cette semaine”.' },
  schedule_affected_arrangements: { zh: '将影响 {{count}} 个安排。', en: 'This will affect {{count}} arrangements.', ja: '{{count}} 件の予定に影響します。', ko: '{{count}}개 일정에 영향을 줍니다.', es: 'Afectará {{count}} arreglos.', fr: 'Cela affectera {{count}} éléments.' },
  schedule_confirm_cancel_risk: { zh: '如果仍然要取消，请确认。', en: 'Confirm if you still want to cancel.', ja: 'それでもキャンセルする場合は確認してください。', ko: '그래도 취소하려면 확인해 주세요.', es: 'Confirme si aún desea cancelar.', fr: 'Confirmez si vous voulez annuler.' },
  schedule_cancel_after_confirm: { zh: '确认后我会标记为本次取消。', en: 'After confirmation, I will mark this occurrence as cancelled.', ja: '確認後、この回をキャンセルとして記録します。', ko: '확인 후 이번 회차를 취소로 표시할게요.', es: 'Tras confirmar, marcaré esta vez como cancelada.', fr: 'Après confirmation, je marquerai cette occurrence annulée.' },
  schedule_still_cancel: { zh: '仍然取消', en: 'Still cancel', ja: 'それでもキャンセル', ko: '그래도 취소', es: 'Cancelar igual', fr: 'Annuler quand même' },
  schedule_confirm_cancel_once: { zh: '确认取消一次', en: 'Confirm cancel once', ja: '1回キャンセルを確認', ko: '한 번 취소 확인', es: 'Confirmar cancelar una vez', fr: 'Confirmer une annulation' },
  schedule_cancel_done: { zh: '已取消 {{count}} 个本次安排。', en: 'Cancelled {{count}} occurrences.', ja: '{{count}} 件の今回分をキャンセルしました。', ko: '{{count}}개 이번 일정을 취소했어요.', es: 'Se cancelaron {{count}} ocurrencias.', fr: '{{count}} occurrences annulées.' },
  schedule_no_reschedule_found: { zh: '我没有找到要改时间的日程。可以说“把周五英语课改到周六上午9-10点”。', en: 'I did not find a schedule item to reschedule. Try “move Friday English to Saturday 9-10 AM”.', ja: '時間変更する予定が見つかりません。例：「金曜英語を土曜9-10時へ」。', ko: '시간을 바꿀 일정을 찾지 못했어요. “금요일 영어를 토요일 9-10시로”처럼 말해 주세요.', es: 'No encontré qué reprogramar. Pruebe “mover inglés del viernes al sábado 9-10”.', fr: 'Je n’ai pas trouvé l’élément à déplacer. Essayez “déplacer anglais vendredi à samedi 9-10h”.' },
  schedule_confirm_reschedule_risk: { zh: '如果仍然要改到这个时间，请确认。', en: 'Confirm if you still want this new time.', ja: 'この時間に変更する場合は確認してください。', ko: '이 시간으로 바꾸려면 확인해 주세요.', es: 'Confirme si aún desea esta hora.', fr: 'Confirmez si vous voulez cet horaire.' },
  schedule_reschedule_after_confirm: { zh: '确认后我会更新 {{count}} 个日程时间。', en: 'After confirmation, I will update {{count}} schedule times.', ja: '確認後、{{count}} 件の日程時間を更新します。', ko: '확인 후 {{count}}개 일정 시간을 업데이트할게요.', es: 'Tras confirmar, actualizaré {{count}} horarios.', fr: 'Après confirmation, je mettrai à jour {{count}} horaires.' },
  schedule_still_reschedule: { zh: '仍然改时间', en: 'Still change time', ja: 'それでも時間変更', ko: '그래도 시간 변경', es: 'Cambiar hora igual', fr: 'Changer quand même' },
  schedule_confirm_reschedule: { zh: '确认改时间', en: 'Confirm new time', ja: '時間変更を確認', ko: '시간 변경 확인', es: 'Confirmar hora', fr: 'Confirmer horaire' },
  schedule_reschedule_done: { zh: '已调整 {{count}} 个日程时间。', en: 'Adjusted {{count}} schedule times.', ja: '{{count}} 件の日程時間を調整しました。', ko: '{{count}}개 일정 시간을 조정했어요.', es: 'Se ajustaron {{count}} horarios.', fr: '{{count}} horaires ajustés.' },
  schedule_no_pause_found: { zh: '我没有找到符合条件的任务。可以换成“考试前两周暂停所有娱乐类任务”。', en: 'I did not find matching tasks. Try “pause all entertainment tasks two weeks before exams”.', ja: '条件に合うタスクが見つかりません。例：「試験前2週間は娯楽タスクを停止」。', ko: '조건에 맞는 작업을 찾지 못했어요. “시험 전 2주간 놀이 작업 중지”처럼 말해 주세요.', es: 'No encontré tareas coincidentes. Pruebe “pausar entretenimiento dos semanas antes del examen”.', fr: 'Aucune tâche correspondante. Essayez “pause loisirs deux semaines avant l’examen”.' },
  schedule_affected_tasks: { zh: '将影响 {{count}} 个任务。', en: 'This will affect {{count}} tasks.', ja: '{{count}} 件のタスクに影響します。', ko: '{{count}}개 작업에 영향을 줍니다.', es: 'Afectará {{count}} tareas.', fr: 'Cela affectera {{count}} tâches.' },
  schedule_confirm_pause_risk: { zh: '如果仍然要这样调整，请确认。', en: 'Confirm if you still want this adjustment.', ja: 'この調整を続ける場合は確認してください。', ko: '이 조정을 계속하려면 확인해 주세요.', es: 'Confirme si aún desea este ajuste.', fr: 'Confirmez si vous voulez cet ajustement.' },
  schedule_pause_after_confirm: { zh: '确认后我会统一暂停或后移。', en: 'After confirmation, I will pause or move them together.', ja: '確認後、まとめて停止または後ろ倒しにします。', ko: '확인 후 한꺼번에 중지하거나 뒤로 옮길게요.', es: 'Tras confirmar, las pausaré o moveré juntas.', fr: 'Après confirmation, je les mettrai en pause ou les décalerai.' },
  schedule_still_pause: { zh: '仍然暂停/后移', en: 'Still pause/move', ja: 'それでも停止/後ろ倒し', ko: '그래도 중지/연기', es: 'Pausar/mover igual', fr: 'Pause/décalage quand même' },
  schedule_confirm_pause: { zh: '确认暂停/后移', en: 'Confirm pause/move', ja: '停止/後ろ倒しを確認', ko: '중지/연기 확인', es: 'Confirmar pausa/mover', fr: 'Confirmer pause/décalage' },
  schedule_pause_done: { zh: '已调整 {{count}} 个任务。', en: 'Adjusted {{count}} tasks.', ja: '{{count}} 件のタスクを調整しました。', ko: '{{count}}개 작업을 조정했어요.', es: 'Se ajustaron {{count}} tareas.', fr: '{{count}} tâches ajustées.' },
  schedule_unknown: { zh: '我还没完全理解这次日程调整，可以换一种说法，比如“每周三下午6-7点空手道课”或“课外班顺延2周”。', en: 'I do not fully understand this schedule change yet. Try “karate every Wednesday 6-7 PM” or “shift activities by 2 weeks”.', ja: 'この日程調整をまだ完全には理解できません。例：「毎週水曜18-19時に空手」「習い事を2週間延期」。', ko: '이번 일정 조정을 아직 완전히 이해하지 못했어요. “매주 수요일 6-7시 가라테” 또는 “수업 2주 연기”처럼 말해 주세요.', es: 'Aún no entendí el cambio. Pruebe “kárate miércoles 6-7” o “retrasar clases 2 semanas”.', fr: 'Je n’ai pas bien compris. Essayez “karaté mercredi 18-19h” ou “décaler les activités de 2 semaines”.' },
  range_today: { zh: '今天', en: 'Today', ja: '今日', ko: '오늘', es: 'Hoy', fr: 'Aujourd’hui' },
  range_week: { zh: '本周', en: 'This week', ja: '今週', ko: '이번 주', es: 'Esta semana', fr: 'Cette semaine' },
  range_month: { zh: '本月', en: 'This month', ja: '今月', ko: '이번 달', es: 'Este mes', fr: 'Ce mois-ci' },
  quadrant_ready_message: { zh: '{{range}}四象限分析已就绪，我会帮你们先看哪些事最值得优先处理。', en: '{{range}} quadrant analysis is ready. I will help identify what deserves priority.', ja: '{{range}}の四象限分析が準備できました。優先すべきことを見ます。', ko: '{{range}} 사분면 분석이 준비됐어요. 우선순위를 찾아볼게요.', es: 'El análisis de cuadrantes de {{range}} está listo. Ayudaré a priorizar.', fr: 'L’analyse quadrants {{range}} est prête. Je vais aider à prioriser.' },
  quadrant_label: { zh: '{{range}}四象限', en: '{{range}} quadrant', ja: '{{range}}四象限', ko: '{{range}} 사분면', es: 'Cuadrantes {{range}}', fr: 'Quadrants {{range}}' },
  quadrant_opened: { zh: '{{range}}四象限分析已打开。', en: '{{range}} quadrant analysis is open.', ja: '{{range}}の四象限分析を開きました。', ko: '{{range}} 사분면 분석을 열었어요.', es: 'Análisis de cuadrantes {{range}} abierto.', fr: 'Analyse quadrants {{range}} ouverte.' },
  butler_reminder_title: { zh: '管家提醒', en: 'Steward reminder', ja: 'アシスタントから', ko: '매니저 알림', es: 'Recordatorio', fr: 'Rappel assistant' },
  butler_reminder_promises: { zh: '还有 {{count}} 个孩子心愿需要父母安排兑现。', en: '{{count}} child wishes still need parent follow-through.', ja: '保護者が実行する子どもの願いが {{count}} 件あります。', ko: '부모가 이행해야 할 아이 소원 {{count}}개가 남아 있어요.', es: 'Quedan {{count}} deseos que los padres deben cumplir.', fr: '{{count}} souhaits restent à concrétiser par les parents.' },
  butler_reminder_default: { zh: '今天先守住一两个关键行动，全家的节奏会更稳。', en: 'Keep one or two key actions steady today, and the family rhythm will feel calmer.', ja: '今日は重要な行動を1、2個守るだけで家族のリズムが安定します。', ko: '오늘 핵심 행동 한두 가지만 지켜도 가족 리듬이 더 안정돼요.', es: 'Sostener una o dos acciones clave hoy hará el ritmo familiar más estable.', fr: 'Garder une ou deux actions clés rendra le rythme familial plus stable.' },
  report_year: { zh: '年度复盘', en: 'Yearly review', ja: '年間レビュー', ko: '연간 회고', es: 'Revisión anual', fr: 'Bilan annuel' },
  report_term: { zh: '学期复盘', en: 'Term review', ja: '学期レビュー', ko: '학기 회고', es: 'Revisión del período', fr: 'Bilan de période' },
  report_month: { zh: '月报', en: 'Monthly report', ja: '月次レポート', ko: '월간 보고', es: 'Informe mensual', fr: 'Rapport mensuel' },
  report_week: { zh: '周报', en: 'Weekly report', ja: '週次レポート', ko: '주간 보고', es: 'Informe semanal', fr: 'Rapport hebdo' },
  report_focus_next: { zh: '我会直接带你看下个周期怎么安排。', en: 'I will take you straight to planning the next period.', ja: '次の期間の安排を直接見ます。', ko: '다음 기간 계획으로 바로 안내할게요.', es: 'Le llevaré directo a organizar el próximo período.', fr: 'Je vous emmène directement vers le prochain cycle.' },
  report_focus_review: { zh: '我会把完成、好习惯、心愿兑现和下个周期预告放在一起。', en: 'I will combine completion, good habits, wish follow-through, and next-period preview.', ja: '完了、良い習慣、願いの実行、次期予告をまとめます。', ko: '완료, 좋은 습관, 소원 이행, 다음 기간 예고를 함께 정리해요.', es: 'Combinaré logros, hábitos, deseos cumplidos y vista del próximo período.', fr: 'Je rassemble réalisations, habitudes, souhaits et aperçu du prochain cycle.' },
  report_ready: { zh: '{{label}}已准备好，{{focus}}', en: '{{label}} is ready. {{focus}}', ja: '{{label}}が準備できました。{{focus}}', ko: '{{label}}가 준비됐어요. {{focus}}', es: '{{label}} listo. {{focus}}', fr: '{{label}} prêt. {{focus}}' },
  pressure_busy: { zh: '节奏偏满', en: 'busy rhythm', ja: '予定多め', ko: '일정이 많은 편', es: 'ritmo cargado', fr: 'rythme chargé' },
  pressure_balanced: { zh: '节奏适中', en: 'balanced rhythm', ja: 'ほどよいリズム', ko: '균형 잡힌 리듬', es: 'ritmo equilibrado', fr: 'rythme équilibré' },
  pressure_light: { zh: '节奏轻松', en: 'light rhythm', ja: 'ゆったりしたリズム', ko: '여유로운 리듬', es: 'ritmo ligero', fr: 'rythme léger' },
  smart_status: { zh: '当前状态：{{pressure}} · 待办 {{pending}} · 待确认 {{reviewing}} · 心愿兑现 {{promises}}', en: 'Current status: {{pressure}} · To-do {{pending}} · Pending review {{reviewing}} · Wish follow-through {{promises}}', ja: '現在：{{pressure}} · 未完了 {{pending}} · 確認待ち {{reviewing}} · 願い実行 {{promises}}', ko: '현재 상태: {{pressure}} · 할 일 {{pending}} · 확인 대기 {{reviewing}} · 소원 이행 {{promises}}', es: 'Estado: {{pressure}} · Pendientes {{pending}} · En revisión {{reviewing}} · Deseos {{promises}}', fr: 'État : {{pressure}} · À faire {{pending}} · À valider {{reviewing}} · Souhaits {{promises}}' },
  unknown_examples: { zh: '· “创建一个数学作业任务”\n· “分析今天的日程四象限”\n· “我还有多少星星”', en: '· “Create a math homework task”\n· “Analyze today’s schedule quadrant”\n· “How many stars do I have?”', ja: '· 「数学宿題のタスクを作成」\n· 「今日の日程四象限を分析」\n· 「星はいくつある？」', ko: '· “수학 숙제 작업 만들어줘”\n· “오늘 일정 사분면 분석해줘”\n· “별이 몇 개 있어?”', es: '· “Crear una tarea de matemáticas”\n· “Analizar los cuadrantes de hoy”\n· “Cuántas estrellas tengo”', fr: '· “Créer une tâche de maths”\n· “Analyser les quadrants d’aujourd’hui”\n· “Combien d’étoiles ai-je ?”' },
} as const;
