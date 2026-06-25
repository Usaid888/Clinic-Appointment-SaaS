/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider.tsx';
import DashboardLayout from './components/DashboardLayout.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import WaitlistPage from './pages/WaitlistPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import ClaimSlotPage from './pages/ClaimSlotPage.tsx';
import Login from './pages/Login.tsx';
import { Toaster } from '@/components/ui/sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/claim/:token" element={<ClaimSlotPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/calendar" />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="waitlist" element={<WaitlistPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}
