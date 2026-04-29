import React, { useState, useEffect } from 'react';
import { Database, Search, Trash2, Flame, Gift, CheckSquare, RefreshCw } from 'lucide-react';
import supabase from '../lib/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

interface Template {
  id: string;
  type: 'task' | 'habit' | 'reward';
  title: string;
  description: string | null;
  category: string;
  stars: number;
  icon: string | null;
  source: 'system' | 'community';
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'task' | 'habit' | 'reward'>('task');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'system' | 'community'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    loadTemplates();
  }, [typeFilter, sourceFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase.from('templates').select('*').eq('type', typeFilter).order('usage_count', { ascending: false });
      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Load templates error:', err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const syncCommunity = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync-community-templates', { method: 'POST' });
      const data = await res.json();
      showToast(`同步完成：${data.synced || 0} 个社区模板已更新`, 'success');
      loadTemplates();
    } catch {
      showToast('同步失败，请检查服务端配置', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await supabase.from('templates').update({ is_active: !currentActive }).eq('id', id);
      loadTemplates();
      showToast('状态已更新', 'success');
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!await showConfirm({ message: '确定删除此模板？' })) return;
    try {
      await supabase.from('templates').delete().eq('id', id);
      loadTemplates();
      showToast('模板已删除', 'success');
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const filtered = templates.filter(t =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">模板库管理</h1>
        </div>
        <button
          onClick={syncCommunity}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          <Flame size={16} />
          {syncing ? '同步中...' : '同步社区热门'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['task', 'habit', 'reward'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {t === 'task' ? '任务' : t === 'habit' ? '习惯' : '心愿'}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['all', 'system', 'community'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${sourceFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {s === 'all' ? '全部' : s === 'system' ? '系统' : '社区'}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-500">共 <b className="text-gray-900">{filtered.length}</b> 个模板</span>
        <span className="text-gray-500">系统 <b className="text-blue-600">{filtered.filter(t => t.source === 'system').length}</b></span>
        <span className="text-gray-500">社区 <b className="text-orange-600">{filtered.filter(t => t.source === 'community').length}</b></span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无模板数据（请先执行数据库迁移脚本创建 templates 表）</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">图标</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">标题</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">分类</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">星星</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">来源</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">使用次数</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">状态</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="text-lg">{t.icon || '📝'}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{t.category}</span></td>
                  <td className="px-4 py-3 font-bold text-yellow-600">{t.stars}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.source === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {t.source === 'system' ? '系统' : '社区'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.usage_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {t.is_active ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteTemplate(t.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
