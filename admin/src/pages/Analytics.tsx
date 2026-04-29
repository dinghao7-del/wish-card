import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Star, Activity, Flame, Gift, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import supabase from '../lib/supabase';

interface Stats {
  total_families: number;
  total_members: number;
  total_tasks: number;
  total_rewards: number;
  total_transactions: number;
}

interface DailyActivity {
  date: string;
  tasks_created: number;
  tasks_completed: number;
  rewards_redeemed: number;
}

interface TopItem {
  title: string;
  count: number;
  type: 'task' | 'reward';
}

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

export default function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [topTasks, setTopTasks] = useState<TopItem[]>([]);
  const [topRewards, setTopRewards] = useState<TopItem[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 全局统计
      const [families, members, tasks, rewards, transactions] = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('rewards').select('*', { count: 'exact', head: true }),
        supabase.from('star_transactions').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        total_families: families.count || 0,
        total_members: members.count || 0,
        total_tasks: tasks.count || 0,
        total_rewards: rewards.count || 0,
        total_transactions: transactions.count || 0,
      });

      // 角色分布
      const { count: parentCount } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('role', 'parent').eq('is_active', true);
      const { count: childCount } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('role', 'child').eq('is_active', true);
      setRoleDistribution([
        { name: '家长', value: parentCount || 0 },
        { name: '孩子', value: childCount || 0 },
      ]);

      // 每日活跃度（最近7天）
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: events } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      const dailyMap = new Map<string, DailyActivity>();
      for (const e of events || []) {
        const date = e.created_at.split('T')[0];
        if (!dailyMap.has(date)) dailyMap.set(date, { date, tasks_created: 0, tasks_completed: 0, rewards_redeemed: 0 });
        const d = dailyMap.get(date)!;
        if (e.event_name === 'task_created') d.tasks_created++;
        if (e.event_name === 'task_completed' || e.event_name === 'task_approved') d.tasks_completed++;
        if (e.event_name === 'reward_redeemed') d.rewards_redeemed++;
      }
      setDailyActivity(Array.from(dailyMap.values()));

      // 热门任务（按标题聚合）
      const { data: allTasks } = await supabase.from('tasks').select('title');
      const taskCountMap = new Map<string, number>();
      for (const t of allTasks || []) {
        const key = t.title.trim();
        taskCountMap.set(key, (taskCountMap.get(key) || 0) + 1);
      }
      setTopTasks(
        Array.from(taskCountMap.entries())
          .map(([title, count]) => ({ title, count, type: 'task' as const }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // 热门心愿
      const { data: allRewards } = await supabase.from('rewards').select('name');
      const rewardCountMap = new Map<string, number>();
      for (const r of allRewards || []) {
        const key = r.name.trim();
        rewardCountMap.set(key, (rewardCountMap.get(key) || 0) + 1);
      }
      setTopRewards(
        Array.from(rewardCountMap.entries())
          .map(([title, count]) => ({ title, count, type: 'reward' as const }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );
    } catch (err) {
      console.error('Load analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">用户行为分析</h1>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '家庭总数', value: stats?.total_families || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: '成员总数', value: stats?.total_members || 0, icon: Users, color: 'bg-green-50 text-green-600' },
          { label: '任务总数', value: stats?.total_tasks || 0, icon: Activity, color: 'bg-orange-50 text-orange-600' },
          { label: '心愿总数', value: stats?.total_rewards || 0, icon: Star, color: 'bg-purple-50 text-purple-600' },
          { label: '交易总数', value: stats?.total_transactions || 0, icon: TrendingUp, color: 'bg-red-50 text-red-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon size={16} />
              </div>
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* 每日活跃度图表 */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-blue-500" /> 最近7天活跃度
        </h3>
        {dailyActivity.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyActivity}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tasks_created" fill="#4CAF50" name="创建任务" />
              <Bar dataKey="tasks_completed" fill="#2196F3" name="完成任务" />
              <Bar dataKey="rewards_redeemed" fill="#FF9800" name="兑换心愿" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-10">暂无数据</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 角色分布 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">成员角色分布</h3>
          {roleDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={roleDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">暂无数据</p>
          )}
        </div>

        {/* 热门任务 TOP 10 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Flame size={18} className="text-orange-500" /> 热门任务 TOP 10
          </h3>
          <div className="space-y-2">
            {topTasks.map((item, idx) => (
              <div key={item.title} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${idx < 3 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700 truncate">{item.title}</span>
                <span className="text-sm font-bold text-gray-900">{item.count}</span>
              </div>
            ))}
            {topTasks.length === 0 && <p className="text-gray-400 text-sm text-center py-6">暂无数据</p>}
          </div>
        </div>
      </div>

      {/* 热门心愿 TOP 10 */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gift size={18} className="text-purple-500" /> 热门心愿 TOP 10
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {topRewards.map((item, idx) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-3 text-center">
              <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold leading-6 ${idx < 3 ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {idx + 1}
              </span>
              <p className="text-sm font-medium text-gray-700 mt-1 truncate">{item.title}</p>
              <p className="text-xs text-gray-400">{item.count} 次</p>
            </div>
          ))}
          {topRewards.length === 0 && <p className="text-gray-400 text-sm text-center py-6 col-span-5">暂无数据</p>}
        </div>
      </div>
    </div>
  );
}
