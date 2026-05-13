/**
 * 情感化文案库 - 愉悦体验系统核心
 * 所有用户可见文案统一管理，支持情感化变体
 */

// ============================================================
// 场景类型定义
// ============================================================
export type MessageScenario =
    | 'task_complete'
    | 'task_approve'
    | 'task_publish'
    | 'star_earn'
    | 'star_spend'
    | 'reward_redeem'
    | 'streak_start'
    | 'streak_continue'
    | 'streak_break'
    | 'level_up'
    | 'achievement_unlock'
    | 'welcome_back'
    | 'empty_state'
    | 'error'
    | 'success';

export interface MessageVariant {
    text: string;
    emoji?: string;
    energy?: number; // -1 到 1，影响动画强度
}

// ============================================================
// 主文案库
// ============================================================
const messageLibrary: Record<MessageScenario, MessageVariant[]> = {
    task_complete: [
        { text: '太棒了！任务完成！', emoji: '🎉', energy: 0.8 },
        { text: '又完成一项，你真厉害！', emoji: '⭐', energy: 0.7 },
        { text: '坚持就是胜利，继续加油！', emoji: '💪', energy: 0.6 },
        { text: '完美收官！', emoji: '✨', energy: 0.9 },
        { text: '今天的你闪闪发光！', emoji: '🌟', energy: 0.85 },
    ],
    task_approve: [
        { text: '家长已确认，星星入账啦！', emoji: '💰', energy: 0.7 },
        { text: '获得认可的感觉真好~', emoji: '😊', energy: 0.5 },
        { text: '努力被看见了！', emoji: '👀', energy: 0.6 },
    ],
    task_publish: [
        { text: '新任务已发布！', emoji: '📋', energy: 0.4 },
        { text: '任务已上线，等待完成~', emoji: '🚀', energy: 0.5 },
    ],
    star_earn: [
        { text: '+{count} 颗星星！', emoji: '⭐', energy: 0.8 },
        { text: '星星 +{count}！攒起来换礼物~', emoji: '🌟', energy: 0.7 },
        { text: '小金库又增加了！', emoji: '💎', energy: 0.6 },
    ],
    star_spend: [
        { text: '花费 {count} 颗星星', emoji: '💫', energy: -0.2 },
        { text: '兑换成功，值得！', emoji: '🎁', energy: 0.3 },
    ],
    reward_redeem: [
        { text: '心愿达成！恭喜你！', emoji: '🎊', energy: 0.95 },
        { text: '愿望实现的那一刻最美好！', emoji: '💖', energy: 0.9 },
        { text: '兑换成功！期待你的礼物~', emoji: '📦', energy: 0.7 },
    ],
    streak_start: [
        { text: '连续打卡第一天！好的开始！', emoji: '🔥', energy: 0.7 },
        { text: '打卡之旅开始啦！', emoji: '🚩', energy: 0.65 },
    ],
    streak_continue: [
        { text: '连续 {n} 天！太强了！', emoji: '🔥', energy: 0.85 },
        { text: '{n}天不间断，你是认真的！', emoji: '💪', energy: 0.8 },
        { text: '打卡狂魔就是你！', emoji: '😎', energy: 0.75 },
    ],
    streak_break: [
        { text: '别灰心，明天重新开始！', emoji: '💪', energy: 0.3 },
        { text: '休息一下也没关系~', emoji: '🌙', energy: 0.2 },
    ],
    level_up: [
        { text: '升级啦！现在是 Lv.{level}！', emoji: '🆙', energy: 0.95 },
        { text: '等级提升，越来越强！', emoji: '⬆️', energy: 0.9 },
        { text: '成长可见，继续加油！', emoji: '📈', energy: 0.85 },
    ],
    achievement_unlock: [
        { text: '解锁成就：{name}！', emoji: '🏆', energy: 1.0 },
        { text: '新成就 get！', emoji: '🎖️', energy: 0.95 },
        { text: '又一个里程碑！', emoji: '🎯', energy: 0.9 },
    ],
    welcome_back: [
        { text: '欢迎回来，今天也要加油哦！', emoji: '👋', energy: 0.5 },
        { text: '好久不见，想你啦~', emoji: '🤗', energy: 0.55 },
        { text: '新的一天，新的可能！', emoji: '🌈', energy: 0.6 },
    ],
    empty_state: [
        { text: '这里空空的，去添加点东西吧~', emoji: '🌱', energy: 0.2 },
        { text: '还没有内容哦，快来创建第一个！', emoji: '✨', energy: 0.25 },
        { text: '空白画布等你来填满！', emoji: '🎨', energy: 0.3 },
    ],
    error: [
        { text: '哎呀，出错了...', emoji: '😅', energy: -0.4 },
        { text: '好像出了点小问题', emoji: '🤔', energy: -0.3 },
        { text: '稍后再试一下吧~', emoji: '🔄', energy: -0.2 },
    ],
    success: [
        { text: '操作成功！', emoji: '✅', energy: 0.5 },
        { text: '搞定啦！', emoji: '🎯', energy: 0.55 },
        { text: '一切顺利！', emoji: '✨', energy: 0.45 },
    ],
};

// ============================================================
// 导出函数
// ============================================================

/**
 * 获取场景下的随机文案
 */
export function getMessage(scenario: MessageScenario, params?: Record<string, string | number>): MessageVariant {
    const variants = messageLibrary[scenario];
    if (!variants || variants.length === 0) {
        return { text: scenario, energy: 0 };
    }

    // 随机选择一个变体
    const variant = variants[Math.floor(Math.random() * variants.length)];

    // 替换参数占位符
    let text = variant.text;
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            text = text.replace(`{${key}}`, String(value));
        });
    }

    return { ...variant, text };
}

/**
 * 获取场景下的所有文案（用于测试或特殊展示）
 */
export function getAllMessages(scenario: MessageScenario): MessageVariant[] {
    return messageLibrary[scenario] || [];
}

/**
 * 检查场景是否存在
 */
export function hasScenario(scenario: string): scenario is MessageScenario {
    return scenario in messageLibrary;
}
