import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFamily } from './context/FamilyContext';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Rewards from './pages/Rewards';
import FamilyManagement from './pages/FamilyManagement';
import LoadingScreen from './components/LoadingScreen';

function AppRoutes() {
  const { currentUser, currentFamily, loading } = useFamily();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser && currentFamily
            ? <Navigate to="/dashboard" replace />
            : <Welcome />
        }
      />
      <Route
        path="/dashboard"
        element={
          currentUser && currentFamily
            ? <Dashboard />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/tasks"
        element={
          currentUser && currentFamily
            ? <Tasks />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/habits"
        element={
          currentUser && currentFamily
            ? <Habits />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/rewards"
        element={
          currentUser && currentFamily
            ? <Rewards />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/family"
        element={
          currentUser && currentFamily
            ? <FamilyManagement />
            : <Navigate to="/" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
