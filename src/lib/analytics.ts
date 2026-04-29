/**
 * 用户行为分析模块
 * - 记录用户操作事件到 Supabase analytics_events 表
 * - 聚合分析：任务重叠度检测、热门模板推荐、活跃度统计
 * - 将高重叠度任务自动提升为推荐模板
 */

import supabase from './supabase';

// ==================== 类型定义 ====================

export interface AnalyticsEvent {
  id?: string;
  family_id: string;
  member_id?: string | null;
  event_name: string;
  event_data: Record<string, unknown>;
  created_at?: string;
}

export interface TaskOverlap {
  title: string;
  count: number;
  percentage: number; // 占总家庭数的百分比
  avg_stars: number;
  categories: string[];
}

export interface PopularTemplate {
  title: string;
  description: string;
  category: string;
  stars: number;
  usage_count: number;
  icon: string;
  source: 'system' | 'community';
}

export interface FamilyActivity {
  family_id: string;
  date: string;
  tasks_created: number;
  tasks_completed: number;
  rewards_redeemed: number;
  active_members: number;
  stars_earned: number;
  stars_spent: number;
}

// ==================== 事件记录 ====================

export async function trackEvent(
  familyId: string,
  memberId: string | null,
  eventName: string,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        family_id: familyId,
        member_id: memberId,
        event_name: eventName,
        event_data: eventData,
      });
    if (error) console.error('[Analytics] trackEvent error:', error.message);
  } catch (err) {
    console.error('[Analytics] trackEvent exception:', err);
  }
}

// 批量记录（用于初始化或数据迁移）
export async function trackEvents(events: AnalyticsEvent[]): Promise<void> {
  try {
    const { error } = await supabase.from('analytics_events').insert(events);
    if (error) console.error('[Analytics] trackEvents error:', error.message);
  } catch (err) {
    console.error('[Analytics] trackEvents exception:', err);
  }
}

// ==================== 任务重叠度分析 ====================

/**
 * 分析全平台任务标题重叠度
 * 返回被多个家庭使用的任务标题，按使用次数降序排列
 */
export async function analyzeTaskOverlap(minFamilyCount = 3): Promise<TaskOverlap[]> {
  try {
    // 查询所有活跃任务
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('title, family_id, star_amount, category')
      .eq('completed', false);

    if (error || !tasks) return [];

    // 按标题聚合：计算跨家庭使用次数
    const titleMap = new Map<string, {
      families: Set<string>;
      totalStars: number;
      starCount: number;
      categories: Set<string>;
    }>();

    for (const task of tasks) {
      const normalizedTitle = task.title.trim().toLowerCase();
      if (!normalizedTitle) continue;

      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, {
          families: new Set(),
          totalStars: 0,
          starCount: 0,
          categories: new Set(),
        });
      }
      const entry = titleMap.get(normalizedTitle)!;
      entry.families.add(task.family_id);
      entry.totalStars += task.star_amount || 0;
      entry.starCount += 1;
      if (task.category) entry.categories.add(task.category);
    }

    // 总家庭数（用于计算百分比）
    const { count: totalFamilies } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true });

    const familyCount = totalFamilies || 1;

    // 过滤并排序
    const overlaps: TaskOverlap[] = [];
    for (const [title, data] of titleMap.entries()) {
      if (data.families.size >= minFamilyCount) {
        overlaps.push({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          count: data.families.size,
          percentage: Math.round((data.families.size / familyCount) * 100),
          avg_stars: Math.round(data.totalStars / data.starCount),
          categories: Array.from(data.categories),
        });
      }
    }

    return overlaps.sort((a, b) => b.count - a.count);
  } catch (err) {
    console.error('[Analytics] analyzeTaskOverlap error:', err);
    return [];
  }
}

/**
 * 分析奖励标题重叠度
 */
export async function analyzeRewardOverlap(minFamilyCount = 3): Promise<TaskOverlap[]> {
  try {
    const { data: rewards, error } = await supabase
      .from('rewards')
      .select('name, family_id, star_cost, category')
      .eq('status', 'available');

    if (error || !rewards) return [];

    const nameMap = new Map<string, {
      families: Set<string>;
      totalCost: number;
      costCount: number;
      categories: Set<string>;
    }>();

    for (const r of rewards) {
      const normalizedName = r.name.trim().toLowerCase();
      if (!normalizedName) continue;

      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, {
          families: new Set(),
          totalCost: 0,
          costCount: 0,
          categories: new Set(),
        });
      }
      const entry = nameMap.get(normalizedName)!;
      entry.families.add(r.family_id);
      entry.totalCost += r.star_cost || 0;
      entry.costCount += 1;
      if (r.category) entry.categories.add(r.category);
    }

    const { count: totalFamilies } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true });

    const familyCount = totalFamilies || 1;

    const overlaps: TaskOverlap[] = [];
    for (const [name, data] of nameMap.entries()) {
      if (data.families.size >= minFamilyCount) {
        overlaps.push({
          title: name.charAt(0).toUpperCase() + name.slice(1),
          count: data.families.size,
          percentage: Math.round((data.families.size / familyCount) * 100),
          avg_stars: Math.round(data.totalCost / data.costCount),
          categories: Array.from(data.categories),
        });
      }
    }

    return overlaps.sort((a, b) => b.count - a.count);
  } catch (err) {
    console.error('[Analytics] analyzeRewardOverlap error:', err);
    return [];
  }
}

// ==================== 热门模板推荐 ====================

/**
 * 将重叠度高的任务自动提升为推荐模板
 * 存入 community_templates 表（需要数据库先创建该表）
 */
export async function generateCommunityTemplates(): Promise<PopularTemplate[]> {
  const [taskOverlaps, rewardOverlaps] = await Promise.all([
    analyzeTaskOverlap(2),
    analyzeRewardOverlap(2),
  ]);

  const taskTemplates: PopularTemplate[] = taskOverlaps.slice(0, 30).map(o => ({
    title: o.title,
    description: `${o.percentage}% 的家庭都在用的任务`,
    category: o.categories[0] || '热门',
    stars: o.avg_stars,
    usage_count: o.count,
    icon: '🔥',
    source: 'community' as const,
  }));

  const rewardTemplates: PopularTemplate[] = rewardOverlaps.slice(0, 20).map(o => ({
    title: o.title,
    description: `${o.percentage}% 的家庭热门心愿`,
    category: o.categories[0] || '热门',
    stars: o.avg_stars,
    usage_count: o.count,
    icon: '🎁',
    source: 'community' as const,
  }));

  return [...taskTemplates, ...rewardTemplates];
}

// ==================== 家庭活跃度统计 ====================

export async function getFamilyActivityStats(familyId: string, days = 7): Promise<FamilyActivity[]> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('family_id', familyId)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (error || !events) return [];

    // 按日期聚合
    const dailyMap = new Map<string, FamilyActivity>();

    for (const event of events) {
      const date = event.created_at.split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          family_id: familyId,
          date,
          tasks_created: 0,
          tasks_completed: 0,
          rewards_redeemed: 0,
          active_members: 0,
          stars_earned: 0,
          stars_spent: 0,
        });
      }
      const d = dailyMap.get(date)!;
      const memberSet = new Set<string>();
      if (event.member_id) memberSet.add(event.member_id);
      d.active_members = Math.max(d.active_members, memberSet.size);

      switch (event.event_name) {
        case 'task_created': d.tasks_created++; break;
        case 'task_completed': d.tasks_completed++; d.stars_earned += (event.event_data as any)?.stars || 0; break;
        case 'task_approved': d.tasks_completed++; d.stars_earned += (event.event_data as any)?.stars || 0; break;
        case 'reward_redeemed': d.rewards_redeemed++; d.stars_spent += (event.event_data as any)?.starCost || 0; break;
      }
    }

    return Array.from(dailyMap.values());
  } catch (err) {
    console.error('[Analytics] getFamilyActivityStats error:', err);
    return [];
  }
}

// ==================== 全局统计概览（管理员） ====================

export interface GlobalStats {
  total_families: number;
  total_members: number;
  total_tasks: number;
  total_rewards: number;
  total_transactions: number;
  active_today: number;
  growth_rate: number;
}

export async function getGlobalStats(): Promise<GlobalStats | null> {
  try {
    const [families, members, tasks, rewards, transactions] = await Promise.all([
      supabase.from('families').select('*', { count: 'exact', head: true }),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('rewards').select('*', { count: 'exact', head: true }),
      supabase.from('star_transactions').select('*', { count: 'exact', head: true }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const { count: activeToday } = await supabase
      .from('analytics_events')
      .select('family_id', { count: 'exact', head: true })
      .gte('created_at', today);

    return {
      total_families: families.count || 0,
      total_members: members.count || 0,
      total_tasks: tasks.count || 0,
      total_rewards: rewards.count || 0,
      total_transactions: transactions.count || 0,
      active_today: activeToday || 0,
      growth_rate: 0, // 需要 7 天对比计算
    };
  } catch (err) {
    console.error('[Analytics] getGlobalStats error:', err);
    return null;
  }
}
