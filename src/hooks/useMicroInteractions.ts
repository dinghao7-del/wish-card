/**
 * 微交互 Hook - 愉觉体验系统
 * 提供触觉反馈、音效触发、微动画状态等能力
 */

import { useCallback, useRef, useState } from 'react';
import type { MessageVariant } from '../copy/Messages';

// ============================================================
// 类型定义
// ============================================================
export interface HapticPattern {
    light: number[];
    medium: number[];
    heavy: number[];
    success: number[];
    error: number[];
    selection: number[];
}

export type HapticType = keyof HapticPattern;

export interface MicroInteractionConfig {
    /** 是否启用触觉反馈 (默认 true) */
    haptics?: boolean;
    /** 是否启用音效 (默认 false) */
    sound?: boolean;
    /** 触觉强度倍率 (默认 1.0) */
    intensityMultiplier?: number;
}

interface MicroInteractionState {
    /** 当前活跃的微交互 ID */
    activeId: string | null;
    /** 上一次交互时间戳 */
    lastInteraction: number;
    /** 连续交互计数器 */
    consecutiveCount: number;
}

// ============================================================
// 默认配置
// ============================================================
const DEFAULT_CONFIG: MicroInteractionConfig = {
    haptics: true,
    sound: false,
    intensityMultiplier: 1.0,
};

// 触觉模式定义 (持续时间 ms)
const HAPTIC_PATTERNS: HapticPattern = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [15, 50, 15],
    error: [30, 50, 80],
    selection: [8],
};

// ============================================================
// Hook 实现
// ============================================================
export function useMicroInteractions(config: MicroInteractionConfig = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const [state, setState] = useState<MicroInteractionState>({
        activeId: null,
        lastInteraction: 0,
        consecutiveCount: 0,
    });

    const stateRef = useRef(state);
    stateRef.current = state;

    // ----------------------------------------------------------
    // 触觉反馈
    // ----------------------------------------------------------
    const triggerHaptic = useCallback((type: HapticType = 'light') => {
        if (!cfg.haptics) return;

        // 尝试使用 Vibration API
        const vibrate = navigator.vibrate;
        if (vibrate) {
            const pattern = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS.light;
            const scaledPattern = pattern.map(d => d * (cfg.intensityMultiplier || 1));
            vibrate(scaledPattern);
            return;
        }

        // Capacitor/H5 fallback: 通过 CSS 动画模拟
        document.body.classList.add('haptic-feedback');
        setTimeout(() => {
            document.body.classList.remove('haptic-feedback');
        }, 100);
    }, [cfg.haptics, cfg.intensityMultiplier]);

    // ----------------------------------------------------------
    // 成功反馈（组合）
    // ----------------------------------------------------------
    const triggerSuccess = useCallback((message?: MessageVariant) => {
        triggerHaptic('success');
        setState(prev => ({
            ...prev,
            activeId: `success-${Date.now()}`,
            lastInteraction: Date.now(),
            consecutiveCount: prev.consecutiveCount + 1,
        }));
    }, [triggerHaptic]);

    // ----------------------------------------------------------
    // 错误反馈
    // ----------------------------------------------------------
    const triggerError = useCallback(() => {
        triggerHaptic('error');
        setState(prev => ({
            ...prev,
            activeId: `error-${Date.now()}`,
            lastInteraction: Date.now(),
            consecutiveCount: 0,
        }));
    }, [triggerHaptic]);

    // ----------------------------------------------------------
    // 点击/选择反馈
    // ----------------------------------------------------------
    const triggerSelection = useCallback(() => {
        triggerHaptic('selection');
    }, [triggerHaptic]);

    // ----------------------------------------------------------
    // 能量映射（根据消息能量值调整动画强度）
    // ----------------------------------------------------------
    const getAnimationIntensity = useCallback((energy?: number): number => {
        if (energy === undefined) return cfg.intensityMultiplier || 1;

        // 将 [-1, 1] 映射到 [0.3, 2.0]
        const baseIntensity = cfg.intensityMultiplier || 1;
        const energyFactor = 0.3 + ((energy + 1) / 2) * 1.7;
        return baseIntensity * energyFactor;
    }, [cfg.intensityMultiplier]);

    // ----------------------------------------------------------
    // 清除活跃状态
    // ----------------------------------------------------------
    const clearActive = useCallback(() => {
        setState(prev => ({ ...prev, activeId: null }));
    }, []);

    return {
        /** 当前状态 */
        state,
        /** 触发触觉反馈 */
        triggerHaptic,
        /** 触发成功组合效果 */
        triggerSuccess,
        /** 触发错误组合效果 */
        triggerError,
        /** 触发选择反馈 */
        triggerSelection,
        /** 根据能量值获取动画强度 */
        getAnimationIntensity,
        /** 清除活跃状态 */
        clearActive,
    };
}
