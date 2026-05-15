/**
 * CheckIn 打卡页 — 100% 对齐 Web 版 CheckIn.tsx (217行)
 *
 * 视觉规范（严格对齐 Web）:
 * ✅ 浅色背景 bg-surface + 两处模糊光斑装饰
 * ✅ Header: sticky + backdrop-blur + 返回箭头 + 标题
 * ✅ 任务卡: 白色 bg-white + 圆角40rpx + 阴影 + 左侧绿方块+Star + 标签+标题+用户头像
 * ✅ 大按钮: 绿色 from-primary to-primary-dark + CheckCircle2(88px) + "确认打卡"文字 + 脉冲环
 * ✅ 星星预览: 胶囊形容器 bg-surface-container + Star图标 + "将获得X星星奖励"
 * ✅ 成功页: 绿色圆角方图标(rounded-3rem) + 12粒子散射 + 白色详情卡 + 全宽深绿按钮
 */
import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { isGuestMode, getGuestData, updateGuestData } from '@/lib/guestData';
import { getLocalUser, setLocalUser } from '@/utils/localUser';
import Icon from '@/components/Icon';
import './index.scss';

// ===== 类型定义 =====
interface TaskInfo {
  id: string;
  title: string;
  icon?: string;
  status: string;
  reward_stars?: number;
  rewardStars?: number;  // Web版字段名
  star_amount?: number;
  start_time?: string;
  assignee_ids?: string[];
}

// ===== 粒子配置（对齐Web版12个粒子）=====
const PARTICLE_COUNT = 12;

export default function CheckIn() {
  // ===== 状态 =====
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadTask();
  }, []);

  // ===== 加载任务 =====
  const loadTask = async () => {
    try {
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const options = (currentPage as any).options || {};
      const taskId = options.taskId || options.id;

      // 游客模式 — 必须根据taskId查找对应任务，不能死取第一个
      if (isGuestMode()) {
        console.log('[CheckIn] Guest mode: taskId=', taskId);
        const guestData = getGuestData();
        let foundTask = null;

        if (taskId) {
          // 优先按ID精确查找
          foundTask = guestData.tasks.find((t: any) => t.id === taskId);
          if (!foundTask) {
            console.warn('[CheckIn] Guest: taskId not found, fallback to first pending');
          }
        }
        // fallback: 找第一个可打卡的任务（非习惯、非完成、非奖励）
        if (!foundTask) {
          foundTask = guestData.tasks.find((t: any) =>
            !t.is_habit && !t.is_reward && t.status !== 'completed' && t.status !== 'reward'
          ) || guestData.tasks[0];
        }

        if (foundTask) {
          setTask(foundTask);
          setIsReviewMode(foundTask.status === 'reviewing');
          setUserName(guestData.currentUser?.name || '测试孩子');
          console.log('[CheckIn] Guest task loaded:', foundTask.title, 'stars:', foundTask.reward_stars);
        }
        setLoading(false);
        return;
      }

      if (taskId) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (data) {
          setTask(data);
          setIsReviewMode(data.status === 'reviewing');
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // 获取用户名
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '');

        const today = new Date().toISOString().split('T')[0];
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .or(`assignee_ids.cs.{${user.id}},creator_id.eq.${user.id}`)
          .neq('status', 'completed')
          .order('start_time', { ascending: true })
          .limit(1);

        if (tasks && tasks.length > 0) {
          setTask(tasks[0]);
          setIsReviewMode(tasks[0].status === 'reviewing');
        }
      }

      // 获取当前用户名
      if (!isGuestMode()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '');
        }
      }
    } catch (e) {
      console.error('[CheckIn] loadTask error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ===== 执行打卡 =====
  const handleCheckIn = async () => {
    if (!task) return;

    setCheckingIn(true);

    try {
      // 兼容 Web 版 rewardStars 和小程序 reward_stars
      const stars = Math.abs(task.rewardStars ?? task.reward_stars ?? task.star_amount ?? 0);

      // 模拟 Web 版的 300ms 延迟
      await new Promise(resolve => setTimeout(resolve, 300));

      if (isGuestMode()) {
        console.log('[CheckIn] Guest mode: simulating check-in');
        await new Promise(resolve => setTimeout(resolve, 500));
        const localUser = getLocalUser();
        const isParentReview = isReviewMode && localUser?.role === 'parent';
        const assigneeIds = task.assignee_ids?.length ? task.assignee_ids : [];
        const targetMemberId = assigneeIds[0] || localUser?.id || 'guest-son';
        const nextData = updateGuestData((draft) => {
          draft.tasks = (draft.tasks || []).map((item: any) =>
            item.id === task.id ? { ...item, status: isParentReview ? 'completed' : 'reviewing' } : item
          );
          if (isParentReview && stars > 0) {
            draft.members = (draft.members || []).map((member: any) =>
              member.id === targetMemberId ? { ...member, stars: (member.stars || 0) + stars } : member
            );
            draft.history = [{
              id: `guest-checkin-${task.id}-${Date.now()}`,
              user_id: targetMemberId,
              title: `完成任务: ${task.title}`,
              type: 'task',
              stars,
              timestamp: new Date().toISOString(),
              icon: 'CheckCircle',
            }, ...(draft.history || [])];
          }
        });
        if (localUser) {
          const refreshed = nextData.members.find((member: any) => member.id === localUser.id);
          if (refreshed) setLocalUser(refreshed);
        }
        setEarnedStars(stars);
        setShowParticles(true);
        setTimeout(() => { setSuccess(true); setShowParticles(false); }, 1200);
        return;
      }

      if (isReviewMode) {
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', task.id);
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('increment_stars', { user_id: user.id, stars });
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('check_ins').insert({
          task_id: task.id,
          user_id: user?.id,
          type: 'manual',
          stars_earned: stars,
        });
        await supabase.from('tasks').update({ status: 'reviewing' }).eq('id', task.id);
        if (user) {
          await supabase.rpc('increment_stars', { user_id: user.id, stars });
        }
      }

      setEarnedStars(stars);
      setShowParticles(true);
      setTimeout(() => { setSuccess(true); setShowParticles(false); }, 1200);

    } catch (err: any) {
      console.error('[CheckIn] error:', err);
      Taro.showToast({ title: err.message || '打卡失败', icon: 'none' });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleDone = () => {
    Taro.switchTab({ url: '/pages/tasks/index' });  // 对齐Web版: navigate('/tasks')
  };

  const handleGoHome = () => {
    Taro.navigateBack() || Taro.switchTab({ url: '/pages/home/index' });
  };

  // ===== 粒子数据（对齐Web版: 12个，30度间隔，120px距离）=====
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    // Web版用 primary/secondary/tertiary 三色循环
    colorClass: i % 3 === 0 ? 'particle-primary' : i % 3 === 1 ? 'particle-secondary' : 'particle-tertiary',
    angle: i * 30,
  }));

  // ===== 渲染 =====

  // 加载中
  if (loading) {
    return (
      <View className="ci-page">
        <View className="ci-loading">
          <Icon name="loader" size={48} color="#999" />
          <Text className="ci-loading-text">加载中...</Text>
        </View>
      </View>
    );
  }

  // 无任务空状态 — 对齐Web版第41-56行
  if (!task && !loading) {
    return (
      <View className="ci-page">
        <View className="ci-empty">
          <View className="ci-empty-icon">
            <Icon name="checkCircle2" size={64} color="rgba(0,0,0,0.15)" />
          </View>
          <Text className="ci-empty-title">休息时间</Text>
          <Text className="ci-empty-desc">暂无任务</Text>
          <View className="ci-empty-btn" onClick={handleGoHome}>
            <Text>查看首页</Text>
          </View>
        </View>
      </View>
    );
  }

  // ===== 成功阶段 — 对齐Web版第146-211行（无独立header，纯全屏动画） =====
  if (success) {
    return (
      <View className="ci-page ci-page-success">
        {/* 成功容器 — 对齐Web版第150行: flex-1居中布局 */}
        <View className="ci-success-stage">

          {/* 大绿圆角方形 Check 图标 — 对齐Web第153-160行 */}
          <View className="ci-success-icon-wrap">
            <View className="ci-success-icon-box">
              <Icon name="checkCircle2" size={96} color="#FFFFFF" />
            </View>
            {/* 12粒子散射 — 对齐Web第163-179行，补充 animation-delay */}
            {particles.map(p => (
              <View
                key={p.id}
                className={`ci-particle ${p.colorClass}`}
                style={{
                  '--angle': `${p.angle}deg`,
                  '--particle-delay': `${p.id * 0.1}s`,
                } as React.CSSProperties}
              />
            ))}
          </View>

          {/* 文字区 — 对齐Web第183-186行: space-y-4 */}
          <View className="ci-success-text-area">
            <Text className="ci-success-heading">
              {isReviewMode ? '审核完成' : '打卡成功'}
            </Text>
            <Text className="ci-success-sub">
              {isReviewMode ? '星星已发放' : '森林更加茂盛了'}
            </Text>
          </View>

          {/* 详情白卡 — 对齐Web第188-203行 */}
          <View className="ci-detail-card">
            <Text className="ci-detail-label">
              {isReviewMode ? '星星详情' : '打卡详情'}
            </Text>
            <View className="ci-detail-row">
              <View className="ci-detail-star-box">
                <Icon name="star" size={36} color="#006e1c" />
              </View>
              <View className="ci-detail-info">
                <View className="ci-detail-stars-line">
                  <Text className="ci-detail-stars-num">+{earnedStars}</Text>
                  <Text className="ci-detail-stars-unit">颗星星奖励</Text>
                </View>
                <Text className="ci-detail-status">
                  {isReviewMode ? '奖励已到账' : '待审核确认'}
                </Text>
              </View>
            </View>
          </View>

          {/* 太棒了按钮 — 对齐Web第205-210行: 全宽深绿 */}
          <View className="ci-done-btn" onClick={handleDone}>
            <Text>太棒了</Text>
          </View>

        </View>
      </View>
    );
  }

  // ===== 表单阶段（主界面）— 对齐Web版第73-143行 =====
  const stars = Math.abs(task.rewardStars ?? task.reward_stars ?? task.star_amount ?? 0);

  return (
    <View className="ci-page">
      {/* 背景光斑装饰 — 对齐Web第61-62行 */}
      <View className="ci-bg-blob ci-blob-1" />
      <View className="ci-bg-blob ci-blob-2" />

      {/* Header — 对齐Web第64-70行 */}
      <View className="ci-header">
        <View className="ci-header-btn" onClick={handleGoHome}>
          <Icon name="arrowLeft" size={24} color="#666" />
        </View>
        <Text className="ci-header-title">
          {isReviewMode ? '审核任务' : '执行打卡'}
        </Text>
        <View className="ci-header-placeholder" />
      </View>

      {/* 表单主体 — 对齐Web第74-143行 */}
      <View className="ci-form-body">

        {/* 任务概览卡片 — 对齐Web第83-96行: 白色+圆角+阴影+左侧绿方块Star */}
        <View className="ci-task-card">
          {/* 卡片右上角光斑 */}
          <View className="ci-card-glow" />
          {/* 左侧绿方块+Star图标 */}
          <View className="ci-task-badge">
            <Icon name="star" size={32} color="#FFFFFF" />
          </View>
          {/* 右侧信息 */}
          <View className="ci-task-info">
            <Text className="ci-task-label">
              {isReviewMode ? '待审核任务' : '进行中任务'}
            </Text>
            <Text className="ci-task-title">{task.title}</Text>
            <View className="ci-task-user-row">
              <View className="ci-avatar-circle">
                <Text className="ci-avatar-text">{userName?.charAt(0) || '?'}</Text>
              </View>
              <Text className="ci-task-user-text">
                {isReviewMode ? '提交人' : '打卡人'}：{userName}
              </Text>
            </View>
          </View>
        </View>

        {/* 打卡按钮区域 — 对齐Web第99-121行 */}
        <View className="ci-button-area">
          <View className="ci-btn-relative">

            {/* 主按钮 — 绿色渐变+CheckCircle2+"确认打卡"文字 */}
            <View
              className={`ci-main-btn ${checkingIn ? 'checking' : ''}`}
              onClick={!checkingIn ? handleCheckIn : undefined}
            >
              {/* 按钮内部高光 — 对齐Web第108行 radial-gradient */}
              <View className="ci-btn-shine" />
              <View className="ci-btn-content">
                <Icon name="checkCircle2" size={88} color="#FFFFFF" />
                <Text className="ci-btn-text">
                  {isReviewMode ? '确认完成' : '确认打卡'}
                </Text>
              </View>
              {/* 脉冲环 — 对齐Web第112行 animate-ping */}
              {!checkingIn && <View className="ci-ping-ring" />}
              {/* hover环（小程序改为常显淡环） */}
              {!checkingIn && <View className="ci-hover-ring" />}
            </View>

          </View>
        </View>

        {/* 星星预览胶囊 — 对齐Web第122-134行 */}
        <View className="ci-reward-pill">
          <View className="ci-reward-star-box">
            <Icon name="star" size={20} color="#006e1c" />
          </View>
          <Text className="ci-reward-text">
            将获得<Text className="ci-reward-num"> {stars} </Text>颗星星奖励
          </Text>
        </View>

        {/* 底部励志文案 — 对齐Web第136-142行: 呼吸动画 */}
        <Text className="ci-motivation">继续加油</Text>

      </View>
    </View>
  );
}
