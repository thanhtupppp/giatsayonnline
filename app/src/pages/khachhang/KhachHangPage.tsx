import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, CircularProgress, InputAdornment,
} from '@mui/material';
import { Add, Edit, Search, Star, History, NavigateNext, NavigateBefore, Delete } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { khachHangService } from '../../services/khachHangService';
import { donHangService } from '../../services/donHangService';
import type { KhachHang, DonHang } from '../../types';
import { LoaiKhachHang, VaiTro } from '../../types';
import { formatCurrency, formatPhone, TRANG_THAI_LABELS, TRANG_THAI_COLORS } from '../../utils/constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const TIER_CONFIG: Record<LoaiKhachHang, { label: string; color: 'default' | 'primary' | 'warning' }> = {
  [LoaiKhachHang.THUONG]: { label: 'Thường', color: 'default' },
  [LoaiKhachHang.THAN_THIET]: { label: 'Thân thiết', color: 'primary' },
  [LoaiKhachHang.VIP]: { label: 'VIP', color: 'warning' },
};

export default function KhachHangPage() {
  const { userProfile } = useAuth();
  const maCuaHang = userProfile?.maCuaHang || '';

  const [khachHangs, setKhachHangs] = useState<KhachHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const vaiTro = userProfile?.vaiTro;

  // Delete control
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<KhachHang | null>(null);

  // Yêu Cầu 11: Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const cursorStackRef = useRef<any[]>([null]);

  // Create/Edit Dialog
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ hoTen: '', soDienThoai: '', email: '', diaChi: '' });
  const [duplicateWarning, setDuplicateWarning] = useState<KhachHang | null>(null);

  // History Dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<KhachHang | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<DonHang[]>([]);

  const loadData = async (cursor?: any) => {
    setLoading(true);
    try {
      const result = await khachHangService.getByMaCuaHangPaginated(maCuaHang, {
        lastDoc: cursor || null,
      });
      setKhachHangs(result.data);
      setHasMore(result.hasMore);
      if (result.lastDoc) {
        cursorStackRef.current[page + 1] = result.lastDoc;
      }
    } catch { toast.error('Lỗi tải dữ liệu'); }
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

  const handleSearch = async () => {
    if (!searchPhone.trim()) { loadData(); return; }
    setLoading(true);
    try {
      const results = await khachHangService.searchByPhone(maCuaHang, searchPhone);
      setKhachHangs(results);
    } catch { toast.error('Lỗi tìm kiếm'); }
    setLoading(false);
  };

  const handleCreateOrUpdate = async () => {
    // #2: Check existing phone
    if (!isEdit && !duplicateWarning) {
      try {
        const existing = await khachHangService.searchByPhone(maCuaHang, form.soDienThoai);
        if (existing.length > 0) {
          // #3: Prompt to use existing
          setDuplicateWarning(existing[0]);
          return;
        }
      } catch { toast.error('Lỗi kiểm tra SĐT'); return; }
    }

    try {
      if (isEdit) {
        // #10: Do not update points/spend manually
        await khachHangService.update(editId, {
          hoTen: form.hoTen,
          soDienThoai: form.soDienThoai,
          email: form.email,
          diaChi: form.diaChi,
        });
        toast.success('Cập nhật khách hàng thành công');
      } else {
        await khachHangService.create({
          hoTen: form.hoTen,
          soDienThoai: form.soDienThoai,
          email: form.email,
          diaChi: form.diaChi,
          maCuaHang,
        });
        toast.success('Thêm khách hàng thành công');
      }
      handleCloseDialog();
      loadData();
    } catch { toast.error(isEdit ? 'Lỗi cập nhật' : 'Lỗi thêm khách hàng'); }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await khachHangService.delete(customerToDelete.maKhachHang);
      toast.success('Xóa khách hàng thành công');
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      loadData();
    } catch {
      toast.error('Lỗi khi xóa khách hàng');
    }
  };

  const openCreate = () => {
    setIsEdit(false);
    setDuplicateWarning(null);
    setForm({ hoTen: '', soDienThoai: '', email: '', diaChi: '' });
    setOpen(true);
  };

  const openEdit = (kh: KhachHang) => {
    setIsEdit(true);
    setDuplicateWarning(null);
    setEditId(kh.maKhachHang);
    setForm({ hoTen: kh.hoTen, soDienThoai: kh.soDienThoai, email: kh.email || '', diaChi: kh.diaChi || '' });
    setOpen(true);
  };

  const openHistory = async (kh: KhachHang) => {
    setHistoryCustomer(kh);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      // #5: Fetch transaction history
      const orders = await donHangService.getByKhachHang(kh.maKhachHang);
      setHistoryOrders(orders);
    } catch {
      toast.error('Lỗi tải lịch sử giao dịch');
    }
    setHistoryLoading(false);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setDuplicateWarning(null);
    setForm({ hoTen: '', soDienThoai: '', email: '', diaChi: '' });
  };

  const handleUseExisting = () => {
    if (duplicateWarning) openEdit(duplicateWarning);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '-';
    return format(timestamp.toDate(), 'dd/MM/yyyy HH:mm', { locale: vi });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Quản lý khách hàng</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Thêm khách hàng
        </Button>
      </Box>

      {/* #4: Search by phone */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          size="small" placeholder="Tìm theo số điện thoại..."
          value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ width: 300 }}
        />
        <Button variant="outlined" onClick={handleSearch}>Tìm</Button>
        <Button variant="text" onClick={() => { setSearchPhone(''); loadData(); }}>Xóa lọc</Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Họ tên</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>SĐT</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Loại KH</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Điểm tích lũy</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Tổng chi tiêu</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Số lần GD</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {khachHangs.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  {searchPhone ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng nào'}
                </TableCell></TableRow>
              ) : khachHangs.map((kh) => (
                <TableRow key={kh.maKhachHang} hover>
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{kh.hoTen}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatPhone(kh.soDienThoai)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Chip
                      icon={kh.loaiKhachHang === LoaiKhachHang.VIP ? <Star /> : undefined}
                      label={TIER_CONFIG[kh.loaiKhachHang].label}
                      color={TIER_CONFIG[kh.loaiKhachHang].color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{kh.diemTichLuy.toLocaleString()}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(kh.tongChiTieu)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{kh.soLanGiaoDich}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => openEdit(kh)} title="Sửa thông tin"><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="secondary" onClick={() => openHistory(kh)} title="Lịch sử giao dịch"><History fontSize="small" /></IconButton>
                    {(vaiTro === VaiTro.ADMIN || vaiTro === VaiTro.SUPER_ADMIN) && (
                      <IconButton size="small" color="error" onClick={() => { setCustomerToDelete(kh); setDeleteConfirmOpen(true); }} title="Xóa khách hàng"><Delete fontSize="small" /></IconButton>
                    )}
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

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {duplicateWarning ? (
            <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 2, border: '1px dashed', borderColor: 'warning.main', mb: 2 }}>
              <Typography variant="subtitle2" color="warning.dark" gutterBottom>
                ⚠ Số điện thoại {form.soDienThoai} đã tồn tại trong hệ thống!
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Khách hàng: <strong>{duplicateWarning.hoTen}</strong>
              </Typography>
              <Button variant="outlined" color="warning" size="small" onClick={handleUseExisting}>
                Cập nhật KH hiện tại
              </Button>
            </Box>
          ) : (
            <>
              {/* #10: No diemTichLuy / tongChiTieu fields here */}
              <TextField label="Họ tên" value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} required />
              <TextField label="Số điện thoại" value={form.soDienThoai} onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })} required />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Địa chỉ" value={form.diaChi} onChange={(e) => setForm({ ...form, diaChi: e.target.value })} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
          {!duplicateWarning && (
            <Button variant="contained" onClick={handleCreateOrUpdate}>
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* HISTORY DIALOG (#5) */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Lịch sử giao dịch - <span style={{ fontWeight: 700 }}>{historyCustomer?.hoTen}</span>
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : historyOrders.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              Khách hàng chưa có đơn hàng nào
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Mã đơn</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tổng tiền</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Đã trả</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyOrders.map((oh) => (
                    <TableRow key={oh.maDonHang}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{oh.maDonHang}</TableCell>
                      <TableCell>{formatDate(oh.ngayTao)}</TableCell>
                      <TableCell>{formatCurrency(oh.tongTien)}</TableCell>
                      <TableCell>{formatCurrency(oh.tienDaTra)}</TableCell>
                      <TableCell>
                        <Chip
                          label={TRANG_THAI_LABELS[oh.trangThai]}
                          size="small"
                          sx={{ bgcolor: TRANG_THAI_COLORS[oh.trangThai], color: 'white', fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa khách hàng</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa khách hàng <strong>{customerToDelete?.hoTen}</strong> ({customerToDelete?.soDienThoai}) không?
            Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button onClick={handleDeleteCustomer} color="error" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
