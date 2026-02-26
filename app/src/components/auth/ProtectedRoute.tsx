import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import type { VaiTro } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: VaiTro[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { firebaseUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography color="text.secondary">Đang tải...</Typography>
      </Box>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.vaiTro)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <Typography variant="h4" color="error">
          403
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Bạn không có quyền truy cập trang này
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
