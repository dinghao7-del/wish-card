import { View, Text, Image, Input, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { resolveAvatarPath } from '@/lib/templates';
import Icon from '@/components/Icon';
import { isGuestMode, getGuestData } from '@/lib/guestData';
import './index.scss';

export default function MemberDetail() {
  const router = useRouter();
  const memberId = router.params.id;
  const [member, setMember] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  // 星星编辑状态
  const [editingStars, setEditingStars] = useState(false);
  const [starDelta, setStarDelta] = useState(0);
  const [starReason, setStarReason] = useState('');
  // 删除确认
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 新增: 已完成任务 Modal (对齐Web)
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) loadMember();
  }, [memberId]);

  const loadMember = async () => {
    setLoading(true);
    // ===== 游客模式：从本地演示数据加载 =====
    if (isGuestMode()) {
      console.log('[MemberDetail] 游客模式：加载演示数据, memberId:', memberId);
      const guestData = getGuestData();
      const guestMember = guestData.members.find((m: any) => m.id === memberId);
      if (guestMember) {
        setMember(guestMember);
        setIsAdmin(true);  // 游客模式默认管理员权限，方便体验完整功能
        setCurrentUserRole('parent');
        setCurrentUserId('guest-mom');  // 当前用户设为妈妈
        const memberTasks = guestData.tasks.filter((t: any) => t.assignee_id === memberId);
        setTasks(memberTasks.filter((t: any) => t.status === 'completed').slice(0, 5));
        setAllTasks(memberTasks);
      } else {
        console.warn('[MemberDetail] 游客数据中未找到成员:', memberId);
      }
      setLoading(false);
      return;
    }

    try {
      const { data: m } = await supabase.from('members').select('*').eq('id', memberId).single();
      if (m) {
        setMember(m);
        const localUser = Taro.getStorageSync('guest_user');
        if (localUser) {
          const lu = JSON.parse(localUser);
          setIsAdmin(lu.role === 'parent');
          setCurrentUserRole(lu.role || '');
          setCurrentUserId(lu.id || '');
        }
        // 加载最近完成的任务（对齐Web: 查全部已完成任务用于Modal展示）
        const { data: allCompleted } = await supabase.from('tasks')
          .select('*').eq('assignee_id', memberId)
          .eq('status', 'completed').order('updated_at', { ascending: false });
        setTasks(Array.isArray(allCompleted) ? allCompleted.slice(0, 20) : []);
        // 加载所有任务（用于统计）
        const { data: allData } = await supabase.from('tasks')
          .select('*').eq('assignee_id', memberId);
        setAllTasks(Array.isArray(allData) ? allData : []);
      } else {
        console.warn('[MemberDetail] 成员不存在:', memberId);
      }
    } catch (err) {
      console.error('loadMember error:', err);
      setMember({ id: memberId, name: '加载失败', role: 'child', stars: 0, avatar: '' });
    }
    setLoading(false);
  };

  // 统计数据
  const safeTasks = allTasks || [];
  const completedCount = safeTasks.filter(t => t.status === 'completed').length;
  const pendingCount = safeTasks.filter(t => t.status === 'pending').length;
  const totalStarsEarned = safeTasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.reward_stars || 0), 0);

  // 增减星星
  const handleStarChange = async () => {
    if (starDelta === 0) { Taro.showToast({ title: '请输入星星变化数量', icon: 'none' }); return; }
    try {
      const newStars = (member?.stars || 0) + starDelta;
      const { error } = await supabase.from('members').update({ stars: newStars }).eq('id', memberId);
      if (error) throw error;
      // 记录日志到本地或 exchanges 表
      console.log(`[星星变动] ${member?.name}: ${starDelta > 0 ? '+' : ''}${starDelta} → ${starReason || '无原因'}`);
      Taro.showToast({ title: `已${starDelta > 0 ? '增加' : '扣除'} ${Math.abs(starDelta)} 颗星`, icon: 'success' });
      setMember({ ...member, stars: newStars });
      setEditingStars(false);
      setStarDelta(0);
      setStarReason('');
    } catch (err: any) {
      Taro.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  };

  // 删除成员
  const handleDeleteMember = async () => {
    try {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
      Taro.showToast({ title: '已删除成员', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1000);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  };

  if (!member) return (
    <View className="md-page">
      <View className="md-header">
        <View className="md-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={32} color="#3f4a3c" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <Text className="md-header-title">成员详情</Text>
        <View style={{ width: '60rpx' }} />
      </View>
      {/* 对齐Web: 旋转加载动画 */}
      <View className="md-loading-center">
        <Icon name="loader-2" size={56} color="#006e1c" className="spin" />
        <Text className="md-loading-text">加载中...</Text>
      </View>
    </View>
  );

  // 已完成任务完整列表（用于Modal展示）
  const completedTasksFull = allTasks.filter(t => t.status === 'completed');

  return (
    <View className="md-page">
      {/* 头部 */}
      <View className="md-header">
        <View className="md-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={32} color="#3f4a3c" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <Text className="md-header-title">成员详情</Text>
        {isAdmin && member?.id && member.id !== currentUserId && (
          <View className="md-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
            <Icon name="trash2" size={28} color="#e53935" />
          </View>
        )}
      </View>

      {/* Hero 区域 — 对齐Web: 大头像128px+编辑悬浮按钮+名字+角色Badge */}
      <View className="md-hero">
        <View className="md-avatar-wrap">
          <Image className="md-avatar" src={resolveAvatarPath(member.avatar || '')} mode="aspectFill"
                 onClick={() => Taro.navigateTo({ url: '/pages/profile/edit/index' })} />
          {/* 悬浮编辑按钮（对齐Web: 右下角悬浮） */}
          <View className="md-hero-edit-btn" onClick={() => Taro.navigateTo({ url: `/pages/profile/edit/index?id=${memberId}` })}>
            <Icon name="edit" size={18} color="#ffffff" />
          </View>
        </View>
        <Text className="md-name">{member.name}</Text>
        <View className={`md-role-tag ${member.role}`}>
          <Text>{member.role === 'parent' ? '管理员' : '孩子'}</Text>
        </View>
        <View className="md-stars">
          <Icon name="star" size={40} color="#F9A825" />
          <Text className="md-star-num">{member.stars || 0}</Text>
          {isAdmin && (
            <View className="md-edit-stars-btn" onClick={() => setEditingStars(true)}>
              <Icon name="edit" size={24} color="#006e1c" />
            </View>
          )}
        </View>
      </View>

      {/* 统计卡片 — 对齐Web: 点击"已完成"弹出任务列表Modal */}
      <View className="md-stats-row">
        <View className="md-stat-item">
          <Text className="md-stat-value">{allTasks.length}</Text>
          <Text className="md-stat-label">总任务</Text>
        </View>
        {/* 已完成: 可点击查看详情Modal */}
        <View className={`md-stat-item clickable ${completedCount > 0 ? '' : 'disabled'}`}
              onClick={() => completedCount > 0 && setShowTaskModal(true)}>
          <Text className="md-stat-value completed">{completedCount}</Text>
          <Text className="md-stat-label">已完成</Text>
        </View>
        <View className="md-stat-item">
          <Text className="md-stat-value pending">{pendingCount}</Text>
          <Text className="md-stat-label">进行中</Text>
        </View>
        <View className="md-stat-item">
          <Text className="md-stat-value stars">{totalStarsEarned}</Text>
          <Text className="md-stat-label">累计获得</Text>
        </View>
      </View>

      {/* 最近完成 */}
      <View className="md-section">
        <Text className="md-section-title">最近完成</Text>
        {(tasks || []).length > 0 ? tasks.map((t, i) => (
          <View key={i} className="md-task-item">
            <Icon name="checkCircle" size={28} color="#4CAF50" />
            <View className="md-task-info">
              <Text className="md-task-title">{t.title}</Text>
              <Text className="md-task-time">{new Date(t.updated_at || t.start_time).toLocaleDateString()}</Text>
            </View>
            <Text className="md-task-stars">+{t.reward_stars}⭐</Text>
          </View>
        )) : (
          <Text className="md-empty">暂无完成记录</Text>
        )}
      </View>

      {/* ===== 星星编辑面板 ===== */}
      {editingStars && (
        <View className="md-mask" onClick={() => setEditingStars(false)}>
          <View className="md-star-panel" onClick={(e) => e.stopPropagation()}>
            <View className="md-sp-header">
              <Text className="md-sp-title">调整 {member.name} 的星星</Text>
              <View onClick={() => setEditingStars(false)}><Icon name="x" size={24} /></View>
            </View>
            <View className="md-sp-body">
              <View className="md-sp-current">
                <Text>当前: </Text><Text className="md-sp-val">{member.stars || 0}</Text>
                <Icon name="star" size={24} color="#F9A825" />
              </View>
              <View className="md-sp-delta">
                <View className={`md-sp-btn minus ${starDelta <= 0 ? 'active' : ''}`} onClick={() => setStarDelta(d => d - 1)}>
                  <Text>-1</Text>
                </View>
                <Input className="md-sp-input" type="number" value={String(starDelta)}
                       onInput={(e) => setStarDelta(parseInt(e.detail.value) || 0)} />
                <View className={`md-sp-btn plus ${starDelta >= 0 ? 'active' : ''}`} onClick={() => setStarDelta(d => d + 1)}>
                  <Text>+1</Text>
                </View>
              </View>
              <Input className="md-sp-reason" placeholder="原因（可选）" value={starReason}
                     onInput={(e) => setStarReason(e.detail.value)} />
            </View>
            <View className="md-sp-actions">
              <View className="md-sp-cancel" onClick={() => setEditingStars(false)}>
                <Text>取消</Text>
              </View>
              <View className="md-sp-confirm" onClick={handleStarChange}>
                <Text>确认{starDelta >= 0 ? '奖励' : '扣除'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 删除确认 ===== */}
      {showDeleteConfirm && (
        <View className="md-mask" onClick={() => setShowDeleteConfirm(false)}>
          <View className="md-del-panel" onClick={(e) => e.stopPropagation()}>
            <Icon name="alertTriangle" size={56} color="#e53935" />
            <Text className="md-del-title">确定删除该成员？</Text>
            <Text className="md-del-desc">删除「{member.name}」后，其所有任务和记录将被清除且不可恢复。</Text>
            <View className="md-del-actions">
              <View className="md-del-cancel" onClick={() => setShowDeleteConfirm(false)}>
                <Text>取消</Text>
              </View>
              <View className="md-del-confirm" onClick={handleDeleteMember}>
                <Text>确认删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 已完成任务Modal (对齐Web: 任务查看) ===== */}
      {showTaskModal && (
        <View className="md-mask" onClick={() => setShowTaskModal(false)}>
          <View className="md-task-modal" onClick={(e) => e.stopPropagation()}>
            <View className="md-tm-header">
              <Icon name="checkCircle" size={32} color="#4CAF50" />
              <Text className="md-tm-title">已完成任务 ({completedCount})</Text>
              <View className="md-tm-close" onClick={() => setShowTaskModal(false)}>
                <Icon name="x" size={28} color="#3f4a3c" />
              </View>
            </View>
            <ScrollView scrollY className="md-tm-list">
              {completedTasksFull.length > 0 ? completedTasksFull.map((t, i) => (
                <View key={i} className="md-tm-item">
                  <View className="md-tm-left">
                    <Icon name="checkCircle" size={28} color="#4CAF50" />
                    <View className="md-tm-info">
                      <Text className="md-tm-task-title">{t.title}</Text>
                      <Text className="md-tm-time">
                        {t.completed_at ? new Date(t.completed_at).toLocaleDateString('zh-CN') :
                          new Date(t.updated_at || t.start_time).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                  </View>
                  <Text className="md-tm-stars">+{t.reward_stars || 0}⭐</Text>
                </View>
              )) : (
                <View className="md-tm-empty"><Text>暂无完成记录</Text></View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}
