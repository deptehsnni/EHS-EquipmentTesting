import React, { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { ToastProvider } from './hooks/useToast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { InventoryPage } from './pages/InventoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterEquipmentPage } from './pages/RegisterEquipmentPage';
import { PublicScannerPage } from './pages/PublicScannerPage';
import { EquipmentPublicPage } from './pages/EquipmentPublicPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { EquipmentDetailPage } from './pages/EquipmentDetailPage';

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  employeeId: string;
  fullName: string;
  role: 'user' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Auth Provider ────────────────────────────────────────────────────────────

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setUser({ id: data.id, employeeId: data.employee_id, fullName: data.full_name, role: data.role, status: data.status });
    } else { setUser(null); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadUser(session.user.id).finally(() => setLoading(false));
      else { setUser(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
};

// ─── Protected Route ──────────────────────────────────────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'pending') return <Navigate to="/login?status=pending" replace />;
  if (user.status === 'rejected') return <Navigate to="/login?status=rejected" replace />;
  if (requireAdmin && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ─── Root Redirect ────────────────────────────────────────────────────────────

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]"><div className="spinner" /></div>;
  if (!user || user.status !== 'approved') return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'superadmin' ? '/admin' : '/dashboard'} replace />;
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/public-scan" element={<PublicScannerPage />} />
          <Route path="/scan/:equipmentNo" element={<EquipmentPublicPage />} />

          {/* Protected - all approved users */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/inventory/:id" element={<ProtectedRoute><EquipmentDetailPage /></ProtectedRoute>} />
          <Route path="/register-equipment" element={<ProtectedRoute><RegisterEquipmentPage /></ProtectedRoute>} />

          {/* Protected - superadmin only */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

          {/* Redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
