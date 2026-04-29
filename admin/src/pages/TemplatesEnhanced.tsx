import React, { useState, useEffect } from 'react';
import { 
  Search, Trash2, Flame, Gift, CheckSquare, 
  RefreshCw, Plus, Edit2, Eye, Star, 
  ChevronRight, Filter, Grid, List, Image as ImageIcon
} from 'lucide-react';
import supabase from '../lib/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

interface Template {
  id: string;
  type: 'task' | 'habit' | 'reward';
  title: string;
  description: string | null;
  detailed_description: string | null;
  category: string;
  subcategory: string | null;
  stars: number;
  icon: string | null;
  image_url: string | null;
  usage_suggestions: string | null;
  age_range: string | null;
  difficulty: string | null;
  tags: string[] | null;
  is_featured: boolean;
  source: 'system' | 'community';
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

const typeConfig = {
  task: { label: '任务模板', icon: CheckSquare, color: 'blue' },
  habit: { label: '习惯模板', icon: RefreshCw, color: 'green' },
  reward: { label: '心愿模板', icon: Gift, color: 'purple' },
};

const difficultyConfig = {
  easy: { label: '简单', color: 'text-green-600 bg-green-50' },
  medium: { label: '中等', color: 'text-yellow-600 bg-yellow-50' },
  hard: { label: '困难', color: 'text-red-600 bg-red-50' },
};

export default function TemplatesEnhanced() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'task' | 'habit' | 'reward'>('task');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    loadTemplates();
  }, [typeFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('type', typeFilter)
        .order('is_featured', { ascending: false })
        .order('usage_count', { ascending: false })
        .limit(200);
      
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
    } catch {}
  };

  const deleteTemplate = async (id: string) => {
    if (!await showConfirm({ message: '确定删除此模板？' })) return;
    try {
      await supabase.from('templates').delete().eq('id', id);
      loadTemplates();
    } catch {}
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      await supabase.from('templates').update({ is_featured: !currentFeatured }).eq('id', id);
      loadTemplates();
    } catch {}
  };

  const filtered = templates.filter(t =>
    !searchQuery || 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const getColorClasses = (color: 'blue' | 'green' | 'purple') => {
    const map = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
    };
    return map[color] || map.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板库管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理任务、习惯、心愿三套模板库，支持深入分类和内容编辑
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={syncCommunity}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Flame size={16} />
            {syncing ? '同步中...' : '同步社区热门'}
          </button>
          <button
            onClick={() => showToast('添加模板功能开发中...', 'info')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            添加模板
          </button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
        {Object.entries(typeConfig).map(([key, config]) => {
          const Icon = config.icon;
          const count = templates.filter(t => t.type === key).length;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key as 'task' | 'habit' | 'reward')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                typeFilter === key 
                  ? `bg-${config.color}-50 text-${config.color}-600 shadow-sm` 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              <span>{config.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                typeFilter === key 
                  ? `bg-${config.color}-100` 
                  : 'bg-gray-100'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and View Mode */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板标题、描述、标签..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-500">
          共 <b className="text-gray-900">{filtered.length}</b> 个模板
        </span>
        <span className="text-gray-500">
          精选 <b className="text-yellow-600">{filtered.filter(t => t.is_featured).length}</b>
        </span>
        <span className="text-gray-500">
          已启用 <b className="text-green-600">{filtered.filter(t => t.is_active).length}</b>
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="mb-4">
            {typeFilter === 'task' ? (
              <CheckSquare size={48} className="mx-auto text-gray-300" />
            ) : typeFilter === 'habit' ? (
              <RefreshCw size={48} className="mx-auto text-gray-300" />
            ) : (
              <Gift size={48} className="mx-auto text-gray-300" />
            )}
          </div>
          暂无模板数据
          <br />
          <span className="text-sm">请先执行数据库迁移脚本，然后导入种子数据</span>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
              onClick={() => {
                setSelectedTemplate(t);
                setShowDetail(true);
              }}
            >
              {/* Image Header */}
              <div className="relative h-40 bg-gray-100 overflow-hidden">
                {t.image_url ? (
                  <img 
                    src={t.image_url} 
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-6xl">{t.icon || '📝'}</span>
                  </div>
                )}
                
                {/* Featured Badge */}
                {t.is_featured && (
                  <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    精选
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    t.is_active 
                      ? 'bg-green-400/90 text-green-900' 
                      : 'bg-red-400/90 text-white'
                  }`}>
                    {t.is_active ? '启用' : '停用'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 flex-1">{t.title}</h3>
                  <span className="text-sm font-bold text-yellow-600 ml-2 flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    {t.stars}
                  </span>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {t.description}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {t.category}
                  </span>
                  {t.subcategory && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                      {t.subcategory}
                    </span>
                  )}
                  {t.difficulty && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      difficultyConfig[t.difficulty as keyof typeof difficultyConfig]?.color || ''
                    }`}>
                      {difficultyConfig[t.difficulty as keyof typeof difficultyConfig]?.label || t.difficulty}
                    </span>
                  )}
                  {t.age_range && (
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                      {t.age_range}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                        {tag}
                      </span>
                    ))}
                    {t.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{t.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">
                    使用 {t.usage_count} 次
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFeatured(t.id, t.is_featured);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        t.is_featured 
                          ? 'text-yellow-500 bg-yellow-50' 
                          : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                      }`}
                      title={t.is_featured ? '取消精选' : '设为精选'}
                    >
                      <Star size={14} fill={t.is_featured ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(t.id, t.is_active);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        t.is_active 
                          ? 'text-green-500 bg-green-50' 
                          : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                      }`}
                      title={t.is_active ? '停用' : '启用'}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(t.id);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">图标</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">标题</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">分类</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">难度</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">星星</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">使用次数</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">状态</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr 
                  key={t.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedTemplate(t);
                    setShowDetail(true);
                  }}
                >
                  <td className="px-4 py-3">
                    {t.image_url ? (
                      <img src={t.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <span className="text-2xl">{t.icon || '📝'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.title}</div>
                    {t.is_featured && (
                      <div className="text-xs text-yellow-600 flex items-center gap-1 mt-0.5">
                        <Star size={10} fill="currentColor" /> 精选
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">{t.category}</div>
                    {t.subcategory && (
                      <div className="text-xs text-gray-400">{t.subcategory}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                  {t.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        difficultyConfig[t.difficulty as keyof typeof difficultyConfig]?.color || ''
                      }`}>
                        {difficultyConfig[t.difficulty as keyof typeof difficultyConfig]?.label || t.difficulty}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-yellow-600">{t.stars}</td>
                  <td className="px-4 py-3 text-gray-600">{t.usage_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(t.id, t.is_active);
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.is_active ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeatured(t.id, t.is_featured);
                        }}
                        className="p-1 text-gray-400 hover:text-yellow-500"
                      >
                        <Star size={14} fill={t.is_featured ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(t.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header Image */}
            <div className="relative h-64 bg-gray-100">
              {selectedTemplate.image_url ? (
                <img 
                  src={selectedTemplate.image_url} 
                  alt={selectedTemplate.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                  <span className="text-9xl">{selectedTemplate.icon || '📝'}</span>
                </div>
              )}
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-500">{selectedTemplate.category}</span>
                    {selectedTemplate.subcategory && (
                      <>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-500">{selectedTemplate.subcategory}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-xl">
                  <Star size={20} className="text-yellow-500 fill-current" />
                  <span className="text-xl font-bold text-yellow-600">{selectedTemplate.stars}</span>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedTemplate.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    difficultyConfig[selectedTemplate.difficulty as keyof typeof difficultyConfig]?.color || ''
                  }`}>
                    难度：{difficultyConfig[selectedTemplate.difficulty as keyof typeof difficultyConfig]?.label || selectedTemplate.difficulty}
                  </span>
                )}
                {selectedTemplate.age_range && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                    适用年龄：{selectedTemplate.age_range}
                  </span>
                )}
                {selectedTemplate.is_featured && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-600 flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    精选模板
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2">简介</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedTemplate.description}</p>
              </div>

              {/* Detailed Description */}
              {selectedTemplate.detailed_description && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">详细介绍</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {selectedTemplate.detailed_description}
                  </p>
                </div>
              )}

              {/* Usage Suggestions */}
              {selectedTemplate.usage_suggestions && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">使用建议</h3>
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-800 leading-relaxed">
                      {selectedTemplate.usage_suggestions}
                    </p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{selectedTemplate.usage_count}</div>
                    <div className="text-xs text-gray-500">使用次数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedTemplate.source === 'system' ? '系统' : '社区'}
                    </div>
                    <div className="text-xs text-gray-500">来源</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedTemplate.is_active ? '✅' : '❌'}
                    </div>
                    <div className="text-xs text-gray-500">状态</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
