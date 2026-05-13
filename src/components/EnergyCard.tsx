/**
 * EnergyCard - 首页能量卡片
 * 展示用户当前状态、心情和活力值
 * 使用主题令牌 + Lucide 图标（不用 emoji）
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, Flame, Zap, Smile, Meh, Frown, Sun, Moon } from 'lucide-react';
import { useWhimsy } from './WhimsyProvider';

interface EnergyCardProps {
    /** 用户昵称 */
    name?: string;
    /** 当前星星数 */
    stars?: number;
    /** 今日完成任务数 */
    tasksCompleted?: number;
    /** 今日总任务数 */
    tasksTotal?: number;
    /** 连续打卡天数 */
    streakDays?: number;
}

type MoodType = 'great' | 'good' | 'okay' | 'tired' | 'energetic';

// 用 lucide 图标替代 emoji
const MOOD_OPTIONS: { type: MoodType; icon: React.ElementType; label: string; color: string }[] = [
    { type: 'energetic', icon: Zap, label: '元气满满', color: 'text-reward-display' },
    { type: 'great', icon: Sun, label: '超开心', color: 'text-secondary-container' },
    { type: 'good', icon: Smile, label: '还不错', color: 'text-primary-surface' },
    { type: 'okay', icon: Meh, label: '一般般', color: 'text-surface-container-high' },
    { type: 'tired', icon: Moon, label: '有点累', color: 'text-outline-variant' },
];

export function EnergyCard({
    name = '',
    stars = 0,
    tasksCompleted = 0,
    tasksTotal = 0,
    streakDays = 0,
}: EnergyCardProps) {
    const [currentMood, setCurrentMood] = useState<MoodType | null>(null);
    const [isMoodSelectorOpen, setIsMoodSelectorOpen] = useState(false);
    const { showCustomMessage, isWhimsyMode, haptic } = useWhimsy();

    // 计算进度百分比
    const taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

    // 选择心情
    const handleSelectMood = useCallback((mood: MoodType) => {
        setCurrentMood(mood);
        setIsMoodSelectorOpen(false);
        haptic.triggerSelection();

        if (isWhimsyMode) {
            const option = MOOD_OPTIONS.find(o => o.type === mood);
            showCustomMessage(
                `今天${option?.label ?? ''}！`,
                undefined,
                mood === 'energetic' || mood === 'great' ? 0.8 : 0.4
            );
        }

        // 保存到 localStorage
        try {
            const today = new Date().toISOString().split('T')[0];
            const moods = JSON.parse(localStorage.getItem('daily-moods') || '{}');
            moods[today] = mood;
            localStorage.setItem('daily-moods', JSON.stringify(moods));
        } catch {
            // ignore
        }
    }, [haptic, isWhimsyMode, showCustomMessage]);

    const selectedMood = MOOD_OPTIONS.find(o => o.type === currentMood);
    const SelectedIcon = selectedMood?.icon ?? Smile;

    return (
        <motion.div
            className="relative bg-gradient-to-br from-primary-surface via-primary-container to-primary-text rounded-[2.5rem] py-5 sm:py-6 px-6 sm:px-8 text-white shadow-xl shadow-primary/20 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                animate={{
                    y: [0, -8, 0],
                    x: [0, 3, 0],
                    rotate: [0, 10, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-3 left-4 opacity-20 pointer-events-none"
            >
                <Star size={20} className="fill-current text-reward-display" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 8, 0],
                    x: [0, -4, 0],
                    rotate: [0, -15, 0],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-5 right-5 opacity-30 pointer-events-none"
            >
                <Zap size={28} className="text-secondary" />
            </motion.div>

            {/* 内容区 */}
            <div className="relative z-10">
                {/* 问候语 + 心情按钮 */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-sm text-white/80">Hi~</p>
                        <h2 className="text-2xl font-bold">{name || '小伙伴'}</h2>
                    </div>

                    {/* 心情选择器 — 用图标替代 emoji */}
                    <motion.button
                        onClick={() => setIsMoodSelectorOpen(!isMoodSelectorOpen)}
                        className={`w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                            selectedMood ? 'bg-white/25 backdrop-blur-sm ring-1 ring-white/30' : 'bg-white/15'
                        }`}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                    >
                        <SelectedIcon size={22} className={selectedMood?.color ?? 'text-white/80'} />
                    </motion.button>
                </div>

                {/* 心情选择面板 */}
                {isMoodSelectorOpen && (
                    <motion.div
                        className="mb-4 p-3 bg-black/10 rounded-2xl backdrop-blur-sm border border-white/10"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        <p className="text-[11px] text-white/70 mb-2 font-medium">今天心情如何？</p>
                        <div className="flex gap-2">
                            {MOOD_OPTIONS.map(mood => {
                                const Icon = mood.icon;
                                return (
                                    <button
                                        key={mood.type}
                                        onClick={() => handleSelectMood(mood.type)}
                                        className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                                            currentMood === mood.type
                                                ? 'bg-white/20 ring-1 ring-white/40'
                                                : 'hover:bg-white/10'
                                        }`}
                                    >
                                        <Icon size={18} className={mood.color} />
                                        <span className="text-[9px] text-white/70 mt-1">{mood.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* 数据统计 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* 星星 */}
                    <motion.div
                        className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center"
                        whileHover={{ scale: 1.03 }}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Star size={16} className="text-reward-display fill-current" />
                            <span className="text-xl font-bold tabular-nums">{stars.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-white/70 mt-1">星星</p>
                    </motion.div>

                    {/* 任务进度 */}
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                        <p className="text-lg font-bold tabular-nums">
                            {tasksCompleted}/{tasksTotal}
                        </p>
                        <p className="text-[10px] text-white/70 mt-1">今日任务</p>
                    </div>

                    {/* 连续打卡 */}
                    <motion.div
                        className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center"
                        whileHover={{ scale: 1.03 }}
                    >
                        <div className="flex items-center justify-center gap-0.5">
                            <Flame size={14} className="text-warning-container" />
                            <span className="text-lg font-bold tabular-nums">{streakDays}</span>
                        </div>
                        <p className="text-[10px] text-white/70 mt-1">连续天数</p>
                    </motion.div>
                </div>

                {/* 进度条 */}
                {tasksTotal > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-white/70">
                            <span>今日进度</span>
                            <span className="font-medium">{Math.round(taskProgress)}%</span>
                        </div>
                        <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-reward-display to-warning-container rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${taskProgress}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default EnergyCard;
