import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { isGuestMode, getGuestData } from '@/lib/guestData';
import { resolveAvatarPath } from '@/lib/templates';
import Icon from '@/components/Icon';
import VoiceAssistant from '@/components/VoiceAssistant';
import './index.scss';

const STORAGE_KEY = 'guest_user';
const MINI_PROGRAM_VERSION = 'v1.0.3';

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

      // ===== 2. 非游客模式再检查真实登录状态 =====
      let userData;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userData = user;
      } catch (authError) {
        console.warn('[Home] auth check failed:', authError);
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
    console.log('[Home-DEBUG] handleAvatarClick FIRED!');
    Taro.navigateTo({ url: '/pages/switch-profile/index' });
  };

  /** 星星余额点击 -> 历史记录页 */
  const handleStarClick = () => {
    console.log('[Home-DEBUG] handleStarClick FIRED!');
    Taro.navigateTo({ url: '/pages/history/index' });
  };

  /** 设置按钮 -> 个人中心 */
  const handleSettingsClick = () => {
    console.log('[Home-DEBUG] handleSettingsClick FIRED!');
    Taro.switchTab({ url: '/pages/profile/index' });
  };

  /** 快捷操作：创建任务 */
  const handleCreateTask = () => {
    console.log('[Home-DEBUG] handleCreateTask FIRED!');
    Taro.navigateTo({ url: '/pages/tasks/create/index' });
  };

  /** 快捷操作：日历视图 */
  const handleCalendar = () => {
    console.log('[Home-DEBUG] handleCalendar FIRED!');
    Taro.switchTab({ url: '/pages/tasks/index' });
  };

  /** 快捷操作：番茄钟 */
  const handlePomodoro = () => {
    console.log('[Home-DEBUG] handlePomodoro FIRED!');
    Taro.navigateTo({ url: '/pages/pomodoro/index' });
  };

  /** 快捷操作：AI分析与智能建档 */
  const handleAiAnalysis = () => {
    console.log('[Home-DEBUG] handleAiAnalysis FIRED!');
    Taro.navigateTo({ url: '/pages/ai-analysis/index' });
  };

  /** 快捷操作：计划管理 */
  const handlePlans = () => {
    console.log('[Home-DEBUG] handlePlans FIRED!');
    Taro.navigateTo({ url: '/pages/plans/index' });
  };

  /** 任务卡片点击 */
  const handleTaskClick = (taskId: string) => {
    console.log('[Home-DEBUG] handleTaskClick FIRED! taskId=', taskId);
    Taro.navigateTo({ url: `/pages/tasks/detail/index?id=${taskId}` });
  };

  /** 查看全部任务 */
  const handleViewAllTasks = () => {
    Taro.switchTab({ url: '/pages/tasks/index' });
  };

  /** 排行榜成员点击 */
  const handleMemberClick = (memberId: string) => {
    Taro.navigateTo({ url: `/pages/members/detail/index?id=${memberId}` });
  };

  /** 四象限入口 */
  const handleQuadrantClick = () => {
    Taro.navigateTo({ url: '/pages/quadrant/index' });
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

  const pendingTasks = todayTasks.filter((task: any) => task.status === 'pending').length;
  const reviewingTasks = todayTasks.filter((task: any) => task.status === 'reviewing').length;

  return (
    <ScrollView scrollY className="home-page">
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

        <View className="header-center">
          <Text className="home-brand-title">WishCard 家庭管家</Text>
          <Text className="home-version-text">小程序新版 {MINI_PROGRAM_VERSION}</Text>
        </View>

        {/* 右侧：星星余额胶囊 + 设置按钮 */}
        <View className="header-right">
          {/* 星星余额胶囊（可点击查看历史） */}
          <View className="star-capsule" onClick={handleStarClick}>
            <Icon name="star" size={28} color="#686000" />
            <Text className="star-balance-text">{stars.toLocaleString()}</Text>
          </View>

          {/* 设置按钮 */}
          <View className="settings-btn" onClick={handleSettingsClick}>
            <Icon name="settings" size={40} color="#006e1c" />
          </View>
        </View>
      </View>

      <View className="latest-banner" onClick={handleAiAnalysis}>
        <View className="latest-banner-copy">
          <Text className="latest-kicker">新版已生效</Text>
          <Text className="latest-title">AI分析、复盘和日程方案已集中到家庭管家</Text>
          <Text className="latest-desc">今日待办 {pendingTasks} 项 · 待确认 {reviewingTasks} 项 · 家庭星星 {stars.toLocaleString()}</Text>
        </View>
        <View className="latest-banner-action">
          <Icon name="sparkles" size={46} color="#ffffff" />
          <Text>进入</Text>
        </View>
      </View>

      <View className="smart-cards-row">
        <View className="smart-card" onClick={handleAiAnalysis}>
          <Icon name="barChart" size={36} color="#006e1c" />
          <Text className="smart-card-title">家庭复盘</Text>
          <Text className="smart-card-desc">周报/月报</Text>
        </View>
        <View className="smart-card" onClick={() => Taro.navigateTo({ url: '/pages/schedule-recommend/index' })}>
          <Icon name="calendar" size={36} color="#1976D2" />
          <Text className="smart-card-title">日程建议</Text>
          <Text className="smart-card-desc">假期/课外班</Text>
        </View>
        <View className="smart-card" onClick={handleQuadrantClick}>
          <Icon name="target" size={36} color="#F57C00" />
          <Text className="smart-card-title">四象限</Text>
          <Text className="smart-card-desc">轻重缓急</Text>
        </View>
      </View>

      {/* ========== 能量卡（今日成长能量） ========== */}
      <View className={`energy-card ${showSparkles ? 'sparkle-active' : ''}`}>
        {/* 浮动装饰元素 - Star */}
        <View className="float-decor float-star">
          <Icon name="star" size={64} color="#FFD54F" />
        </View>

        {/* 浮动装饰元素 - Sparkles */}
        <View className="float-decor float-sparkles">
          <Icon name="sparkles" size={96} color="#FFFFFF" opacity="0.3" />
        </View>

        {/* 浮动光点 */}
        <View className="float-glow-dot" />

        {/* 主内容区 */}
        <View className="energy-content">
          {/* 标题标签 */}
          <View className="energy-badge">
            <View className="energy-badge-icon">
              <Icon name="sparkles" size={28} color="#FFD54F" />
            </View>
            <Text className="energy-badge-text">今日成长能量</Text>
          </View>

          {/* 今日获得星星数（大号动态数字） */}
          <View className="energy-number-row">
            <Text className="energy-number">{todayEarnedStars.toLocaleString()}</Text>
            <View className="energy-star-icon">
              <Icon name="star" size={72} color="#FFD54F" />
            </View>
          </View>

          {/* 副标题 */}
          <View className="energy-subtitle-box">
            <Text className="energy-subtitle">加油！离下一个愿望更近了</Text>
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

        {/* 日历 */}
        <View className="quick-action-item" onClick={handleCalendar}>
          <View className="action-icon-circle action-icon-blue">
            <Icon name="calendar" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">日历</Text>
        </View>

        {/* AI分析 */}
        <View className="quick-action-item" onClick={handleAiAnalysis}>
          <View className="action-icon-circle" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Icon name="sparkles" size={48} color="#ffffff" />
          </View>
          <Text className="action-label">AI分析</Text>
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

                  {/* 中间内容区 */}
                  <View className="task-content">
                    <Text className={`task-title ${task.status === 'completed' ? 'task-completed' : ''}`}>
                      {task.title}
                    </Text>
                    <Text className="task-time">
                      {isReviewing ? '待审核' : new Date(task.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* 右侧操作区 — 对齐Web版 TaskCard */}
                  <View className="task-action-area">
                    {/* 待审核状态 → 橙色"核实"/"待确认"按钮 */}
                    {isReviewing && (
                      <View
                        className={`checkin-btn checkin-btn-review ${isAdmin ? 'can-approve' : 'pending-confirm'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          Taro.navigateTo({ url: `/pages/check-in/index?taskId=${task.id}` });
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
                          Taro.navigateTo({ url: `/pages/check-in/index?taskId=${task.id}` });
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
    </ScrollView>
  );
}
