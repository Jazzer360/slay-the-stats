import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { CardEloPage } from './pages/CardEloPage';
import { AncientEloPage } from './pages/AncientEloPage';
import { RunListPage } from './pages/RunListPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { AboutPage } from './pages/AboutPage';
import { ImportPage } from './pages/ImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SharedRunPage } from './pages/SharedRunPage';
import { RequireAuth } from './components/auth/RequireAuth';
import { useCloudLoader } from './hooks/useCloudLoader';
import { usePageTracking } from './hooks/usePageTracking';

function AppRoutes() {
  useCloudLoader();
  usePageTracking();

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/card-elo" element={<CardEloPage />} />
        <Route path="/ancient-elo" element={<AncientEloPage />} />
        <Route path="/runs" element={<RunListPage />} />
        <Route path="/runs/:fileName" element={<RunDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/u/:screenName" element={<ProfilePage />}>
          <Route index element={<DashboardPage />} />
          <Route path="card-elo" element={<CardEloPage />} />
          <Route path="ancient-elo" element={<AncientEloPage />} />
          <Route path="runs" element={<RunListPage />} />
          <Route path="runs/:fileName" element={<RunDetailPage />} />
        </Route>
        <Route path="/share/:token" element={<SharedRunPage />} />
      </Route>
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
