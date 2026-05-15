/**
 * 任务详情页 — 对齐 Web 版 TaskCard 详情视图
 *
 * Phase 2 补齐:
 * ✅ 创建者信息区块 (creator_name/creator_avatar)
 * ✅ 参与者独立进度追踪 (memberProgress)
 * ✅ 多成员分配展示 (assignee_ids → 成员头像列表)
 */
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import { isGuestMode, getGuestData, updateGuestData } from '@/lib/guestData';
import { resolveIconPath, resolveAvatarPath } from '@/lib/templates';
import './index.scss';

/** 任务类型 → emoji 映射（与 index.tsx 保持一致） */
const TASK_TYPE_EMOJI: Record<string, string> = {
  'homework': '✏️', 'math': '🔢', 'writing': '📝', 'essay': '📝',
  'english': '🔤', 'read': '📖', 'reading': '📖', 'recite': '📜',
  'calligraphy': '✍️', 'dictation': '🎤', 'memorizing': '🧠',
  'mental_arithm': '🧮', 'science': '🔬', 'chinese': '📕',
  'sports': '🏃', 'jump': '⬆️', 'run': '🏃', 'wake': '☀️',
  'drink': '🥛', 'water': '💧', 'eat': '🥗', 'egg': '🥚',
  'brush': '', 'wash': '🛁', 'face': '😊', 'milk': '🥛',
  'pack': '🎒', 'school': '🎒',
  'music': '🎵', 'piano': '🎹', 'violin': '🎻', 'draw': '🎨',
  'dance': '💃', 'swim': '🏊', 'bike': '🚲',
  'teach': '🏆', 'praise': '⭐', 'stay': '📱', 'phone': '📱',
};

const inferEmoji = (icon: string | undefined, title: string | undefined): string => {
  const key = (icon || '').toLowerCase() + ' ' + (title || '').toLowerCase();
  for (const [k, emoji] of Object.entries(TASK_TYPE_EMOJI)) {
    if (key.includes(k)) return emoji;
  }
  return '📝';
};

/**
 * 任务详情页
 * 路由: /pages/tasks/detail/index?id=xxx
 *
 * 数据流:
 * 1. 路由参数获取 taskId
 * 2. 游客模式 → guestData.tasks.find()
 * 3. 正式模式 → supabase.from('tasks').select() (含 creator 关联查询)
 * 4. 如果有 assignee_ids → 额外查询成员表获取头像/名字
 */
export default function TaskDetail() {
  const router = useRouter();
  const taskId = router.params?.id || '';
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  // 【新增】创建者信息和参与者列表
  const [creatorInfo, setCreatorInfo] = useState<{ name: string; avatar: string } | null>(null);
  const [assigneeList, setAssigneeList] = useState<Array<{ id: string; name: string; avatar: string; progress?: string }>>([]);

  useEffect(() => {
    if (taskId) loadTask(taskId);
  }, [taskId]);

  const loadTask = async (id: string) => {
    // 游客模式：从本地演示数据加载
    if (isGuestMode()) {
      console.log('[TaskDetail] 游客模式：从本地数据加载');
      const guestData = getGuestData();
      const guestTask = guestData.tasks.find((t: any) => t.id === id) as any;
      if (guestTask) {
        setTask(guestTask);
        // 游客模式的创建者和执行人
        setCreatorInfo({ name: guestTask.creator_name || '家长', avatar: '' });
        const assigneeName = guestTask.assignee_name || '孩子';
        setAssigneeList([{ id: guestTask.assignee_id || '1', name: assigneeName, avatar: '', progress: guestTask.status }]);
      }
      setLoading(false);
      return;
    }

    try {
      // 正式模式：查任务数据
      const { data } = await supabase.from('tasks').select('*').eq('id', id).single();

      if (!data) { setLoading(false); return; }

      // 修复数据库中的旧格式图标/头像路径
      data.icon = resolveIconPath(data.icon);
      setTask(data);

      // 【新增】加载创建者信息 (对齐 Web creator_id 关联)
      if (data.creator_id) {
        try {
          const { data: creator } = await supabase
            .from('members')
            .select('name, avatar')
            .eq('id', data.creator_id)
            .single();
          if (creator) {
            setCreatorInfo({ name: creator.name || '未知家长', avatar: resolveAvatarPath(creator.avatar) || '' });
          } else {
            setCreatorInfo({ name: '发布者', avatar: '' });
          }
        } catch {
          setCreatorInfo({ name: '发布者', avatar: '' });
        }
      }

      // 【新增】加载参与者列表及独立进度 (对齐 Web memberProgress L547)
      const assigneeIds: string[] = data.assignee_ids || [];
      if (assigneeIds.length > 0) {
        try {
          const { data: members } = await supabase
            .from('members')
            .select('id, name, avatar')
            .in('id', assigneeIds);

          if (members && members.length > 0) {
            const memberProgress = data.member_progress || {};
            const list = members.map((m: any) => ({
              id: m.id,
              name: m.name || '未知',
              avatar: m.avatar || '',
              progress: memberProgress[m.id] || data.status || 'pending',
            }));
            setAssigneeList(list);
          }
        } catch (e) {
          console.warn('[TaskDetail] 加载参与者失败:', e);
        }
      }
    } catch (err) {
      console.error('[TaskDetail] 加载失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
    setLoading(false);
  };

  // 状态映射 (含 in_progress 对齐 Web TaskStatus)
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待完成', color: '#006e1c' },
    in_progress: { label: '进行中', color: '#3b82f6' },
    reviewing: { label: '待审核', color: '#f97316' },
    completed: { label: '已完成', color: '#4CAF50' },
    rejected: { label: '已退回', color: '#ef4444' },
  };
  const statusInfo = task?.status ? statusMap[task.status] : statusMap.pending;

  // 进度状态中文映射
  const progressLabelMap: Record<string, string> = {
    pending: '待完成',
    in_progress: '进行中',
    reviewing: '审核中',
    completed: '已完成',
    rejected: '已退回',
  };

  // Loading
  if (loading) {
    return (
      <View className="td-page">
        <View className="td-loading"><Icon name="loader" size={48} color="#006e1c" /><Text>加载中...</Text></View>
      </View>
    );
  }

  if (!task) {
    return (
      <View className="td-page">
        <View className="td-empty">
          <Icon name="alertCircle" size={64} color="#becab9" />
          <Text className="td-empty-text">任务不存在</Text>
          <View className="td-back-btn" onClick={() => Taro.navigateBack()}><Text>返回</Text></View>
        </View>
      </View>
    );
  }

  // 解析时间
  const startTime = task.start_time ? new Date(task.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const endTime = task.end_time || task.deadline;
  const endTimeStr = endTime ? new Date(endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  // 奖励星星
  const stars = Math.abs(task.star_amount ?? task.reward_stars ?? 0);

  return (
    <View className="td-page">
      {/* ===== Header ===== */}
      <View className="td-header">
        <View className="td-back-btn" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={36} color="#1b1c1a" />
        </View>
        <Text className="td-header-title">任务详情</Text>
        {/* 设置菜单 */}
        <View className="td-menu-btn" onClick={() => setShowMenu(!showMenu)}>
          <Icon name="settings" size={36} color="#666" />
        </View>

        {/* 弹出菜单 */}
        {showMenu && (
          <View className="td-menu-popup">
            <View className="td-menu-mask" onClick={() => setShowMenu(false)} />
            <View className="td-menu-list">
              <View className="td-menu-item" onClick={() => {
                setShowMenu(false);
                Taro.navigateTo({ url: `/pages/tasks/edit/index?id=${taskId}` });
              }}>
                <Icon name="edit" size={28} color="#006e1c" />
                <Text className="td-menu-item-text">编辑任务</Text>
              </View>
              <View className="td-menu-item danger" onClick={() => {
                setShowMenu(false);
                Taro.showModal({
                  title: '确认删除',
                  content: `确定要删除「${task.title}」吗？`,
                  success: async (res) => {
                    if (!res.confirm) return;
                    try {
                      if (isGuestMode()) {
                        updateGuestData((draft) => {
                          draft.tasks = (draft.tasks || []).filter((item: any) => item.id !== taskId);
                        });
                        Taro.showToast({ title: '已删除（演示）', icon: 'success' });
                        setTimeout(() => Taro.navigateBack(), 1000);
                        return;
                      }
                      await supabase.from('tasks').delete().eq('id', taskId);
                      Taro.showToast({ title: '已删除', icon: 'success' });
                      setTimeout(() => Taro.navigateBack(), 1000);
                    } catch {
                      Taro.showToast({ title: '删除失败', icon: 'none' });
                    }
                  },
                });
              }}>
                <Icon name="trash" size={28} color="#ef4444" />
                <Text className="td-menu-item-text danger">删除任务</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ===== 内容区 ===== */}
      <ScrollView className="td-content" scrollY>
        <View className="td-body">
          {/* 大图标容器 */}
          <View className="td-hero-icon-block">
            <View className="td-hero-icon-wrap">
              {(() => {
                // 解析图标路径 — 对齐 resolveIconPath 逻辑
                const resolvedIcon = task.icon ? resolveIconPath(task.icon) : '';
                // 有效的本地 PNG 路径 → 显示图片
                if (resolvedIcon && resolvedIcon.startsWith('/') && !imgError) {
                  return (
                    <Image
                      className="td-hero-icon-img"
                      src={resolvedIcon}
                      mode="aspectFit"
                      onError={() => setImgError(true)}
                    />
                  );
                }
                // Fallback: 用 emoji 替代空白绿块
                return (
                  <Text style={{ fontSize: 88, lineHeight: 1.2 }}>
                    {inferEmoji(task.icon, task.title)}
                  </Text>
                );
              })()}
            </View>
            <View className="td-hero-icon-glow" />
          </View>

          {/* 标题 */}
          <Text className="td-hero-title">{task.title}</Text>

          {/* 时间行 */}
          {(startTime || endTime) && (
            <View className="td-time-pill">
              <Icon name="clock" size={28} color="#999" />
              <Text className="td-time-text">{startTime || '--:--'}{endTime && ` — ${endTimeStr}`}</Text>
            </View>
          )}

          {/* ===== 【新增】创建者信息区块 (对齐 Web 创建者卡片) ===== */}
          {creatorInfo && (
            <View className="td-creator-card">
              {(() => {
                const avatarUrl = resolveAvatarPath(creatorInfo.avatar || '');
                if (avatarUrl) {
                  return (
                    <Image
                      className="td-creator-avatar"
                      src={avatarUrl}
                      onError={(e: any) => {
                        // 图片加载失败时不需要特殊处理，保持当前布局
                        console.log('[TaskDetail] 创建者头像加载失败');
                      }}
                    />
                  );
                }
                // 无头像时显示首字母 fallback（绿色渐变背景 + 白色文字）
                return (
                  <View className="td-creator-avatar td-avatar-fallback">
                    <Text className="td-avatar-fallback-text">{(creatorInfo.name || '家').charAt(0)}</Text>
                  </View>
                );
              })()}
              <View className="td-creator-info">
                <Text className="td-creator-label">创建者</Text>
                <Text className="td-creator-name">{creatorInfo.name}</Text>
              </View>
              <View className="td-creator-role-tag"><Text>发布人</Text></View>
            </View>
          )}

          {/* ===== 【新增】多参与者独立进度追踪 (对齐 Web memberProgress L547) ===== */}
          {assigneeList.length > 1 ? (
            <View className="td-multi-progress-section">
              <Text className="td-section-title">参与成员</Text>
              <View className="td-multi-progress-list">
                {assigneeList.map(member => (
                  <View key={member.id} className="td-member-progress-card">
                    <Image
                      className="td-member-avatar"
                      src={resolveAvatarPath(member.avatar || '')}
                    />
                    <View className="td-member-info">
                      <Text className="td-member-name">{member.name}</Text>
                      <View className={`td-member-status-badge status-${member.progress || 'pending'}`}>
                        <View className="td-member-dot"
                          style={{
                            backgroundColor: (statusMap[member.progress || task.status] || statusMap.pending).color,
                          }}
                        />
                        <Text className="td-member-status-label"
                          style={{
                            color: (statusMap[member.progress || task.status] || statusMap.pending).color,
                          }}
                        >
                          {progressLabelMap[member.progress || task.status] || '待完成'}
                        </Text>
                      </View>
                    </View>
                    {member.progress === 'completed' && (
                      <Icon name="checkCircle" size={32} color="#4CAF50" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : assigneeList.length === 1 ? (
            /* 单执行人时显示原有分配人卡片样式 */
            <View className="td-assignee-card">
              {(() => {
                const avatarUrl = isGuestMode()
                  ? resolveAvatarPath(getGuestData().members.find((m: any) => m.id === task.assignee_id)?.avatar || '')
                  : resolveAvatarPath(assigneeList[0]?.avatar || '');
                const displayName = isGuestMode()
                  ? (getGuestData().members.find((m: any) => m.id === task.assignee_id)?.name || '未知')
                  : (assigneeList[0]?.name || task?.assignee_name || '未分配');
                return avatarUrl ? (
                  <Image className="td-assignee-avatar" src={avatarUrl} />
                ) : (
                  <View className="td-assignee-avatar td-avatar-fallback">
                    <Text className="td-avatar-fallback-text">{displayName.charAt(0)}</Text>
                  </View>
                );
              })()}
              <View className="td-assignee-info">
                <Text className="td-assignee-label">执行人</Text>
                <Text className="td-assignee-name">
                  {isGuestMode()
                    ? (getGuestData().members.find((m: any) => m.id === task.assignee_id)?.name || '未知')
                    : (assigneeList[0]?.name || task?.assignee_name || '未分配')}
                </Text>
              </View>
              <View className="td-assignee-tag"><Text>家庭协作</Text></View>
            </View>
          ) : null}

          {/* 描述区域 */}
          <View className="td-section">
            <Text className="td-section-title">描述</Text>
            <View className="td-desc-box">
              <View className="td-desc-deco" />
              <Text className="td-desc-text">{task.description || '暂无描述'}</Text>
            </View>
          </View>

          {/* 完成奖励 */}
          {stars > 0 && (
            <View className={`td-reward-card ${statusInfo.label === '已完成' ? 'completed' : ''}`}>
              <View className="td-reward-icon-wrap">
                <Icon name="star" size={40} color="#F9A825" />
              </View>
              <View className="td-reward-right">
                <Text className="td-reward-label">奖励</Text>
                <View className="td-reward-num-row">
                  <Text className="td-reward-num">{stars}</Text>
                  <View className="td-reward-mini-stars">
                    <Icon name="star" size={10} color="#F59E0B" />
                    <Icon name="star" size={8} color="#F59E0B" style={{ opacity: 0.6 }} />
                  </View>
                </View>
              </View>
              <View className="td-reward-deco-star"><Icon name="star" size={120} color="rgba(255,255,255,0.2)" /></View>
            </View>
          )}

          {/* 状态标签行 */}
          <View className="td-status-row">
            <View className="td-status-dot" style={{ backgroundColor: statusInfo.color }} />
            <Text className="td-status-label" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
            {task.is_habit && <Text className="td-habit-tag">习惯任务</Text>}
          </View>
        </View>

        {/* 底部占位 - 为固定底部按钮留空间 */}
        <View style={{ height: '160rpx' }} />
      </ScrollView>

      {/* ===== 底部操作栏（对齐 Web 第578-616行 Action FAB Area）===== */}
      <View className="td-bottom-bar">
        {(task.status === 'pending' || task.status === 'in_progress') && (
          <View className="td-action-btn td-action-primary" onClick={() => {
            Taro.navigateTo({ url: `/pages/check-in/index?taskId=${taskId}` });
          }}>
          <Icon name="checkCircle" size={36} color="#FFFFFF" />
          <Text className="td-action-text">打卡</Text>
        </View>
      )}
      {task.status === 'reviewing' && (
        <View
          className="td-action-btn td-action-blue"
          onClick={() => {
            Taro.navigateTo({ url: `/pages/check-in/index?taskId=${taskId}` });
          }}
        >
          <Icon name="checkCircle" size={36} color="#FFFFFF" />
          <Text className="td-action-text">审核</Text>
        </View>
      )}
      {task.status === 'completed' && (
        <View className="td-action-btn td-action-done">
          <Icon name="checkCircle" size={36} color="#006e1c" opacity={0.6} />
            <Text className="td-action-text td-action-done-text">奖励已发放</Text>
          </View>
        )}
      </View>
    </View>
  );
}
