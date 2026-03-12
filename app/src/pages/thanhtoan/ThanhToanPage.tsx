import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, CircularProgress,
  Tabs, Tab, IconButton,
} from '@mui/material';
import {
  Payment, AttachMoney, AccountBalance, CreditCard, PhoneAndroid,
  History, SettingsBackupRestore, NavigateNext, NavigateBefore,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { donHangService } from '../../services/donHangService';
import { giaoDichService } from '../../services/giaoDichService';
import type { DonHang, GiaoDich } from '../../types';
import { PhuongThucThanhToan } from '../../types';
import { formatCurrency, TRANG_THAI_LABELS, TRANG_THAI_COLORS } from '../../utils/constants';
import { logError, getUserMessage } from '../../utils/errorHandler';
import { khachHangService } from '../../services/khachHangService';

const PHUONG_THUC_OPTIONS = [
  { value: PhuongThucThanhToan.TIEN_MAT, label: 'Tiền mặt', icon: <AttachMoney /> },
  { value: PhuongThucThanhToan.CHUYEN_KHOAN, label: 'Chuyển khoản', icon: <AccountBalance /> },
  { value: PhuongThucThanhToan.THE_ATM, label: 'Thẻ ATM', icon: <CreditCard /> },
  { value: PhuongThucThanhToan.VI_DIEN_TU, label: 'Ví điện tử', icon: <PhoneAndroid /> },
];

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'C'];
const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export default function ThanhToanPage() {
  const { userProfile } = useAuth();
  const [donHangs, setDonHangs] = useState<DonHang[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer mapping: maKhachHang → { hoTen, soDienThoai }
  const [customerMap, setCustomerMap] = useState<Record<string, { hoTen: string; soDienThoai: string }>>({});

  // Yêu Cầu 11: Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const cursorStackRef = useRef<any[]>([null]);
  
  // Tabs
  const [tabIndex, setTabIndex] = useState(0);

  // Payment/Refund State
  const [payOpen, setPayOpen] = useState(false);
  const [isRefund, setIsRefund] = useState(false);
  const [selected, setSelected] = useState<DonHang | null>(null);
  const [amount, setAmount] = useState('0');
  const [method, setMethod] = useState(PhuongThucThanhToan.TIEN_MAT);
  const [paying, setPaying] = useState(false);

  // History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTxs, setHistoryTxs] = useState<GiaoDich[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async (cursor?: any) => {
    setLoading(true);
    try {
      const maCuaHang = userProfile?.maCuaHang || '';
      const [result, customers] = await Promise.all([
        donHangService.getByMaCuaHangPaginated(
          maCuaHang,
          { lastDoc: cursor || null }
        ),
        khachHangService.getByMaCuaHang(maCuaHang)
      ]);
      setDonHangs(result.data);
      setHasMore(result.hasMore);
      if (result.lastDoc) {
        cursorStackRef.current[page + 1] = result.lastDoc;
      }

      // Build customer maKhachHang → { hoTen, soDienThoai } map
      const custMap: Record<string, { hoTen: string; soDienThoai: string }> = {};
      customers.forEach(c => { custMap[c.maKhachHang] = { hoTen: c.hoTen, soDienThoai: c.soDienThoai }; });
      setCustomerMap(custMap);
    } catch (err) {
      logError(err, 'ThanhToanPage.loadData');
      toast.error(getUserMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleNextPage = () => {
    const nextCursor = cursorStackRef.current[page + 1];
    setPage(page + 1);
    loadData(nextCursor);
  };

  const handlePrevPage = () => {
    if (page <= 0) return;
    const prevCursor = cursorStackRef.current[page - 1];
    setPage(page - 1);
    loadData(prevCursor);
  };

  const pendingOrders = useMemo(() => donHangs.filter(d => d.tienConLai > 0), [donHangs]);
  const paidOrders = useMemo(() => donHangs.filter(d => d.tienConLai === 0), [donHangs]);
  const displayedOrders = tabIndex === 0 ? pendingOrders : paidOrders;

  const numpadPress = (key: string) => {
    if (key === 'C') { setAmount('0'); return; }
    setAmount((prev) => (prev === '0' ? key : prev + key));
  };

  const soTienNhap = parseInt(amount, 10) || 0;
  // If paying: calculate change (khách đưa - còn lại)
  const tienThoi = (!isRefund && selected) ? Math.max(0, soTienNhap - selected.tienConLai) : 0;
  // If refunding: max refund is tienDaTra
  const validRefundAmount = selected ? Math.min(soTienNhap, selected.tienDaTra) : 0;

  const handleProcessTransaction = async () => {
    if (!selected) return;

    let transactionAmount = 0;
    if (isRefund) {
      if (soTienNhap <= 0) { toast.error('Vui lòng nhập số tiền hoàn'); return; }
      // Criteria 3: Detailed refund error
      if (soTienNhap > selected.tienDaTra) {
        toast.error(
          `Số tiền hoàn (${formatCurrency(soTienNhap)}) vượt quá số tiền đã trả (${formatCurrency(selected.tienDaTra)}).\nSố tiền hoàn tối đa: ${formatCurrency(selected.tienDaTra)}`,
          { duration: 5000 }
        );
        return;
      }
      transactionAmount = -soTienNhap; // Tiền âm cho hoàn tiền
    } else {
      transactionAmount = Math.min(soTienNhap, selected.tienConLai);
      if (transactionAmount <= 0) { toast.error('Vui lòng nhập số tiền thanh toán'); return; }
    }

    setPaying(true);
    try {
      // Gọi service transaction (đáp ứng tiêu chí 9 & 10)
      await giaoDichService.processPayment({
        maCuaHang: userProfile?.maCuaHang || '',
        maDonHang: selected.maDonHang,
        maKhachHang: selected.maKhachHang,
        maNhanVien: userProfile?.uid || '',
        soTien: transactionAmount,
        phuongThucThanhToan: method,
      });

      toast.success(isRefund ? `Hoàn tiền ${formatCurrency(Math.abs(transactionAmount))} thành công!` : `Thanh toán ${formatCurrency(transactionAmount)} thành công! 💰`);
      setPayOpen(false);
      setAmount('0');
      setSelected(null);
      loadData();
    } catch (err: any) {
      logError(err, 'ThanhToanPage.handleProcessTransaction', {
        maDonHang: selected.maDonHang,
        soTien: transactionAmount,
        isRefund,
      });
      // Criteria 3: Detailed payment error with amounts
      if (err.message?.includes('vượt quá')) {
        toast.error(
          `${err.message}\n\nTổng tiền: ${formatCurrency(selected.tongTien)} | Đã trả: ${formatCurrency(selected.tienDaTra)} | Còn lại: ${formatCurrency(selected.tienConLai)}`,
          { duration: 6000 }
        );
      } else {
        toast.error(getUserMessage(err));
      }
    }
    setPaying(false);
  };

  const openPayment = (dh: DonHang) => {
    setSelected(dh);
    setIsRefund(false);
    setAmount('0');
    setPayOpen(true);
  };

  const openRefund = (dh: DonHang) => {
    setSelected(dh);
    setIsRefund(true);
    setAmount('0');
    setPayOpen(true);
  };

  const openHistory = async (dh: DonHang) => {
    setSelected(dh);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const txs = await giaoDichService.getByDonHang(dh.maDonHang);
      setHistoryTxs(txs);
    } catch {
      toast.error('Lỗi tải lịch sử giao dịch');
    }
    setHistoryLoading(false);
  };

  const formatDate = (ts: any) => ts?.toDate ? format(ts.toDate(), 'dd/MM HH:mm', { locale: vi }) : '-';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Quản lý thanh toán</Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Chờ thanh toán (${pendingOrders.length})`} />
          <Tab label={`Đã thanh toán đủ (${paidOrders.length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Mã đơn</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Khách hàng</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tổng tiền</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Đã trả</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Còn lại</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedOrders.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>Không có dữ liệu</TableCell></TableRow>
              ) : displayedOrders.map((dh) => (
                <TableRow key={dh.maDonHang} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{dh.maDonHang}</TableCell>
                  <TableCell>
                    {customerMap[dh.maKhachHang] ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600} noWrap>{customerMap[dh.maKhachHang].hoTen}</Typography>
                        <Typography variant="caption" color="text.secondary">{customerMap[dh.maKhachHang].soDienThoai}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(dh.ngayTao)}</TableCell>
                  <TableCell>{formatCurrency(dh.tongTien)}</TableCell>
                  <TableCell sx={{ color: 'success.main' }}>{formatCurrency(dh.tienDaTra)}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{formatCurrency(dh.tienConLai)}</TableCell>
                  <TableCell>
                    <Chip label={TRANG_THAI_LABELS[dh.trangThai]} size="small"
                      sx={{ bgcolor: TRANG_THAI_COLORS[dh.trangThai], color: 'white' }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {dh.tienConLai > 0 && (
                        <Button variant="contained" size="small" startIcon={<Payment />}
                          onClick={() => openPayment(dh)}>Thu tiền</Button>
                      )}
                      {dh.tienDaTra > 0 && (
                        <Button variant="outlined" color="warning" size="small" startIcon={<SettingsBackupRestore />}
                          onClick={() => openRefund(dh)}>Hoàn tiền</Button>
                      )}
                      <IconButton size="small" color="primary" onClick={() => openHistory(dh)} title="Lịch sử giao dịch">
                        <History fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Yêu Cầu 11: Pagination Controls */}
      {!loading && (page > 0 || hasMore) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
          <Button size="small" startIcon={<NavigateBefore />} disabled={page === 0} onClick={handlePrevPage}>Trang trước</Button>
          <Typography variant="body2" color="text.secondary">Trang {page + 1}</Typography>
          <Button size="small" endIcon={<NavigateNext />} disabled={!hasMore} onClick={handleNextPage}>Trang sau</Button>
        </Box>
      )}

      {/* Payment / Refund Dialog */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
        {selected ? (
          <>
            <DialogTitle sx={{ color: isRefund ? 'warning.main' : 'primary.main', fontWeight: 700 }}>
              {isRefund ? 'Hoàn tiền - ' : 'Thanh toán - '} {selected.maDonHang}
              <Typography variant="body2" color="text.secondary">
                {isRefund ? (
                  <>Đã trả: <strong style={{ color: '#2E7D32' }}>{formatCurrency(selected.tienDaTra)}</strong></>
                ) : (
                  <>Còn lại: <strong style={{ color: '#E53935' }}>{formatCurrency(selected.tienConLai)}</strong></>
                )}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Phương thức {isRefund ? 'hoàn trả' : 'thanh toán'}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {PHUONG_THUC_OPTIONS.map((pt) => (
                  <Chip key={pt.value} icon={pt.icon} label={pt.label}
                    color={method === pt.value ? (isRefund ? 'warning' : 'primary') : 'default'}
                    variant={method === pt.value ? 'filled' : 'outlined'}
                    onClick={() => setMethod(pt.value)} />
                ))}
              </Box>

              <Paper variant="outlined" sx={{ p: 2, mb: 2, textAlign: 'right', borderRadius: 2, borderColor: isRefund ? 'warning.main' : 'primary.main' }}>
                <Typography variant="caption" color="text.secondary">{isRefund ? 'Số tiền hoàn' : 'Khách đưa'}</Typography>
                <Typography variant="h4" fontWeight={700} color={isRefund ? 'warning.main' : 'primary.main'}>{formatCurrency(soTienNhap)}</Typography>
              </Paper>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {isRefund ? (
                  <Button variant="outlined" color="warning" size="small" onClick={() => setAmount(String(selected.tienDaTra))}>
                    Hoàn toàn bộ ({formatCurrency(selected.tienDaTra)})
                  </Button>
                ) : (
                  <>
                    <Button variant="outlined" size="small" onClick={() => setAmount(String(selected.tienConLai))}>
                      Đúng giá ({formatCurrency(selected.tienConLai)})
                    </Button>
                    {QUICK_AMOUNTS.map((a) => (
                      <Button key={a} variant="outlined" size="small" onClick={() => setAmount(String(a))}>
                        {formatCurrency(a)}
                      </Button>
                    ))}
                  </>
                )}
              </Box>

              <Grid container spacing={1}>
                {NUMPAD_KEYS.map((key) => (
                  <Grid size={{ xs: 4 }} key={key}>
                    <Button fullWidth variant={key === 'C' ? 'outlined' : 'contained'}
                      color={key === 'C' ? 'error' : 'secondary'}
                      onClick={() => numpadPress(key)}
                      sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}>
                      {key}
                    </Button>
                  </Grid>
                ))}
              </Grid>

              {(!isRefund && tienThoi > 0) ? (
                <Paper sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="white">Tiền thối</Typography>
                  <Typography variant="h5" fontWeight={700} color="white">{formatCurrency(tienThoi)}</Typography>
                </Paper>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPayOpen(false)}>Hủy</Button>
              <Button variant="contained" color={isRefund ? 'warning' : 'primary'} onClick={handleProcessTransaction} disabled={paying || soTienNhap <= 0}>
                {paying ? 'Đang xử lý...' : (isRefund 
                  ? `Xác nhận hoàn ${formatCurrency(validRefundAmount)}` 
                  : `Xác nhận thu ${formatCurrency(Math.min(soTienNhap, selected.tienConLai))}`)}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lịch sử giao dịch - {selected?.maDonHang}</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : historyTxs.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ py: 3 }}>Chưa có giao dịch nào</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Phương thức</TableCell>
                    <TableCell align="right">Số tiền</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyTxs.map(tx => (
                    <TableRow key={tx.maGiaoDich}>
                      <TableCell>{formatDate(tx.ngayGiaoDich)}</TableCell>
                      <TableCell>{PHUONG_THUC_OPTIONS.find(p => p.value === tx.phuongThucThanhToan)?.label || tx.phuongThucThanhToan}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: tx.soTien < 0 ? 'warning.main' : 'success.main' }}>
                        {tx.soTien > 0 ? '+' : ''}{formatCurrency(tx.soTien)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoryOpen(false)}>Đóng</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
