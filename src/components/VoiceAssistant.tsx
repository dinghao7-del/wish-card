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
  speak,
  startListening,
  generateICSFile,
  downloadICS,
  type AppContext,
  type VoiceCommand,
} from '../lib/voiceAssistant';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuadrant?: () => void;
  onOpenCalendarSync?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: string;
    label: string;
    onConfirm: () => void;
  };
  quadrantData?: any;
}

const QUICK_COMMANDS = [
  { labelKey: 'voice_assistant.quick_cmds.quadrant', icon: '📊', command: '帮我分析今天的日程四象限', defaultValue: '四象限' },
  { labelKey: 'voice_assistant.quick_cmds.summary', icon: '📝', command: '给我今天的总结', defaultValue: '今日总结' },
  { labelKey: 'voice_assistant.quick_cmds.calendar', icon: '📅', command: '帮我同步日历到手机', defaultValue: '日历同步' },
  { labelKey: 'voice_assistant.quick_cmds.stars', icon: '⭐', command: '我还有多少星星', defaultValue: '我的星星' },
  { labelKey: 'voice_assistant.quick_cmds.reviewing', icon: '⏳', command: '有哪些任务待审核', defaultValue: '待审核' },
  { labelKey: 'voice_assistant.quick_cmds.suggestion', icon: '💡', command: '给我一些智能建议', defaultValue: '智能建议' },
];

export function VoiceAssistant({ isOpen, onClose, onOpenQuadrant, onOpenCalendarSync }: VoiceAssistantProps) {
  const { members, tasks, rewards, currentUser, addTask, completeTask, approveTask, deleteTask, redeemReward, addReward, stars, familyId } = useFamily();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
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
            onConfirm: () => {
              addTask(newTask);
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
            onConfirm: () => {
              completeTask(taskId);
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
            onConfirm: () => {
              approveTask(taskId);
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
            onConfirm: () => {
              deleteTask(taskId);
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
            onConfirm: () => {
              addReward(newReward);
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
            onConfirm: () => {
              redeemReward(rewardId);
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

      // === 星星系统 ===
      case 'query_stars': {
        return { message: t('voice_assistant.star_count', { count: stars }) };
      }

      case 'query_history': {
        return { message: t('voice_assistant.star_history', { stars }) };
      }

      // === 日程分析 ===
      case 'quadrant_analysis': {
        if (onOpenQuadrant) {
          return {
            message: t('voice_assistant.quadrant_ready', { defaultValue: '四象限分析已就绪' }),
            action: {
              type: 'open_quadrant',
              label: t('voice_assistant.quick_cmds.quadrant', { defaultValue: '四象限' }),
              onConfirm: () => {
                onClose();
                setTimeout(() => onOpenQuadrant(), 300);
              }
            }
          };
        }
        return { message: t('voice_assistant.quadrant_ready', { defaultValue: '四象限分析已就绪' }) };
      }

      case 'today_summary': {
        const completed = tasks.filter(t => t.status === 'completed');
        const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        const reviewing = tasks.filter(t => t.status === 'reviewing');
        const encouragement = pending.length > 0 ? t('voice_assistant.encouragement_continue', { defaultValue: '继续加油' }) : t('voice_assistant.encouragement_great', { defaultValue: '太棒了' });
        return {
          message: t('voice_assistant.today_summary', { 
            completed: completed.length, 
            pending: pending.length, 
            reviewing: reviewing.length, 
            stars,
            encouragement 
          })
        };
      }

      case 'smart_suggestion': {
        const reviewing = tasks.filter(t => t.status === 'reviewing');
        const suggestions: string[] = [];
        if (reviewing.length > 0) suggestions.push(t('voice_assistant.suggestion_reviewing', { count: reviewing.length }));
        if (stars > 0 && rewards.length > 0) {
          const affordable = rewards.filter(r => r.cost <= stars);
          if (affordable.length > 0) suggestions.push(t('voice_assistant.suggestion_affordable', { name: affordable[0].name }));
        }
        if (tasks.filter(t => t.status === 'pending').length > 3) suggestions.push(t('voice_assistant.suggestion_many_pending', { defaultValue: '有很多进行中的任务' }));
        if (suggestions.length === 0) suggestions.push(t('voice_assistant.suggestion_all_good', { defaultValue: '一切都很棒' }));
        return { message: t('voice_assistant.smart_suggestions', { defaultValue: '智能建议' }) + '\n\n' + suggestions.join('\n\n') };
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
        const ics = generateICSFile(context.tasks, context.members, t('voice_assistant.calendar_default_name', { defaultValue: 'calendar default name' }) || '愿望卡');
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-lg bg-surface flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[85vh] sm:h-[650px] shadow-2xl overflow-hidden border border-outline-variant/10"
          >
            {/* Header */}
            <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-white dark:bg-surface-container shrink-0">
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
                      : "bg-white dark:bg-surface-container-high text-on-surface shadow-sm rounded-tl-none"
                  )}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.action && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/20 flex gap-2">
                        <button
                          onClick={msg.action.onConfirm}
                          className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <CheckCircle2 size={14} />
                          {msg.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-white dark:bg-surface-container-high p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
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
            <div className="px-4 py-2 bg-white dark:bg-surface-container border-t border-outline-variant/5">
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
            <div className="p-4 bg-white dark:bg-surface-container border-t border-outline-variant/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95",
                    isListening
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse"
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
