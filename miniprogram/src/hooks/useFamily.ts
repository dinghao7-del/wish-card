/**
 * Forest Family 小程序 - useFamily Hook
 * 对齐 Web 端 src/context/FamilyContext.tsx 的 useFamily()
 *
 * 封装 Redux store 的 useSelector/useDispatch，提供与 Web 端一致的 API
 * 所有页面通过 useFamily() 获取全局状态和 CRUD 方法
 */

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import type { Notification } from '@/store/slices/notificationsSlice';
import {
  // Async Thunks
  loadUserData,
  loadGuestData,
  addTask,
  updateTask,
  deleteTask,
  submitForReview,
  approveTask,
  rejectTask,
  addReward,
  updateReward,
  deleteReward,
  redeemReward,
  addMember,
  deleteMember,
  updateMember,
  logout,
  persistLocalData,
  restoreLocalData,
  // Actions
  userSessionActions,
  dataActions,
  uiActions,
  notificationActions,
} from '@/store';

export function useFamily() {
  const dispatch = useDispatch<AppDispatch>();

  // ===== Selectors (对齐 Web FamilyContextType) =====
  const currentUser = useSelector((s: RootState) => s.userSession.currentUser);
  const familyId = useSelector((s: RootState) => s.userSession.familyId);
  const guestMode = useSelector((s: RootState) => s.userSession.guestMode);
  const members = useSelector((s: RootState) => s.data.members);
  const tasks = useSelector((s: RootState) => s.data.tasks);
  const rewards = useSelector((s: RootState) => s.data.rewards);
  const history = useSelector((s: RootState) => s.data.history);
  const isDarkMode = useSelector((s: RootState) => s.ui.isDarkMode);
  const isUserSelectorOpen = useSelector((s: RootState) => s.ui.isUserSelectorOpen);
  const loading = useSelector((s: RootState) => s.ui.loading);
  const isInitialized = useSelector((s: RootState) => s.ui.isInitialized);

  // ===== Notification Selectors =====
  const notifications = useSelector((s: RootState) => s.notifications.items);
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount);

  // ===== 星星余额 =====
  const stars = currentUser?.stars || 0;

  // ===== Session Actions =====
  const setCurrentUser = useCallback((m: any) => dispatch(userSessionActions.setCurrentUser(m)), [dispatch]);
  const setFamilyId = useCallback((id: string | null) => dispatch(userSessionActions.setFamilyId(id)), [dispatch]);
  const setGuestMode = useCallback((v: boolean) => dispatch(userSessionActions.setGuestMode(v)), [dispatch]);

  // ===== Data Actions =====
  const setMembers = useCallback((ms: any[]) => dispatch(dataActions.setMembers(ms)), [dispatch]);
  const setTasks = useCallback((ts: any[]) => dispatch(dataActions.setTasks(ts)), [dispatch]);
  const setRewards = useCallback((rs: any[]) => dispatch(dataActions.setRewards(rs)), [dispatch]);
  const setHistory = useCallback((hs: any[]) => dispatch(dataActions.setHistory(hs)), [dispatch]);

  // ===== UI Actions =====
  const setUserSelectorOpen = useCallback((v: boolean) => dispatch(uiActions.setUserSelectorOpen(v)), [dispatch]);
  const toggleDarkMode = useCallback(() => dispatch(uiActions.toggleDarkMode()), [dispatch]);
  const setLoading = useCallback((v: boolean) => dispatch(uiActions.setLoading(v)), [dispatch]);
  const setInitialized = useCallback((v: boolean) => dispatch(uiActions.setInitialized(v)), [dispatch]);

  // ===== Notification Actions =====
  const addNotification = useCallback(
    (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) =>
      dispatch(notificationActions.addNotification(n)),
    [dispatch],
  );
  const markAsRead = useCallback((id: string) => dispatch(notificationActions.markAsRead(id)), [dispatch]);
  const markAllAsRead = useCallback(() => dispatch(notificationActions.markAllAsRead()), [dispatch]);
  const removeNotification = useCallback((id: string) => dispatch(notificationActions.removeNotification(id)), [dispatch]);
  const clearAllNotifications = useCallback(() => dispatch(notificationActions.clearAll()), [dispatch]);

  // ===== Async Thunk Wrappers (对齐 Web FamilyContext 的 CRUD 方法) =====
  const handleLoadUserData = useCallback(
    (userId: string) => dispatch(loadUserData(userId)),
    [dispatch],
  );
  const handleLoadGuestData = useCallback(
    (args: { memberId: string; famId: string }) => dispatch(loadGuestData(args)),
    [dispatch],
  );
  const handleAddTask = useCallback(
    (task: any) => dispatch(addTask(task)),
    [dispatch],
  );
  const handleUpdateTask = useCallback(
    (task: any) => dispatch(updateTask(task)),
    [dispatch],
  );
  const handleDeleteTask = useCallback(
    (taskId: string) => dispatch(deleteTask(taskId)),
    [dispatch],
  );
  const handleSubmitForReview = useCallback(
    (taskId: string) => dispatch(submitForReview(taskId)),
    [dispatch],
  );
  const handleApproveTask = useCallback(
    (taskId: string) => dispatch(approveTask(taskId)),
    [dispatch],
  );
  const handleRejectTask = useCallback(
    (taskId: string) => dispatch(rejectTask(taskId)),
    [dispatch],
  );
  const handleAddReward = useCallback(
    (reward: any) => dispatch(addReward(reward)),
    [dispatch],
  );
  const handleUpdateReward = useCallback(
    (reward: any) => dispatch(updateReward(reward)),
    [dispatch],
  );
  const handleDeleteReward = useCallback(
    (rewardId: string) => dispatch(deleteReward(rewardId)),
    [dispatch],
  );
  const handleRedeemReward = useCallback(
    (rewardId: string) => dispatch(redeemReward(rewardId)),
    [dispatch],
  );
  const handleAddMember = useCallback(
    (member: any) => dispatch(addMember(member)),
    [dispatch],
  );
  const handleDeleteMember = useCallback(
    (memberId: string) => dispatch(deleteMember(memberId)),
    [dispatch],
  );
  const handleUpdateMember = useCallback(
    (member: any) => dispatch(updateMember(member)),
    [dispatch],
  );
  const handleLogout = useCallback(
    () => dispatch(logout()),
    [dispatch],
  );
  const handlePersistLocalData = useCallback(
    () => persistLocalData(() => ({ userSession: { currentUser, familyId, guestMode }, data: { members, tasks, rewards, history }, ui: { isDarkMode, isUserSelectorOpen, loading, isInitialized } } as any)),
    [currentUser, familyId, guestMode, members, tasks, rewards, history],
  );
  const handleRestoreLocalData = useCallback(
    () => restoreLocalData(),
    [],
  );

  return {
    // 状态（对齐 Web FamilyContextType）
    currentUser,
    familyId,
    guestMode,
    members,
    tasks,
    rewards,
    history,
    stars,
    isDarkMode,
    isUserSelectorOpen,
    loading,
    isInitialized,
    notifications,
    unreadCount,

    // Session 方法
    setCurrentUser,
    setFamilyId,
    setGuestMode,

    // Data 方法
    setMembers,
    setTasks,
    setRewards,
    setHistory,

    // UI 方法
    setUserSelectorOpen,
    toggleDarkMode,
    setLoading,
    setInitialized,

    // Notification 方法
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,

    // Async CRUD 方法（对齐 Web）
    loadUserData: handleLoadUserData,
    loadGuestData: handleLoadGuestData,
    addTask: handleAddTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    submitForReview: handleSubmitForReview,
    approveTask: handleApproveTask,
    rejectTask: handleRejectTask,
    addReward: handleAddReward,
    updateReward: handleUpdateReward,
    deleteReward: handleDeleteReward,
    redeemReward: handleRedeemReward,
    addMember: handleAddMember,
    deleteMember: handleDeleteMember,
    updateMember: handleUpdateMember,
    logout: handleLogout,
    persistLocalData: handlePersistLocalData,
    restoreLocalData: handleRestoreLocalData,
  };
}

export default useFamily;
