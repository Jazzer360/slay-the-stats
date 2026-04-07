import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { CardEloPage } from './pages/CardEloPage';
import { AncientEloPage } from './pages/AncientEloPage';
import { RunListPage } from './pages/RunListPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/card-elo" element={<CardEloPage />} />
          <Route path="/ancient-elo" element={<AncientEloPage />} />
          <Route path="/runs" element={<RunListPage />} />
          <Route path="/runs/:fileName" element={<RunDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
