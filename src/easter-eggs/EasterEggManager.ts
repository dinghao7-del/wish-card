/**
 * 彩蛋管理器 - 愉悦体验系统 Phase 2
 * 管理隐藏彩蛋触发和展示逻辑
 */

// ============================================================
// 彩蛋类型
// ============================================================
export interface EasterEgg {
    id: string;
    name: string;
    /** 触发方式描述 */
    hint: string;
    /** 触发条件类型 */
    trigger: EasterEggTrigger;
    /** 彩蛋内容 */
    content: EasterEggContent;
    /** 是否已被发现 */
    discovered: boolean;
}

export type EasterEggTrigger =
    | 'konami_code'      // 上上下下左右左右BA
    | 'triple_click'     // 连续快速点击3次同一位置
    | 'long_press'       // 长按 > 3s
    | 'time_specific'    // 特定时间访问
    | 'sequence_input'   // 特定文字序列
    | 'easter_date'      // 复活节期间
    | 'custom';          // 自定义条件

export interface EasterEggContent {
    type: 'animation' | 'message' | 'mini_game' | 'visual_effect';
    data: Record<string, unknown>;
}

// ============================================================
// 内置彩蛋库
// ============================================================
const EASTER_EGGS: EasterEgg[] = [
    {
        id: 'konami_stars',
        name: '经典秘籍',
        hint: '还记得那个经典的操作吗？↑↑↓↓←→←→BA',
        trigger: 'konami_code',
        content: {
            type: 'visual_effect',
            data: { effect: 'star_rain', duration: 5000 },
        },
        discovered: false,
    },
    {
        id: 'midnight_wish',
        name: '午夜许愿',
        hint: '深夜时分来试试？23:00 - 01:00',
        trigger: 'time_specific',
        content: {
            type: 'message',
            data: { text: '🌙 夜深了，愿你的每个愿望都能实现~', title: '午夜祝福' },
        },
        discovered: false,
    },
    {
        id: 'easter_bunny',
        name: '复活节惊喜',
        hint: '复活节期间来看看吧~',
        trigger: 'easter_date',
        content: {
            type: 'animation',
            data: { animation: 'bunny_hop', emoji: '🐰' },
        },
        discovered: false,
    },
    {
        id: 'magic_word',
        name: '魔法咒语',
        hint: '在搜索框输入 "阿拉丁"...',
        trigger: 'sequence_input',
        content: {
            type: 'visual_effect',
            data: { effect: 'genie_appear', emoji: '🧞' },
        },
        discovered: false,
    },
];

// ============================================================
// Konami Code 定义
// ============================================================
const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA',
];

// ============================================================
// 管理器 Hook
// ============================================================
import { useState, useCallback, useRef, useEffect } from 'react';

interface EasterEggManagerState {
    /** 当前活跃的彩蛋 */
    activeEgg: EasterEgg | null;
    /** 所有彩蛋状态 */
    eggs: EasterEgg[];
    /** 发现历史 */
    discoveredIds: Set<string>;
}

export function useEasterEggManager() {
    const [state, setState] = useState<EasterEggManagerState>({
        activeEgg: null,
        eggs: EASTER_EGGS.map(e => ({
            ...e,
            discovered: isDiscovered(e.id),
        })),
        discoveredIds: new Set(getDiscoveredIds()),
    });

    // Konami Code 输入缓冲区
    const konamiBuffer = useRef<string[]>([]);
    // 清除定时器
    const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ----------------------------------------------------------
    // 检查本地存储中的发现记录
    // ----------------------------------------------------------
    function isDiscovered(eggId: string): boolean {
        try {
            const ids = JSON.parse(localStorage.getItem('easter-eggs-discovered') || '[]');
            return ids.includes(eggId);
        } catch {
            return false;
        }
    }

    function getDiscoveredIds(): string[] {
        try {
            return JSON.parse(localStorage.getItem('easter-eggs-discovered') || '[]');
        } catch {
            return [];
        }
    }

    function markDiscovered(eggId: string) {
        if (isDiscovered(eggId)) return;

        const ids = [...getDiscoveredIds(), eggId];
        try {
            localStorage.setItem('easter-eggs-discovered', JSON.stringify(ids));
        } catch {
            // ignore
        }
    }

    // ----------------------------------------------------------
    // 键盘事件处理
    // ----------------------------------------------------------
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Konami Code 检测
        konamiBuffer.current.push(event.code);

        // 重置定时器（2秒内需要完成输入）
        if (clearTimer.current) clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(() => {
            konamiBuffer.current = [];
        }, 2000);

        // 检查是否匹配
        if (konamiBuffer.current.length >= KONAMI_CODE.length) {
            const recent = konamiBuffer.current.slice(-KONAMI_CODE.length);
            const matches = KONAMI_CODE.every((code, i) => code === recent[i]);
            if (matches) {
                triggerEgg('konami_stars');
                konamiBuffer.current = [];
            }
        }
    }, []);

    // ----------------------------------------------------------
    // 时间检测
    // ----------------------------------------------------------
    const checkTimeEggs = useCallback(() => {
        const hour = new Date().getHours();

        // 午夜彩蛋 (23:00 - 01:00)
        if (hour >= 23 || hour < 1) {
            const midnightEgg = state.eggs.find(e => e.id === 'midnight_wish');
            if (midnightEgg && !midnightEgg.discovered) {
                // 不自动触发，只是标记为可触发
            }
        }
    }, [state.eggs]);

    // ----------------------------------------------------------
    // 触发彩蛋
    // ----------------------------------------------------------
    const triggerEgg = useCallback((eggId: string) => {
        const egg = state.eggs.find(e => e.id === eggId);
        if (!egg || egg.discovered) return;

        // 标记为发现
        markDiscovered(eggId);

        setState(prev => ({
            ...prev,
            activeEgg: { ...egg, discovered: true },
            eggs: prev.eggs.map(e =>
                e.id === eggId ? { ...e, discovered: true } : e
            ),
            discoveredIds: new Set([...prev.discoveredIds, eggId]),
        }));

        // 自动关闭
        setTimeout(() => {
            setState(prev => ({ ...prev, activeEgg: null }));
        }, 4000);
    }, [state.eggs]);

    // ----------------------------------------------------------
    // 手动触发（用于测试或特定条件）
    // ----------------------------------------------------------
    const tryTriggerByType = useCallback((triggerType: EasterEgg['trigger']) => {
        const egg = state.eggs.find(
            e => e.trigger === triggerType && !e.discovered
        );
        if (egg) {
            triggerEgg(egg.id);
            return true;
        }
        return false;
    }, [state.eggs, triggerEgg]);

    // ----------------------------------------------------------
    // 绑定键盘监听
    // ----------------------------------------------------------
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);

        // 时间检测定时器
        const timeCheckInterval = setInterval(checkTimeEggs, 60000); // 每分钟检查一次

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearInterval(timeCheckInterval);
            if (clearTimer.current) clearTimeout(clearTimer.current);
        };
    }, [handleKeyDown, checkTimeEggs]);

    return {
        /** 当前活跃彩蛋 */
        activeEgg: state.activeEgg,
        /** 所有彩蛋列表（含发现状态） */
        eggs: state.eggs,
        /** 手动触发彩蛋 */
        triggerEgg,
        /** 按类型尝试触发 */
        tryTriggerByType,
        /** 发现计数 */
        discoveredCount: state.discoveredIds.size,
        /** 总彩蛋数 */
        totalCount: EASTER_EGGS.length,
    };
}
