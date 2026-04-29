/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FamilyProvider } from './context/FamilyContext';
import { NotificationProvider, NotificationPanel } from './components/NotificationCenter';
import { ToastProvider } from './components/Toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Rewards } from './pages/Rewards';
import { HabitRewards } from './pages/HabitRewards';
import { Profile } from './pages/Profile';
import { CheckIn } from './pages/CheckIn';
import { SwitchProfile } from './pages/SwitchProfile';
import { Welcome } from './pages/Welcome';
import { AuthCallback } from './pages/AuthCallback';
import { EditReward } from './pages/EditReward';
import { PublishTask } from './pages/PublishTask';
import { AddMember } from './pages/AddMember';
import { MemberDetail } from './pages/MemberDetail';
import { EditProfile } from './pages/EditProfile';
import { SettingsSubPage } from './pages/SettingsSubPage';
import { ContactUs } from './pages/ContactUs';
import { Feedback } from './pages/Feedback';
import { TaskTemplates } from './pages/TaskTemplates';
import { History } from './pages/History';
import { Import } from './pages/Import';

import { PomodoroTimer } from './pages/PomodoroTimer';
import { CalendarSync } from './pages/CalendarSync';
import { QuadrantAnalysisPage } from './pages/QuadrantAnalysisPage';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <NotificationProvider>
          <FamilyProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/tasks/new" element={<PublishTask />} />
                  <Route path="/tasks/edit/:id" element={<PublishTask />} />
                  <Route path="/tasks/templates" element={<TaskTemplates />} />
                  <Route path="/habits" element={<HabitRewards />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/rewards" element={<Rewards />} />
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
                  <Route path="/quadrant" element={<QuadrantAnalysisPage />} />
                  <Route path="/support/contact" element={<ContactUs />} />
                  <Route path="/support/feedback" element={<Feedback />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <NotificationPanel />
          </FamilyProvider>
        </NotificationProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
