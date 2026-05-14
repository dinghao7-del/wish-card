/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { FamilyProvider } from './context/FamilyContext';
import { NotificationProvider, NotificationPanel } from './components/NotificationCenter';
import { ToastProvider } from './components/Toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { WhimsyProvider } from './components/WhimsyProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Rewards } from './pages/Rewards';
import { HabitRewards } from './pages/HabitRewards';
import { Profile } from './pages/Profile';
import { CheckIn } from './pages/CheckIn';
import { SwitchProfile } from './pages/SwitchProfile';
import { Welcome } from './pages/Welcome';
import { EditReward } from './pages/EditReward';
import { PublishTask } from './pages/PublishTask';
import { Plans } from './pages/Plans';
import { applyThemeSkin } from './lib/themeSkins';

const AuthCallback = lazy(() => import('./pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const AddMember = lazy(() => import('./pages/AddMember').then(module => ({ default: module.AddMember })));
const MemberDetail = lazy(() => import('./pages/MemberDetail').then(module => ({ default: module.MemberDetail })));
const EditProfile = lazy(() => import('./pages/EditProfile').then(module => ({ default: module.EditProfile })));
const SettingsSubPage = lazy(() => import('./pages/SettingsSubPage').then(module => ({ default: module.SettingsSubPage })));
const ContactUs = lazy(() => import('./pages/ContactUs').then(module => ({ default: module.ContactUs })));
const Feedback = lazy(() => import('./pages/Feedback').then(module => ({ default: module.Feedback })));
const TaskTemplates = lazy(() => import('./pages/TaskTemplates').then(module => ({ default: module.TaskTemplates })));
const RewardTemplates = lazy(() => import('./pages/RewardTemplates').then(module => ({ default: module.RewardTemplates })));
const History = lazy(() => import('./pages/History').then(module => ({ default: module.History })));
const Import = lazy(() => import('./pages/Import').then(module => ({ default: module.Import })));
const ClerkSignIn = lazy(() => import('./components/auth/ClerkAuth').then(module => ({ default: module.ClerkSignIn })));
const ClerkSignUp = lazy(() => import('./components/auth/ClerkAuth').then(module => ({ default: module.ClerkSignUp })));
const PomodoroTimer = lazy(() => import('./pages/PomodoroTimer').then(module => ({ default: module.PomodoroTimer })));
const CalendarSync = lazy(() => import('./pages/CalendarSync').then(module => ({ default: module.CalendarSync })));
const QuadrantAnalysisPage = lazy(() => import('./pages/QuadrantAnalysisPage').then(module => ({ default: module.QuadrantAnalysisPage })));
const PlanWizard = lazy(() => import('./pages/PlanWizard').then(module => ({ default: module.PlanWizard })));
const PlanDetail = lazy(() => import('./pages/PlanDetail').then(module => ({ default: module.PlanDetail })));
const ScheduleRecommend = lazy(() => import('./pages/ScheduleRecommend').then(module => ({ default: module.ScheduleRecommend })));
const FamilyReports = lazy(() => import('./pages/FamilyReports').then(module => ({ default: module.FamilyReports })));
const AIAnalysisHub = lazy(() => import('./pages/AIAnalysisHub').then(module => ({ default: module.AIAnalysisHub })));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard').then(module => ({ default: module.BusinessDashboard })));
const CommercialResourcesAdmin = lazy(() => import('./pages/CommercialResourcesAdmin').then(module => ({ default: module.CommercialResourcesAdmin })));
const OnboardingGuide = lazy(() => import('./pages/OnboardingGuide').then(module => ({ default: module.OnboardingGuide })));
const CommunityShareReview = lazy(() => import('./pages/CommunityShareReview').then(module => ({ default: module.CommunityShareReview })));
const CommunityTemplates = lazy(() => import('./pages/CommunityTemplates').then(module => ({ default: module.CommunityTemplates })));
const SchoolCalendar = lazy(() => import('./pages/SchoolCalendar').then(module => ({ default: module.SchoolCalendar })));
const ProductHuntDemo = lazy(() => import('./pages/ProductHuntDemo').then(module => ({ default: module.ProductHuntDemo })));
const ProductHuntGalleryFrames = lazy(() => import('./pages/ProductHuntGalleryFrames').then(module => ({ default: module.ProductHuntGalleryFrames })));
const TestDesignSystem = lazy(() => import('./pages/TestDesignSystem'));

// ============================================================
// Android 物理返回键拦截
// 必须放在 BrowserRouter 内部才能访问 useNavigate/useLocation
// ============================================================

/** 根路径列表：到达这些页面时按返回键应最小化 App 而非继续后退 */
const ROOT_PATHS = ['/', '/welcome', '/sign-in', '/sign-up'];

function AndroidBackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // 仅在 Capacitor Android 原生环境中生效
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capacitor = (window as any).Capacitor;
    if (!capacitor || capacitor.getPlatform?.() !== 'android') return;

    let listenerHandle: { remove: () => void } | null = null;

    const registerListener = async () => {
      listenerHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = window.location.pathname;
        const isRootPage = ROOT_PATHS.includes(currentPath);

        if (isRootPage || !canGoBack) {
          // 已在根页面或无历史记录 → 最小化 App（回到桌面但不销毁进程）
          CapacitorApp.minimizeApp();
        } else {
          // 有历史记录 → 返回上一页
          navigate(-1);
        }
      });
    };

    registerListener();

    return () => {
      listenerHandle?.remove();
    };
  // location.pathname 变化时不需要重新注册监听，navigate(-1) 已足够
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-bold text-on-surface-variant">正在打开...</p>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    applyThemeSkin();
  }, []);

  return (
    <WhimsyProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <NotificationProvider>
            <FamilyProvider>
            <BrowserRouter>
              {/* Android 返回键处理器（必须在 BrowserRouter 内） */}
              <AndroidBackHandler />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  {/* Clerk 认证路由 */}
                  <Route path="/sign-in" element={<ClerkSignIn />} />
                  <Route path="/sign-up" element={<ClerkSignUp />} />
                  <Route path="/demo/product-hunt" element={<ProductHuntDemo />} />
                  <Route path="/demo/product-hunt/gallery" element={<ProductHuntGalleryFrames />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/tasks/new" element={<PublishTask />} />
                    <Route path="/tasks/edit/:id" element={<PublishTask />} />
                    <Route path="/tasks/templates" element={<TaskTemplates />} />
                    <Route path="/habits" element={<HabitRewards />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/reports" element={<FamilyReports />} />
                    <Route path="/rewards" element={<Rewards />} />
                    <Route path="/rewards/templates" element={<RewardTemplates />} />
                    <Route path="/rewards/new" element={<EditReward />} />
                    <Route path="/rewards/edit/:id" element={<EditReward />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<EditProfile />} />
                    <Route path="/profile/members/edit/:id" element={<EditProfile />} />
                    <Route path="/profile/members/:id" element={<MemberDetail />} />
                    <Route path="/profile/members/add" element={<AddMember />} />
                    <Route path="/settings/:type" element={<SettingsSubPage />} />
                    <Route path="/check-in/:taskId?" element={<CheckIn />} />
                    <Route path="/switch-profile" element={<SwitchProfile />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/pomodoro" element={<PomodoroTimer />} />
                    <Route path="/calendar-sync" element={<CalendarSync />} />
                    <Route path="/school-calendar" element={<SchoolCalendar />} />
                    <Route path="/quadrant" element={<QuadrantAnalysisPage />} />
                    <Route path="/ai-analysis" element={<AIAnalysisHub />} />
                    <Route path="/internal/business" element={<BusinessDashboard />} />
                    <Route path="/internal/resources" element={<CommercialResourcesAdmin />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/plans/wizard" element={<PlanWizard />} />
                    <Route path="/plans/smart-recommend" element={<ScheduleRecommend />} />
                    <Route path="/plans/:id" element={<PlanDetail />} />
                    <Route path="/community/templates" element={<CommunityTemplates />} />
                    <Route path="/community/share-review/:id" element={<CommunityShareReview />} />
                    <Route path="/onboarding" element={<OnboardingGuide />} />
                    <Route path="/support/contact" element={<ContactUs />} />
                    <Route path="/support/feedback" element={<Feedback />} />
                    <Route path="/test-design" element={<TestDesignSystem />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
            <NotificationPanel />
          </FamilyProvider>
        </NotificationProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
    </WhimsyProvider>
  );
}
