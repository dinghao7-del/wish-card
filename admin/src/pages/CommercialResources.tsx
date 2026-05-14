import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Megaphone,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { supabaseAdmin, type Database } from '../lib/supabase';
import { useToast } from '../components/Toast';

type CommercialResourceRow = Database['public']['Tables']['commercial_resources']['Row'];
type CommercialResourceInsert = Database['public']['Tables']['commercial_resources']['Insert'];
type RecommendationCategory = CommercialResourceRow['category'];
type ActiveFilter = 'all' | 'active' | 'inactive';

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  education: '教育成长',
  travel: '亲子旅行',
  healthcare: '健康医疗',
};

const KIND_LABELS: Record<CommercialResourceRow['kind'], string> = {
  course: '课程',
  camp: '营地',
  learning_tool: '学习工具',
  parent_child_trip: '亲子游',
  medical_service: '医疗服务',
  care_service: '照护服务',
};

const SEED_RESOURCES: CommercialResourceInsert[] = [
  {
    id: 'seed-english-reading',
    category: 'education',
    kind: 'course',
    title: '小学英语阅读提升课',
    provider_name: '精选教育资源',
    scenario_tags: ['school_day', 'weekend', 'summer_break', 'winter_break'],
    family_stage_tags: ['小学低年级', '小学中年级', '小学高年级'],
    city_level_tags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    category_tags: ['study', 'reading', 'english'],
    holiday_play_scales: [],
    holiday_play_modes: [],
    caregiver_load_tags: [],
    budget_level_tags: [],
    effort_level_tags: [],
    priority_boost: 18,
    action_label: '查看课程方向',
    destination: '/plans/smart-recommend',
    selling_point: '适合把每日阅读、英语启蒙和假期学习计划连起来。',
    active: true,
  },
  {
    id: 'seed-summer-camp',
    category: 'travel',
    kind: 'camp',
    title: '寒暑假研学营地',
    provider_name: '精选营地资源',
    scenario_tags: ['summer_break', 'winter_break', 'holiday'],
    family_stage_tags: ['小学中年级', '小学高年级', '初中阶段'],
    city_level_tags: ['一线城市', '新一线城市', '二线城市'],
    category_tags: ['travel', 'interest', 'study'],
    holiday_play_scales: ['medium_play', 'big_play'],
    holiday_play_modes: ['science_fun', 'interest_development'],
    caregiver_load_tags: ['medium', 'high'],
    budget_level_tags: ['medium', 'high'],
    effort_level_tags: ['balanced', 'easy'],
    priority_boost: 22,
    action_label: '查看假期安排',
    destination: '/school-calendar',
    selling_point: '适合在放假前，把营地、出行和课外班顺延一起规划。',
    active: true,
  },
  {
    id: 'seed-piano-practice',
    category: 'education',
    kind: 'learning_tool',
    title: '乐器练习打卡工具',
    provider_name: '精选学习工具',
    scenario_tags: ['school_day', 'weekend', 'holiday'],
    family_stage_tags: ['学龄前', '小学低年级', '小学中年级', '小学高年级'],
    city_level_tags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    category_tags: ['interest', 'music', 'habit'],
    holiday_play_scales: [],
    holiday_play_modes: [],
    caregiver_load_tags: [],
    budget_level_tags: [],
    effort_level_tags: [],
    priority_boost: 14,
    action_label: '查看练习方案',
    destination: '/plans',
    selling_point: '适合把钢琴、小提琴等长期练习拆成每日任务和阶段复盘。',
    active: true,
  },
  {
    id: 'seed-parent-child-trip',
    category: 'travel',
    kind: 'parent_child_trip',
    title: '周末亲子游路线',
    provider_name: '精选亲子旅行',
    scenario_tags: ['weekend', 'holiday', 'travel'],
    family_stage_tags: ['学龄前', '小学低年级', '小学中年级', '小学高年级'],
    city_level_tags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    category_tags: ['reward', 'travel', 'family'],
    holiday_play_scales: ['small_play', 'medium_play'],
    holiday_play_modes: ['pure_fun', 'science_fun'],
    caregiver_load_tags: ['medium', 'high'],
    budget_level_tags: ['low', 'medium'],
    effort_level_tags: ['balanced', 'hands_on'],
    priority_boost: 15,
    action_label: '查看亲子安排',
    destination: '/school-calendar',
    selling_point: '适合孩子用积分兑换周末出游后，提醒父母兑现承诺。',
    active: true,
  },
  {
    id: 'seed-child-checkup',
    category: 'healthcare',
    kind: 'medical_service',
    title: '儿童体检与就医清单',
    provider_name: '精选健康服务',
    scenario_tags: ['medical', 'school_day', 'holiday'],
    family_stage_tags: ['学龄前', '小学低年级', '小学中年级', '小学高年级', '初中阶段'],
    city_level_tags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    category_tags: ['medical', 'health', 'care'],
    holiday_play_scales: [],
    holiday_play_modes: [],
    caregiver_load_tags: [],
    budget_level_tags: [],
    effort_level_tags: [],
    priority_boost: 10,
    action_label: '查看就医清单',
    destination: '/school-calendar',
    selling_point: '适合把挂号、请假、复诊和护理事项整理成家庭日程。',
    active: true,
  },
];

function validateResource(resource: CommercialResourceRow): string[] {
  const errors: string[] = [];
  if (!resource.title?.trim()) errors.push('缺少标题');
  if (!resource.provider_name?.trim()) errors.push('缺少供应方');
  if (!resource.selling_point?.trim()) errors.push('缺少推荐理由');
  if (!resource.action_label?.trim()) errors.push('缺少行动按钮');
  if (!resource.destination?.trim()) errors.push('缺少跳转目标');
  if ((resource.scenario_tags?.length || 0) === 0 && (resource.category_tags?.length || 0) === 0) {
    errors.push('缺少匹配标签');
  }
  if (resource.category === 'travel') {
    const hasHolidayTags = Boolean(resource.holiday_play_scales?.length || resource.holiday_play_modes?.length);
    if (!hasHolidayTags) errors.push('缺少假期玩法标签');
  }
  return errors;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '未同步';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tagPreview(tags: string[] | null | undefined, fallback = '未配置') {
  if (!tags?.length) return fallback;
  return tags.slice(0, 4).join('、');
}

export default function CommercialResources() {
  const { showToast } = useToast();
  const [resources, setResources] = useState<CommercialResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [category, setCategory] = useState<RecommendationCategory | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [query, setQuery] = useState('');

  const loadResources = async () => {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from('commercial_resources')
      .select('*')
      .order('priority_boost', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      showToast(`读取推荐资源失败：${error.message}`, 'error');
      setResources([]);
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, []);

  const summary = useMemo(() => {
    const needsReview = resources.filter(item => validateResource(item).length > 0);
    return {
      total: resources.length,
      active: resources.filter(item => item.active).length,
      inactive: resources.filter(item => !item.active).length,
      needsReview: needsReview.length,
      byCategory: {
        education: resources.filter(item => item.category === 'education').length,
        travel: resources.filter(item => item.category === 'travel').length,
        healthcare: resources.filter(item => item.category === 'healthcare').length,
      },
    };
  }, [resources]);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter(resource => {
      if (category !== 'all' && resource.category !== category) return false;
      if (activeFilter === 'active' && !resource.active) return false;
      if (activeFilter === 'inactive' && resource.active) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        resource.title,
        resource.provider_name,
        resource.selling_point,
        resource.destination,
        ...(resource.scenario_tags || []),
        ...(resource.category_tags || []),
        ...(resource.family_stage_tags || []),
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeFilter, category, query, resources]);

  const seedResources = async () => {
    setSavingId('seed');
    const rows = SEED_RESOURCES.map(item => ({
      ...item,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin
      .from('commercial_resources')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      showToast(`初始化资源失败：${error.message}`, 'error');
    } else {
      showToast('已写入基础推荐资源', 'success');
      await loadResources();
    }
    setSavingId(null);
  };

  const updateResource = async (resource: CommercialResourceRow, patch: Partial<CommercialResourceRow>) => {
    setSavingId(resource.id);
    const { error } = await supabaseAdmin
      .from('commercial_resources')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resource.id);

    if (error) {
      showToast(`更新失败：${error.message}`, 'error');
    } else {
      setResources(prev => prev.map(item =>
        item.id === resource.id
          ? { ...item, ...patch, updated_at: new Date().toISOString() }
          : item
      ));
      showToast('资源已更新', 'success');
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <Megaphone className="h-4 w-4" />
            商业化推荐中枢
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">推荐资源池</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理教育、旅行、医疗等承接资源，用家庭画像和行为信号做智能匹配推荐。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={seedResources}
            disabled={savingId === 'seed'}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            初始化基础资源
          </button>
          <button
            onClick={loadResources}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="资源总数" value={summary.total} tone="blue" />
        <SummaryCard label="已上线" value={summary.active} tone="green" />
        <SummaryCard label="已下线" value={summary.inactive} tone="gray" />
        <SummaryCard label="待补全" value={summary.needsReview} tone={summary.needsReview ? 'amber' : 'green'} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(['education', 'travel', 'healthcare'] as RecommendationCategory[]).map(item => (
          <button
            key={item}
            onClick={() => setCategory(category === item ? 'all' : item)}
            className={`rounded-xl border p-4 text-left transition ${
              category === item ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-200'
            }`}
          >
            <div className="text-sm font-semibold text-gray-900">{CATEGORY_LABELS[item]}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{summary.byCategory[item]}</div>
            <div className="mt-1 text-xs text-gray-500">资源覆盖量</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索标题、供应方、标签、卖点"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <select
            value={category}
            onChange={event => setCategory(event.target.value as RecommendationCategory | 'all')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="all">全部方向</option>
            <option value="education">教育成长</option>
            <option value="travel">亲子旅行</option>
            <option value="healthcare">健康医疗</option>
          </select>
          <select
            value={activeFilter}
            onChange={event => setActiveFilter(event.target.value as ActiveFilter)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="all">全部状态</option>
            <option value="active">仅上线</option>
            <option value="inactive">仅下线</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">资源列表</h2>
            <p className="text-sm text-gray-500">当前筛选 {filteredResources.length} 条</p>
          </div>
          <Filter className="h-5 w-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            正在读取资源池...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="py-16 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-gray-300" />
            <div className="mt-3 font-medium text-gray-900">暂无可展示资源</div>
            <div className="mt-1 text-sm text-gray-500">可以先初始化基础资源，再逐步替换为真实合作资源。</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredResources.map(resource => {
              const errors = validateResource(resource);
              const isSaving = savingId === resource.id;
              return (
                <div key={resource.id} className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          resource.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {resource.active ? '上线中' : '已下线'}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {CATEGORY_LABELS[resource.category]}
                        </span>
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          {KIND_LABELS[resource.kind]}
                        </span>
                        {errors.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            待补全
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            可投放
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-1">
                        <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                        <div className="text-sm text-gray-500">{resource.provider_name}</div>
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{resource.selling_point}</p>

                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                        <InfoBlock label="场景标签" value={tagPreview(resource.scenario_tags)} />
                        <InfoBlock label="画像标签" value={tagPreview(resource.family_stage_tags)} />
                        <InfoBlock label="匹配标签" value={tagPreview(resource.category_tags)} />
                      </div>

                      {errors.length > 0 && (
                        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          需要处理：{errors.join('、')}
                        </div>
                      )}
                    </div>

                    <div className="w-full shrink-0 rounded-xl border border-gray-100 bg-gray-50 p-4 xl:w-64">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">推荐权重</span>
                        <span className="text-2xl font-bold text-gray-900">{resource.priority_boost}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateResource(resource, { priority_boost: Math.min(100, resource.priority_boost + 5) })}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                        >
                          <ArrowUp className="h-4 w-4" />
                          加权
                        </button>
                        <button
                          onClick={() => updateResource(resource, { priority_boost: Math.max(0, resource.priority_boost - 5) })}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                        >
                          <ArrowDown className="h-4 w-4" />
                          降权
                        </button>
                      </div>
                      <button
                        onClick={() => updateResource(resource, { active: !resource.active })}
                        disabled={isSaving}
                        className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                          resource.active
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {resource.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {resource.active ? '下线资源' : '上线资源'}
                      </button>
                      <div className="mt-3 text-xs text-gray-400">
                        跳转：{resource.destination}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        更新：{formatDate(resource.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'gray' | 'amber' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-50 text-gray-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-3 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${toneClasses[tone]}`}>
        {value}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 truncate font-medium text-gray-700">{value}</div>
    </div>
  );
}
