/**
 * EmptyState - 愉悦化空状态组件
 * 用于列表/内容为空时展示友好提示
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useWhimsy } from './WhimsyProvider';
import type { MessageScenario } from '../copy/Messages';

interface EmptyStateProps {
    /** 场景类型（用于匹配文案） */
    scenario?: MessageScenario;
    /** 自定义标题 */
    title?: string;
    /** 自定义描述 */
    description?: string;
    /** 自定义 emoji */
    emoji?: string;
    /** 点击回调 */
    onAction?: () => void;
    /** 操作按钮文字 */
    actionText?: string;
    /** 是否显示动画 (默认 true) */
    animated?: boolean;
}

export function EmptyState({
    scenario = 'empty_state',
    title,
    description,
    emoji,
    onAction,
    actionText = '去添加',
    animated = true,
}: EmptyStateProps) {
    const { showWhimsyMessage, isWhimsyMode } = useWhimsy();

    // 获取愉悦文案或使用自定义文案
    let displayTitle = title;
    let displayEmoji = emoji;
    let displayDesc = description;

    if (!displayTitle || !displayEmoji) {
        // 尝试从文案库获取（固定选第一条以保持稳定）
        try {
            const messages = require('../copy/Messages').getAllMessages(scenario);
            if (messages.length > 0 && !displayTitle) {
                displayTitle = messages[0].text;
                displayEmoji = messages[0].emoji;
            }
        } catch {
            // fallback
        }
    }

    const handleAction = () => {
        if (isWhimsyMode) {
            showWhimsyMessage('task_publish');
        }
        onAction?.();
    };

    return (
        <motion.div
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
            initial={animated ? { opacity: 0, y: 20 } : undefined}
            animate={animated ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {/* Emoji 动画 */}
            <motion.div
                className="text-6xl mb-6"
                animate={
                    animated
                        ? {
                            y: [0, -10, 0],
                            scale: [1, 1.1, 1],
                        }
                        : undefined
                }
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                {displayEmoji ?? '🌱'}
            </motion.div>

            {/* 文字 */}
            <h3 className="text-lg font-black text-on-surface mb-2">
                {displayTitle ?? '这里空空的'}
            </h3>

            {displayDesc && (
                <p className="text-sm font-bold text-on-surface-variant/60 mb-6 max-w-xs leading-relaxed">
                    {displayDesc}
                </p>
            )}

            {/* 操作按钮 */}
            {onAction && (
                <motion.button
                    onClick={handleAction}
                    className="ui-primary-button rounded-full px-6 py-2.5"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {actionText}
                </motion.button>
            )}
        </motion.div>
    );
}

export default EmptyState;
