/**
 * WhimsyProvider - 全局愉悦体验 Provider
 * 包裹应用根组件，提供全局愉悦体验上下文
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import type { MessageScenario, MessageVariant } from '../copy/Messages';
import { getMessage } from '../copy/Messages';
import { useMicroInteractions } from '../hooks/useMicroInteractions';

// ============================================================
// 类型定义
// ============================================================
interface WhimsyContextType {
    /** 显示愉悦化提示 */
    showWhimsyMessage: (scenario: MessageScenario, params?: Record<string, string | number>) => MessageVariant;
    /** 显示自定义愉悦消息 */
    showCustomMessage: (text: string, emoji?: string, energy?: number) => void;
    /** 当前活跃的消息（用于动画） */
    activeMessage: MessageVariant | null;
    /** 清除当前消息 */
    dismissMessage: () => void;
    /** 是否处于愉悦模式（可由用户关闭） */
    isWhimsyMode: boolean;
    toggleWhimsyMode: () => void;
    /** 微交互工具 */
    haptic: ReturnType<typeof useMicroInteractions>;
}

const WhimsyContext = createContext<WhimsyContextType | undefined>(undefined);

// ============================================================
// 愉悦模式持久化 Key
// ============================================================
const WHIMSY_MODE_KEY = 'whimsy-mode-enabled';

// ============================================================
// Provider 组件
// ============================================================
interface WhimsyProviderProps {
    children: ReactNode;
    /** 默认是否开启愉悦体验 (默认 true) */
    defaultEnabled?: boolean;
}

export function WhimsyProvider({ children, defaultEnabled = true }: WhimsyProviderProps) {
    // 从 localStorage 读取偏好设置
    const [isWhimsyMode, setIsWhimsyMode] = useState(() => {
        try {
            const saved = localStorage.getItem(WHIMSY_MODE_KEY);
            return saved !== null ? JSON.parse(saved) : defaultEnabled;
        } catch {
            return defaultEnabled;
        }
    });

    const [activeMessage, setActiveMessage] = useState<MessageVariant | null>(null);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 微交互 hook
    const haptic = useMicroInteractions();

    // ----------------------------------------------------------
    // 显示愉悦化消息
    // ----------------------------------------------------------
    const showWhimsyMessage = useCallback((
        scenario: MessageScenario,
        params?: Record<string, string | number>
    ): MessageVariant => {
        const message = getMessage(scenario, params);

        if (!isWhimsyMode) return message;

        setActiveMessage(message);
        haptic.triggerSuccess(message);

        // 自动消失
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
            setActiveMessage(null);
        }, 2500 + (message.energy > 0 ? message.energy * 1000 : 500));

        return message;
    }, [isWhimsyMode, haptic]);

    // ----------------------------------------------------------
    // 显示自定义消息
    // ----------------------------------------------------------
    const showCustomMessage = useCallback((text: string, emoji?: string, energy?: number) => {
        const message: MessageVariant = { text, emoji, energy: energy ?? 0.5 };

        if (!isWhimsyMode) return;

        setActiveMessage(message);
        haptic.triggerSuccess(message);

        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
            setActiveMessage(null);
        }, 2000);
    }, [isWhimsyMode, haptic]);

    // ----------------------------------------------------------
    // 关闭消息
    // ----------------------------------------------------------
    const dismissMessage = useCallback(() => {
        setActiveMessage(null);
        if (dismissTimer.current) {
            clearTimeout(dismissTimer.current);
            dismissTimer.current = null;
        }
    }, []);

    // ----------------------------------------------------------
    // 切换愉悦模式
    // ----------------------------------------------------------
    const toggleWhimsyMode = useCallback(() => {
        setIsWhimsyMode(prev => {
            const next = !prev;
            try {
                localStorage.setItem(WHIMSY_MODE_KEY, JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    }, []);

    // ----------------------------------------------------------
    // 清理定时器
    // ----------------------------------------------------------
    useEffect(() => {
        return () => {
            if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
            }
        };
    }, []);

    // ----------------------------------------------------------
    // Context Value
    // ----------------------------------------------------------
    const contextValue: WhimsyContextType = {
        showWhimsyMessage,
        showCustomMessage,
        activeMessage,
        dismissMessage,
        isWhimsyMode,
        toggleWhimsyMode,
        haptic,
    };

    return (
        <WhimsyContext.Provider value={contextValue}>
            {/* 愉悦浮层 - 用于全局庆祝动画 */}
            {isWhimsyMode && activeMessage && (
                <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
                    <WhimsyOverlay message={activeMessage} onDismiss={dismissMessage} />
                </div>
            )}
            {children}
        </WhimsyContext.Provider>
    );
}

// ============================================================
// 导出 Hook
// ============================================================
export function useWhimsy(): WhimsyContextType {
    const context = useContext(WhimsyContext);
    if (!context) throw new Error('useWhimsy must be used within WhimsyProvider');
    return context;
}

// ============================================================
// 愉悦浮层组件
// ============================================================
function WhimsyOverlay({ message, onDismiss }: { message: MessageVariant; onDismiss: () => void }) {
    const energy = message.energy ?? 0.5;
    const isPositive = energy > 0;

    // 根据能量值计算缩放和透明度
    const scale = 1 + Math.abs(energy) * 0.3;
    const opacity = 0.6 + Math.abs(energy) * 0.4;

    return (
        <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity }}
            onClick={onDismiss}
        >
            {/* Emoji 粒子 */}
            {message.emoji && (
                <div
                    key={message.text}
                    className="text-6xl md:text-8xl animate-bounce"
                    style={{
                        transform: `scale(${scale})`,
                        filter: isPositive
                            ? 'drop-shadow(0 0 20px rgba(255,215,0,0.6))'
                            : 'none',
                        animationDuration: `${1 / (Math.abs(energy) + 0.5)}s`,
                    }}
                    role="status"
                    aria-live="polite"
                >
                    {message.emoji}
                </div>
            )}
        </div>
    );
}
