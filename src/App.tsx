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
const WatchPreview = lazy(() => import('./pages/WatchPreview'));
const WatchRelease = lazy(() => import('./pages/WatchRelease'));
const WatchDelivery = lazy(() => import('./pages/WatchDelivery'));
const FamilyBoardConcepts = lazy(() => import('./pages/FamilyBoardConcepts'));

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

function LegalDocumentPage({ type }: { type: 'privacy' | 'deletion' }) {
  const isPrivacy = type === 'privacy';

  return (
    <main className="min-h-screen bg-[#f7fbf6] px-5 py-8 text-[#183225]">
      <article className="mx-auto max-w-3xl leading-7">
        <h1 className="mb-2 text-3xl font-bold text-[#006e1c]">
          {isPrivacy ? '星愿卡隐私政策' : '星愿卡账号注销说明'}
        </h1>
        <p className="text-sm text-[#5d7565]">
          {isPrivacy ? '更新日期：2026年5月17日 ｜ 生效日期：2026年5月17日' : '更新日期：2026年5月17日'}
        </p>

        <section className="my-5 rounded-2xl border border-[#dce9de] bg-white px-5 py-4">
          <p>
            {isPrivacy
              ? '星愿卡是一款面向家庭的日程、任务、习惯与愿望奖励管理工具。我们重视用户，尤其是儿童用户相关信息的保护。本政策说明我们如何收集、使用、保存、共享和保护你的个人信息。'
              : '如你不再使用星愿卡，可以申请注销账号及删除相关家庭数据。注销后，账号登录信息、家庭成员、任务、计划、愿望奖励、星星积分和本账号关联的云端记录将无法继续使用。'}
          </p>
        </section>

        {isPrivacy ? (
          <>
            <h2 className="mt-8 text-xl font-bold text-[#153d23]">一、我们收集的信息</h2>
            <ul className="list-disc pl-6">
              <li>账号与登录信息：邮箱、昵称、家庭成员昵称、登录状态等。</li>
              <li>家庭协作信息：家庭成员、任务、习惯、计划、愿望奖励、星星积分、操作记录等由用户主动创建的内容。</li>
              <li>设备与运行信息：设备型号、操作系统、网络状态、应用版本、故障日志等用于保障服务稳定性的必要信息。</li>
              <li>反馈信息：当你提交意见反馈或联系客服时，可能会收集你填写的问题描述、联系方式和附件。</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">二、儿童信息保护</h2>
            <p>星愿卡的儿童成员资料由监护人创建和管理。儿童无需独立提供邮箱或手机号。请监护人避免上传或填写儿童真实姓名、详细住址、学校班级、身份证件、联系方式等非必要敏感信息。涉及儿童的资料仅用于家庭内部任务管理、习惯培养、奖励兑换和家庭协作展示。</p>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">三、我们如何使用信息</h2>
            <ul className="list-disc pl-6">
              <li>提供家庭任务、计划、习惯打卡、愿望奖励、日历同步、数据备份等核心功能。</li>
              <li>识别登录状态，维护家庭成员权限和家长审核流程。</li>
              <li>改进产品体验、排查故障、处理用户反馈和安全事件。</li>
              <li>在获得授权后，提供日程建议、模板推荐或家庭管理辅助。</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">四、权限调用说明</h2>
            <p>当前 Android 版本主要使用网络访问权限，用于登录、同步、反馈和获取服务数据。若后续版本涉及相机、相册、定位、通知或日历等权限，我们会在调用前以系统弹窗或页面说明方式征得授权。拒绝非必要权限不会影响基本浏览和家庭任务管理功能。</p>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">五、信息共享、转让与公开披露</h2>
            <p>我们不会出售个人信息。除法律法规要求、保障账号安全、完成用户主动请求、获得明确授权或使用必要的基础云服务外，我们不会向第三方共享可识别个人信息。</p>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">六、信息保存与安全</h2>
            <p>我们仅在实现本政策所述目的所需期间保存个人信息，并通过访问控制、传输加密、最小化权限等措施保护数据安全。因互联网服务存在客观风险，我们也建议用户妥善保管账号密码，不在共享设备上保存登录状态。</p>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">七、你的权利</h2>
            <p>你可以在应用内查看、修改、删除家庭成员、任务、计划和奖励等内容。你也可以通过账号注销说明页申请注销账号或删除相关数据。我们会在核验身份后依法处理访问、更正、删除、撤回授权、注销账号等请求。</p>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">八、联系我们</h2>
            <p>如你对本政策或个人信息保护有疑问、投诉或请求，请通过邮箱 <a className="text-[#006e1c]" href="mailto:support@xingmubiao.com">support@xingmubiao.com</a> 联系我们。</p>
          </>
        ) : (
          <>
            <h2 className="mt-8 text-xl font-bold text-[#153d23]">一、注销方式</h2>
            <ol className="list-decimal pl-6">
              <li>在应用内进入「我的」-「联系我们」或「反馈」，提交“账号注销”请求。</li>
              <li>也可以使用注册邮箱或常用联系方式发送邮件至 <a className="text-[#006e1c]" href="mailto:support@xingmubiao.com">support@xingmubiao.com</a>，标题写明“星愿卡账号注销”。</li>
              <li>邮件中请提供用于核验的账号邮箱、家庭名称或其他能证明账号归属的信息。不要发送身份证、银行卡等非必要敏感材料。</li>
            </ol>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">二、处理时限</h2>
            <p>我们收到注销申请并完成身份核验后，将在15个工作日内处理。法律法规另有要求或涉及安全、争议、账务、审计留存的记录，可能按必要期限保存。</p>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">三、注销影响</h2>
            <ul className="list-disc pl-6">
              <li>注销后无法恢复原账号、家庭资料、计划、任务和奖励记录。</li>
              <li>其他家庭成员可能无法继续访问该家庭空间中的协作数据。</li>
              <li>如账号存在未完成的安全验证、投诉处理或法律义务，注销可能需要延后完成。</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-[#153d23]">四、撤回注销</h2>
            <p>在注销完成前，你可以通过同一邮箱联系 <a className="text-[#006e1c]" href="mailto:support@xingmubiao.com">support@xingmubiao.com</a> 撤回申请。注销完成后，数据通常无法恢复。</p>
          </>
        )}
      </article>
    </main>
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
                  <Route path="/watch-preview" element={<WatchPreview />} />
                  <Route path="/watch-release" element={<WatchRelease />} />
                  <Route path="/watch-delivery" element={<WatchDelivery />} />
                  <Route path="/family-board-concepts" element={<FamilyBoardConcepts />} />
                  <Route path="/legal/privacy.html" element={<LegalDocumentPage type="privacy" />} />
                  <Route path="/legal/account-deletion.html" element={<LegalDocumentPage type="deletion" />} />
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
