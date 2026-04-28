import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Task, Member, Reward, HistoryRecord } from '../types';
import * as api from '../lib/api';
import { supabase, type Database } from '../lib/supabase';
import { getGuestData } from '../lib/guestData';

type DbMember = Database['public']['Tables']['members']['Row'];
type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbReward = Database['public']['Tables']['rewards']['Row'];
type DbStarTransaction = Database['public']['Tables']['star_transactions']['Row'];

interface FamilyContextType {
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  history: HistoryRecord[];
  currentUser: Member | null;
  setCurrentUser: (user: Member) => void;
  stars: number;
  addStars: (amount: number) => void;
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  addReward: (reward: Reward) => Promise<void>;
  updateReward: (reward: Reward) => Promise<void>;
  deleteReward: (rewardId: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  addMember: (member: Member) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  updateMember: (member: Member) => Promise<void>;
  logout: () => Promise<void>;
  isUserSelectorOpen: boolean;
  setIsUserSelectorOpen: (isOpen: boolean) => void;
  isInitialized: boolean;
  setIsInitialized: (val: boolean) => void;
  loading: boolean;
  familyId: string | null;
  guestMode: boolean;
  setGuestMode: (val: boolean) => void;
  loadGuestData: (memberId: string, famId: string) => Promise<void>;
  loadGuestDemoData: () => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

// DB 类型 → 前端类型映射
function toMember(db: DbMember): Member {
  return {
    id: db.id,
    name: db.name,
    avatar: db.avatar || '',
    stars: db.stars || 0,
    role: db.role,
    pin: db.pin || undefined,
    password: db.password || undefined,
  };
}

function toTask(db: DbTask): Task {
  return {
    id: db.id,
    title: db.title,
    description: db.description || '',
    type: 'daily',
    startTime: db.created_at || new Date().toISOString(),
    assigneeIds: db.assignee_ids || [],
    creatorId: db.creator_id || '',
    rewardStars: db.star_amount || 0,
    status: db.status || 'pending',
    icon: db.icon || 'Star',
    isHabit: db.is_habit || false,
    targetCount: db.target_count || 1,
    currentCount: db.current_count || 0,
  };
}

function toReward(db: DbReward): Reward {
  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    cost: db.star_cost || 0,
    icon: db.icon || 'Gift',
    image: db.image_url || '',
    category: db.category || '',
    stock: db.stock ?? undefined,
  };
}

function toHistory(db: DbStarTransaction): HistoryRecord {
  return {
    id: db.id,
    userId: db.member_id,
    title: db.reason,
    type: db.type === 'earn' ? 'task' : 'redeem',
    stars: db.amount,
    timestamp: db.created_at,
    icon: '',
  };
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const guestModeRef = useRef(false);

  // 保持 ref 同步
  useEffect(() => { guestModeRef.current = guestMode; }, [guestMode]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // 初始化：检查 Supabase Session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await loadUserData(session.user.id);
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 访客模式下不清空数据
      if (guestModeRef.current) return;
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setCurrentUser(null);
        setMembers([]);
        setTasks([]);
        setRewards([]);
        setHistory([]);
        setFamilyId(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserData(userId: string) {
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !member) {
        console.error('成员记录未找到:', userId, error?.message);
        setLoading(false);
        return;
      }

      const m = toMember(member);
      setCurrentUser(m);
      setFamilyId(member.family_id);

      const [membersRes, tasksRes, rewardsRes, historyRes] = await Promise.all([
        api.getMembersByFamilyId(member.family_id!),
        api.getTasksByFamilyId(member.family_id!, true),
        api.getRewardsByFamilyId(member.family_id!),
        api.getStarTransactionsByMemberId(m.id),
      ]);

      setMembers(membersRes.map(toMember));
      setTasks(tasksRes.map(toTask));
      setRewards(rewardsRes.map(toReward));
      setHistory(historyRes.map(toHistory));
    } catch (err) {
      console.error('加载用户数据失败:', err);
    } finally {
      setLoading(false);
    }
  }

  // 访客模式：从数据库加载家庭数据（不需要 Supabase Auth session）
  async function loadGuestData(memberId: string, famId: string) {
    try {
      setFamilyId(famId);
      const [membersRes, tasksRes, rewardsRes, historyRes] = await Promise.all([
        api.getMembersByFamilyId(famId),
        api.getTasksByFamilyId(famId, true),
        api.getRewardsByFamilyId(famId),
        api.getStarTransactionsByMemberId(memberId),
      ]);
      setMembers(membersRes.map(toMember));
      setTasks(tasksRes.map(toTask));
      setRewards(rewardsRes.map(toReward));
      setHistory(historyRes.map(toHistory));
    } catch (err) {
      console.error('加载访客数据失败:', err);
    } finally {
      setLoading(false);
    }
  }

  // 访客模式：加载本地展示数据（不需要数据库）
  function loadGuestDemoData() {
    const data = getGuestData();
    setMembers(data.members);
    setTasks(data.tasks);
    setRewards(data.rewards);
    setHistory(data.history);
    setFamilyId('guest-family');
    setLoading(false);
  }

  // ==================== 任务 Mutations ====================
  const addTask = useCallback(async (task: Task) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地添加
    if (guestModeRef.current) {
      setTasks(prev => [...prev, { ...task, id: task.id || `guest-t-${Date.now()}` }]);
      return;
    }
    if (!familyId) return;
    try {
      const dbTask = await api.createTask(
        familyId, task.title, task.description, task.rewardStars,
        task.assigneeIds, currentUser.id,
        {
          is_habit: task.isHabit || false,
          icon: task.icon || null,
          target_count: task.targetCount || 1,
          current_count: task.currentCount || 0,
          category: task.type,
          status: task.status,
        }
      );
      setTasks(prev => [...prev, toTask(dbTask)]);
    } catch (err: any) {
      alert(`创建任务失败: ${err.message}`);
    }
  }, [currentUser, familyId]);

  const updateTask = useCallback(async (task: Task) => {
    // 访客模式：纯前端本地更新
    if (guestModeRef.current) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      return;
    }
    try {
      const dbTask = await api.updateTask(task.id, {
        title: task.title,
        description: task.description || null,
        star_amount: task.rewardStars,
        assignee_ids: task.assigneeIds,
        status: task.status === 'expired' ? 'completed' : task.status,
        is_habit: task.isHabit || false,
        target_count: task.targetCount || 1,
        current_count: task.currentCount || 0,
        icon: task.icon,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? toTask(dbTask) : t));
    } catch (err: any) {
      alert(`更新任务失败: ${err.message}`);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    // 访客模式：纯前端本地删除
    if (guestModeRef.current) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      alert(`删除任务失败: ${err.message}`);
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地完成
    if (guestModeRef.current) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'reviewing' as const } : t));
      return;
    }
    try {
      const dbTask = await api.completeTask(taskId, currentUser.id);
      setTasks(prev => prev.map(t => t.id === taskId ? toTask(dbTask) : t));
    } catch (err: any) {
      alert(`完成任务失败: ${err.message}`);
    }
  }, [currentUser]);

  const approveTask = useCallback(async (taskId: string) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地审批 + 加星星
    if (guestModeRef.current) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t));
        // 给当前用户加星星
        if (task.assigneeIds.includes(currentUser.id)) {
          const newStars = currentUser.stars + task.rewardStars;
          setCurrentUser({ ...currentUser, stars: newStars });
          setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, stars: newStars } : m));
        }
        // 添加历史记录
        setHistory(prev => [{
          id: `guest-hist-${Date.now()}`,
          userId: currentUser.id,
          title: `完成任务: ${task.title}`,
          type: 'task',
          stars: task.rewardStars,
          timestamp: new Date().toISOString(),
          icon: 'CheckCircle',
        }, ...prev]);
      }
      return;
    }
    try {
      const dbTask = await api.approveTask(taskId, currentUser.id);
      setTasks(prev => prev.map(t => t.id === taskId ? toTask(dbTask) : t));
      // 重新加载用户数据以刷新星星余额
      await loadUserData(currentUser.id);
    } catch (err: any) {
      alert(`审批任务失败: ${err.message}`);
    }
  }, [currentUser, tasks]);

  // ==================== 奖励 Mutations ====================
  const addReward = useCallback(async (reward: Reward) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地添加
    if (guestModeRef.current) {
      setRewards(prev => [...prev, { ...reward, id: reward.id || `guest-r-${Date.now()}` }]);
      return;
    }
    if (!familyId) return;
    try {
      const dbReward = await api.createReward(
        familyId, reward.name, reward.description, reward.cost, currentUser.id,
        {
          imageUrl: reward.image,
          icon: reward.icon,
          category: reward.category,
          stock: reward.stock,
        }
      );
      setRewards(prev => [...prev, toReward(dbReward)]);
    } catch (err: any) {
      alert(`创建奖励失败: ${err.message}`);
    }
  }, [currentUser, familyId]);

  const updateReward = useCallback(async (reward: Reward) => {
    // 访客模式：纯前端本地更新
    if (guestModeRef.current) {
      setRewards(prev => prev.map(r => r.id === reward.id ? reward : r));
      return;
    }
    try {
      const dbReward = await api.updateReward(reward.id, {
        name: reward.name,
        description: reward.description || null,
        star_cost: reward.cost,
        icon: reward.icon,
        image_url: reward.image || null,
        category: reward.category || null,
        stock: reward.stock ?? null,
      });
      setRewards(prev => prev.map(r => r.id === reward.id ? toReward(dbReward) : r));
    } catch (err: any) {
      alert(`更新奖励失败: ${err.message}`);
    }
  }, []);

  const deleteReward = useCallback(async (rewardId: string) => {
    // 访客模式：纯前端本地删除
    if (guestModeRef.current) {
      setRewards(prev => prev.filter(r => r.id !== rewardId));
      return;
    }
    try {
      await api.deleteReward(rewardId);
      setRewards(prev => prev.filter(r => r.id !== rewardId));
    } catch (err: any) {
      alert(`删除奖励失败: ${err.message}`);
    }
  }, []);

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地兑换
    if (guestModeRef.current) {
      const reward = rewards.find(r => r.id === rewardId);
      if (reward && currentUser.stars >= reward.cost) {
        const newStars = currentUser.stars - reward.cost;
        setCurrentUser({ ...currentUser, stars: newStars });
        setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, stars: newStars } : m));
        // 添加历史记录
        setHistory(prev => [{
          id: `guest-hist-${Date.now()}`,
          userId: currentUser.id,
          title: `兑换心愿: ${reward.name}`,
          type: 'redeem',
          stars: -reward.cost,
          timestamp: new Date().toISOString(),
          icon: 'Gift',
        }, ...prev]);
      }
      return;
    }
    try {
      const dbReward = await api.redeemReward(rewardId, currentUser.id);
      setRewards(prev => prev.map(r => r.id === rewardId ? toReward(dbReward) : r));
    } catch (err: any) {
      alert(`兑换奖励失败: ${err.message}`);
    }
  }, [currentUser, rewards]);

  // ==================== 成员 Mutations ====================
  const addMember = useCallback(async (member: Member) => {
    // 访客模式：纯前端本地添加
    if (guestModeRef.current) {
      setMembers(prev => [...prev, { ...member, id: member.id || `guest-m-${Date.now()}` }]);
      return;
    }
    if (!familyId) return;
    try {
      const dbMember = await api.addMember(familyId, member.name, member.role, member.avatar);
      setMembers(prev => [...prev, toMember(dbMember)]);
    } catch (err: any) {
      alert(`添加成员失败: ${err.message}`);
    }
  }, [familyId]);

  const deleteMember = useCallback(async (memberId: string) => {
    // 访客模式：纯前端本地删除
    if (guestModeRef.current) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      return;
    }
    try {
      await api.deleteMember(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err: any) {
      alert(`删除成员失败: ${err.message}`);
    }
  }, []);

  const updateMember = useCallback(async (member: Member) => {
    // 访客模式：纯前端本地更新
    if (guestModeRef.current) {
      setMembers(prev => prev.map(m => m.id === member.id ? member : m));
      if (currentUser?.id === member.id) setCurrentUser(member);
      return;
    }
    try {
      const dbMember = await api.updateMember(member.id, {
        name: member.name,
        avatar: member.avatar || null,
        role: member.role,
        stars: member.stars,
        pin: member.pin || null,
        password: member.password || null,
      });
      const updated = toMember(dbMember);
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      if (currentUser?.id === member.id) setCurrentUser(updated);
    } catch (err: any) {
      alert(`更新成员失败: ${err.message}`);
    }
  }, [currentUser]);

  const logout = useCallback(async () => {
    if (!guestModeRef.current) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setMembers([]);
    setTasks([]);
    setRewards([]);
    setHistory([]);
    setFamilyId(null);
    setGuestMode(false);
  }, []);

  const toggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), []);

  const addStars = useCallback((amount: number) => {
    console.warn('addStars 已废弃，请使用 API 函数');
  }, []);

  return (
    <FamilyContext.Provider
      value={{
        members, tasks, rewards, history,
        currentUser, setCurrentUser,
        stars: currentUser?.stars || 0,
        addStars, addTask, updateTask, deleteTask,
        completeTask, approveTask,
        addReward, updateReward, deleteReward, redeemReward,
        isDarkMode, toggleDarkMode,
        addMember, deleteMember, updateMember,
        logout,
        isUserSelectorOpen, setIsUserSelectorOpen,
        isInitialized, setIsInitialized,
        loading,
        familyId,
        guestMode, setGuestMode, loadGuestData, loadGuestDemoData,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) throw new Error('useFamily must be used within a FamilyProvider');
  return context;
}
