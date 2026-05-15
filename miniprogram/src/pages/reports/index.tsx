import { View, Text, ScrollView } from '@tarojs/components';
import { useEffect, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { getGuestData, isGuestMode } from '@/lib/guestData';
import { getLocalUser } from '@/utils/localUser';
import { supabase } from '@/utils/supabase';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

type PeriodKey = 'week' | 'month' | 'term' | 'year';

const PERIODS: Array<{ key: PeriodKey; label: string; title: string }> = [
  { key: 'week', label: '周报', title: '这一周成长回顾' },
  { key: 'month', label: '月报', title: '这个月进步看得见' },
  { key: 'term', label: '学期', title: '本学期成长盘点' },
  { key: 'year', label: '年度', title: '今年家庭星光记录' },
];

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPeriodStart(period: PeriodKey) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'term') {
    const month = start.getMonth();
    start.setMonth(month >= 7 ? 8 : 1, 1);
  } else {
    start.setMonth(0, 1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function isInPeriod(item: any, start: Date) {
  const date = parseDate(item.completed_at || item.completedAt || item.updated_at || item.created_at || item.start_time || item.startTime);
  return date ? date >= start : true;
}

function isHabit(task: any) {
  return Boolean(task.is_habit || task.isHabit);
}

function getStars(task: any) {
  return Number(task.reward_stars ?? task.rewardStars ?? task.starAmount ?? 0);
}

function getAssigneeName(task: any, members: any[]) {
  const assigneeId = task.assignee_id || task.assigneeId || task.assigneeIds?.[0];
  return members.find(member => member.id === assigneeId)?.name || '孩子';
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [tasks, setTasks] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const localUser = getLocalUser();
      if (!localUser || isGuestMode() || localUser.family_id === 'guest-family' || localUser.family_id === 'demo-family') {
        const guestData = getGuestData();
        setTasks(guestData.tasks || []);
        setRewards(guestData.rewards || []);
        setMembers(guestData.members || []);
        return;
      }

      const familyId = localUser.family_id;
      if (!familyId) return;

      const [taskRes, rewardRes, memberRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', familyId),
        supabase.from('rewards').select('*').eq('family_id', familyId),
        supabase.from('members').select('*').eq('family_id', familyId),
      ]);

      setTasks(taskRes.data || []);
      setRewards(rewardRes.data || []);
      setMembers(memberRes.data || []);
    } catch (err) {
      console.warn('[Reports] load failed:', err);
      const guestData = getGuestData();
      setTasks(guestData.tasks || []);
      setRewards(guestData.rewards || []);
      setMembers(guestData.members || []);
    } finally {
      setLoading(false);
    }
  };

  const report = useMemo(() => {
    const start = getPeriodStart(period);
    const scopedTasks = tasks.filter(task => isInPeriod(task, start));
    const completed = scopedTasks.filter(task => task.status === 'completed');
    const goodHabits = completed.filter(task => isHabit(task) && getStars(task) >= 0);
    const penalties = scopedTasks.filter(task => isHabit(task) && getStars(task) < 0);
    const promiseRewards = rewards.filter(reward => reward.status === 'redeemed' || reward.status === 'pending_parent');
    const earnedStars = completed.reduce((sum, task) => sum + Math.max(0, getStars(task)), 0);
    const penaltyStars = penalties.reduce((sum, task) => sum + Math.abs(getStars(task)), 0);
    const highlights = completed.slice(0, 4).map(task => `${getAssigneeName(task, members)}完成了「${task.title}」，这是一次很棒的坚持。`);

    return {
      completedTasks: completed.filter(task => !isHabit(task)).length,
      goodHabits: goodHabits.length,
      penalties: penalties.length,
      promiseRewards: promiseRewards.length,
      earnedStars,
      penaltyStars,
      highlights: highlights.length > 0 ? highlights : ['本周期还在积累中，先从一个小任务开始也很好。'],
      nextPreview: scopedTasks
        .filter(task => task.status === 'pending' || task.status === 'reviewing')
        .slice(0, 5)
        .map(task => task.title),
    };
  }, [members, period, rewards, tasks]);

  const current = PERIODS.find(item => item.key === period) || PERIODS[0];
  const netStars = report.earnedStars - report.penaltyStars;

  return (
    <View className={`reports-page ${getThemeClass()}`}>
      <View className="reports-header">
        <View className="reports-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={34} color="#25352a" />
        </View>
        <Text className="reports-title">家庭复盘</Text>
        <View className="reports-refresh" onClick={loadReportData}>
          <Icon name="refresh-cw" size={30} color="#006e1c" />
        </View>
      </View>

      <View className="period-tabs">
        {PERIODS.map(item => (
          <View key={item.key} className={`period-tab ${period === item.key ? 'active' : ''}`} onClick={() => setPeriod(item.key)}>
            <Text className={`period-text ${period === item.key ? 'active' : ''}`}>{item.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY enhanced className="reports-scroll">
        <View className="reports-hero">
          <View className="hero-icon">
            <Icon name="sparkles" size={56} color="#ffffff" />
          </View>
          <Text className="hero-kicker">{current.label}</Text>
          <Text className="hero-title">{current.title}</Text>
          <Text className="hero-desc">复盘不是检查，而是把全家这段时间的努力轻轻点亮。</Text>
        </View>

        {loading ? (
          <View className="report-loading">
            <Icon name="loader-2" size={52} color="#006e1c" className="spin" />
            <Text>正在生成复盘...</Text>
          </View>
        ) : (
          <>
            <View className="stats-grid">
              <StatCard icon="checkCircle" label="完成任务" value={report.completedTasks} />
              <StatCard icon="repeat" label="好习惯" value={report.goodHabits} />
              <StatCard icon="gift" label="心愿兑现" value={report.promiseRewards} />
              <StatCard icon="star" label="星星净变化" value={netStars} prefix={netStars >= 0 ? '+' : ''} />
            </View>

            <View className="report-section">
              <View className="section-head">
                <Icon name="trophy" size={32} color="#F9A825" />
                <Text>孩子高光时刻</Text>
              </View>
              {report.highlights.map((text, index) => (
                <View key={text} className="highlight-row">
                  <View className="highlight-index"><Text>{index + 1}</Text></View>
                  <Text className="highlight-text">{text}</Text>
                </View>
              ))}
            </View>

            <View className="report-section">
              <View className="section-head">
                <Icon name="star" size={32} color="#006e1c" />
                <Text>星星变化</Text>
              </View>
              <View className="stars-row">
                <View>
                  <Text className="stars-label">获得</Text>
                  <Text className="stars-positive">+{report.earnedStars}</Text>
                </View>
                <View>
                  <Text className="stars-label">扣减提醒</Text>
                  <Text className="stars-negative">-{report.penaltyStars}</Text>
                </View>
              </View>
              <Text className="encourage-text">星星代表的是努力被看见，不是家长对孩子的控制。</Text>
            </View>

            <View className="report-section">
              <View className="section-head">
                <Icon name="calendar" size={32} color="#1976D2" />
                <Text>下一周期预告</Text>
              </View>
              {report.nextPreview.length > 0 ? report.nextPreview.map(item => (
                <View key={item} className="preview-row">
                  <Icon name="chevronRight" size={24} color="#006e1c" />
                  <Text>{item}</Text>
                </View>
              )) : (
                <Text className="empty-copy">暂时没有待办，适合安排一次轻松的家庭时间。</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, prefix = '' }: { icon: string; label: string; value: number; prefix?: string }) {
  return (
    <View className="stat-card">
      <Icon name={icon} size={32} color="#006e1c" />
      <Text className="stat-value">{prefix}{value}</Text>
      <Text className="stat-label">{label}</Text>
    </View>
  );
}
