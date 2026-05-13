/**
 * 成就弹窗组件 - 解锁时展示
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Achievement } from '../gamification/AchievementSystem';

interface AchievementPopupProps {
    /** 触发解锁的成就 */
    achievement: Achievement | null;
    /** 显示时长 (ms) */
    duration?: number;
    /** 关闭回调 */
    onDismiss?: () => void;
}

/**
 * Hook: 管理成就弹窗状态
 */
export function useAchievementPopup() {
    const [achievement, setAchievement] = useState<Achievement | null>(null);

    const showAchievement = (ach: Achievement) => {
        setAchievement(ach);
    };

    const dismiss = () => {
        setAchievement(null);
    };

    return {
        achievement,
        showAchievement,
        dismiss,
        AchievementPopupComponent: ({ duration = 3000, onDismiss }: Pick<AchievementPopupProps, 'duration' | 'onDismiss'>) =>
            <AchievementPopup
                achievement={achievement}
                duration={duration}
                onDismiss={() => {
                    dismiss();
                    onDismiss?.();
                }}
            />,
    };
}

export function AchievementPopup({
    achievement,
    duration = 3000,
    onDismiss,
}: AchievementPopupProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!achievement) {
            setIsVisible(false);
            return;
        }

        // 显示动画
        requestAnimationFrame(() => setIsVisible(true));

        // 自动消失
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDismiss?.(), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [achievement, duration, onDismiss]);

    if (!achievement) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onDismiss}
                >
                    {/* 半透明背景 */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                    {/* 成就卡片 */}
                    <motion.div
                        className="relative z-10 mx-4 w-full max-w-sm"
                        initial={{ scale: 0.3, y: 100, rotate: -10 }}
                        animate={{ scale: 1, y: 0, rotate: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: -50 }}
                        transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                        }}
                    >
                        {/* 光效背景 */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-3xl blur-lg opacity-75" />

                        {/* 卡片主体 */}
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-2xl">
                            {/* 标题 */}
                            <div className="text-xs font-bold uppercase tracking-wider text-orange-500 dark:text-orange-400 mb-2">
                                🎊 成就解锁！
                            </div>

                            {/* Icon 动画 */}
                            <motion.div
                                className="text-6xl mb-4"
                                animate={{
                                    rotate: [0, -10, 10, -10, 10, 0],
                                    scale: [1, 1.2, 1.1, 1.2, 1.1, 1],
                                }}
                                transition={{
                                    duration: 1,
                                    ease: 'easeInOut',
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                }}
                            >
                                {achievement.icon}
                            </motion.div>

                            {/* 成就名称 */}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {achievement.name}
                            </h3>

                            {/* 描述 */}
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                {achievement.description}
                            </p>

                            {/* 奖励提示 */}
                            {achievement.reward !== undefined && (
                                <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-700 dark:text-yellow-300 text-sm font-medium">
                                    <span>⭐</span>
                                    <span>+{achievement.reward} 奖励</span>
                                </div>
                            )}

                            {/* 关闭按钮 */}
                            <button
                                onClick={onDismiss}
                                className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                点击任意处关闭
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AchievementPopup;
