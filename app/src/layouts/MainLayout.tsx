import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Receipt,
  People,
  LocalLaundryService,
  Payment,
  BarChart,
  Settings,
  PointOfSale,
  Store,
  History,
  Logout,
  Person,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { VaiTro } from '../types';
import { VAI_TRO_LABELS } from '../utils/constants';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: VaiTro[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', path: '/', icon: <Dashboard /> },
  { label: 'Màn hình POS', path: '/pos', icon: <PointOfSale />, roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
  { label: 'Đơn hàng', path: '/don-hang', icon: <Receipt />, roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN] },
  { label: 'Khách hàng', path: '/khach-hang', icon: <People />, roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
  { label: 'Dịch vụ', path: '/dich-vu', icon: <LocalLaundryService />, roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
  { label: 'Thanh toán', path: '/thanh-toan', icon: <Payment />, roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
  { label: 'Báo cáo', path: '/bao-cao', icon: <BarChart />, roles: [VaiTro.SUPER_ADMIN, VaiTro.ADMIN] },
  { label: 'Nhân viên', path: '/nhan-vien', icon: <Person />, roles: [VaiTro.SUPER_ADMIN, VaiTro.ADMIN] },
  { label: 'Cửa hàng', path: '/cua-hang', icon: <Store />, roles: [VaiTro.SUPER_ADMIN] },
  { label: 'Audit Log', path: '/audit-log', icon: <History />, roles: [VaiTro.SUPER_ADMIN] },
  { label: 'Cài đặt', path: '/cai-dat', icon: <Settings />, roles: [VaiTro.SUPER_ADMIN, VaiTro.ADMIN] },
];

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { userProfile, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const currentWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return userProfile && item.roles.includes(userProfile.vaiTro);
  });

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo — click to toggle sidebar */}
      <Box
        onClick={() => { if (!isMobile) setCollapsed(!collapsed); }}
        sx={{
          p: collapsed ? 1.5 : 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: isMobile ? 'default' : 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': isMobile ? {} : {
            bgcolor: 'action.hover',
          },
          borderRadius: 2,
          mx: collapsed ? 0.5 : 0,
          mt: collapsed ? 0.5 : 0,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            minWidth: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1565C0, #00897B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s ease',
            transform: collapsed ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <LocalLaundryService sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        {!collapsed && (
          <Box sx={{
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 0.2s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary.dark">
              Giặt Sấy Online
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Quản lý cửa hàng
            </Typography>
          </Box>
        )}
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, py: 1, transition: 'padding 0.3s ease' }}>
        {filteredNavItems.map((item) => {
          const button = (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 2,
                minHeight: 44,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { backgroundColor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, mr: collapsed ? 0 : undefined, justifyContent: 'center', transition: 'all 0.2s ease' }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                />
              )}
            </ListItemButton>
          );

          // Show tooltip with label when collapsed
          return collapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              {button}
            </Tooltip>
          ) : (
            <React.Fragment key={item.path}>{button}</React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: currentWidth,
            flexShrink: 0,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiDrawer-paper': {
              width: currentWidth,
              boxSizing: 'border-box',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            {/* TC 9: Dark mode toggle */}
            <IconButton onClick={toggleTheme} sx={{ mr: 1 }} title={mode === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}>
              {mode === 'light' ? <DarkMode /> : <LightMode sx={{ color: 'warning.main' }} />}
            </IconButton>
            {userProfile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={VAI_TRO_LABELS[userProfile.vaiTro]}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 16 }}>
                    {userProfile.hoTen?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography fontWeight={600}>{userProfile.hoTen}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {userProfile.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                    <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                    Hồ sơ cá nhân
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                    Đăng xuất
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
