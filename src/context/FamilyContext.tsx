import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Task, Member, Reward, HistoryRecord } from '../types';
import * as api from '../lib/api';
import { supabase, type Database } from '../lib/supabase';
import { getGuestData } from '../lib/guestData';
import { showToastGlobal } from '../components/Toast';
import { getDataLayer, type DataMember, type DataOperationAuditLog, type DataPlan, type DataReward, type DataTask } from '../lib/DataLayer';
import type { SyncStatus } from '../lib/SyncEngine';
import { canApproveRewards, canApproveTasks, canManageFamily, canManageMembers, canManageRewards } from '../domain/familyPlanning';
import { buildRewardFulfillmentTask, hasRewardFulfillmentTask } from '../domain/rewardFulfillment';
import {
  createMemberSession,
  isMemberSessionValid,
  persistMemberSession,
  readStoredMemberSession,
  type MemberSession,
  type MemberVerificationMethod,
} from '../lib/memberSession';
import { prepareMemberCredentialsForStorage } from '../lib/memberCredentials';
import { getStorageAdapter, STORAGE_KEYS, storageGetSync, storageSetSync } from '../lib/StorageAdapter';
import { clearGuestPlans, saveGuestPlan } from '../lib/guestPlans';

type DbMember = Database['public']['Tables']['members']['Row'];
type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbReward = Database['public']['Tables']['rewards']['Row'];
type DbStarTransaction = Database['public']['Tables']['star_transactions']['Row'];

interface FamilyContextType {
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  history: HistoryRecord[];
  auditLogs: DataOperationAuditLog[];
  currentUser: Member | null;
  memberSession: MemberSession | null;
  setCurrentUser: (user: Member | null, verificationMethod?: MemberVerificationMethod) => void;
  stars: number;
  addStars: (amount: number) => void;
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  requestHabitCheckIn: (habitId: string, memberId?: string) => Promise<void>;
  approveHabitCheckIn: (habitId: string, memberId: string) => Promise<void>;
  addReward: (reward: Reward) => Promise<void>;
  updateReward: (reward: Reward) => Promise<void>;
  deleteReward: (rewardId: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  approveReward: (rewardId: string) => Promise<boolean>;
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
  setFamilyId: (id: string | null) => void;
  guestMode: boolean;
  setGuestMode: (val: boolean) => void;
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
  loadGuestData: (memberId: string, famId: string) => Promise<void>;
  loadGuestDemoData: () => Member | null;
  localImport: (data: { members?: Member[]; plans?: DataPlan[]; tasks?: Task[]; rewards?: Reward[]; history?: HistoryRecord[] }) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

function deny(message: string): false {
  showToastGlobal(message, 'warning');
  return false;
}

const HABIT_REVIEW_MARKER = '奖惩来源ID:';

function habitReviewMarker(habitId: string): string {
  return `${HABIT_REVIEW_MARKER}${habitId}`;
}

function getHabitSourceId(task: Pick<Task, 'description'>): string | null {
  const match = task.description?.match(/奖惩来源ID:([^\s\n]+)/);
  return match?.[1] || null;
}

function buildHabitReviewTask(params: {
  habit: Task;
  memberId: string;
  actorId: string;
}): Task {
  const isPenalty = params.habit.rewardStars < 0;
  const now = new Date().toISOString();
  return {
    id: `habit-review-${params.habit.id}-${params.memberId}-${Date.now()}`,
    title: `${isPenalty ? '扣分待审核' : '打卡待审核'}：${params.habit.title}`,
    description: [
      params.habit.description || '',
      habitReviewMarker(params.habit.id),
    ].filter(Boolean).join('\n'),
    type: isPenalty ? 'penalty_review' : 'habit_review',
    startTime: now,
    assigneeIds: [params.memberId],
    creatorId: params.actorId,
    rewardStars: params.habit.rewardStars,
    status: 'reviewing',
    icon: params.habit.icon,
    isHabit: false,
    targetCount: 1,
    currentCount: 0,
    createdAt: now,
  };
}

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

function toMemberFromDataLayer(dataMember: DataMember): Member {
  return {
    id: dataMember.id,
    name: dataMember.name,
    avatar: dataMember.avatar || '',
    stars: dataMember.stars,
    role: dataMember.role,
    pin: dataMember.pin || undefined,
    password: dataMember.password || undefined,
  };
}

function toDataLayerMember(member: Member): Omit<DataMember, 'id' | 'isActive' | 'familyId'> {
  const securedMember = prepareMemberCredentialsForStorage(member);
  return {
    name: securedMember.name,
    avatar: securedMember.avatar || '',
    role: securedMember.role,
    stars: securedMember.stars || 0,
    color: null,
    pin: securedMember.pin || null,
    password: securedMember.password || null,
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
    planId: db.plan_id || undefined,
    rewardStars: db.star_amount || 0,
    status: db.status || 'pending',
    icon: db.icon || 'Star',
    isHabit: db.is_habit || false,
    targetCount: db.target_count || 1,
    currentCount: db.current_count || 0,
    createdAt: db.created_at || undefined,
    completedAt: db.completed_at || undefined,
  };
}

function toTaskFromDataLayer(dataTask: DataTask): Task {
  return {
    id: dataTask.id,
    title: dataTask.title,
    description: dataTask.description,
    type: 'daily',
    startTime: dataTask.startTime || dataTask.createdAt || new Date().toISOString(),
    deadline: dataTask.deadline || undefined,
    assigneeIds: dataTask.assigneeIds,
    creatorId: dataTask.creatorId,
    planId: dataTask.planId || undefined,
    rewardStars: dataTask.starAmount,
    status: dataTask.status,
    icon: dataTask.icon || 'Star',
    isHabit: dataTask.isHabit,
    targetCount: dataTask.targetCount,
    currentCount: dataTask.currentCount,
    createdAt: dataTask.createdAt,
    completedAt: dataTask.completedAt || undefined,
  };
}

function toDataLayerTask(task: Task, creatorId: string): Omit<DataTask, 'id' | 'createdAt' | 'updatedAt' | 'familyId'> {
  return {
    planId: task.planId || null,
    title: task.title,
    description: task.description || '',
    starAmount: task.rewardStars || 0,
    assigneeIds: task.assigneeIds || [],
    creatorId: task.creatorId || creatorId,
    status: task.status === 'expired' ? 'completed' : task.status,
    isHabit: task.isHabit || false,
    targetCount: task.targetCount || 1,
    currentCount: task.currentCount || 0,
    icon: task.icon || 'Star',
    startTime: task.startTime || null,
    deadline: task.deadline || null,
    completed: task.status === 'completed',
    completedAt: task.status === 'completed' ? new Date().toISOString() : null,
  };
}

function toReward(db: DbReward): Reward {
  return {
    id: db.id,
    planId: db.plan_id || undefined,
    name: db.name,
    description: db.description || '',
    cost: db.star_cost || 0,
    icon: db.icon || 'Gift',
    image: db.image_url || '',
    category: db.category || '',
    stock: db.stock ?? undefined,
    status: db.status,
    redeemedBy: db.redeemed_by || undefined,
    redeemedAt: db.redeemed_at || undefined,
  };
}

function toRewardFromDataLayer(dataReward: DataReward): Reward {
  return {
    id: dataReward.id,
    planId: dataReward.planId || undefined,
    name: dataReward.name,
    description: dataReward.description,
    cost: dataReward.starCost,
    icon: dataReward.icon || 'Gift',
    image: dataReward.imageUrl || '',
    category: dataReward.category || '',
    stock: dataReward.stock ?? undefined,
    status: dataReward.status,
    redeemedBy: dataReward.redeemedBy || undefined,
    redeemedAt: dataReward.redeemedAt || undefined,
  };
}

function toDataLayerReward(reward: Reward): Omit<DataReward, 'id' | 'familyId'> {
  return {
    planId: reward.planId || null,
    name: reward.name,
    description: reward.description || '',
    starCost: reward.cost || 0,
    icon: reward.icon || 'Gift',
    imageUrl: reward.image || null,
    category: reward.category || null,
    status: reward.status || 'available',
    stock: reward.stock ?? null,
    redeemedBy: reward.redeemedBy || null,
    redeemedAt: reward.redeemedAt || null,
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

function normalizeHistoryRecords(records: HistoryRecord[]): HistoryRecord[] {
  return records.filter(record => Number(record.stars) !== 0);
}

type GuestLocalState = {
  guestMode: true;
  familyId: string;
  currentUser: Member;
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  history: HistoryRecord[];
};

const storageAdapter = getStorageAdapter();
const DARK_MODE_STORAGE_KEY = 'ff_dark_mode';

function readStoredGuestLocalState(): GuestLocalState | null {
  const stored = storageGetSync<GuestLocalState | null>(storageAdapter, STORAGE_KEYS.GUEST_LOCAL_STATE, null);
  if (!stored?.guestMode || !stored.currentUser || !stored.familyId) return null;
  return {
    ...stored,
    history: normalizeHistoryRecords(stored.history || []),
  };
}

function persistGuestLocalState(state: GuestLocalState) {
  storageSetSync(storageAdapter, STORAGE_KEYS.GUEST_LOCAL_STATE, {
    ...state,
    history: normalizeHistoryRecords(state.history || []),
  });
}

function clearGuestLocalState() {
  storageAdapter.removeItemSync(STORAGE_KEYS.GUEST_LOCAL_STATE);
}

function mergeMembers(existing: Member[], incoming: Member[]): Member[] {
  const map = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
  return Array.from(map.values());
}

function mergeTasks(existing: Task[], incoming: Task[]): Task[] {
  const map = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
  return Array.from(map.values());
}

function mergeRewards(existing: Reward[], incoming: Reward[]): Reward[] {
  const map = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
  return Array.from(map.values());
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const storedGuestLocalStateRef = useRef<GuestLocalState | null>(readStoredGuestLocalState());
  const [currentUser, setCurrentUserState] = useState<Member | null>(() => storedGuestLocalStateRef.current?.currentUser ?? null);
  const currentUserRef = useRef<Member | null>(storedGuestLocalStateRef.current?.currentUser ?? null);
  const [memberSession, setMemberSession] = useState<MemberSession | null>(() => readStoredMemberSession());
  const familyIdRef = useRef<string | null>(storedGuestLocalStateRef.current?.familyId ?? null);
  // 包装 setCurrentUser，同步更新 ref 以防止竞态
  const setCurrentUser = (user: Member | null, verificationMethod?: MemberVerificationMethod) => {
    currentUserRef.current = user;
    setCurrentUserState(user);
    const resolvedMethod = verificationMethod
      || (memberSession?.memberId === user?.id ? memberSession.verificationMethod : 'none');
    const nextSession = user
      ? createMemberSession(user, familyIdRef.current, resolvedMethod)
      : null;
    setMemberSession(nextSession);
    persistMemberSession(nextSession);
  };
  const [members, setMembers] = useState<Member[]>(() => storedGuestLocalStateRef.current?.members ?? []);
  const [tasks, setTasks] = useState<Task[]>(() => storedGuestLocalStateRef.current?.tasks ?? []);
  const [rewards, setRewards] = useState<Reward[]>(() => storedGuestLocalStateRef.current?.rewards ?? []);
  const [history, setHistory] = useState<HistoryRecord[]>(() => normalizeHistoryRecords(storedGuestLocalStateRef.current?.history ?? []));
  const [auditLogs, setAuditLogs] = useState<DataOperationAuditLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => storageGetSync<boolean>(storageAdapter, DARK_MODE_STORAGE_KEY, false));
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(() => storedGuestLocalStateRef.current?.familyId ?? null);
  const [guestMode, setGuestMode] = useState(() => Boolean(storedGuestLocalStateRef.current?.guestMode));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  }));
  const guestModeRef = useRef(Boolean(storedGuestLocalStateRef.current?.guestMode));
  const dataLayerRef = useRef(getDataLayer());

  const updateFamilyId = useCallback((id: string | null) => {
    familyIdRef.current = id;
    setFamilyId(id);
    const current = currentUserRef.current;
    const currentSession = readStoredMemberSession();
    if (current && isMemberSessionValid(currentSession) && currentSession.familyId !== id) {
      const nextSession = createMemberSession(current, id, currentSession.verificationMethod);
      setMemberSession(nextSession);
      persistMemberSession(nextSession);
    }
  }, []);

  async function refreshTasksFromDataLayer() {
    const dataTasks = await dataLayerRef.current.getTasks();
    setTasks(dataTasks.map(toTaskFromDataLayer));
  }

  async function refreshMembersFromDataLayer() {
    const dataMembers = await dataLayerRef.current.getMembers();
    const mappedMembers = dataMembers.map(toMemberFromDataLayer);
    setMembers(mappedMembers);
    const current = currentUserRef.current;
    if (current) {
      const updatedCurrent = mappedMembers.find(member => member.id === current.id);
      if (updatedCurrent) setCurrentUser(updatedCurrent);
    }
  }

  async function refreshRewardsFromDataLayer() {
    const dataRewards = await dataLayerRef.current.getRewards();
    setRewards(dataRewards.map(toRewardFromDataLayer));
  }

  async function refreshAuditLogsFromDataLayer() {
    const logs = await dataLayerRef.current.getOperationAuditLogs(20);
    setAuditLogs(logs);
  }

  async function ensureDataLayer(famId: string, userId: string) {
    dataLayerRef.current.onDataChanged = () => {
      refreshTasksFromDataLayer().catch((err) => {
        console.warn('[DataLayer] 刷新任务缓存失败:', err);
      });
      refreshRewardsFromDataLayer().catch((err) => {
        console.warn('[DataLayer] 刷新心愿缓存失败:', err);
      });
      refreshMembersFromDataLayer().catch((err) => {
        console.warn('[DataLayer] 刷新成员缓存失败:', err);
      });
      refreshAuditLogsFromDataLayer().catch((err) => {
        console.warn('[DataLayer] 刷新操作审计缓存失败:', err);
      });
      setSyncStatus(dataLayerRef.current.getSyncStatus());
    };
    dataLayerRef.current.onSyncStatusChange = (status) => {
      setSyncStatus(status);
    };
    await dataLayerRef.current.initialize(famId, userId);
    setSyncStatus(dataLayerRef.current.getSyncStatus());
  }

  // 保持 guestMode ref 同步
  useEffect(() => { guestModeRef.current = guestMode; }, [guestMode]);

  useEffect(() => {
    if (!guestMode || !currentUser || !familyId) return;
    persistGuestLocalState({
      guestMode: true,
      familyId,
      currentUser,
      members,
      tasks,
      rewards,
      history,
    });
  }, [currentUser, familyId, guestMode, history, members, rewards, tasks]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    storageSetSync(storageAdapter, DARK_MODE_STORAGE_KEY, isDarkMode);
  }, [isDarkMode]);

  // 初始化：检查 Supabase Session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 访客模式下不尝试恢复 Supabase session
      if (guestModeRef.current) {
        console.log('[Init] Skipped: guest mode active');
        setLoading(false);
        return;
      }
      // 给 Supabase getSession 设置超时，防止网络不可达时无限挂起
      // Android 模拟器 SSL 问题会导致请求卡住，使用更短的超时
      const getSessionWithTimeout = Promise.race([
        supabase.auth.getSession(),
        new Promise<null>((resolve) => setTimeout(() => {
          console.log('[Init] getSession timeout, assuming no session');
          resolve(null);
        }, 2000)), // 缩短到 2 秒，避免 ANR
      ]);
      try {
        const result = await getSessionWithTimeout;
        // getSession 期间用户可能已进入游客模式，再次检查
        if (guestModeRef.current) {
          console.log('[Init] Skipped after getSession: guest mode active');
          return;
        }
        const session = (result as any)?.data?.session;
        if (session?.user && mounted) {
          await loadUserData(session.user.id);
        }
      } catch (err) {
        console.error('Init failed (Supabase may be unreachable):', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    // onAuthStateChange 只做两件事：
    // 1. 有 session 时加载用户数据
    // 2. 用户主动退出登录(SIGNED_OUT)时清空数据
    // 绝不在 Supabase 不可达或无网络时清空数据
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, 'guestMode:', guestModeRef.current, 'currentUser:', currentUserRef.current?.id);
      try {
        // 访客模式下完全忽略所有 auth 事件
        if (guestModeRef.current) {
          console.log('[Auth] Skipped: guest mode active');
          return;
        }

        // 有 session → 加载用户数据
        if (session?.user) {
          // 加载前再次确认不是游客模式（防止竞态）
          if (guestModeRef.current) return;
          await loadUserData(session.user.id);
          return;
        }

        // 无 session 的情况：只有明确是 SIGNED_OUT 事件 且 当前没有已登录用户 才清空数据
        // 这是终极防线：即使 SIGNED_OUT 被错误触发（如网络问题），也不清空游客数据
        if (event === 'SIGNED_OUT' && !currentUserRef.current) {
          console.log('[Auth] User signed out, clearing data');
          setCurrentUser(null);
          setMembers([]);
          setTasks([]);
          setRewards([]);
          setHistory([]);
          setAuditLogs([]);
          updateFamilyId(null);
          setLoading(false);
        } else if (event === 'SIGNED_OUT' && currentUserRef.current) {
          console.log('[Auth] SIGNED_OUT but currentUser exists, skipping clear');
        } else {
          console.log('[Auth] No session but not SIGNED_OUT, skipping (event:', event, ')');
        }
      } catch (err) {
        console.error('[Auth] onAuthStateChange error:', err);
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
        .select()
        .eq('id', userId)
        .maybeSingle();

      // 成员不存在时静默处理（新用户正在注册中，或刚验证完还没创建记录）
      if (error || !member) {
        console.log('[loadUserData] 成员记录不存在，等待注册完成:', userId);
        setLoading(false);
        return;
      }

      const m = toMember(member);
      updateFamilyId(member.family_id);
      setCurrentUser(m, 'account');
      await ensureDataLayer(member.family_id!, userId);

      const [dataMembers, dataTasks, dataRewards, auditLogRes, historyRes] = await Promise.all([
        dataLayerRef.current.getMembers(),
        dataLayerRef.current.getTasks(),
        dataLayerRef.current.getRewards(),
        dataLayerRef.current.getOperationAuditLogs(20),
        api.getStarTransactionsByMemberId(m.id),
      ]);

      setMembers(dataMembers.map(toMemberFromDataLayer));
      setTasks(dataTasks.map(toTaskFromDataLayer));
      setRewards(dataRewards.map(toRewardFromDataLayer));
      setAuditLogs(auditLogRes);
      setHistory(normalizeHistoryRecords(historyRes.map(toHistory)));
    } catch (err) {
      console.error('加载用户数据失败:', err);
    } finally {
      setLoading(false);
    }
  }

  // 访客模式：从数据库加载家庭数据（不需要 Supabase Auth session）
  async function loadGuestData(memberId: string, famId: string) {
    try {
      updateFamilyId(famId);
      const [membersRes, tasksRes, rewardsRes, historyRes] = await Promise.all([
        api.getMembersByFamilyId(famId),
        api.getTasksByFamilyId(famId, true),
        api.getRewardsByFamilyId(famId),
        api.getStarTransactionsByMemberId(memberId),
      ]);
      setMembers(membersRes.map(toMember));
      setTasks(tasksRes.map(toTask));
      setRewards(rewardsRes.map(toReward));
      setHistory(normalizeHistoryRecords(historyRes.map(toHistory)));
      setAuditLogs([]);
    } catch (err) {
      console.error('加载访客数据失败:', err);
    } finally {
      setLoading(false);
    }
  }

  // 访客模式：加载本地展示数据（不需要数据库）
  function loadGuestDemoData() {
    // 先同步设置 ref，防止 onAuthStateChange 竞态清空数据
    guestModeRef.current = true;
    setGuestMode(true);
    const data = getGuestData();
    setMembers(data.members);
    setTasks(data.tasks);
    setRewards(data.rewards);
    const cleanHistory = normalizeHistoryRecords(data.history);
    setHistory(cleanHistory);
    setAuditLogs([]);
    updateFamilyId('guest-family');
    setLoading(false);
    // 返回默认游客用户，让调用方同步设置 currentUser 和 ref
    const guestUser = data.members[0] || null;
    if (guestUser) {
      persistGuestLocalState({
        guestMode: true,
        familyId: 'guest-family',
        currentUser: guestUser,
        members: data.members,
        tasks: data.tasks,
        rewards: data.rewards,
        history: cleanHistory,
      });
    }
    return guestUser;
  }

  async function localImport(data: { members?: Member[]; plans?: DataPlan[]; tasks?: Task[]; rewards?: Reward[]; history?: HistoryRecord[] }) {
    if (guestModeRef.current || !familyId || !currentUser) {
      if (data.plans) data.plans.forEach(plan => saveGuestPlan(plan));
      if (data.members) setMembers(prev => [...prev, ...data.members!]);
      if (data.tasks) setTasks(prev => [...prev, ...data.tasks!]);
      if (data.rewards) setRewards(prev => [...prev, ...data.rewards!]);
      if (data.history) setHistory(prev => normalizeHistoryRecords([...data.history!, ...prev]));
      return;
    }

    const now = new Date().toISOString();
    await ensureDataLayer(familyId, currentUser.id);
    await dataLayerRef.current.importLocalRecords({
      members: data.members?.map(member => ({
        ...toDataLayerMember(member),
        id: member.id,
        familyId,
        isActive: true,
      })),
      plans: data.plans?.map(plan => ({
        ...plan,
        familyId,
        isActive: plan.isActive !== false,
      })),
      tasks: data.tasks?.map(task => ({
        ...toDataLayerTask(task, currentUser.id),
        id: task.id,
        familyId,
        createdAt: task.createdAt || now,
        updatedAt: now,
      })),
      rewards: data.rewards?.map(reward => ({
        ...toDataLayerReward(reward),
        id: reward.id,
        familyId,
      })),
    });
    if (data.members) setMembers(prev => mergeMembers(prev, data.members!));
    if (data.tasks) setTasks(prev => mergeTasks(prev, data.tasks!));
    if (data.rewards) setRewards(prev => mergeRewards(prev, data.rewards!));
    if (data.history) setHistory(prev => normalizeHistoryRecords([...data.history!, ...prev]));
  }

  // ==================== 任务 Mutations ====================
  const addTask = useCallback(async (task: Task) => {
    if (!currentUser) {
      throw new Error('未登录，无法创建任务');
    }
    if (!canManageFamily(currentUser)) {
      deny('只有家长可以创建任务');
      return;
    }
    // 访客模式：纯前端本地添加
    if (guestModeRef.current) {
      setTasks(prev => [...prev, { ...task, id: task.id || `guest-t-${Date.now()}` }]);
      return;
    }
    if (!familyId) {
      throw new Error('未找到家庭信息，请重新登录');
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.addTask(toDataLayerTask(task, currentUser.id));
      await refreshTasksFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`创建任务失败: ${err.message}`, 'error');
      throw err;
    }
  }, [currentUser, familyId]);

  const updateTask = useCallback(async (task: Task) => {
    if (!currentUser) return;
    if (!canManageFamily(currentUser)) {
      deny('只有家长可以编辑任务');
      return;
    }
    // 访客模式：纯前端本地更新
    if (guestModeRef.current) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      return;
    }
    if (!currentUser || !familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return;
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.updateTask(task.id, toDataLayerTask(task, currentUser.id));
      await refreshTasksFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`更新任务失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!currentUser) return;
    if (!canManageFamily(currentUser)) {
      deny('只有家长可以删除任务');
      return;
    }
    // 访客模式：纯前端本地删除
    if (guestModeRef.current) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }
    if (!currentUser || !familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return;
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.deleteTask(taskId);
      await refreshTasksFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`删除任务失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId]);

  const completeTask = useCallback(async (taskId: string) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地完成
    if (guestModeRef.current) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'reviewing' as const } : t));
      return;
    }
    if (!familyId) return;
    try {
      await ensureDataLayer(familyId, currentUser.id);
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return;
      const dataTask = await dataLayerRef.current.updateTask(taskId, {
        ...toDataLayerTask(currentTask, currentUser.id),
        status: 'reviewing',
        completed: false,
        completedAt: null,
      });
      setTasks(prev => prev.map(t => t.id === taskId ? toTaskFromDataLayer(dataTask) : t));
    } catch (err: any) {
      showToastGlobal(`完成任务失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId, tasks]);

  const approveTask = useCallback(async (taskId: string) => {
    if (!currentUser) return;
    if (!canApproveTasks(currentUser)) {
      deny('只有家长可以确认任务');
      return;
    }
    // 访客模式：纯前端本地审批 + 加星星
    if (guestModeRef.current) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const completedAt = new Date().toISOString();
        const sourceHabitId = getHabitSourceId(task);
        const sourceHabit = sourceHabitId ? tasks.find(t => t.id === sourceHabitId) : null;
        const habitCount = (sourceHabit?.currentCount || 0) + (sourceHabit ? 1 : 0);
        setTasks(prev => prev.map(t => t.id === taskId ? {
          ...t,
          status: 'completed' as const,
          completedAt,
        } : sourceHabitId && t.id === sourceHabitId ? {
          ...t,
          currentCount: habitCount,
          status: habitCount >= (t.targetCount || 1) ? 'completed' as const : t.status,
        } : t));
        const assigneeIds = task.assigneeIds.length > 0 ? task.assigneeIds : [currentUser.id];
        setMembers(prev => prev.map(member =>
          assigneeIds.includes(member.id)
            ? { ...member, stars: member.stars + task.rewardStars }
            : member
        ));
        if (assigneeIds.includes(currentUser.id)) {
          setCurrentUser({ ...currentUser, stars: currentUser.stars + task.rewardStars });
        }
        // 星星足迹只记录真实星星变化，0 星任务不进入账本。
        const newHistoryRecords: HistoryRecord[] = assigneeIds.map(assigneeId => ({
          id: `guest-hist-${taskId}-${assigneeId}-${Date.now()}`,
          userId: assigneeId,
          title: `完成任务: ${task.title}`,
          type: task.rewardStars < 0 ? 'penalty' as const : 'task' as const,
          stars: task.rewardStars,
          timestamp: completedAt,
          icon: 'CheckCircle',
        }));
        setHistory(prev => normalizeHistoryRecords([...newHistoryRecords, ...prev]));
      }
      return;
    }
    if (!familyId) return;
    try {
      await ensureDataLayer(familyId, currentUser.id);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const completedAt = new Date().toISOString();
      const dataTask = await dataLayerRef.current.updateTask(taskId, {
        ...toDataLayerTask(task, currentUser.id),
        status: 'completed',
        completed: true,
        completedAt,
      });
      setTasks(prev => prev.map(t => t.id === taskId ? toTaskFromDataLayer(dataTask) : t));

      const sourceHabitId = getHabitSourceId(task);
      if (sourceHabitId) {
        const sourceHabit = tasks.find(t => t.id === sourceHabitId);
        if (sourceHabit) {
          const nextCount = (sourceHabit.currentCount || 0) + 1;
          const updatedHabit = await dataLayerRef.current.updateTask(sourceHabitId, {
            ...toDataLayerTask(sourceHabit, currentUser.id),
            currentCount: nextCount,
            status: nextCount >= (sourceHabit.targetCount || 1) ? 'completed' : sourceHabit.status === 'completed' ? 'completed' : 'pending',
          });
          setTasks(prev => prev.map(t => t.id === sourceHabitId ? toTaskFromDataLayer(updatedHabit) : t));
        }
      }

      for (const assigneeId of task.assigneeIds) {
        await dataLayerRef.current.addStars(assigneeId, task.rewardStars, `完成任务(审批): ${task.title}`, { taskId, habitId: sourceHabitId || undefined });
      }
      setMembers(prev => prev.map(member =>
        task.assigneeIds.includes(member.id)
          ? { ...member, stars: member.stars + task.rewardStars }
          : member
      ));
      if (task.assigneeIds.includes(currentUser.id)) {
        setCurrentUser({ ...currentUser, stars: currentUser.stars + task.rewardStars });
      }
      const newHistoryRecords: HistoryRecord[] = task.assigneeIds.map(assigneeId => ({
        id: `local-hist-${taskId}-${assigneeId}-${Date.now()}`,
        userId: assigneeId,
        title: `完成任务(审批): ${task.title}`,
        type: task.rewardStars < 0 ? 'penalty' as const : 'task' as const,
        stars: task.rewardStars,
        timestamp: completedAt,
        icon: 'CheckCircle',
      }));
      setHistory(prev => normalizeHistoryRecords([...newHistoryRecords, ...prev]));
    } catch (err: any) {
      showToastGlobal(`审批任务失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId, tasks]);

  const requestHabitCheckIn = useCallback(async (habitId: string, memberId?: string) => {
    if (!currentUser) return;
    const habit = tasks.find(t => t.id === habitId && t.isHabit);
    if (!habit) return;
    const targetMemberId = memberId || currentUser.id;
    if (currentUser.role !== 'parent' && targetMemberId !== currentUser.id) {
      deny('孩子只能提交自己的打卡');
      return;
    }
    if (!habit.assigneeIds.includes(targetMemberId)) {
      showToastGlobal('这个奖惩没有分配给该孩子', 'warning');
      return;
    }
    const hasPending = tasks.some(task =>
      task.status === 'reviewing'
      && task.assigneeIds.includes(targetMemberId)
      && getHabitSourceId(task) === habitId
    );
    if (hasPending) {
      showToastGlobal('这条奖惩已经提交，等待家长审核', 'info');
      return;
    }

    const reviewTask = buildHabitReviewTask({
      habit,
      memberId: targetMemberId,
      actorId: currentUser.id,
    });

    if (guestModeRef.current) {
      setTasks(prev => [reviewTask, ...prev]);
      showToastGlobal('已提交给家长审核', 'success');
      return;
    }
    if (!familyId) return;
    try {
      await ensureDataLayer(familyId, currentUser.id);
      const dataTask = await dataLayerRef.current.addTask(toDataLayerTask(reviewTask, currentUser.id));
      setTasks(prev => [toTaskFromDataLayer(dataTask), ...prev]);
      showToastGlobal('已提交给家长审核', 'success');
    } catch (err: any) {
      showToastGlobal(`提交奖惩失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId, tasks]);

  const approveHabitCheckIn = useCallback(async (habitId: string, memberId: string) => {
    if (!currentUser) return;
    if (!canApproveTasks(currentUser)) {
      deny('只有家长可以直接确认奖惩');
      return;
    }
    const habit = tasks.find(t => t.id === habitId && t.isHabit);
    if (!habit) return;
    if (!habit.assigneeIds.includes(memberId)) {
      showToastGlobal('这个奖惩没有分配给该孩子', 'warning');
      return;
    }
    const now = new Date().toISOString();
    const nextCount = (habit.currentCount || 0) + 1;
    const nextHabit: Task = {
      ...habit,
      currentCount: nextCount,
      status: nextCount >= (habit.targetCount || 1) ? 'completed' : habit.status === 'completed' ? 'completed' : 'pending',
    };
    const historyRecord: HistoryRecord = {
      id: `habit-direct-${habitId}-${memberId}-${Date.now()}`,
      userId: memberId,
      title: `${habit.rewardStars < 0 ? '扣分' : '打卡'}: ${habit.title}`,
      type: habit.rewardStars < 0 ? 'penalty' : 'task',
      stars: habit.rewardStars,
      timestamp: now,
      icon: habit.rewardStars < 0 ? 'AlertCircle' : 'CheckCircle',
    };

    if (guestModeRef.current) {
      setTasks(prev => prev.map(task => task.id === habitId ? nextHabit : task));
      setMembers(prev => prev.map(member => member.id === memberId ? { ...member, stars: member.stars + habit.rewardStars } : member));
      if (currentUser.id === memberId) setCurrentUser({ ...currentUser, stars: currentUser.stars + habit.rewardStars });
      setHistory(prev => normalizeHistoryRecords([historyRecord, ...prev]));
      showToastGlobal(habit.rewardStars < 0 ? '已扣除孩子积分' : '已为孩子打卡', 'success');
      return;
    }
    if (!familyId) return;
    try {
      await ensureDataLayer(familyId, currentUser.id);
      const updatedHabit = await dataLayerRef.current.updateTask(habitId, toDataLayerTask(nextHabit, currentUser.id));
      await dataLayerRef.current.addStars(memberId, habit.rewardStars, `${habit.rewardStars < 0 ? '奖惩扣分' : '奖惩打卡'}: ${habit.title}`, { habitId });
      setTasks(prev => prev.map(task => task.id === habitId ? toTaskFromDataLayer(updatedHabit) : task));
      setMembers(prev => prev.map(member => member.id === memberId ? { ...member, stars: member.stars + habit.rewardStars } : member));
      if (currentUser.id === memberId) setCurrentUser({ ...currentUser, stars: currentUser.stars + habit.rewardStars });
      setHistory(prev => normalizeHistoryRecords([historyRecord, ...prev]));
      showToastGlobal(habit.rewardStars < 0 ? '已扣除孩子积分' : '已为孩子打卡', 'success');
    } catch (err: any) {
      showToastGlobal(`确认奖惩失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId, tasks]);

  // ==================== 奖励 Mutations ====================
  const addReward = useCallback(async (reward: Reward) => {
    if (!currentUser) {
      throw new Error('未登录，无法创建奖励');
    }
    if (!canManageRewards(currentUser)) {
      deny('只有家长可以创建心愿');
      return;
    }
    // 访客模式：纯前端本地添加
    if (guestModeRef.current) {
      setRewards(prev => [...prev, { ...reward, id: reward.id || `guest-r-${Date.now()}` }]);
      return;
    }
    if (!familyId) {
      throw new Error('未找到家庭信息，请重新登录');
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.addReward(toDataLayerReward(reward));
      await refreshRewardsFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`创建奖励失败: ${err.message}`, 'error');
      throw err;
    }
  }, [currentUser, familyId]);

  const updateReward = useCallback(async (reward: Reward) => {
    if (!currentUser) return;
    if (!canManageRewards(currentUser)) {
      deny('只有家长可以编辑心愿');
      return;
    }
    // 访客模式：纯前端本地更新
    if (guestModeRef.current) {
      setRewards(prev => prev.map(r => r.id === reward.id ? reward : r));
      return;
    }
    if (!currentUser || !familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return;
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.updateReward(reward.id, toDataLayerReward(reward));
      await refreshRewardsFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`更新奖励失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId]);

  const deleteReward = useCallback(async (rewardId: string) => {
    if (!currentUser) return;
    if (!canManageRewards(currentUser)) {
      deny('只有家长可以删除心愿');
      return;
    }
    // 访客模式：纯前端本地删除
    if (guestModeRef.current) {
      setRewards(prev => prev.filter(r => r.id !== rewardId));
      return;
    }
    if (!currentUser || !familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return;
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.deleteReward(rewardId);
      await refreshRewardsFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`删除奖励失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId]);

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!currentUser) return;
    // 访客模式：纯前端本地兑换
    if (guestModeRef.current) {
      const reward = rewards.find(r => r.id === rewardId);
      if (reward && currentUser.stars >= reward.cost) {
        setRewards(prev => prev.map(r => r.id === rewardId
          ? { ...r, status: 'pending_approval', redeemedBy: currentUser.id, redeemedAt: undefined }
          : r
        ));
      }
      return;
    }
    try {
      if (!familyId) {
        showToastGlobal('未找到家庭信息，请重新登录', 'error');
        return;
      }
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) return;
      if (currentUser.stars < reward.cost) {
        showToastGlobal('星星不足', 'warning');
        return;
      }
      await ensureDataLayer(familyId, currentUser.id);
      const updatedReward = await dataLayerRef.current.updateReward(rewardId, {
        ...toDataLayerReward(reward),
        status: 'pending_approval',
        redeemedBy: currentUser.id,
        redeemedAt: null,
      });
      setRewards(prev => prev.map(r => r.id === rewardId ? toRewardFromDataLayer(updatedReward) : r));
    } catch (err: any) {
      showToastGlobal(`兑换奖励失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId, rewards]);

  const approveReward = useCallback(async (rewardId: string): Promise<boolean> => {
    if (!currentUser) return false;
    if (!canApproveRewards(currentUser)) {
      deny('只有家长可以确认兑换');
      return false;
    }
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return false;
    const redeemerId = reward.redeemedBy || currentUser.id;
    const redeemer = members.find(member => member.id === redeemerId);

    if (guestModeRef.current) {
      if (redeemer && redeemer.stars < reward.cost) {
        showToastGlobal('星星不足，无法确认兑换', 'warning');
        return false;
      }
      const redeemedAt = new Date().toISOString();
      const fulfillmentTask = buildRewardFulfillmentTask({
        reward,
        redeemer,
        parents: members.filter(member => member.role === 'parent'),
        approver: currentUser,
        redeemedAt,
      });
      setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, status: 'redeemed', redeemedBy: redeemerId, redeemedAt } : r));
      if (!hasRewardFulfillmentTask(tasks, reward.id)) {
        setTasks(prev => [{ ...fulfillmentTask, id: `guest-fulfill-${reward.id}-${Date.now()}` }, ...prev]);
      }
      setMembers(prev => prev.map(member => member.id === redeemerId ? { ...member, stars: member.stars - reward.cost } : member));
      if (currentUser.id === redeemerId) setCurrentUser({ ...currentUser, stars: currentUser.stars - reward.cost });
      setHistory(prev => normalizeHistoryRecords([{
        id: `guest-redeem-approved-${Date.now()}`,
        userId: redeemerId,
        title: `兑换心愿: ${reward.name}`,
        type: 'redeem',
        stars: -reward.cost,
        timestamp: redeemedAt,
        icon: 'Gift',
      }, ...prev]));
      return true;
    }

    if (!familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return false;
    }
    if (redeemer && redeemer.stars < reward.cost) {
      showToastGlobal('星星不足，无法确认兑换', 'warning');
      return false;
    }

    try {
      await ensureDataLayer(familyId, currentUser.id);
      const redeemedAt = new Date().toISOString();
      const updatedReward = await dataLayerRef.current.updateReward(rewardId, {
        ...toDataLayerReward(reward),
        status: 'redeemed',
        redeemedBy: redeemerId,
        redeemedAt,
      });
      const fulfillmentTask = buildRewardFulfillmentTask({
        reward,
        redeemer,
        parents: members.filter(member => member.role === 'parent'),
        approver: currentUser,
        redeemedAt,
      });
      if (!hasRewardFulfillmentTask(tasks, reward.id)) {
        const dataTask = await dataLayerRef.current.addTask(toDataLayerTask(fulfillmentTask, currentUser.id));
        setTasks(prev => [toTaskFromDataLayer(dataTask), ...prev]);
      }
      await dataLayerRef.current.addStars(redeemerId, -reward.cost, `兑换心愿: ${reward.name}`, { rewardId });
      setRewards(prev => prev.map(r => r.id === rewardId ? toRewardFromDataLayer(updatedReward) : r));
      setMembers(prev => prev.map(member => member.id === redeemerId ? { ...member, stars: member.stars - reward.cost } : member));
      if (currentUser.id === redeemerId) setCurrentUser({ ...currentUser, stars: currentUser.stars - reward.cost });
      setHistory(prev => normalizeHistoryRecords([{
        id: `local-redeem-approved-${rewardId}-${Date.now()}`,
        userId: redeemerId,
        title: `兑换心愿: ${reward.name}`,
        type: 'redeem',
        stars: -reward.cost,
        timestamp: redeemedAt,
        icon: 'Gift',
      }, ...prev]));
      return true;
    } catch (err: any) {
      showToastGlobal(`确认兑换失败: ${err.message}`, 'error');
      return false;
    }
  }, [currentUser, familyId, members, rewards, tasks]);

  // ==================== 成员 Mutations ====================
  const addMember = useCallback(async (member: Member) => {
    if (currentUser && !canManageMembers(currentUser)) {
      deny('只有家长可以添加家庭成员');
      return;
    }
    // 访客模式：纯前端本地添加
    if (guestModeRef.current) {
      const memberWithId = { ...member, id: member.id || `guest-m-${Date.now()}` };
      setMembers(prev => [...prev, prepareMemberCredentialsForStorage(memberWithId)]);
      return;
    }
    if (!familyId) {
      throw new Error('未找到家庭信息，请重新登录');
    }
    try {
      await ensureDataLayer(familyId, currentUser?.id || member.id);
      await dataLayerRef.current.addMember(toDataLayerMember(member));
      await refreshMembersFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`添加成员失败: ${err.message}`, 'error');
      throw err;
    }
  }, [currentUser, familyId]);

  const deleteMember = useCallback(async (memberId: string) => {
    if (!currentUser) return;
    if (!canManageMembers(currentUser)) {
      deny('只有家长可以删除家庭成员');
      return;
    }
    // 访客模式：纯前端本地删除
    if (guestModeRef.current) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      return;
    }
    if (!currentUser || !familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return;
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      await dataLayerRef.current.deleteMember(memberId);
      await refreshMembersFromDataLayer();
    } catch (err: any) {
      showToastGlobal(`删除成员失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId]);

  const updateMember = useCallback(async (member: Member) => {
    if (!currentUser) return;
    const isSelfCredentialUpdate = currentUser.id === member.id;
    if (!isSelfCredentialUpdate && !canManageMembers(currentUser)) {
      deny('只有家长可以编辑其他家庭成员');
      return;
    }
    // 访客模式：纯前端本地更新
    if (guestModeRef.current) {
      const securedMember = prepareMemberCredentialsForStorage(member);
      setMembers(prev => prev.map(m => m.id === member.id ? securedMember : m));
      if (currentUser?.id === member.id) setCurrentUser(securedMember);
      return;
    }
    if (!currentUser || !familyId) {
      showToastGlobal('未找到家庭信息，请重新登录', 'error');
      return;
    }
    try {
      await ensureDataLayer(familyId, currentUser.id);
      const dataMember = await dataLayerRef.current.updateMember(member.id, toDataLayerMember(member));
      const updated = toMemberFromDataLayer(dataMember);
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      if (currentUser?.id === member.id) setCurrentUser(updated);
    } catch (err: any) {
      showToastGlobal(`更新成员失败: ${err.message}`, 'error');
    }
  }, [currentUser, familyId]);

  const logout = useCallback(async () => {
    if (!guestModeRef.current) {
      await supabase.auth.signOut();
    }
    guestModeRef.current = false;
    setCurrentUser(null);
    setMembers([]);
    setTasks([]);
    setRewards([]);
    setHistory([]);
    setAuditLogs([]);
    updateFamilyId(null);
    setGuestMode(false);
    clearGuestLocalState();
    clearGuestPlans();
  }, [updateFamilyId]);

  const toggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), []);

  const addStars = useCallback((amount: number) => {
    console.warn('addStars 已废弃，请使用 API 函数');
  }, []);

  const syncNow = useCallback(async () => {
    if (!familyId || !currentUser || guestModeRef.current) return;
    await ensureDataLayer(familyId, currentUser.id);
    const result = await dataLayerRef.current.syncNow(true);
    setSyncStatus(dataLayerRef.current.getSyncStatus());
    if (!result.success && result.error !== 'OFFLINE') {
      showToastGlobal(`同步失败: ${result.error || '请稍后重试'}`, 'error');
    }
  }, [currentUser, familyId]);

  return (
    <FamilyContext.Provider
      value={{
        members, tasks, rewards, history, auditLogs,
        currentUser, memberSession, setCurrentUser,
        stars: currentUser?.stars || 0,
        addStars, addTask, updateTask, deleteTask,
        completeTask, approveTask, requestHabitCheckIn, approveHabitCheckIn,
        addReward, updateReward, deleteReward, redeemReward, approveReward,
        isDarkMode, toggleDarkMode,
        addMember, deleteMember, updateMember,
        logout,
        isUserSelectorOpen, setIsUserSelectorOpen,
        isInitialized, setIsInitialized,
        loading,
        familyId, setFamilyId: updateFamilyId,
        guestMode, setGuestMode,
        syncStatus, syncNow,
        loadGuestData, loadGuestDemoData, localImport,
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
