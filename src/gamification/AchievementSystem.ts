/**
 * 成就系统定义 - 愉悦体验系统 Phase 2
 */

// ============================================================
// 成就类型
// ============================================================
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string; // emoji 或 icon 名称
    category: AchievementCategory;
    condition: AchievementCondition;
    reward?: number; // 奖励星星数
    secret?: boolean; // 是否隐藏成就
}

export type AchievementCategory =
    | 'task'       // 任务相关
    | 'streak'     // 打卡连续性
    | 'star'       // 星星积累
    | 'social'     // 社交互动
    | 'special';   // 特殊/彩蛋

export type AchievementCondition = {
    /** 检查类型 */
    type: 'task_count' | 'streak_days' | 'star_total' | 'redeem_count' | 'custom';
    /** 阈值 */
    threshold: number;
    /** 自定义检查函数名 (type=custom 时使用) */
    checkFn?: string;
};

// ============================================================
// 成就列表定义
// ============================================================
export const ACHIEVEMENTS: Achievement[] = [
    // ===== 任务类 =====
    {
        id: 'first_task',
        name: '初试身手',
        description: '完成第一个任务',
        icon: '🌟',
        category: 'task',
        condition: { type: 'task_count', threshold: 1 },
        reward: 5,
    },
    {
        id: 'task_10',
        name: '小有成就',
        description: '累计完成10个任务',
        icon: '📋',
        category: 'task',
        condition: { type: 'task_count', threshold: 10 },
        reward: 15,
    },
    {
        id: 'task_50',
        name: '任务达人',
        description: '累计完成50个任务',
        icon: '🏆',
        category: 'task',
        condition: { type: 'task_count', threshold: 50 },
        reward: 50,
    },
    {
        id: 'task_100',
        name: '百战百胜',
        description: '累计完成100个任务',
        icon: '💯',
        category: 'task',
        condition: { type: 'task_count', threshold: 100 },
        reward: 100,
    },

    // ===== 打卡类 =====
    {
        id: 'streak_3',
        name: '三日坚持',
        description: '连续打卡3天',
        icon: '🔥',
        category: 'streak',
        condition: { type: 'streak_days', threshold: 3 },
        reward: 10,
    },
    {
        id: 'streak_7',
        name: '一周达人',
        description: '连续打卡7天',
        icon: '⚡',
        category: 'streak',
        condition: { type: 'streak_days', threshold: 7 },
        reward: 25,
    },
    {
        id: 'streak_30',
        name: '月度之星',
        description: '连续打卡30天',
        icon: '👑',
        category: 'streak',
        condition: { type: 'streak_days', threshold: 30 },
        reward: 100,
    },
    {
        id: 'streak_100',
        name: '百日传奇',
        description: '连续打卡100天！你是传说！',
        icon: '🐲',
        category: 'streak',
        condition: { type: 'streak_days', threshold: 100 },
        reward: 500,
        secret: true,
    },

    // ===== 星星类 =====
    {
        id: 'star_100',
        name: '小富翁',
        description: '累计获得100颗星星',
        icon: '💰',
        category: 'star',
        condition: { type: 'star_total', threshold: 100 },
        reward: 20,
    },
    {
        id: 'star_500',
        name: '大富翁',
        description: '累计获得500颗星星',
        icon: '💎',
        category: 'star',
        condition: { type: 'star_total', threshold: 500 },
        reward: 50,
    },
    {
        id: 'star_1000',
        name: '星星之王',
        description: '累计获得1000颗星星',
        icon: '👑',
        category: 'star',
        condition: { type: 'star_total', threshold: 1000 },
        reward: 200,
        secret: true,
    },

    // ===== 兑换类 =====
    {
        id: 'redeem_first',
        name: '心愿成真',
        description: '第一次兑换奖励',
        icon: '🎁',
        category: 'social',
        condition: { type: 'redeem_count', threshold: 1 },
        reward: 10,
    },
    {
        id: 'redeem_10',
        name: '兑换达人',
        description: '累计兑换10次奖励',
        icon: '🛍️',
        category: 'social',
        condition: { type: 'redeem_count', threshold: 10 },
        reward: 30,
    },
];

// ============================================================
// 辅助函数
// ============================================================

/** 获取指定分类的成就 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return ACHIEVEMENTS.filter(a => a.category === category);
}

/** 根据 ID 获取成就 */
export function getAchievementById(id: string): Achievement | undefined {
    return ACHIEVEMENTS.find(a => a.id === id);
}

/** 获取非隐藏成就（用于展示） */
export function getVisibleAchievements(): Achievement[] {
    return ACHIEVEMENTS.filter(a => !a.secret);
}
