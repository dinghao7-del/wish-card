import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Mic, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useFamily } from '../context/FamilyContext';
import { cn } from '../lib/utils';
import { Task } from '../types';

interface AISmartTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISmartTaskDialog({ isOpen, onClose }: AISmartTaskDialogProps) {
  const { members, addTask, currentUser } = useFamily();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; task?: any }[]>([
    { role: 'assistant', content: '您好！我是您的家庭助手。您可以直接告诉我想要创建的任务，例如：“让坦坦明天下午3点去练琴，奖励30颗星星”。' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const memberNames = members.map(m => m.name).join('、');
      
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Using flash for tasks like this
        contents: userMessage,
        config: {
          systemInstruction: `你是一个家庭管理助手的后端。你的任务是解析用户的自然语言，将其转化为任务JSON。
          
          当前家庭成员有: ${memberNames}。
          
          输出格式必须是JSON，包含以下字段：
          - title: 任务名称 (string)
          - description: 详细描述 (string)
          - assigneeIds: 执行人ID列表 (string[])，根据提供的成员名称匹配ID。
          - rewardStars: 奖励星星数 (number)
          - type: 任务类型 (daily/study/habit/表扬/penalty)
          - startTime: ISO字符串 (string)，如果是"明天"则基于今天计算。
          - icon: 可选图标名称 (string)
          
          成员名与ID对应关系:
          ${members.map(m => `${m.name}: ${m.id}`).join('\n')}
          
          如果信息不完整（比如没有说谁执行，或者没说奖值），请在JSON中包含一个 'missingInfo' 字段说明欠缺什么。
          否则，直接返回合法的任务对象JSON。
          
          如果你认为这是一句闲聊或无法解析为任务，请返回 {"error": "无法解析为任务，请尝试更具体的描述"}。`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              assigneeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              rewardStars: { type: Type.NUMBER },
              type: { type: Type.STRING },
              startTime: { type: Type.STRING },
              icon: { type: Type.STRING },
              missingInfo: { type: Type.STRING },
              error: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');

      if (result.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.error }]);
      } else if (result.missingInfo) {
        setMessages(prev => [...prev, { role: 'assistant', content: `收到！不过还差一点信息：${result.missingInfo}。您可以补充一下吗？` }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `为您解析到一条任务：\n\n📌 **${result.title}**\n👤 执行人：${members.filter(m => result.assigneeIds.includes(m.id)).map(m => m.name).join(', ')}\n⭐ 奖励：${result.rewardStars} 颗星\n\n是否确认创建？`,
          task: result
        }]);
      }
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我现在有点忙，请稍后再试或点击“手动创建”。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTask = (taskData: any) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      creatorId: currentUser?.id || 'system',
      status: 'pending',
      memberProgress: taskData.assigneeIds.reduce((acc: any, id: string) => {
        acc[id] = 'pending';
        return acc;
      }, {}),
      isHabit: taskData.type === 'habit'
    };
    addTask(newTask);
    setMessages(prev => [...prev, { role: 'assistant', content: '✅ 任务已成功添加到今日清单！' }]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-lg bg-surface flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[80vh] sm:h-[600px] shadow-2xl overflow-hidden border border-outline-variant/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-white dark:bg-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-black text-on-surface">智能任务助手</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold opacity-60">AI 加速任务创建</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-container-low/30">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl font-bold text-sm",
                    msg.role === 'user' 
                      ? "bg-primary text-on-primary rounded-tr-none" 
                      : "bg-white dark:bg-surface-container-high text-on-surface shadow-sm rounded-tl-none"
                  )}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.task && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex gap-2">
                        <button 
                          onClick={() => confirmTask(msg.task)}
                          className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={14} />
                          确认创建
                        </button>
                        <button 
                          onClick={() => setMessages(prev => [...prev, { role: 'assistant', content: '好的，我们再试一次。您可以更详细地描述任务内容。' }])}
                          className="flex-1 bg-surface-container py-2.5 rounded-xl font-black text-xs text-on-surface-variant"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-white dark:bg-surface-container-high p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-xs font-bold text-on-surface-variant">正在解析您的指令...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white dark:bg-surface-container border-t border-outline-variant/10">
              <div className="relative flex items-center gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="输入任务描述..."
                    className="w-full bg-surface-container-low rounded-2xl px-5 py-4 pr-12 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all placeholder:text-on-surface-variant/40"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40">
                    <Mic size={20} />
                  </div>
                </div>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50 transition-all"
                >
                  <Send size={24} />
                </button>
              </div>
              <p className="text-center text-[10px] text-on-surface-variant/40 font-bold mt-4">
                由航大 AI 提供智能动力 ⚡️
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
