/**
 * 计划详情页 — 严格对齐Web端 src/pages/PlanDetail.tsx
 *
 * 功能清单:
 * 1. ✅ 返回导航 + 标题"编辑计划" + 动态场景emoji + 计划名称
 * 2. ✅ 统计卡片: 目标数(🎯) + 心愿数(⭐) + 类型标签 + 年级标签 + 时区标签
 * 3. ✅ 每日作息展示: 起床/就寝/时段列表/三餐时间 (对齐Web第162-211行)
 * 4. ✅ 每周固定活动展示 (对齐Web第214-229行)
 * 5. ✅ 目标列表区 + 「+ 添加目标」→ /pages/tasks/create/index
 * 6. ✅ 心愿列表区 + 「+ 添加心愿」→ /pages/rewards/index (带planId)
 * 7. ✅ 支持URL参数: id, name, type, schedule (含日程/活动/年级/时区)
 */
import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import Icon from '@/components/Icon';
import { PLAN_SCENES, type DailyScheduleTemplate } from '@/lib/planTemplates';
import './index.scss';

interface PlanData {
  id: string;
  name: string;
  type: string;
}

interface WeeklyActivity {
  day: string;
  activity: string;
  time: string;
}

export default function PlanDetail() {
  const router = useRouter();
  const { id, name: nameParam, type: typeParam } = router.params;

  // ⭐ 对齐Web第26-33行: 完整状态定义
  const [loading, setLoading] = useState(true);
  const [targetCount, setTargetCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('');

  // ⭐ 对齐Web第29-32行: 新增状态 — 日程/活动/年级/时区
  const [schedule, setSchedule] = useState<DailyScheduleTemplate | null>(null);
  const [weeklyActivities, setWeeklyActivities] = useState<WeeklyActivity[]>([]);
  const [grade, setGrade] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => {
    loadPlan();
  }, [id]);

  // ===== 对齐Web第53-84行: loadPlan =====
  const loadPlan = async () => {
    setLoading(true);

    if (!id) {
      setLoading(false);
      return;
    }

    // ⭐ 对齐Web第39-49行: 从 URL 参数读取日程数据（向导创建后传入）
    try {
      const scheduleStr = router.params.schedule;
      if (scheduleStr) {
        try {
          const decoded = JSON.parse(decodeURIComponent(scheduleStr));
          if (decoded.wakeTime) setSchedule(decoded);
          if (decoded.weeklyActivities) setWeeklyActivities(decoded.weeklyActivities);
          if (decoded.grade) setGrade(decoded.grade);
          if (decoded.timezone?.label) setTimezone(decoded.timezone.label);
        } catch (e) {
          console.log('[PlanDetail] schedule参数解析失败:', e);
        }
      }
    } catch {}

    // 游客模式：从URL参数读取（对齐Web第57-65行）
    if (id.startsWith('guest-')) {
      setPlanName(decodeURIComponent(nameParam || '新计划'));
      setPlanType(decodeURIComponent(typeParam || '自定义'));
      setTargetCount(0);
      setWishCount(0);
      setLoading(false);
      return;
    }

    // 正常模式：从DB读取（对齐Web第68-83行）
    try {
      const supabaseClient = await import('@/utils/supabase');
      const { data: planData } = await supabaseClient.supabase.from('plans')
        .select('id, name, type')
        .eq('id', id)
        .single();

      if (planData) {
        setPlanName(planData.name);
        setPlanType(planData.type || '');

        const [targetRes, wishRes] = await Promise.all([
          supabaseClient.supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('plan_id', id),
          supabaseClient.supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('plan_id', id),
        ]);
        setTargetCount(targetRes.count ?? 0);
        setWishCount(wishRes.count ?? 0);
      }
    } catch (e) {
      console.log('[PlanDetail] DB查询失败，使用URL参数:', e);
      setPlanName(decodeURIComponent(nameParam || '计划'));
      setPlanType(decodeURIComponent(typeParam || '自定义'));
    }

    setLoading(false);
  };

  // ⭐ 对齐Web第87-91行: 获取对应场景的 emoji
  const sceneEmoji = (): string => {
    if (!planType) return '📋';
    const scene = PLAN_SCENES.find(s => planType.includes(s.name) || planType.includes(s.type));
    return scene?.emoji || '📋';
  };

  // ===== 添加目标 — 对齐Web第237行 =====
  const handleAddTarget = () => {
    Taro.navigateTo({
      url: `/pages/tasks/create/index?planId=${id}&planName=${encodeURIComponent(planName)}`,
    });
  };

  // ===== 添加心愿 — 对齐Web第261行: /rewards/new?planId=... =====
  const handleAddWish = () => {
    Taro.navigateTo({
      url: `/pages/rewards/new/index?planId=${id}&planName=${encodeURIComponent(planName)}`,
    });
  };

  // ===== Loading =====
  if (loading) {
    return (
      <View className="detail-page">
        <View style={{ display: 'flex', justifyContent: 'center', paddingTop: '200rpx' }}>
          <Icon name="loader" size={48} color="#006e1c" />
        </View>
      </View>
    );
  }

  return (
    <View className="detail-page">
      {/* ===== Header — 对齐Web第104-117行 (含动态emoji) ===== */}
      <View className="detail-header">
        <View className="header-nav">
          <View className="back-btn" onClick={() => Taro.navigateBack()}>
            <Icon name="chevronLeft" size={40} color="#333" />
          </View>
          <View className="header-info">
            <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx' }}>
              <Text className="header-title">编辑计划</Text>
              {/* ⭐ 动态emoji — 对齐Web第112行 */}
              <Text style={{ fontSize: '36rpx' }}>{sceneEmoji()}</Text>
            </View>
            <Text className="header-subtitle">{planName}</Text>
          </View>
        </View>
      </View>

      {/* ===== Body ===== */}
      <ScrollView className="detail-body" scrollY>
        {/* ===== 统计卡片 — 对齐Web第121-159行 (含grade/timezone标签) ===== */}
        <View className="stat-card">
          <Text className="stat-card-name">{planName}</Text>
          <View className="stat-row">
            {/* 🎯 目标数 — 对齐Web第124-132行 */}
            <View className="stat-box stat-box-target">
              <View className="stat-icon-wrap stat-icon-wrap-target">
                <Icon name="target" size={32} color="#006e1c" />
              </View>
              <View>
                <Text className="stat-label">目标</Text>
                <Text className="stat-num">{targetCount}</Text>
              </View>
            </View>
            {/* ⭐ 心愿数 — 对齐Web第133-141行 */}
            <View className="stat-box stat-box-wish">
              <View className="stat-icon-wrap stat-icon-wrap-wish">
                <Icon name="star" size={32} color="#f59e0b" />
              </View>
              <View>
                <Text className="stat-label">心愿</Text>
                <Text className="stat-num">{wishCount}</Text>
              </View>
            </View>
          </View>

          {/* ⭐ 标签行 — 对齐Web第143-158行 (类型+年级+时区) */}
          {planType && (
            <View className="type-tags-row">
              <View className="type-tag">
                <Text className="type-tag-text">{sceneEmoji()} {planType}</Text>
              </View>
              {/* ⭐ 年级标签 — 对齐Web第148-152行 */}
              {grade && (
                <View className="type-tag type-tag-grade">
                  <Text className="type-tag-text">{grade}</Text>
                </View>
              )}
              {/* ⭐ 时区标签 — 对齐Web第153-157行 */}
              {timezone && (
                <View className="type-tag type-tag-tz">
                  <Icon name="globe" size={20} color="#6366f1" />
                  <Text className="type-tag-text" style={{ color: '#6366f1' }}>{timezone}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ===== ⭐ 每日作息展示 — 对齐Web第162-211行 (整个新增区块) ===== */}
        {schedule && (
          <View className="section-card schedule-card">
            <View className="section-header">
              <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx' }}>
                <Icon name="clock" size={28} color="#006e1c" />
                <Text className="section-title">每日作息</Text>
              </View>
            </View>

            {/* 起床 & 就寝 — 对齐Web第168-183行 */}
            <View className="wake-bed-row">
              <View className="wb-item wb-wake">
                <Icon name="sun" size={24} color="#f59e0b" />
                <View>
                  <Text className="wb-label">起床</Text>
                  <Text className="wb-value">{schedule.wakeTime}</Text>
                </View>
              </View>
              <View className="wb-item wb-bed">
                <Icon name="moon" size={24} color="#6366f1" />
                <View>
                  <Text className="wb-label">就寝</Text>
                  <Text className="wb-value">{schedule.bedTime}</Text>
                </View>
              </View>
            </View>

            {/* 时段列表 — 对齐Web第184-199行 */}
            <View className="slot-list">
              {schedule.slots.map((slot, idx) => (
                <View key={idx} className="slot-row">
                  <Text className="slot-emoji">{slot.icon}</Text>
                  <Text className="slot-time">{slot.startTime}-{slot.endTime}</Text>
                  <View className="slot-detail">
                    <Text className="slot-name">{slot.label}</Text>
                    {slot.description ? (
                      <Text className="slot-desc">{slot.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            {/* 三餐信息 — 对齐Web第201-210行 */}
            <View className="meals-info">
              <Text className="meals-label">用餐时间</Text>
              <View className="meals-row">
                <Text className="meal-text">早餐 {schedule.mealTimes.breakfast}</Text>
                <Text className="meal-sep">|</Text>
                <Text className="meal-text">午餐 {schedule.mealTimes.lunch}</Text>
                <Text className="meal-sep">|</Text>
                <Text className="meal-text">晚餐 {schedule.mealTimes.dinner}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ===== ⭐ 每周固定活动展示 — 对齐Web第214-229行 (整个新增区块) ===== */}
        {weeklyActivities.length > 0 && (
          <View className="section-card activities-card">
            <View className="section-header">
              <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx' }}>
                <Icon name="users" size={28} color="#006e1c" />
                <Text className="section-title">每周固定活动</Text>
              </View>
            </View>
            {weeklyActivities.map((act, idx) => (
              <View key={idx} className="act-item-row">
                <Text className="act-day">{act.day}</Text>
                <Text className="act-time-val">{act.time}</Text>
                <Text className="act-name-val">{act.activity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== 目标列表 — 对齐Web第233-253行 ===== */}
        <View className="section-card">
          <View className="section-header">
            <Text className="section-title">目标列表</Text>
            <View className="section-action" onClick={handleAddTarget}>
              <Icon name="plus" size={26} color="#006e1c" strokeWidth={3} />
              <Text className="section-action-text">添加目标</Text>
            </View>
          </View>
          {targetCount === 0 ? (
            <View className="section-empty">
              <Icon name="grid" size={64} color="rgba(0,0,0,0.12)" />
              <Text className="section-empty-text">暂无目标，点击上方按钮添加</Text>
            </View>
          ) : (
            <View className="section-count">
              <Text>{targetCount} 个目标已创建</Text>
            </View>
          )}
        </View>

        {/* ===== 心愿列表 — 对齐Web第256-278行 (修复跳转路径) ===== */}
        <View className="section-card">
          <View className="section-header">
            <Text className="section-title">心愿列表</Text>
            <View className="section-action section-action-wish" onClick={handleAddWish}>
              <Icon name="sparkles" size={26} color="#f59e0b" />
              <Text className="section-action-text section-action-text-wish">添加心愿</Text>
            </View>
          </View>
          {wishCount === 0 ? (
            <View className="section-empty">
              <Icon name="star" size={64} color="rgba(0,0,0,0.12)" />
              <Text className="section-empty-text">暂无心愿，点击上方按钮添加</Text>
            </View>
          ) : (
            <View className="section-count">
              <Text>{wishCount} 个心愿已创建</Text>
            </View>
          )}
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
