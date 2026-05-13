import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Mic, MicOff, Loader2, CheckCircle2, Volume2, VolumeX, Grid2X2, Calendar, Download } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Task, Reward } from '../types';
import {
  recognizeIntent,
  buildFamilyButlerAdvice,
  buildFamilyButlerContextSummary,
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

const QUICK_COMMANDS = [
  { labelKey: 'voice_assistant.quick_cmds.quadrant', icon: '📊', command: '帮我分析今天的日程四象限', defaultValue: '四象限' },
  { labelKey: 'voice_assistant.quick_cmds.summary', icon: '📝', command: '给我本周家庭周报', defaultValue: '家庭周报' },
  { labelKey: 'voice_assistant.quick_cmds.plan', icon: '🗓️', command: '帮我制定一个平日计划', defaultValue: '创建计划' },
  { labelKey: 'voice_assistant.quick_cmds.calendar', icon: '📅', command: '帮我同步日历到手机', defaultValue: '日历同步' },
  { labelKey: 'voice_assistant.quick_cmds.stars', icon: '⭐', command: '我还有多少星星', defaultValue: '我的星星' },
  { labelKey: 'voice_assistant.quick_cmds.reviewing', icon: '⏳', command: '有哪些任务待审核', defaultValue: '待审核' },
  { labelKey: 'voice_assistant.quick_cmds.suggestion', icon: '💡', command: '给我一些智能建议', defaultValue: '智能建议' },
];

export function VoiceAssistant({ isOpen, onClose, onOpenQuadrant, onOpenCalendarSync }: VoiceAssistantProps) {
  const { members, tasks, rewards, currentUser, addTask, updateTask, completeTask, approveTask, deleteTask, redeemReward, addReward, stars, familyId } = useFamily();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [pendingScheduleCommand, setPendingScheduleCommand] = useState<PendingScheduleArrangement | null>(null);
  const [pendingSchedulePreview, setPendingSchedulePreview] = useState<PendingScheduleShiftPreview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t('voice_assistant.greeting', { defaultValue: '你好！我是你的语音助手' }) }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      addMessage({ role: 'assistant', content: `操作没有完成：${error?.message || '请稍后重试'}` });
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 语音识别 ====================
  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      addMessage({ role: 'assistant', content: `🎤 ${t('voice_assistant.listening', { defaultValue: '正在听...' })}` });
      const transcript = await startListening();
      setIsListening(false);

      if (transcript) {
        setInput(transcript);
        await processCommand(transcript);
      } else {
        setMessages(prev => prev.slice(0, -1));
        addMessage({ role: 'assistant', content: t('voice_assistant.listening_failed', { defaultValue: '启动失败' }) });
      }
    } catch (err: any) {
      setIsListening(false);
      setMessages(prev => prev.slice(0, -1));
      addMessage({ role: 'assistant', content: `${t('voice_assistant.error', { defaultValue: '错误' })} ${err.message}` });
    }
  };

  // ==================== 命令处理 ====================
  const processCommand = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    addMessage({ role: 'user', content: userInput });
    setInput('');
    setIsLoading(true);

    try {
      const context = getAppContext();
      if (pendingSchedulePreview) {
        const trimmed = userInput.trim();
        if (/^(算了|取消|不用了|先不|先不用|不改了)/.test(trimmed)) {
          setPendingSchedulePreview(null);
          addMessage({ role: 'assistant', content: '好的，这次待处理的日程变更先取消。' });
          return;
        }

        const refinement = parseScheduleArrangementRefinement(trimmed);
        if (refinement) {
          const refinedShiftedTasks = filterScheduleArrangementTasksByRefinement(pendingSchedulePreview.shiftedTasks, refinement);
          if (refinedShiftedTasks.length === 0) {
            addMessage({ role: 'assistant', content: '我按你的限定条件过滤后，没有剩下可调整的日程。可以换一种说法，比如“只顺延钢琴和空手道”。' });
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
          const result = buildScheduleShiftPreviewResponse(nextPreview, '已按你的补充条件重新整理影响范围。');
          addMessage({ role: 'assistant', content: result.message, action: result.action });
          return;
        }
      }

      if (pendingScheduleCommand) {
        if (/^(算了|取消|不用了|先不|先不用|不改了|不加了)/.test(userInput.trim())) {
          setPendingScheduleCommand(null);
          addMessage({ role: 'assistant', content: '好的，这次日程调整先取消。' });
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

      const incompleteSchedule = recognizeIncompleteScheduleArrangement(userInput);
      if (incompleteSchedule) {
        setPendingScheduleCommand(incompleteSchedule);
        addMessage({ role: 'assistant', content: incompleteSchedule.prompt });
        return;
      }

      const command = await recognizeIntent(userInput, context, i18n.language);
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
    const riskText = formatScheduleImpactForConfirmation(preview.impact);
    const affectedTitles = preview.shiftedTasks.slice(0, 5).map(task => `· ${task.title}`).join('\n');
    const moreText = preview.shiftedTasks.length > 5 ? `\n还有 ${preview.shiftedTasks.length - 5} 个安排` : '';
    return {
      message: `${prefix ? `${prefix}\n` : ''}我理解为：${preview.command.summary}。\n将影响 ${preview.shiftedTasks.length} 个课外班/兴趣安排${preview.travelTask ? `，并新增“${preview.travelTask.title}”作为家庭日程锚点` : ''}。\n${affectedTitles}${moreText}\n${riskText}\n${preview.impact.requiresUserConfirmation ? '如果仍然要这样改，请确认。也可以继续说“只顺延钢琴，不动英语”。' : '确认后我会执行。你也可以继续限定范围。'}`,
      action: {
        type: 'confirm_schedule_shift',
        label: preview.impact.requiresUserConfirmation ? '确认这样顺延' : '确认顺延',
        onConfirm: async () => {
          for (const task of preview.shiftedTasks) {
            await updateTask(task);
          }
          if (preview.travelTask) {
            await addTask(preview.travelTask);
          }
          setPendingSchedulePreview(null);
          addMessage({ role: 'assistant', content: `已顺延 ${preview.shiftedTasks.length} 个日程${preview.travelTask ? `，并加入“${preview.travelTask.title}”。` : '。'}\n${preview.impact.recommendation}` });
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
        const scene = (params.scene || 'custom') as PlanSceneParam;
        const name = typeof params.name === 'string' ? params.name : '';
        const sceneLabel = scene === 'holiday' ? '假期计划' : scene === 'weekday' ? '平日计划' : scene === 'exchange' ? '交换留学计划' : '自定义计划';
        const query = new URLSearchParams({ scene });
        if (name) query.set('name', name);
        return {
          message: `我会先帮你打开${sceneLabel}创建入口，基础时间和日程会先自动带上，你再做少量确认就可以。`,
          action: {
            type: 'open_plan_wizard',
            label: '创建计划',
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
        const { rangeStart, rangeEnd, label } = getPublicCalendarQueryRange(range, direction);
        const region = await getStoredPublicCalendarRegion();
        const bundle = await loadPublicCalendarSignalBundle({
          year: new Date(rangeStart).getFullYear(),
          region,
          includeRemote: isOnline(),
        });
        const summary = buildPublicCalendarAdjustments(bundle.signals, tasks, { region, rangeStart, rangeEnd });
        const details = summary.adjustments.length > 0
          ? summary.adjustments.slice(0, 3).map(item => `· ${item.title}：${item.message}`).join('\n')
          : '暂时没有发现明显会影响家庭安排的节假日、调休、校历或公共事件变化。';

        return {
          message: `${label}公共时间检查：${summary.headline}\n${bundle.freshnessLabel}\n\n${details}`,
          action: {
            type: 'open_school_calendar',
            label: '维护校历与公共时间',
            onConfirm: () => {
              onClose();
              setTimeout(() => navigate('/school-calendar'), 300);
            }
          }
        };
      }

      case 'schedule_arrangement': {
        const scheduleCommand = params as ScheduleArrangementCommand;
        if (!currentUser) return { message: '请先选择当前家庭成员' };
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
          const riskText = formatScheduleImpactForConfirmation(impact);
          const actionVerb = placeholder ? '补全' : '加入';

          return {
            message: `我理解为：${scheduleCommand.summary}。\n${placeholder ? '我找到了建档时留下的课外班占位，会优先补全它。' : ''}${placeholder ? '\n' : ''}${riskText}\n${impact.requiresUserConfirmation ? '如果仍然要这样安排，请确认。' : `确认后，我会把它${actionVerb}到孩子的每周日程。`}`,
            action: {
              type: 'confirm_schedule_arrangement',
              label: impact.requiresUserConfirmation ? `仍然${actionVerb}日程` : `确认${actionVerb}日程`,
              onConfirm: async () => {
                if (placeholder) {
                  await updateTask(task);
                } else {
                  await addTask(task);
                }
                addMessage({ role: 'assistant', content: `已${actionVerb}：${task.title}。以后复盘和日历都会看到这项固定安排。\n${impact.recommendation}` });
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
            return { message: '我没有找到可顺延的课外班日程。可以先告诉我具体是哪几个课程，或者先添加固定课外班。' };
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
            return { message: '我没有找到要取消的那次日程。可以说得更具体一点，比如“取消这周钢琴课一次”。' };
          }
          const impact = analyzeScheduleArrangementImpact(tasks, canceledTasks, { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact);

          return {
            message: `我理解为：${scheduleCommand.summary}。\n将影响 ${canceledTasks.length} 个安排。\n${riskText}\n${impact.requiresUserConfirmation ? '如果仍然要取消，请确认。' : '确认后我会标记为本次取消。'}`,
            action: {
              type: 'confirm_schedule_cancel_once',
              label: impact.requiresUserConfirmation ? '仍然取消' : '确认取消一次',
              onConfirm: async () => {
                for (const task of canceledTasks) {
                  await updateTask(task);
                }
                addMessage({ role: 'assistant', content: `已取消 ${canceledTasks.length} 个本次安排。\n${impact.recommendation}` });
              }
            }
          };
        }

        if (scheduleCommand.operation === 'reschedule_task') {
          const rescheduledTasks = rescheduleTasks(tasks, scheduleCommand);
          if (rescheduledTasks.length === 0) {
            return { message: '我没有找到要改时间的日程。可以说“把周五英语课改到周六上午9-10点”。' };
          }
          const impact = analyzeScheduleArrangementImpact(tasks, rescheduledTasks, { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact);

          return {
            message: `我理解为：${scheduleCommand.summary}。\n${riskText}\n${impact.requiresUserConfirmation ? '如果仍然要改到这个时间，请确认。' : `确认后我会更新 ${rescheduledTasks.length} 个日程时间。`}`,
            action: {
              type: 'confirm_schedule_reschedule',
              label: impact.requiresUserConfirmation ? '仍然改时间' : '确认改时间',
              onConfirm: async () => {
                for (const task of rescheduledTasks) {
                  await updateTask(task);
                }
                addMessage({ role: 'assistant', content: `已调整 ${rescheduledTasks.length} 个日程时间。\n${impact.recommendation}` });
              }
            }
          };
        }

        if (scheduleCommand.operation === 'pause_category') {
          const pausedTasks = pauseCategoryTasks(tasks, scheduleCommand);
          if (pausedTasks.length === 0) {
            return { message: '我没有找到符合条件的任务。可以换成“考试前两周暂停所有娱乐类任务”。' };
          }
          const impact = analyzeScheduleArrangementImpact(tasks, pausedTasks, { publicCalendarSignals, region });
          const riskText = formatScheduleImpactForConfirmation(impact);

          return {
            message: `我理解为：${scheduleCommand.summary}。\n将影响 ${pausedTasks.length} 个任务。\n${riskText}\n${impact.requiresUserConfirmation ? '如果仍然要这样调整，请确认。' : '确认后我会统一暂停或后移。'}`,
            action: {
              type: 'confirm_schedule_pause_category',
              label: impact.requiresUserConfirmation ? '仍然暂停/后移' : '确认暂停/后移',
              onConfirm: async () => {
                for (const task of pausedTasks) {
                  await updateTask(task);
                }
                addMessage({ role: 'assistant', content: `已调整 ${pausedTasks.length} 个任务。\n${impact.recommendation}` });
              }
            }
          };
        }

        return { message: '我还没完全理解这次日程调整，可以换一种说法，比如“每周三下午6-7点空手道课”或“课外班顺延2周”。' };
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
        const dateLabel = dateRange === 'month' ? '本月' : dateRange === 'week' ? '本周' : '今天';
        if (onOpenQuadrant) {
          return {
            message: `${dateLabel}四象限分析已就绪，我会帮你们先看哪些事最值得优先处理。`,
            action: {
              type: 'open_quadrant',
              label: `${dateLabel}四象限`,
              onConfirm: () => {
                onClose();
                setTimeout(() => onOpenQuadrant(dateRange), 300);
              }
            }
          };
        }
        navigate(`/quadrant?range=${dateRange}`);
        onClose();
        return { message: `${dateLabel}四象限分析已打开。` };
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
          }) + `\n\n管家提醒：${butlerSummary.familyPromiseTasks > 0 ? `还有 ${butlerSummary.familyPromiseTasks} 个孩子心愿需要父母安排兑现。` : '今天先守住一两个关键行动，全家的节奏会更稳。'}`
        };
      }

      case 'weekly_report': {
        const period = (params.period || 'week') as ReportPeriodParam;
        const label = period === 'year' ? '年度复盘' : period === 'term' ? '学期复盘' : period === 'month' ? '月报' : '周报';
        const focusText = params.focus === 'next_period'
          ? '我会直接带你看下个周期怎么安排。'
          : '我会把完成、好习惯、心愿兑现和下个周期预告放在一起。';
        return {
          message: `${label}已准备好，${focusText}`,
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
        const pressureText = summary.pressureLevel === 'busy' ? '节奏偏满' : summary.pressureLevel === 'balanced' ? '节奏适中' : '节奏轻松';
        const primaryAction = advice.actions[0];
        return {
          message: `${advice.headline}\n\n当前状态：${pressureText} · 待办 ${summary.pendingTasks} · 待确认 ${summary.reviewingTasks} · 心愿兑现 ${summary.familyPromiseTasks}\n\n${advice.suggestions.map(item => `· ${item}`).join('\n\n')}`,
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
        return { message: confirmationMessage || t('voice_assistant.unknown_command', { defaultValue: 'unknown command' }) + '\n· "创建一个数学作业任务"\n· "分析今天的日程四象限"\n· "我还有多少星星"' };
    }
  };

  const handleSend = () => {
    if (input.trim()) processCommand(input.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-lg bg-surface flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[85svh] max-h-[calc(100svh-1rem)] sm:h-[650px] shadow-2xl overflow-hidden border border-outline-variant/10"
          >
            {/* Header */}
            <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="font-black text-on-surface text-sm">{t('voice_assistant.title', { defaultValue: '标题' })}</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold">{t('voice_assistant.subtitle', { defaultValue: '副标题' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-low/30">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3.5 rounded-2xl font-bold text-[13px] leading-relaxed",
                    msg.role === 'user'
                      ? "bg-primary text-on-primary rounded-tr-none"
                      : "bg-surface-container-high text-on-surface shadow-sm rounded-tl-none"
                  )}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.action && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/20 flex gap-2">
                        <button
                          onClick={() => handleActionConfirm(msg.action!)}
                          disabled={isLoading}
                          className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          {msg.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-surface-container-high p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span className="text-xs font-bold text-on-surface-variant">{t('voice_assistant.thinking', { defaultValue: 'thinking' })}</span>
                  </div>
                </div>
              )}
              {isListening && (
                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Mic size={14} className="text-primary animate-pulse" />
                    <span className="text-xs font-bold text-primary">{t('voice_assistant.listening', { defaultValue: '正在听...' })}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Commands */}
            <div className="px-4 py-2 bg-surface-container border-t border-outline-variant/5">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {QUICK_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.labelKey}
                    onClick={() => processCommand(cmd.command)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-bold whitespace-nowrap shrink-0 hover:bg-surface-container active:scale-95 transition-all border border-outline-variant/10"
                  >
                    <span>{cmd.icon}</span>
                    {t(cmd.labelKey, { defaultValue: cmd.defaultValue })}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-surface-container border-t border-outline-variant/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95",
                    isListening
                      ? "bg-danger text-white shadow-lg shadow-danger/20 animate-pulse"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('voice_assistant.input_placeholder', { defaultValue: 'input placeholder' })}
                    className="w-full bg-surface-container-low rounded-2xl px-4 py-3.5 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all placeholder:text-on-surface-variant/40"
                  />
                </div>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50 transition-all shrink-0"
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-center text-[10px] text-on-surface-variant/40 font-bold mt-2">
                {t('voice_assistant.footer', { defaultValue: 'footer' })}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function formatScheduleImpactForConfirmation(impact: ReturnType<typeof analyzeScheduleArrangementImpact>): string {
  const text = impact.messages.join('\n');
  return impact.requiresUserConfirmation ? `我先帮你检查了一下风险：\n${text}` : text;
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
