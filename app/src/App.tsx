import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import { VaiTro } from './types';

// Lazy load pages (bundle-dynamic-imports best practice)
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const CuaHangPage = lazy(() => import('./pages/cuahang/CuaHangPage'));
const NhanVienPage = lazy(() => import('./pages/nhanvien/NhanVienPage'));
const ProfilePage = lazy(() => import('./pages/nhanvien/ProfilePage'));
const DichVuPage = lazy(() => import('./pages/dichvu/DichVuPage'));
const KhachHangPage = lazy(() => import('./pages/khachhang/KhachHangPage'));
const DonHangPage = lazy(() => import('./pages/donhang/DonHangPage'));
const POSPage = lazy(() => import('./pages/pos/POSPage'));
const CaiDatPage = lazy(() => import('./pages/caidat/CaiDatPage'));
const ThanhToanPage = lazy(() => import('./pages/thanhtoan/ThanhToanPage'));
const BaoCaoPage = lazy(() => import('./pages/baocao/BaoCaoPage'));
const AuditLogPage = lazy(() => import('./pages/auditlog/AuditLogPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ConnectionProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  {/* POS: standalone full-screen route (no sidebar) */}
                  <Route path="/pos" element={
                    <ProtectedRoute allowedRoles={[VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY]}>
                      <Suspense fallback={<PageLoader />}><POSPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                    <Route path="don-hang" element={
                      <ProtectedRoute allowedRoles={[VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN]}>
                        <Suspense fallback={<PageLoader />}><DonHangPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="khach-hang" element={
                      <ProtectedRoute allowedRoles={[VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY]}>
                        <Suspense fallback={<PageLoader />}><KhachHangPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="dich-vu" element={
                      <ProtectedRoute allowedRoles={[VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY]}>
                        <Suspense fallback={<PageLoader />}><DichVuPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="thanh-toan" element={
                      <ProtectedRoute allowedRoles={[VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY]}>
                        <Suspense fallback={<PageLoader />}><ThanhToanPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="bao-cao" element={
                      <ProtectedRoute allowedRoles={[VaiTro.SUPER_ADMIN, VaiTro.ADMIN]}>
                        <Suspense fallback={<PageLoader />}><BaoCaoPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="nhan-vien" element={
                      <ProtectedRoute allowedRoles={[VaiTro.SUPER_ADMIN, VaiTro.ADMIN]}>
                        <Suspense fallback={<PageLoader />}><NhanVienPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="profile" element={
                      <ProtectedRoute>
                        <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="cua-hang" element={
                      <ProtectedRoute allowedRoles={[VaiTro.SUPER_ADMIN]}>
                        <Suspense fallback={<PageLoader />}><CuaHangPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="audit-log" element={
                      <ProtectedRoute allowedRoles={[VaiTro.SUPER_ADMIN, VaiTro.ADMIN]}>
                        <Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="cai-dat" element={
                      <ProtectedRoute allowedRoles={[VaiTro.SUPER_ADMIN, VaiTro.ADMIN]}>
                        <Suspense fallback={<PageLoader />}><CaiDatPage /></Suspense>
                      </ProtectedRoute>
                    } />
                  </Route>
                </Routes>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    style: { borderRadius: '8px', padding: '12px 16px' },
                  }}
                />
            </ConnectionProvider>
          </AuthProvider>
        </BrowserRouter>
      </AppThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}


