/**
 * Vercel Cron Job: 每日同步社区热门模板
 * 部署路径: /api/sync-community-templates
 * Cron 配置见 vercel.json
 * 
 * 使用 @supabase/supabase-js npm 包（Vercel Edge Runtime 兼容）
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: Request) {
  // 验证 Cron Secret（防止未授权调用）
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. 分析任务重叠度
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, family_id, star_amount')
      .eq('completed', false);

    const taskMap = new Map<string, { families: Set<string>; totalStars: number; count: number }>();
    for (const t of tasks || []) {
      const key = t.title.trim().toLowerCase();
      if (!key) continue;
      if (!taskMap.has(key)) taskMap.set(key, { families: new Set(), totalStars: 0, count: 0 });
      const e = taskMap.get(key)!;
      e.families.add(t.family_id);
      e.totalStars += t.star_amount || 0;
      e.count++;
    }

    let synced = 0;
    for (const [title, data] of taskMap.entries()) {
      if (data.families.size < 2) continue;
      const { error } = await supabase
        .from('templates')
        .upsert({
          type: 'task',
          title: title.charAt(0).toUpperCase() + title.slice(1),
          description: `${data.families.size} 个家庭在使用`,
          category: '热门',
          stars: Math.round(data.totalStars / data.count),
          icon: '🔥',
          source: 'community',
          usage_count: data.families.size,
          is_active: true,
        }, { onConflict: 'type,title,source' });
      if (!error) synced++;
    }

    // 2. 分析奖励重叠度
    const { data: rewards } = await supabase
      .from('rewards')
      .select('name, family_id, star_cost, category')
      .eq('status', 'available');

    const rewardMap = new Map<string, { families: Set<string>; totalCost: number; count: number; categories: Set<string> }>();
    for (const r of rewards || []) {
      const key = r.name.trim().toLowerCase();
      if (!key) continue;
      if (!rewardMap.has(key)) rewardMap.set(key, { families: new Set(), totalCost: 0, count: 0, categories: new Set() });
      const e = rewardMap.get(key)!;
      e.families.add(r.family_id);
      e.totalCost += r.star_cost || 0;
      e.count++;
      if (r.category) e.categories.add(r.category);
    }

    for (const [name, data] of rewardMap.entries()) {
      if (data.families.size < 2) continue;
      const categoryIter = data.categories.values();
      const firstCategory = categoryIter.next().value;
      const { error } = await supabase
        .from('templates')
        .upsert({
          type: 'reward',
          title: name.charAt(0).toUpperCase() + name.slice(1),
          description: `${data.families.size} 个家庭热门心愿`,
          category: firstCategory || '热门',
          stars: Math.round(data.totalCost / data.count),
          icon: '🎁',
          source: 'community',
          usage_count: data.families.size,
          is_active: true,
        }, { onConflict: 'type,title,source' });
      if (!error) synced++;
    }

    return new Response(JSON.stringify({ success: true, synced }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'edge',
};
