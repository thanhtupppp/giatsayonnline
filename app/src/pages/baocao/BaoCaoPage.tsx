import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, CircularProgress, 
  Button, TextField, Tabs, Tab, Table, TableBody, TableCell, 
  TableHead, TableRow, TableContainer, Paper
} from '@mui/material';
import {
  TrendingUp, Receipt, People, LocalLaundryService, Save, Download, Print
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { format, startOfMonth, endOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { donHangService } from '../../services/donHangService';
import { khachHangService } from '../../services/khachHangService';
import { baoCaoService } from '../../services/baoCaoService';
import type { DonHang, KhachHang, BaoCao } from '../../types';
import { TrangThaiDonHang, LoaiKhachHang } from '../../types';
import { formatCurrency, TRANG_THAI_LABELS } from '../../utils/constants';

const PIE_COLORS = ['#FFA726', '#AB47BC', '#42A5F5', '#26C6DA', '#66BB6A', '#4CAF50', '#78909C', '#EF5350'];

export default function BaoCaoPage() {
  const { userProfile } = useAuth();
  
  // Data State
  const [allDonHangs, setAllDonHangs] = useState<DonHang[]>([]);
  const [allKhachHangs, setAllKhachHangs] = useState<KhachHang[]>([]);
  const [lichSuBaoCao, setLichSuBaoCao] = useState<BaoCao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [tuNgay, setTuNgay] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [denNgay, setDenNgay] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Tab State
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.maCuaHang) return;
      try {
        // Fetch ALL orders for reporting (not limited to default 50)
        const [dh, kh] = await Promise.all([
          donHangService.getByMaCuaHang(userProfile.maCuaHang, { limitCount: 9999 }),
          khachHangService.getByMaCuaHang(userProfile.maCuaHang),
        ]);
        setAllDonHangs(dh);
        setAllKhachHangs(kh);
      } catch (err) {
        console.error('Lỗi tải dữ liệu báo cáo:', err);
        toast.error('Lỗi tải dữ liệu báo cáo');
      }

      // Load report history separately — may fail if Firestore index is missing
      try {
        const history = await baoCaoService.getByMaCuaHang(userProfile.maCuaHang);
        setLichSuBaoCao(history);
      } catch (err) {
        console.error('Lỗi tải lịch sử báo cáo:', err);
        // Non-critical: don't block the page
      }

      setLoading(false);
    };
    loadData();
  }, [userProfile?.maCuaHang]);

  // Derived filtered data — null-safe timestamp access
  const startTimestamp = new Date(tuNgay).getTime();
  const endTimestamp = endOfDay(new Date(denNgay)).getTime();

  const filteredDonHangs = allDonHangs.filter(d => {
    const time = d.ngayTao?.toMillis?.();
    if (!time) return false;
    return time >= startTimestamp && time <= endTimestamp;
  });

  const filteredKhachHangs = allKhachHangs.filter(k => {
    const time = k.ngayDangKy?.toMillis?.();
    if (!time) return false;
    return time >= startTimestamp && time <= endTimestamp;
  });

  // Criteria calculations
  const tongDonHang = filteredDonHangs.length;
  const completedOrders = filteredDonHangs.filter(d => d.trangThai === TrangThaiDonHang.HOAN_THANH || d.trangThai === TrangThaiDonHang.DA_GIAO);
  const cancelledOrders = filteredDonHangs.filter(d => d.trangThai === TrangThaiDonHang.DA_HUY);
  
  // Tiêu chí 1: Tính tổng doanh thu từ các Đơn_Hàng đã hoàn thành
  const tongDoanhThu = completedOrders.reduce((sum, d) => sum + d.tongTien, 0);
  const donHangHoanThanh = completedOrders.length;
  const donHangHuy = cancelledOrders.length;

  // Status computation
  const statusCounts = filteredDonHangs.reduce((acc, d) => {
    acc[d.trangThai] = (acc[d.trangThai] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: TRANG_THAI_LABELS[status as TrangThaiDonHang],
    value: count,
    percent: tongDonHang > 0 ? ((count / tongDonHang) * 100).toFixed(1) : '0',
  })).sort((a, b) => b.value - a.value);

  // Service computation
  const serviceStats: Record<string, { count: number, revenue: number }> = {};
  filteredDonHangs.forEach(dh => {
    dh.danhSachDichVu.forEach(dv => {
      if (!serviceStats[dv.tenDichVu]) serviceStats[dv.tenDichVu] = { count: 0, revenue: 0 };
      serviceStats[dv.tenDichVu].count += dv.soLuong || dv.trongLuong || 1;
      serviceStats[dv.tenDichVu].revenue += dv.thanhTien;
    });
  });
  const serviceData = Object.entries(serviceStats)
    .map(([name, stats]) => ({ name, value: stats.count, revenue: stats.revenue }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Customer stats
  const tongKhachHangMoi = filteredKhachHangs.length;
  const khachHangThanThiet = allKhachHangs.filter(k => k.loaiKhachHang === LoaiKhachHang.THAN_THIET).length;
  const khachHangVip = allKhachHangs.filter(k => k.loaiKhachHang === LoaiKhachHang.VIP).length;

  const currentReportData = {
    tongDonHang, tongDoanhThu, donHangHoanThanh, donHangHuy,
    tongKhachHangMoi, khachHangThanThiet, khachHangVip,
    statusData, serviceData,
  };

  const handleSaveReport = async () => {
    if (!userProfile?.maCuaHang) return;
    try {
      const maBaoCao = await baoCaoService.save({
        maCuaHang: userProfile.maCuaHang,
        loaiBaoCao: 'DOANH_THU',
        tuNgay: Timestamp.fromMillis(startTimestamp),
        denNgay: Timestamp.fromMillis(endTimestamp),
        ngayTao: Timestamp.now(),
        nguoiTao: userProfile.uid,
        duLieu: currentReportData,
      });
      toast.success('Đã lưu báo cáo thành công!');
      
      // Update history list
      setLichSuBaoCao(prev => [{
        maBaoCao,
        maCuaHang: userProfile.maCuaHang!,
        loaiBaoCao: 'DOANH_THU',
        tuNgay: Timestamp.fromMillis(startTimestamp),
        denNgay: Timestamp.fromMillis(endTimestamp),
        ngayTao: Timestamp.now(),
        nguoiTao: userProfile.uid,
        duLieu: currentReportData,
      }, ...prev]);
    } catch (err) {
      toast.error('Lỗi khi lưu báo cáo');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const csvRows = [];
    csvRows.push('Báo cáo doanh thu Giặt Sấy');
    csvRows.push(`Thời gian: ${tuNgay} Đến ${denNgay}`);
    csvRows.push(`Tổng doanh thu: ${tongDoanhThu}`);
    csvRows.push(`Tổng đơn hàng: ${tongDonHang}`);
    csvRows.push('');
    csvRows.push('Thống Kê Trạng Thái Đơn Hàng');
    csvRows.push('Trạng thái,Số lượng,Tỷ lệ (%)');
    statusData.forEach(s => csvRows.push(`${s.name},${s.value},${s.percent}%`));
    csvRows.push('');
    csvRows.push('Thống Kê Dịch Vụ');
    csvRows.push('Dịch vụ,Số lượng sử dụng,Doanh thu');
    serviceData.forEach(s => csvRows.push(`${s.name},${s.value},${s.revenue}`));
    
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_doanh_thu_${tuNgay}_${denNgay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }} className="no-print">Báo cáo & thống kê</Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }} className="no-print">
        <Tab label="Báo Cáo Hiện Tại" />
        <Tab label="Lịch Sử Báo Cáo" />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Card sx={{ mb: 3 }} className="no-print">
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField 
                    fullWidth 
                    type="date" 
                    label="Từ ngày" 
                    InputLabelProps={{ shrink: true }}
                    value={tuNgay}
                    onChange={(e) => setTuNgay(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField 
                    fullWidth 
                    type="date" 
                    label="Đến ngày" 
                    InputLabelProps={{ shrink: true }}
                    value={denNgay}
                    onChange={(e) => setDenNgay(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<Save />} onClick={handleSaveReport}>Lưu BC</Button>
                  <Button variant="outlined" startIcon={<Download />} onClick={handleExportExcel}>Excel</Button>
                  <Button variant="outlined" startIcon={<Print />} onClick={handleExportPDF}>In/PDF</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box id="report-content">
            <Typography variant="h6" className="print-only" sx={{ display: 'none', mb: 2, textAlign: 'center' }}>
              BÁO CÁO KINH DOANH ({format(new Date(tuNgay), 'dd/MM/yyyy')} - {format(new Date(denNgay), 'dd/MM/yyyy')})
            </Typography>

            {/* Tiêu chí 2: Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {[
                { title: 'Tổng Doanh Thu', value: formatCurrency(tongDoanhThu), icon: <TrendingUp sx={{ fontSize: 32 }} />, color: '#1565C0', bg: '#E3F2FD' },
                { title: 'T.Số Đơn Hàng', value: String(tongDonHang), icon: <Receipt sx={{ fontSize: 32 }} />, color: '#2E7D32', bg: '#E8F5E9' },
                { title: 'ĐH Hoàn Thành', value: String(donHangHoanThanh), icon: <LocalLaundryService sx={{ fontSize: 32 }} />, color: '#6A1B9A', bg: '#F3E5F5' },
                { title: 'ĐH Đã Hủy', value: String(donHangHuy), icon: <TrendingUp sx={{ fontSize: 32 }} />, color: '#D32F2F', bg: '#FFEBEE' },
              ].map((s) => (
                <Grid size={{ xs: 6, md: 3 }} key={s.title}>
                  <Card sx={{ border: '1px solid #eee' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">{s.title}</Typography>
                          <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                        </Box>
                        <Box className="no-print" sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                          {s.icon}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Tiêu chí 5: Customer Stats */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom><People sx={{ verticalAlign: 'middle', mr: 1 }}/> Thống kê khách hàng</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 4 }}>
                    <Typography color="text.secondary">Khách mới (trong kỳ)</Typography>
                    <Typography variant="h5" fontWeight={700}>{tongKhachHangMoi}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography color="text.secondary">Khách Thân Thiết (All-time)</Typography>
                    <Typography variant="h5" fontWeight={700}>{khachHangThanThiet}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography color="text.secondary">Khách VIP (All-time)</Typography>
                    <Typography variant="h5" fontWeight={700}>{khachHangVip}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              {/* Tiêu chí 4: Service Stats */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>Top dịch vụ phổ biến</Typography>
                    {serviceData.length > 0 ? (
                      <Box>
                        <ResponsiveContainer width="100%" height={250} className="no-print">
                          <BarChart data={serviceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#1565C0" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        <Table size="small" sx={{ mt: 2 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Dịch vụ</strong></TableCell>
                              <TableCell align="right"><strong>Số lượng sd</strong></TableCell>
                              <TableCell align="right"><strong>Doanh thu</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {serviceData.map((row) => (
                              <TableRow key={row.name}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell align="right">{row.value}</TableCell>
                                <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 8 }}>Chưa có dữ liệu giao dịch</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Tiêu chí 3: Status Distribution */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>Tính trạng đơn hàng</Typography>
                    {statusData.length > 0 ? (
                      <Box>
                        <ResponsiveContainer width="100%" height={250} className="no-print">
                          <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                              paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${percent}%)`}>
                              {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <Table size="small" sx={{ mt: 2 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Trạng thái</strong></TableCell>
                              <TableCell align="right"><strong>Số lượng</strong></TableCell>
                              <TableCell align="right"><strong>Tỷ lệ</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {statusData.map((row) => (
                              <TableRow key={row.name}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell align="right">{row.value}</TableCell>
                                <TableCell align="right">{row.percent}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 8 }}>Chưa có đơn hàng trong kỳ</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Danh sách báo cáo đã lưu</Typography>
            {lichSuBaoCao.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Chưa có báo cáo nào được lưu</Typography>
            ) : (
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell>Mã Báo Cáo</TableCell>
                      <TableCell>Ngày Lưu</TableCell>
                      <TableCell>Kỳ Báo Cáo</TableCell>
                      <TableCell align="right">Tổng Doanh Thu</TableCell>
                      <TableCell align="right">Số Đơn</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lichSuBaoCao.map((bc) => {
                      const dl = bc.duLieu as any;
                      return (
                        <TableRow key={bc.maBaoCao}>
                          <TableCell sx={{ fontWeight: 500 }}>{bc.maBaoCao}</TableCell>
                          <TableCell>{format(bc.ngayTao.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>
                            {format(bc.tuNgay.toDate(), 'dd/MM/yyyy')} - {format(bc.denNgay.toDate(), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 600 }}>
                            {formatCurrency(dl.tongDoanhThu || 0)}
                          </TableCell>
                          <TableCell align="right">{dl.tongDonHang || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              * Báo cáo đã lưu không thể chỉnh sửa hoặc xóa để đảm bảo tính minh bạch (Yêu Cầu 8, Tiêu Chí 8).
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* CSS for PDF print via window.print() */}
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; padding: 0; margin: 0; }
            @page { margin: 2cm; }
          }
        `}
      </style>
    </Box>
  );
}
