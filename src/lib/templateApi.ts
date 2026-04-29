/**
 * 模板库 API
 * 支持系统模板 + 社区模板（用户行为分析生成）
 * 三大模板库：任务模板、习惯模板、心愿模板
 */

import supabase from './supabase';
import {
  ALL_TASK_TEMPLATES, ALL_REWARD_TEMPLATES,
  TASK_CATEGORIES, REWARD_CATEGORIES,
  type HabitTemplate, type RewardTemplate,
} from './templates';
import { analyzeTaskOverlap, analyzeRewardOverlap, type TaskOverlap } from './analytics';

// ==================== 数据库模板类型 ====================

export interface DbTemplate {
  id?: string;
  type: 'task' | 'habit' | 'reward';
  title: string;
  description?: string | null;
  category: string;
  stars: number;
  icon?: string | null;
  source: 'system' | 'community';
  usage_count: number;
  is_active: boolean;
  i18n_key?: string | null;
  extra_data?: Record<string, unknown> | null;
  created_at?: string;
}

// ==================== 初始化系统模板到数据库 ====================

export async function seedSystemTemplates(): Promise<{ seeded: number }> {
  let count = 0;

  // 任务/习惯模板
  for (const t of ALL_TASK_TEMPLATES) {
    const { error } = await supabase
      .from('templates')
      .upsert({
        type: 'task',
        title: t.title,
        description: t.description || null,
        category: t.category,
        stars: t.stars,
        icon: t.icon,
        source: 'system',
        usage_count: 0,
        is_active: true,
        i18n_key: `template.task.${t.id}`,
      }, { onConflict: 'type,title,source' });
    if (!error) count++;
  }

  // 心愿模板
  for (const r of ALL_REWARD_TEMPLATES) {
    const { error } = await supabase
      .from('templates')
      .upsert({
        type: 'reward',
        title: r.name,
        description: r.description,
        category: r.category,
        stars: r.cost,
        icon: r.icon,
        source: 'system',
        usage_count: 0,
        is_active: true,
        i18n_key: `template.reward.${r.id}`,
      }, { onConflict: 'type,title,source' });
    if (!error) count++;
  }

  return { seeded: count };
}

// ==================== 获取模板列表 ====================

export async function getTemplates(params: {
  type: 'task' | 'habit' | 'reward';
  category?: string;
  source?: 'system' | 'community';
  limit?: number;
  offset?: number;
}): Promise<{ templates: DbTemplate[]; total: number }> {
  let query = supabase
    .from('templates')
    .select('*', { count: 'exact' })
    .eq('type', params.type)
    .eq('is_active', true);

  if (params.category) query = query.eq('category', params.category);
  if (params.source) query = query.eq('source', params.source);

  query = query.order('usage_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error('[TemplateApi] getTemplates error:', error.message);
    return { templates: [], total: 0 };
  }

  return { templates: data || [], total: count || 0 };
}

// ==================== 使用模板（计数+1） ====================

export async function useTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_usage', { p_template_id: templateId });
  if (error) {
    // 降级：直接更新
    const { data: tmpl } = await supabase.from('templates').select('usage_count', { defaultValue: 'usage count' }).eq('id', templateId).single();
    if (tmpl) {
      await supabase.from('templates').update({ usage_count: tmpl.usage_count + 1 }).eq('id', templateId);
    }
  }
}

// ==================== 社区热门模板同步 ====================

/**
 * 从行为分析结果中提取热门模板，写入 community 类型模板
 * 可由定时任务（Supabase Cron / Vercel Cron）定期执行
 */
export async function syncCommunityTemplates(): Promise<{ synced: number }> {
  const [taskOverlaps, rewardOverlaps] = await Promise.all([
    analyzeTaskOverlap(2),
    analyzeRewardOverlap(2),
  ]);

  let synced = 0;

  // 同步热门任务模板
  for (const overlap of taskOverlaps.slice(0, 50)) {
    const { error } = await supabase
      .from('templates')
      .upsert({
        type: 'task',
        title: overlap.title,
        description: `${overlap.percentage}% 家庭都在用`,
        category: overlap.categories[0] || '热门',
        stars: overlap.avg_stars,
        icon: '🔥',
        source: 'community',
        usage_count: overlap.count,
        is_active: true,
      }, { onConflict: 'type,title,source' });
    if (!error) synced++;
  }

  // 同步热门心愿模板
  for (const overlap of rewardOverlaps.slice(0, 30)) {
    const { error } = await supabase
      .from('templates')
      .upsert({
        type: 'reward',
        title: overlap.title,
        description: `${overlap.percentage}% 家庭热门心愿`,
        category: overlap.categories[0] || '热门',
        stars: overlap.avg_stars,
        icon: '🎁',
        source: 'community',
        usage_count: overlap.count,
        is_active: true,
      }, { onConflict: 'type,title,source' });
    if (!error) synced++;
  }

  return { synced };
}

// ==================== 模板搜索 ====================

export async function searchTemplates(keyword: string, type?: 'task' | 'habit' | 'reward'): Promise<DbTemplate[]> {
  let query = supabase
    .from('templates')
    .select('*', { defaultValue: '*' })
    .eq('is_active', true)
    .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    .order('usage_count', { ascending: false })
    .limit(20);

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) {
    console.error('[TemplateApi] searchTemplates error:', error.message);
    return [];
  }
  return data || [];
}

// ==================== 管理员：CRUD 模板 ====================

export async function createTemplate(template: Omit<DbTemplate, 'id' | 'created_at' | 'usage_count'>): Promise<DbTemplate | null> {
  const { data, error } = await supabase
    .from('templates')
    .insert({ ...template, usage_count: 0 })
    .select()
    .single();
  if (error) {
    console.error('[TemplateApi] createTemplate error:', error.message);
    return null;
  }
  return data;
}

export async function updateTemplate(id: string, updates: Partial<DbTemplate>): Promise<DbTemplate | null> {
  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[TemplateApi] updateTemplate error:', error.message);
    return null;
  }
  return data;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) {
    console.error('[TemplateApi] deleteTemplate error:', error.message);
    return false;
  }
  return true;
}
