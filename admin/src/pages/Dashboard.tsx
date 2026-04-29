import { useEffect, useState } from 'react';
import { getDashboardStats, type DashboardStats } from '../lib/api';
import StatsCard from '../components/StatsCard';
import { Users, Home, CheckCircle, Star, KeyRound, TrendingUp, Activity, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
    );
  }

  if (!stats) return null;

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.totalCompletedTasks / stats.totalTasks) * 100)
    : 0;

  const inviteCodeUsageRate = stats.totalInviteCodes > 0
    ? Math.round((stats.usedInviteCodes / stats.totalInviteCodes) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">仪表盘</h2>
        <span className="text-sm text-gray-500">{format(new Date(), 'yyyy年MM月dd日')}</span>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总用户数"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: stats.todayNewUsers, label: '今日新增' }}
          color="blue"
        />
        <StatsCard
          title="家庭总数"
          value={stats.totalFamilies}
          icon={<Home className="w-6 h-6" />}
          trend={{ value: stats.todayNewFamilies, label: '今日新增' }}
          color="green"
        />
        <StatsCard
          title="任务完成率"
          value={`${completionRate}%`}
          icon={<CheckCircle className="w-6 h-6" />}
          trend={{ value: stats.totalCompletedTasks, label: '已完成' }}
          color="purple"
        />
        <StatsCard
          title="总任务数"
          value={stats.totalTasks}
          icon={<Activity className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* 经济 & 邀请码 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="星星发放"
          value={stats.totalStarsEarned.toLocaleString()}
          icon={<Star className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="星星消耗"
          value={stats.totalStarsSpent.toLocaleString()}
          icon={<Gift className="w-6 h-6" />}
          color="red"
        />
        <StatsCard
          title="邀请码总数"
          value={stats.totalInviteCodes}
          icon={<KeyRound className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="邀请码使用率"
          value={`${inviteCodeUsageRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: stats.usedInviteCodes, label: '已使用' }}
          color="green"
        />
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户注册趋势 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">近7天用户注册</h3>
          {stats.recentUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.recentUsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                />
                <Bar dataKey="count" name="新用户" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">暂无数据</div>
          )}
        </div>

        {/* 家庭创建趋势 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">近7天家庭创建</h3>
          {stats.recentFamilies.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.recentFamilies}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                />
                <Line type="monotone" dataKey="count" name="新家庭" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">暂无数据</div>
          )}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">快速操作</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/invite-codes"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <KeyRound className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-blue-900">创建邀请码</div>
              <div className="text-xs text-blue-600">批量生成注册邀请码</div>
            </div>
          </a>
          <a
            href="/users"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Users className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-green-900">用户管理</div>
              <div className="text-xs text-green-600">查看和管理用户</div>
            </div>
          </a>
          <a
            href="/families"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Home className="w-5 h-5 text-purple-600 mr-3" />
            <div>
              <div className="text-sm font-medium text-purple-900">家庭管理</div>
              <div className="text-xs text-purple-600">查看家庭数据</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
