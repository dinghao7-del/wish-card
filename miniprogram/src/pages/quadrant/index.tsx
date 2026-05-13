import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import './index.scss';

// 对齐 Web 版 QuadrantAnalysisPage.tsx
// 四象限配置 — 与Web版第16-49行完全一致的颜色方案
const QUADRANT_CONFIG = [
  { key: 'urgentImportant' as const, defaultTitle: '紧急且重要', icon: 'alertTriangle', color: '#006e1c', bgAlpha: 'rgba(0,110,28,0.10)' },
  { key: 'notUrgentImportant' as const, defaultTitle: '重要不紧急', icon: 'target', color: '#686000', bgAlpha: 'rgba(104,96,0,0.10)' },
  { key: 'urgentNotImportant' as const, defaultTitle: '紧急不重要', icon: 'clock', color: '#C4534D', bgAlpha: 'rgba(196,83,77,0.10)' },
  { key: 'notUrgentNotImportant' as const, defaultTitle: '不紧急不重要', icon: 'coffee', color: '#3f4a3c', bgAlpha: 'rgba(63,74,60,0.10)' },
];

// 对齐Web版第51-60行：8种日期范围
const DATE_RANGE_OPTIONS = [
  { key: 'all', label: '全部' }, { key: 'today', label: '今天' },
  { key: 'next3days', label: '未来3天' }, { key: 'next7days', label: '未来7天' },
  { key: 'week', label: '本周' }, { key: 'month', label: '本月' },
  { key: 'next30days', label: '未来30天' }, { key: 'year', label: '今年' },
] as const;

type DateRangeKey = typeof DATE_RANGE_OPTIONS[number]['key'];

interface QuadrantItem {
  task: any;
  reason: string;
}

interface QuadrantAnalysis {
  urgentImportant: QuadrantItem[];
  notUrgentImportant: QuadrantItem[];
  urgentNotImportant: QuadrantItem[];
  notUrgentNotImportant: QuadrantItem[];
  summary: string;
  suggestions: string[];
}

export default function QuadrantPage() {
  const [analysis, setAnalysis] = useState<QuadrantAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [error, setError] = useState('');

  useEffect(() => { runAnalysis(); }, [dateRange]);

  const runAnalysis = async () => {
    setIsLoading(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let tasks: any[] = [];
      if (user) {
        const res = await supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'completed').order('deadline', { ascending: true, nullsFirst: false });
        tasks = res.data || [];
      }
      // 分类引擎（对齐 Web 版 analyzeQuadrant）
      const result = classifyAndAnalyze(tasks, dateRange);
      setAnalysis(result);
    } catch (err: any) {
      setError(`分析失败: ${err.message}`);
      // fallback to demo data
      setAnalysis(getDemoAnalysis());
    } finally { setIsLoading(false); }
  };

  return (
    <View className="qd-page">
      {/* Header — 对齐Web版第108-161行 */}
      <View className="qd-header">
        <View className="qd-header-left">
          <View className="qd-back-btn" onClick={() => Taro.navigateBack()}>
            <Icon name="arrowLeft" size={36} color="#3f4a3c" />
          </View>
          <Text className="qd-header-title">任务四象限看板</Text>
        </View>
        {/* 麦克风 → AI助手 */}
        <View className="qd-mic-btn">
          <Icon name="microphone" size={32} color="#ffffff" />
        </View>
      </View>

      {/* 日期范围选择器 — 对齐Web版第136-161行 */}
      <View className="qd-range-picker">
        <View className="qd-select-wrap">
          <Text className="qd-select-text">{DATE_RANGE_OPTIONS.find(o => o.key === dateRange)?.label || '全部'}</Text>
          <Icon name="chevronDown" size={24} color="#3f4a3c" />
        </View>
        {/* 模拟下拉选项 */}
        <ScrollView className="qd-range-options" scrollX>
          {DATE_RANGE_OPTIONS.map(opt => (
            <Text
              key={opt.key}
              className={`qd-range-opt ${dateRange === opt.key ? 'active' : ''}`}
              onClick={() => setDateRange(opt.key)}
            >{opt.label}</Text>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View className="qd-content">
        {isLoading && (
          <View className="qd-loading"><Icon name="loader" size={48} color="#006e1c" /><Text>正在分析任务...</Text></View>
        )}

        {error && (
          <View className="qd-error">
            <Text>{error}</Text>
            <View className="qd-retry-btn" onClick={runAnalysis}><Text>重试</Text></View>
          </View>
        )}

        {analysis && !isLoading && (
          <>
            {/* 2×2 网格 — 对齐Web版第200-272行 */}
            <View className="qd-grid">
              {QUADRANT_CONFIG.map((config, idx) => {
                const items = analysis[config.key] as QuadrantItem[];
                return (
                  <View key={idx} className={`qd-cell qd-${idx + 1}`}>
                    <View className="qd-cell-header">
                      <View className="qd-badge" style={{ backgroundColor: config.bgAlpha }}>
                        <Icon name={config.icon as any} size={28} style={{ color: config.color }} />
                      </View>
                      <Text className="qd-cell-title">{config.defaultTitle}</Text>
                    </View>

                    <View className="qd-task-list">
                      {items.length > 0 ? items.slice(0, 3).map((item, i) => (
                        <View key={i} className="qd-task-item">
                          <Text className="qd-task-title">{item.task.title}</Text>
                          <Text className="qd-task-reason">{item.reason}</Text>
                        </View>
                      )) : (
                        <Text className="qd-empty-text">暂无任务</Text>
                      )}
                    </View>

                    {items.length > 3 && (
                      <Text className="qd-more-hint">还有 {items.length - 3} 个任务</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* AI 建议卡片 — 对齐Web版第276-317行 */}
            <View className="qd-suggestion-card">
              <View className="qd-sugg-header">
                <Icon name="sparkles" size={32} color="#006e1c" />
                <Text className="qd-sugg-title">AI 建议</Text>
              </View>
              <Text className="qd-sugg-summary">{analysis.summary || '暂无建议'}</Text>

              {analysis.suggestions.length > 0 && (
                <View className="qd-sugg-list">
                  {analysis.suggestions.map((s, i) => (
                    <View key={i} className="qd-sugg-item">
                      <Icon name="arrowLeft" size={22} color="#006e1c" />
                      <Text className="qd-sugg-text">{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ===== 分类分析引擎 =====
function classifyAndAnalyze(tasks: any[], range: DateRangeKey): QuadrantAnalysis {
  const filtered = filterByDate(tasks, range);
  const result: QuadrantAnalysis = {
    urgentImportant: [], notUrgentImportant: [],
    urgentNotImportant: [], notUrgentNotImportant: [],
    summary: '',
    suggestions: [],
  };

  for (const task of filtered) {
    const q = classify(task);
    const item: QuadrantItem = { task, reason: generateReason(task, q) };
    switch (q) {
      case 0: result.urgentImportant.push(item); break;
      case 1: result.notUrgentImportant.push(item); break;
      case 2: result.urgentNotImportant.push(item); break;
      case 3: result.notUrgentNotImportant.push(item); break;
    }
  }

  // 生成AI建议摘要
  const total = filtered.length;
  if (total === 0) {
    result.summary = '当前没有待处理任务，享受轻松时光吧！';
  } else if (result.urgentImportant.length > 3) {
    result.summary = `有${result.urgentImportant.length}项紧急重要任务，建议优先处理，避免临时抱佛脚。`;
    result.suggestions.push('考虑将部分Q1任务委派或拆分为小步骤');
  } else if (result.notUrgentImportant.length > 5) {
    result.summary = `重要不紧急任务较多(${result.notUrgentImportant.length}项)，这是长期成长的关键区域。`;
    result.suggestions.push('每天固定时间专注完成1-2项Q2任务');
  } else {
    result.suggestions.push('整体任务分布合理，继续保持！');
    result.summary = `共${total}项任务分布均匀，建议按优先级依次完成。`;
  }

  return result;
}

function classify(t: any): number {
  if (!t.deadline) return 3; // 无截止日期→Q4
  const hoursLeft = (new Date(t.deadline).getTime() - Date.now()) / 3600000;
  const isUrgent = hoursLeft <= 24 && hoursLeft >= -24;
  const isImportant = (t.reward_stars || 0) >= 20;
  if (isImportant && isUrgent) return 0;
  if (isImportant && !isUrgent) return 1;
  if (!isImportant && isUrgent) return 2;
  return 3;
}

function generateReason(t: any, q: number): string {
  const reasons = [
    `${t.title} 截止时间紧迫，建议立即处理`,
    `这是长期成长型任务，建议每日分配固定时间`,
    `此任务可能干扰核心工作，评估是否必要`,
    `可在空闲时间灵活处理`,
  ];
  return reasons[q];
}

function filterByDate(tasks: any[], range: DateRangeKey): any[] {
  const now = new Date();
  const safeTasks = tasks || [];
  switch (range) {
    case 'today': return safeTasks.filter(t => sameDay(new Date(t.deadline || t.created_at), now));
    case 'next3days': return safeTasks.filter(t => daysDiff(now, new Date(t.deadline)) <= 3);
    case 'next7days': return safeTasks.filter(t => daysDiff(now, new Date(t.deadline)) <= 7);
    case 'week': return safeTasks.filter(t => sameWeek(new Date(t.deadline || t.created_at), now));
    case 'month': return safeTasks.filter(t => sameMonth(new Date(t.deadline || t.created_at), now));
    case 'next30days': return safeTasks.filter(t => daysDiff(now, new Date(t.deadline)) <= 30);
    case 'year': return safeTasks.filter(t => sameYear(new Date(t.deadline || t.created_at), now));
    default: return safeTasks;
  }
}

function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function sameWeek(a: Date, b: Date) { const w = [6,0,1,2,3,4,5]; return getWeek(a) === getWeek(b); }
function getWeek(d: Date) { return Math.floor((d.getTime() - new Date(d.getFullYear(),0,1).getTime())/604800000); }
function sameMonth(a: Date, b: Date) { return a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear(); }
function sameYear(a: Date, b: Date) { return a.getFullYear()===b.getFullYear(); }
function daysDiff(a: Date, b: Date) { return Math.ceil((b.getTime()-a.getTime())/86400000); }

function getDemoAnalysis(): QuadrantAnalysis {
  return {
    urgentImportant: [{ task: { title: '数学作业', reward_stars: 30 }, reason: '截止时间紧迫，建议立即处理' }],
    notUrgentImportant: [{ task: { title: '英语阅读', reward_stars: 25 }, reason: '这是长期成长型任务' }],
    urgentNotImportant: [{ task: { title: '整理房间', reward_stars: 10 }, reason: '此任务可能非核心' }],
    notUrgentNotImportant: [{ task: { title: '看动画片', reward_stars: 5 }, reason: '空闲时灵活处理' }],
    summary: '共4项任务分布合理，建议按优先级依次完成。',
    suggestions: ['每天固定时间专注完成Q2任务', '避免Q1任务堆积过多'],
  };
}
