/**
 * SuccessCelebration - 成功庆祝组合动画
 * 组合多种效果用于重要成就/里程碑
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfettiExplosion } from './ConfettiExplosion';
import { StarBurst } from './StarBurst';

export interface SuccessCelebrationProps {
    /** 是否显示 */
    active?: boolean;
    /** 庆祝类型 */
    variant?: 'default' | 'big-win' | 'mega';
    /** 自定义消息 */
    message?: string;
    /** 自定义 emoji */
    emoji?: string;
    /** 关闭回调 */
    onComplete?: () => void;
}

const VARIANTS = {
    default: {
        confettiCount: 30,
        starCount: 8,
        duration: 2000,
        scale: 1,
    },
    'big-win': {
        confettiCount: 60,
        starCount: 16,
        duration: 3000,
        scale: 1.2,
    },
    mega: {
        confettiCount: 100,
        starCount: 24,
        duration: 4000,
        scale: 1.5,
    },
};

export function SuccessCelebration({
    active = false,
    variant = 'default',
    message,
    emoji = '🎉',
    onComplete,
}: SuccessCelebrationProps) {
    const config = VARIANTS[variant];

    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    className="fixed inset-0 flex items-center justify-center pointer-events-auto z-[10000]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onAnimationComplete={() => {
                        if (!active) onComplete?.();
                    }}
                    onClick={onComplete}
                >
                    {/* 背景 */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                    {/* 动画层 */}
                    <ConfettiExplosion active={true} particleCount={config.confettiCount} />
                    <StarBurst trigger={active ? 1 : 0} count={config.starCount} />

                    {/* 中央消息 */}
                    <motion.div
                        className="relative z-10 text-center px-8 py-6"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: config.scale, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, y: -50 }}
                        transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 18,
                        }}
                    >
                        <motion.div
                            className="text-7xl md:text-9xl mb-4"
                            animate={{
                                y: [0, -15, 0],
                                scale: [1, 1.15, 1],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                repeatType: 'reverse',
                            }}
                        >
                            {emoji}
                        </motion.div>

                        {message && (
                            <motion.h2
                                className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {message}
                            </motion.h2>
                        )}

                        <p className="mt-4 text-sm text-white/70">
                            点击任意处关闭
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SuccessCelebration;
