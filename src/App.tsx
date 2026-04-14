import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { CardEloPage } from './pages/CardEloPage';
import { AncientEloPage } from './pages/AncientEloPage';
import { RunListPage } from './pages/RunListPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ImportPage } from './pages/ImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SharedRunPage } from './pages/SharedRunPage';
import { CombatStatsPage } from './pages/CombatStatsPage';
import { CardDetailPage } from './pages/CardDetailPage';
import { AncientDetailPage } from './pages/AncientDetailPage';
import { RequireAuth } from './components/auth/RequireAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFoundPage } from './pages/NotFoundPage';
import { CookieBanner } from './components/layout/CookieBanner';
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
        <Route path="/card-elo/:entityId" element={<CardDetailPage />} />
        <Route path="/ancient-elo" element={<AncientEloPage />} />
        <Route path="/ancient-elo/:entityId" element={<AncientDetailPage />} />
        <Route path="/combat-stats" element={<CombatStatsPage />} />
        <Route path="/runs" element={<RunListPage />} />
        <Route path="/runs/:fileName" element={<RunDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/u/:screenName" element={<ProfilePage />}>
          <Route index element={<DashboardPage />} />
          <Route path="card-elo" element={<CardEloPage />} />
          <Route path="card-elo/:entityId" element={<CardDetailPage />} />
          <Route path="ancient-elo" element={<AncientEloPage />} />
          <Route path="ancient-elo/:entityId" element={<AncientDetailPage />} />
          <Route path="combat-stats" element={<CombatStatsPage />} />
          <Route path="runs" element={<RunListPage />} />
          <Route path="runs/:fileName" element={<RunDetailPage />} />
        </Route>
        <Route path="/share/:token" element={<SharedRunPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <CookieBanner />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
