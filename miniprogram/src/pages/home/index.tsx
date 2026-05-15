import { View, Text, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { isGuestMode, getGuestData } from '@/lib/guestData';
import { resolveAvatarPath } from '@/lib/templates';
import Icon from '@/components/Icon';
import VoiceAssistant from '@/components/VoiceAssistant';
import { NotificationBell } from '@/components/NotificationCenter';
import './index.scss';

const STORAGE_KEY = 'guest_user';
const SUPABASE_AUTH_STORAGE_KEY = 'sb-qdiuufuoleharmjfarzr-auth-token';
export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [stars, setStars] = useState<number>(0);
  const [todayEarnedStars, setTodayEarnedStars] = useState<number>(0);
  const [bottomTab, setBottomTab] = useState<'leaderboard' | 'quadrant'>('leaderboard');
  const [showSparkles, setShowSparkles] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const prevStarsRef = useRef(0);

  useEffect(() => {
    initData();
  }, []);

  // 监听星星变化触发闪烁动画
  useEffect(() => {
    if (prevStarsRef.current !== 0 && prevStarsRef.current !== stars) {
      setShowSparkles(true);
      const timer = setTimeout(() => setShowSparkles(false), 2000);
      return () => clearTimeout(timer);
    }
    prevStarsRef.current = stars;
  }, [stars]);

  const initData = async () => {
    try {
      // ===== 1. 游客模式优先走本地数据，避免小程序调试时触发云端鉴权噪声 =====
      if (isGuestMode()) {
        console.log('[Home] Guest mode active, loading local demo data');
        const guestData = getGuestData();
        const storedUser = Taro.getStorageSync(STORAGE_KEY);
        const parsedUser = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;

        const currentGuest = guestData.members.find((m: any) =>
          parsedUser?.id === m.id || (!parsedUser && m.id === 'guest-son')
        ) || guestData.members[2];

        setCurrentUser(currentGuest);
        setMember(currentGuest);
        setStars(currentGuest.stars || 0);
        setMembers(guestData.members);

        const normalTasks = (guestData.tasks as any[])
          .filter((t: any) => !t.is_habit)
          .slice(0, 4);
        setTodayTasks(normalTasks);
        setTodayEarnedStars(3);
        return;
      }

      const authToken = Taro.getStorageSync(SUPABASE_AUTH_STORAGE_KEY);
      if (!authToken) {
        Taro.reLaunch({ url: '/pages/login/index' });
        return;
      }

      // ===== 2. 非游客模式再检查真实登录状态 =====
      let userData;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userData = user;
      } catch (authError) {
        console.warn('[Home] auth check failed:', authError);
      }

      if (!userData) {
        Taro.reLaunch({ url: '/pages/login/index' });
        return;
      }

      // 有真实登录用户 → 走真实数据路径
      if (userData) {
        console.log('[Home] Real user logged in, fetching real data:', userData.id);

        // 2. 当前用户成员信息
        const { data: memberData } = await supabase
          .from('members')
          .select('*')
          .eq('id', userData.id)
          .single();

        if (memberData) {
          setCurrentUser(userData);
          setMember(memberData);
          setStars(memberData.stars || 0);

          // 3. 家庭所有成员（排行榜）
          if (memberData.family_id) {
            const { data: familyMembers } = await supabase
              .from('members')
              .select('*')
              .eq('family_id', memberData.family_id);

            if (familyMembers) setMembers(familyMembers);

            // 4. 今日任务（排除已完成和习惯任务）
            const today = new Date().toISOString().split('T')[0];
            const { data: tasks } = await supabase
              .from('tasks')
              .select('*')
              .eq('family_id', memberData.family_id)
              .gte('start_time', today)
              .lt('start_time', `${today}T23:59:59`)
              .neq('status', 'completed');

            if (tasks) {
              // 过滤掉习惯性任务(is_habit=true)，只保留普通任务，最多4条
              const normalTasks = tasks.filter((t: any) => !t.is_habit).slice(0, 4);
              setTodayTasks(normalTasks);
            }

            // 5. 今日获得的星星（从history表）
            try {
              const { data: historyList } = await supabase
                .from('task_history')
                .select('*')
                .eq('user_id', userData.id)
                .gte('created_at', today)
                .lt('created_at', `${today}T23:59:59`)
                .gt('stars', 0);

              if (Array.isArray(historyList)) {
                const earned = historyList.reduce((acc: number, h: any) => acc + (h.stars || 0), 0);
                setTodayEarnedStars(earned);
              }

              // 如果没有 task_history 表或为空，尝试 check_ins 表
              if (!historyList || historyList.length === 0) {
                const { data: checkIns } = await supabase
                  .from('check_ins')
                  .select('*')
                  .eq('user_id', userData.id)
                  .gte('created_at', today)
                  .lt('created_at', `${today}T23:59:59`);

                if (Array.isArray(checkIns)) {
                  const earned = checkIns.reduce((acc: number, c: any) => acc + (c.reward_stars || 0), 0);
                  setTodayEarnedStars(earned);
                }
              }
            } catch {
              // history 查询失败不影响主流程
            }
          }
        }
        return; // 真实数据加载完成
      }

      // ===== 3. 既无真实用户也无游客模式 → 跳转登录页 =====
      console.log('[Home] No user at all, redirecting to login...');
      Taro.reLaunch({ url: '/pages/login/index' });
    } catch (e) {
      console.error('[Home] initData error:', e);
    }
  };

  // ====== 交互处理函数 ======

  /** 头像点击 - 切换用户（对齐Web版 SwitchProfile） */
  const handleAvatarClick = () => {
    Taro.navigateTo({ url: '/pkg/switch-profile/index' });
  };

  /** 星星余额点击 -> 历史记录页 */
  const handleStarClick = () => {
    Taro.navigateTo({ url: '/pkg/history/index' });
  };

  /** 通知按钮 -> 通知设置/通知中心 */
  const handleNotificationClick = () => {
    Taro.navigateTo({ url: '/pkg/settings/notifications/index' });
  };

  /** 快捷操作：创建任务 */
  const handleCreateTask = () => {
    Taro.navigateTo({ url: '/pkg/templates/index' });
  };

  /** 快捷操作：日历视图 */
  const handleCalendar = () => {
    Taro.navigateTo({ url: '/pkg/calendar/index' });
  };

  /** 快捷操作：番茄钟 */
  const handlePomodoro = () => {
    Taro.navigateTo({ url: '/pkg/pomodoro/index' });
  };

  /** 快捷操作：AI分析与智能建档 */
  const handleAiAnalysis = () => {
    Taro.navigateTo({ url: '/pkg/ai-analysis/index' });
  };

  /** 快捷操作：计划管理 */
  const handlePlans = () => {
    Taro.navigateTo({ url: '/pkg/plans/index' });
  };

  /** 任务卡片点击 */
  const handleTaskClick = (taskId: string) => {
    Taro.navigateTo({ url: `/pkg/tasks/detail/index?id=${taskId}` });
  };

  /** 查看全部任务 */
  const handleViewAllTasks = () => {
    Taro.switchTab({ url: '/pages/tasks/index' });
  };

  /** 排行榜成员点击 */
  const handleMemberClick = (memberId: string) => {
    Taro.navigateTo({ url: `/pkg/members/detail/index?id=${memberId}` });
  };

  /** 四象限入口 */
  const handleQuadrantClick = () => {
    Taro.navigateTo({ url: '/pkg/quadrant/index' });
  };

  // ====== 排行榜数据处理 ======
  const top3Members = [...members]
    .sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0))
    .slice(0, 3);

  // 领奖台布局排序: 第2名在左边, 第1名在中间(最高), 第3名在右边
  const podiumOrder = top3Members.map((m: any, idx: number) => ({
    member: m,
    originalRank: idx + 1,
  })).sort((a, b) => {
    const posA = a.originalRank === 1 ? 1 : a.originalRank === 2 ? 0 : 2;
    const posB = b.originalRank === 1 ? 1 : b.originalRank === 2 ? 0 : 2;
    return posA - posB;
  });

  const completedTasks = todayTasks.filter((task: any) => task.status === 'completed').length;
  const taskProgress = todayTasks.length > 0 ? Math.round((completedTasks / todayTasks.length) * 100) : 0;

  return (
    <View className="home-page">
      <View className="home-content">
      {/* ========== Header 固定顶部栏 ========== */}
      <View className="header">
        {/* 左侧：头像 + AI麦克风 */}
        <View className="header-left">
          {/* 用户头像（可点击切换） */}
          <View className="avatar-wrapper" onClick={handleAvatarClick}>
            {currentUser?.avatar ? (
              <Image className="avatar-img" src={resolveAvatarPath(currentUser.avatar)} />
            ) : (
              <View className="avatar-placeholder">
                <Text>{(member?.name || '?').charAt(0)}</Text>
              </View>
            )}
          </View>

          {/* AI麦克风按钮 */}
          <View className="mic-btn" onClick={() => setIsAiDialogOpen(true)}>
            <Icon name="microphone" size={40} color="#006e1c" />
          </View>
        </View>

        {/* 右侧：星星余额胶囊 + 通知按钮 */}
        <View className="header-right">
          {/* 星星余额胶囊（可点击查看历史） */}
          <View className="star-capsule" onClick={handleStarClick}>
            <Icon name="star" size={28} color="#686000" />
            <Text className="star-balance-text">{stars.toLocaleString()}</Text>
          </View>

          <NotificationBell onClick={handleNotificationClick} />
        </View>
      </View>

      {/* ========== 能量卡：对齐线上 Web 首页 ========== */}
      <View className={`energy-card ${showSparkles ? 'sparkle-active' : ''}`}>
        <View className="float-decor float-star">
          <Icon name="star" size={40} color="#FFD54F" />
        </View>
        <View className="float-decor float-sparkles">
          <Icon name="zap" size={54} color="#FFFFFF" opacity="0.32" />
        </View>
        <View className="energy-content">
          <View className="energy-top-row">
            <View>
              <Text className="energy-hi">Hi~</Text>
              <Text className="energy-name">{member?.name || '小伙伴'}</Text>
            </View>
            <View className="energy-mood-btn">
              <Icon name="smile" size={34} color="#ffffff" />
            </View>
          </View>

          <View className="energy-stats-grid">
            <View className="energy-stat">
              <View className="energy-stat-line">
                <Icon name="star" size={26} color="#FFD54F" />
                <Text className="energy-stat-value">{stars.toLocaleString()}</Text>
              </View>
              <Text className="energy-stat-label">星星</Text>
            </View>
            <View className="energy-stat">
              <Text className="energy-stat-value">{completedTasks}/{todayTasks.length}</Text>
              <Text className="energy-stat-label">今日任务</Text>
            </View>
            <View className="energy-stat">
              <View className="energy-stat-line">
                <Icon name="flame" size={24} color="#FFD54F" />
                <Text className="energy-stat-value">0</Text>
              </View>
              <Text className="energy-stat-label">连续天数</Text>
            </View>
          </View>

          {todayTasks.length > 0 && (
            <View className="energy-progress-wrap">
              <View className="energy-progress-head">
                <Text>今日进度</Text>
                <Text>{taskProgress}%</Text>
              </View>
              <View className="energy-progress-track">
                <View className="energy-progress-fill" style={{ width: `${taskProgress}%` }} />
              </View>
            </View>
          )}
          <View className="energy-subtitle-box">
            <Text className="energy-subtitle">今天获得 {todayEarnedStars.toLocaleString()} 颗星星，继续保持</Text>
          </View>
        </View>
      </View>

      {/* ========== 快捷操作（6列网格 - 对齐Web版+扩展） ========== */}
      <View className="quick-actions-grid">
        {/* 创建任务 */}
        <View className="quick-action-item" onClick={handleCreateTask}>
          <View className="action-icon-circle action-icon-green">
            <Icon name="plusCircle" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">创建任务</Text>
        </View>

        {/* AI分析 */}
        <View className="quick-action-item" onClick={handleAiAnalysis}>
          <View className="action-icon-circle action-icon-highlight">
            <Icon name="sparkles" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">AI分析</Text>
        </View>

        {/* 日历 */}
        <View className="quick-action-item" onClick={handleCalendar}>
          <View className="action-icon-circle action-icon-blue">
            <Icon name="calendar" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">日历</Text>
        </View>

        {/* 计划 */}
        <View className="quick-action-item" onClick={handlePlans}>
          <View className="action-icon-circle action-icon-primary">
            <Icon name="grid" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">计划</Text>
        </View>

        {/* 番茄钟 */}
        <View className="quick-action-item" onClick={handlePomodoro}>
          <View className="action-icon-circle" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Icon name="clock" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">番茄钟</Text>
        </View>
      </View>

      {/* ========== 今日任务 ========== */}
      <View className="section">
        <View className="section-header">
          <View className="section-title-row">
            <Text className="section-title">今日任务</Text>
            <View className="task-count-badge">
              <Text>{todayTasks.length}</Text>
            </View>
          </View>
          <Text className="view-all-link" onClick={handleViewAllTasks}>查看全部</Text>
        </View>

        {todayTasks.length > 0 ? (
          <View className="task-list">
            {todayTasks.map((task, idx) => {
              const isReviewing = task.status === 'reviewing';
              const isPending = task.status === 'pending';
              const isAdmin = member?.role === 'parent';

              return (
                <View key={task.id} className="task-card" onClick={() => handleTaskClick(task.id)}>
                  {/* 左侧色条 */}
                  <View className="task-color-bar" style={{
                    backgroundColor:
                      task.status === 'completed' ? '#9E9E9E' :
                      isReviewing ? '#FF9800' :
                      task.quadrant_color || '#4CAF50'
                  }} />

                  {/* 任务图标区 */}
                  <View className={`task-icon-box ${
                    task.status === 'completed' ? 'is-completed' :
                    isReviewing ? 'is-reviewing' :
                    'is-pending'
                  }`}>
                    <Icon
                      name={task.status === 'completed' ? 'checkCircle2' : isReviewing ? 'clock' : 'listTodo'}
                      size={34}
                      color={task.status === 'completed' ? '#006e1c' : isReviewing ? '#f57c00' : '#5d6559'}
                    />
                  </View>

                  {/* 中间内容区 */}
                  <View className="task-content">
                    <Text className={`task-title ${task.status === 'completed' ? 'task-completed' : ''}`}>
                      {task.title}
                    </Text>
                    <View className="task-meta-row">
                      <View className="task-meta-item">
                        <Icon name="clock" size={18} color="#8b9486" />
                        <Text className="task-time">
                          {isReviewing ? '待审核' : new Date(task.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text className="task-meta-dot">•</Text>
                      <View className="task-meta-item task-assignee">
                        <Icon name="user" size={18} color="#8b9486" />
                        <Text className="task-time">
                          {Array.isArray(task.assignee_ids)
                            ? task.assignee_ids.map((id: string) => members.find((m: any) => m.id === id)?.name).filter(Boolean).join('、') || '所有人'
                            : '所有人'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 右侧操作区 — 对齐Web版 TaskCard */}
                  <View className="task-action-area">
                    {/* 待审核状态 → 橙色"核实"/"待确认"按钮 */}
                    {isReviewing && (
                      <View
                        className={`checkin-btn checkin-btn-review ${isAdmin ? 'can-approve' : 'pending-confirm'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          Taro.navigateTo({ url: `/pkg/check-in/index?taskId=${task.id}` });
                        }}
                      >
                        <Icon name={isAdmin ? "checkCircle2" : "clock"} size={28} color="#FFFFFF" />
                        <Text className="checkin-btn-text">{isAdmin ? '核实' : '待确认'}</Text>
                      </View>
                    )}

                    {/* 待完成状态 → 绿色"打卡"按钮（对齐 Web TaskCard 第134-144行） */}
                    {isPending && (
                      <View
                        className="checkin-btn checkin-btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          Taro.navigateTo({ url: `/pkg/check-in/index?taskId=${task.id}` });
                        }}
                      >
                        <Icon name="checkCircle2" size={32} color="#FFFFFF" />
                        <Text className="checkin-btn-text">打卡</Text>
                      </View>
                    )}

                    {/* 已完成 / 其他状态 → 星星数 */}
                    {!isPending && !isReviewing && (
                      <View className="task-stars">
                        <Icon name="star" size={28} color={task.status === 'completed' ? '#BDBDBD' : '#686000'} />
                        <Text className={`task-stars-text ${task.status === 'completed' ? 'text-disabled' : ''}`}>
                          +{task.reward_stars || 0}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="empty-state">
            <Text>今天没有任务 🎉</Text>
          </View>
        )}
      </View>

      {/* ========== 排行榜 / 四象限 切换区 ========== */}
      <View className="bottom-section">
        {/* Tab切换器 */}
        <View className="tab-switcher">
          <View className="tab-switcher-bg">
            <View
              className={`tab-switch-btn ${bottomTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setBottomTab('leaderboard')}
            >
              <Text>排行榜</Text>
            </View>
            <View
              className={`tab-switch-btn ${bottomTab === 'quadrant' ? 'active' : ''}`}
              onClick={() => setBottomTab('quadrant')}
            >
              <Text>四象限</Text>
            </View>
          </View>
          {bottomTab === 'leaderboard' && (
            <Icon name="sparkles" size={32} color="#686000" />
          )}
        </View>

        {/* 排行榜视图 - 领奖台 */}
        {bottomTab === 'leaderboard' && (
          <View className="podium-area">
            {podiumOrder.map(({ member: m, originalRank }) => {
              const isFirst = originalRank === 1;
              return (
                <View key={m.id} className="podium-item">
                  {/* 排名徽章 */}
                  <View className={`rank-badge ${isFirst ? 'rank-first' : ''}`}>
                    <Text className="rank-num">{originalRank}</Text>
                  </View>

                  {/* 头像 */}
                  <View className="podium-avatar-wrap" onClick={() => handleMemberClick(m.id)}>
                    {m.avatar ? (
                      <Image className="podium-avatar" src={resolveAvatarPath(m.avatar)} mode="aspectFill" />
                    ) : (
                      <View className="podium-avatar-placeholder">
                        <Text>{(m.name || '?').charAt(0)}</Text>
                      </View>
                    )}
                  </View>

                  {/* 领奖台底座 */}
                  <View className={`pedestal ${isFirst ? 'pedestal-first' : originalRank === 2 ? 'pedestal-second' : 'pedestal-third'}`}>
                    <Text className={`pedestal-name ${isFirst ? 'text-white' : ''}`}>{m.name}</Text>
                    <Text className={`pedestal-stars ${isFirst ? 'text-white' : ''}`}>{(m.stars || 0).toLocaleString()}</Text>
                    {isFirst && <View className="pedestal-shine" />}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 四象限入口 */}
        {bottomTab === 'quadrant' && (
          <View className="quadrant-entry">
            <View className="quadrant-entry-btn" onClick={handleQuadrantClick}>
              <Icon name="grid" size={80} color="#006e1c" />
              <Text className="quadrant-entry-text">四象限分析</Text>
            </View>
            <Text className="quadrant-entry-hint">点击查看完整分析</Text>
          </View>
        )}
      </View>

      {/* ========== AI 语音助手弹窗 ========== */}
      <VoiceAssistant
        visible={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        userId={currentUser?.id}
        familyId={member?.family_id}
      />
      </View>
    </View>
  );
}
