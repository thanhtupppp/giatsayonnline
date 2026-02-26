import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  LinearProgress, Button,
} from '@mui/material';
import {
  TrendingUp, Receipt, People, LocalLaundryService,
  AccessTime, CheckCircle, Warning, Store, PersonOutline,
  Business, SupervisorAccount, PointOfSale, Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { donHangService } from '../../services/donHangService';
import { khachHangService } from '../../services/khachHangService';
import { dichVuService } from '../../services/dichVuService';
import { cuaHangService } from '../../services/cuaHangService';
import { userService } from '../../services/userService';
import type { DonHang, CuaHang, User } from '../../types';
import { TrangThaiDonHang, TrangThaiCuaHang, VaiTro } from '../../types';
import { formatCurrency, TRANG_THAI_LABELS, TRANG_THAI_COLORS } from '../../utils/constants';

// ============ SUPER ADMIN DASHBOARD ============
function SuperAdminDashboard({ userProfile }: { userProfile: any }) {
  const [shops, setShops] = useState<CuaHang[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allOrders, setAllOrders] = useState<DonHang[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [shopList, userList] = await Promise.all([
          cuaHangService.getAll(),
          userService.getAll(),
        ]);
        setShops(shopList);
        setUsers(userList);

        // Load recent orders from each active shop
        const activeShops = shopList.filter(s => s.trangThai === TrangThaiCuaHang.HOAT_DONG);
        const orderPromises = activeShops.map(s =>
          donHangService.getByMaCuaHang(s.maCuaHang, { limitCount: 20 })
        );
        const orderArrays = await Promise.all(orderPromises);
        setAllOrders(orderArrays.flat());
      } catch { /* fallback */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  const activeShops = shops.filter(s => s.trangThai === TrangThaiCuaHang.HOAT_DONG).length;
  const inactiveShops = shops.length - activeShops;
  const totalEmployees = users.filter(u => u.vaiTro !== VaiTro.SUPER_ADMIN).length;
  const totalRevenue = allOrders.reduce((s, d) => s + d.tienDaTra, 0);
  const totalOrders = allOrders.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Xin chào, {userProfile?.hoTen || 'Super Admin'} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tổng quan hệ thống — Quản lý tất cả cửa hàng
          </Typography>
        </Box>
      </Box>

      {/* System Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Cửa hàng hoạt động', value: String(activeShops), icon: <Store />, color: '#2E7D32', bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)' },
          { title: 'Cửa hàng tạm ngưng', value: String(inactiveShops), icon: <Business />, color: '#E65100', bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' },
          { title: 'Tổng nhân viên', value: String(totalEmployees), icon: <SupervisorAccount />, color: '#1565C0', bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)' },
          { title: 'Tổng doanh thu', value: formatCurrency(totalRevenue), icon: <TrendingUp />, color: '#6A1B9A', bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)' },
        ].map((stat) => (
          <Grid size={{ xs: 6, md: 3 }} key={stat.title}>
            <Card sx={{ background: stat.bg, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ color: stat.color, opacity: 0.8 }}>{stat.title}</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, mt: 0.5 }}>{stat.value}</Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: stat.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9 }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Orders Overview */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Tổng đơn hàng', count: totalOrders, icon: <Receipt />, color: '#42A5F5' },
          { label: 'Chờ xử lý', count: allOrders.filter(d => d.trangThai === TrangThaiDonHang.CHO_XU_LY).length, icon: <AccessTime />, color: '#FFA726' },
          { label: 'Hoàn thành', count: allOrders.filter(d => d.trangThai === TrangThaiDonHang.HOAN_THANH || d.trangThai === TrangThaiDonHang.DA_GIAO).length, icon: <CheckCircle />, color: '#66BB6A' },
          { label: 'Chưa thanh toán', count: allOrders.filter(d => d.tienConLai > 0).length, icon: <Warning />, color: '#EF5350' },
        ].map((item) => (
          <Grid size={{ xs: 6, md: 3 }} key={item.label}>
            <Card>
              <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${item.color}20`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{item.count}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Shops Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Danh sách cửa hàng</Typography>
          {shops.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              Chưa có cửa hàng nào. Tạo cửa hàng đầu tiên!
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Mã</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tên cửa hàng</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Địa chỉ</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nhân viên</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shops.map((shop) => {
                    const shopEmployees = users.filter(u => u.maCuaHang === shop.maCuaHang);
                    return (
                      <TableRow key={shop.maCuaHang} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{shop.maCuaHang}</TableCell>
                        <TableCell>{shop.tenCuaHang}</TableCell>
                        <TableCell>{shop.diaChi || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            icon={<PersonOutline />}
                            label={shopEmployees.length}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={shop.trangThai === TrangThaiCuaHang.HOAT_DONG ? 'Hoạt động' : 'Tạm ngưng'}
                            size="small"
                            color={shop.trangThai === TrangThaiCuaHang.HOAT_DONG ? 'success' : 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// ============ QUICK ACTIONS ============
function QuickActions({ vaiTro }: { vaiTro?: VaiTro }) {
  const navigate = useNavigate();

  const actions = [
    { label: 'Tạo đơn mới', icon: <PointOfSale />, path: '/pos', roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
    { label: 'Đơn hàng', icon: <Receipt />, path: '/don-hang', roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN] },
    { label: 'Khách hàng', icon: <People />, path: '/khach-hang', roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
    { label: 'Dịch vụ', icon: <LocalLaundryService />, path: '/dich-vu', roles: [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY] },
    { label: 'Cài đặt', icon: <Settings />, path: '/cai-dat', roles: [VaiTro.ADMIN] },
  ].filter(a => vaiTro && a.roles.includes(vaiTro));

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {actions.map((a) => (
        <Button
          key={a.path}
          variant="outlined"
          size="small"
          startIcon={a.icon}
          onClick={() => navigate(a.path)}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          {a.label}
        </Button>
      ))}
    </Box>
  );
}

// ============ SHOP-LEVEL DASHBOARD (Admin / Employee) ============
function ShopDashboard({ userProfile }: { userProfile: any }) {
  const [donHangs, setDonHangs] = useState<DonHang[]>([]);
  const [tongKH, setTongKH] = useState(0);
  const [tongDV, setTongDV] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const maCH = userProfile?.maCuaHang || '';
        const [dh, kh, dv] = await Promise.all([
          donHangService.getByMaCuaHang(maCH, { limitCount: 50 }),
          khachHangService.getByMaCuaHang(maCH),
          dichVuService.getByMaCuaHang(maCH),
        ]);
        setDonHangs(dh);
        setTongKH(kh.length);
        setTongDV(dv.filter((d) => d.trangThai).length);
      } catch { /* fallback to empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const tongDoanhThu = donHangs.reduce((s, d) => s + d.tienDaTra, 0);
  const tongDonHang = donHangs.length;
  const choXuLy = donHangs.filter((d) => d.trangThai === TrangThaiDonHang.CHO_XU_LY).length;
  const dangXuLy = donHangs.filter((d) =>
    [TrangThaiDonHang.DANG_GIAT, TrangThaiDonHang.DANG_SAY, TrangThaiDonHang.DANG_UI].includes(d.trangThai)
  ).length;
  const hoanThanh = donHangs.filter((d) => d.trangThai === TrangThaiDonHang.HOAN_THANH).length;
  const recentOrders = donHangs.slice(0, 8);

  const formatDate = (ts: any) => ts?.toDate ? format(ts.toDate(), 'dd/MM HH:mm', { locale: vi }) : '-';

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Xin chào, {userProfile?.hoTen || 'Admin'} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tổng quan cửa hàng
          </Typography>
        </Box>
        <QuickActions vaiTro={userProfile?.vaiTro} />
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Doanh thu', value: formatCurrency(tongDoanhThu), icon: <TrendingUp />, color: '#1565C0', bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)' },
          { title: 'Tổng đơn hàng', value: String(tongDonHang), icon: <Receipt />, color: '#2E7D32', bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)' },
          { title: 'Khách hàng', value: String(tongKH), icon: <People />, color: '#E65100', bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' },
          { title: 'Dịch vụ', value: String(tongDV), icon: <LocalLaundryService />, color: '#6A1B9A', bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)' },
        ].map((stat) => (
          <Grid size={{ xs: 6, md: 3 }} key={stat.title}>
            <Card sx={{ background: stat.bg, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ color: stat.color, opacity: 0.8 }}>{stat.title}</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, mt: 0.5 }}>{stat.value}</Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: stat.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9 }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Status Overview */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Chờ xử lý', count: choXuLy, icon: <AccessTime />, color: '#FFA726' },
          { label: 'Đang xử lý', count: dangXuLy, icon: <LocalLaundryService />, color: '#42A5F5' },
          { label: 'Hoàn thành', count: hoanThanh, icon: <CheckCircle />, color: '#66BB6A' },
          { label: 'Chưa thanh toán', count: donHangs.filter((d) => d.tienConLai > 0).length, icon: <Warning />, color: '#EF5350' },
        ].map((item) => (
          <Grid size={{ xs: 6, md: 3 }} key={item.label}>
            <Card>
              <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${item.color}20`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{item.count}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Orders */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Đơn hàng gần đây</Typography>
          {recentOrders.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              Chưa có đơn hàng. Tạo đơn đầu tiên từ màn hình POS!
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Mã đơn</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tổng tiền</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Thanh toán</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((dh) => (
                    <TableRow key={dh.maDonHang} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{dh.maDonHang}</TableCell>
                      <TableCell>{formatDate(dh.ngayTao)}</TableCell>
                      <TableCell>{formatCurrency(dh.tongTien)}</TableCell>
                      <TableCell>
                        <Chip label={TRANG_THAI_LABELS[dh.trangThai]} size="small"
                          sx={{ bgcolor: TRANG_THAI_COLORS[dh.trangThai], color: 'white', fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        {dh.tienConLai > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(dh.tienDaTra / dh.tongTien) * 100}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 35 }}>
                              {Math.round((dh.tienDaTra / dh.tongTien) * 100)}%
                            </Typography>
                          </Box>
                        ) : (
                          <Chip label="Đã TT" size="small" color="success" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// ============ MAIN EXPORT ============
export default function DashboardPage() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  if (userProfile.vaiTro === VaiTro.SUPER_ADMIN) {
    return <SuperAdminDashboard userProfile={userProfile} />;
  }

  return <ShopDashboard userProfile={userProfile} />;
}

