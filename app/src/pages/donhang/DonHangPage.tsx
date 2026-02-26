import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Select, MenuItem,
  FormControl, InputLabel, IconButton, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel,
  TextField, InputAdornment, useMediaQuery, useTheme
} from '@mui/material';
import { Visibility, Search, Print, Warning, NavigateNext, NavigateBefore } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { cauHinhService } from '../../services/cauHinhService';
import { donHangService } from '../../services/donHangService';
import { userService } from '../../services/userService';
import type { DonHang, CauHinhCuaHang } from '../../types';
import { TrangThaiDonHang } from '../../types';
import { TRANG_THAI_LABELS, TRANG_THAI_COLORS, formatCurrency, getStatusTransitionsForRole, VALID_STATUS_TRANSITIONS } from '../../utils/constants';
import { logError, getUserMessage } from '../../utils/errorHandler';
import PrintReceipt from '../../components/print/PrintReceipt';
import { silentPrint } from '../../utils/printUtils';
import { printService } from '../../services/printService';

export default function DonHangPage() {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const vaiTro = userProfile?.vaiTro;
  const [donHangs, setDonHangs] = useState<DonHang[]>([]);
  const [cauHinh, setCauHinh] = useState<CauHinhCuaHang | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TrangThaiDonHang | ''>('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selected, setSelected] = useState<DonHang | null>(null);

  // Employee name mapping: uid → hoTen
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});

  // Yêu Cầu 11: Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const cursorStackRef = useRef<any[]>([null]); // stack of lastDoc cursors per page

  const loadData = async (cursor?: any) => {
    setLoading(true);
    try {
      const maCuaHang = userProfile?.maCuaHang || '';
      const [result, configData, employees] = await Promise.all([
        donHangService.getByMaCuaHangPaginated(
          maCuaHang,
          {
            trangThai: filterStatus ? (filterStatus as TrangThaiDonHang) : undefined,
            lastDoc: cursor || null,
          }
        ),
        cauHinhService.get(maCuaHang),
        userService.getByMaCuaHang(maCuaHang),
      ]);
      setDonHangs(result.data);
      if (configData) setCauHinh(configData);
      setHasMore(result.hasMore);
      // Store cursor for next page
      if (result.lastDoc) {
        cursorStackRef.current[page + 1] = result.lastDoc;
      }
      // Build employee uid → name map
      const map: Record<string, string> = {};
      employees.forEach(e => { map[e.uid] = e.hoTen; });
      setEmployeeMap(map);
    } catch (err) {
      logError(err, 'DonHangPage.loadData');
      toast.error(getUserMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
    cursorStackRef.current = [null];
    loadData();
  }, [filterStatus]);

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

  // #25-27: Filter by phone/code and date range (client-side)
  const filteredOrders = donHangs.filter((dh) => {
    // Search by maDonHang or maKhachHang
    if (searchPhone.trim()) {
      const s = searchPhone.trim().toUpperCase();
      if (!dh.maKhachHang.toUpperCase().includes(s) && !dh.maDonHang.toUpperCase().includes(s)) return false;
    }
    // Date range filter
    if (filterDateFrom && dh.ngayTao?.toDate) {
      const orderDate = dh.ngayTao.toDate();
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      if (orderDate < from) return false;
    }
    if (filterDateTo && dh.ngayTao?.toDate) {
      const orderDate = dh.ngayTao.toDate();
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (orderDate > to) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (id: string, newStatus: TrangThaiDonHang) => {
    try {
      await donHangService.updateStatus(id, newStatus, userProfile?.uid || '');
      toast.success('Cập nhật trạng thái thành công');

      // #8: Notify when HOAN_THANH or DA_GIAO
      if (newStatus === TrangThaiDonHang.HOAN_THANH) {
        toast('📱 Đã gửi thông báo "Đơn hàng hoàn thành" cho khách hàng', { icon: '🔔', duration: 4000 });
      } else if (newStatus === TrangThaiDonHang.DA_GIAO) {
        toast('📱 Đã gửi thông báo "Đơn hàng đã giao" cho khách hàng', { icon: '🔔', duration: 4000 });
      }
      loadData();
      if (selected) {
        const updated = await donHangService.getById(id);
        if (!updated) {
          // Criteria 1: Order not found
          toast.error('Không tìm thấy đơn hàng. Thử tìm kiếm theo số điện thoại khách hàng.', { duration: 5000 });
          setSelected(null);
          setDetailOpen(false);
          return;
        }
        setSelected(updated);
      }
    } catch (err: any) {
      logError(err, 'DonHangPage.handleUpdateStatus', { id, newStatus });
      // Criteria 2: Invalid status transition → show valid statuses
      if (err.message?.includes('Không thể chuyển')) {
        const current = selected?.trangThai;
        if (current) {
          const validStatuses = VALID_STATUS_TRANSITIONS[current]
            ?.map((s) => TRANG_THAI_LABELS[s])
            .join(', ');
          toast.error(
            `${err.message}\n\nTrạng thái hợp lệ: ${validStatuses || 'Không có'}`,
            { duration: 6000 }
          );
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error(getUserMessage(err));
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '-';
    return format(timestamp.toDate(), 'dd/MM/yyyy HH:mm', { locale: vi });
  };

  const statusSteps = [
    TrangThaiDonHang.CHO_XU_LY, TrangThaiDonHang.DANG_GIAT,
    TrangThaiDonHang.DANG_SAY, TrangThaiDonHang.DANG_UI,
    TrangThaiDonHang.HOAN_THANH, TrangThaiDonHang.DA_GIAO,
  ];

  const getActiveStep = (status: TrangThaiDonHang) => {
    const idx = statusSteps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const handlePrint = async () => {
    if (!selected) return;
    if (isMobile) {
      const maCuaHang = userProfile?.maCuaHang || '';
      try {
        await printService.requestPrint(maCuaHang, selected.maDonHang, userProfile?.hoTen || 'Mobile');
        toast.success(`Đã gửi lệnh in đơn ${selected.maDonHang} đến máy PC`);
      } catch (err) {
        toast.error('Lỗi khi gửi lệnh in');
      }
      return;
    }

    const el = document.getElementById('print-order-detail');
    if (!el) return;
    silentPrint(el.innerHTML, `Phiếu tiếp nhận (${selected.maDonHang})`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Quản lý đơn hàng</Typography>
      </Box>

      {/* Filters: #25 (phone/code search), #26 (status filter) */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'auto auto auto auto' },
        gap: 2,
        mb: 3
      }}>
        <TextField
          size="small" placeholder="Tìm mã đơn, SĐT..."
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: { xs: '100%', md: 220 } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
          <InputLabel>Lọc trạng thái</InputLabel>
          <Select value={filterStatus} label="Lọc trạng thái" onChange={(e) => setFilterStatus(e.target.value as any)}>
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(TRANG_THAI_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small" type="date" label="Từ ngày" value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', md: 160 } }}
        />
        <TextField
          size="small" type="date" label="Đến ngày" value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', md: 160 } }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Mã đơn</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Ngày tạo</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>Hẹn trả</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>Tổng tiền</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>Đã trả</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>Nhân viên</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>Chưa có đơn hàng nào</TableCell></TableRow>
              ) : filteredOrders.map((dh) => (
                <TableRow key={dh.maDonHang} hover>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {dh.maDonHang}
                    {/* #29: Badge "Chưa xác định dịch vụ" for mode 2 orders */}
                    {!dh.daXacDinhDichVu && (
                      <Chip label="Chưa XĐ DV" size="small" color="warning" variant="outlined"
                        icon={<Warning sx={{ fontSize: '14px !important' }} />}
                        sx={{ ml: 1, height: 22, fontSize: '0.65rem' }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(dh.ngayTao)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>{formatDate(dh.ngayHenTra)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>{dh.tongTien > 0 ? formatCurrency(dh.tongTien) : <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Chưa XĐ</Typography>}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>{formatCurrency(dh.tienDaTra)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' }, fontSize: '0.85rem' }}>{employeeMap[dh.maNhanVien] || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Chip
                      label={TRANG_THAI_LABELS[dh.trangThai]}
                      size="small"
                      sx={{ bgcolor: TRANG_THAI_COLORS[dh.trangThai], color: 'white', fontWeight: 600, minWidth: 90 }}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" title="Chi tiết" onClick={() => { setSelected(dh); setDetailOpen(true); }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="secondary" title="In phiếu" onClick={() => { setSelected(dh); setPrintOpen(true); }}>
                      <Print fontSize="small" />
                    </IconButton>
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
          <Button
            size="small"
            startIcon={<NavigateBefore />}
            disabled={page === 0}
            onClick={handlePrevPage}
          >
            Trang trước
          </Button>
          <Typography variant="body2" color="text.secondary">
            Trang {page + 1}
          </Typography>
          <Button
            size="small"
            endIcon={<NavigateNext />}
            disabled={!hasMore}
            onClick={handleNextPage}
          >
            Trang sau
          </Button>
        </Box>
      )}
      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selected ? (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Đơn hàng {selected.maDonHang}</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {!selected.daXacDinhDichVu && (
                    <Chip label="Chưa xác định dịch vụ" color="warning" size="small" icon={<Warning />} />
                  )}
                  <Chip
                    label={TRANG_THAI_LABELS[selected.trangThai]}
                    sx={{ bgcolor: TRANG_THAI_COLORS[selected.trangThai], color: 'white', fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* Employee info */}
              <Typography variant="body2" sx={{ mb: 2 }}>
                👤 Nhân viên tiếp nhận: <strong>{employeeMap[selected.maNhanVien] || selected.maNhanVien || '-'}</strong>
              </Typography>
              {selected.trangThai !== TrangThaiDonHang.DA_HUY ? (
                <Stepper activeStep={getActiveStep(selected.trangThai)} alternativeLabel sx={{ mb: 3 }}>
                  {statusSteps.map((s) => (
                    <Step key={s}><StepLabel>{TRANG_THAI_LABELS[s]}</StepLabel></Step>
                  ))}
                </Stepper>
              ) : null}

              {/* Services table */}
              {selected.danhSachDichVu.length > 0 ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Dịch vụ</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Dịch vụ</TableCell>
                          <TableCell align="right">SL/KG</TableCell>
                          <TableCell align="right">Đơn giá</TableCell>
                          <TableCell align="right">Thành tiền</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selected.danhSachDichVu.map((dv, i) => (
                          <TableRow key={i}>
                            <TableCell>{dv.tenDichVu}</TableCell>
                            <TableCell align="right">{dv.trongLuong > 0 ? `${dv.trongLuong} kg` : `${dv.soLuong}`}</TableCell>
                            <TableCell align="right">{formatCurrency(dv.donGia)}</TableCell>
                            <TableCell align="right">{formatCurrency(dv.thanhTien)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Tổng tiền</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(selected.tongTien)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.50', borderRadius: 2, mb: 2, border: '1px dashed', borderColor: 'warning.main' }}>
                  <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Chưa xác định dịch vụ</Typography>
                  <Typography variant="body2" color="text.secondary">Dịch vụ và giá sẽ được xác định sau khi giặt</Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Đã trả</Typography>
                  <Typography fontWeight={600} color="success.main">{formatCurrency(selected.tienDaTra)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Còn lại</Typography>
                  <Typography fontWeight={600} color="error.main">{formatCurrency(selected.tienConLai)}</Typography></Box>
              </Box>

              {/* Status History */}
              {selected.lichSuCapNhat?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Lịch sử trạng thái</Typography>
                  {selected.lichSuCapNhat.map((ls, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{formatDate(ls.thoiGian)}</Typography>
                      <Chip label={TRANG_THAI_LABELS[ls.trangThaiCu]} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
                      <Typography variant="caption">→</Typography>
                      <Chip label={TRANG_THAI_LABELS[ls.trangThaiMoi]} size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: TRANG_THAI_COLORS[ls.trangThaiMoi], color: 'white' }} />
                    </Box>
                  ))}
                </Box>
              )}

              {/* Status update buttons */}
              {/* #1-4: Role-based status transitions */}
              {vaiTro && getStatusTransitionsForRole(selected.trangThai, vaiTro).length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cập nhật trạng thái</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {getStatusTransitionsForRole(selected.trangThai, vaiTro).map((nextStatus) => (
                      <Button
                        key={nextStatus} variant="outlined" size="small"
                        sx={{ borderColor: TRANG_THAI_COLORS[nextStatus], color: TRANG_THAI_COLORS[nextStatus] }}
                        onClick={() => handleUpdateStatus(selected.maDonHang, nextStatus)}
                      >
                        → {TRANG_THAI_LABELS[nextStatus]}
                      </Button>
                    ))}
                  </Box>
                </Box>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button startIcon={<Print />} onClick={() => { setPrintOpen(true); setDetailOpen(false); }}>In phiếu</Button>
              <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>In phiếu</DialogTitle>
        <DialogContent>
          {selected && (
            <Box id="print-order-detail">
              <PrintReceipt
                donHang={selected}
                tenCuaHang={cauHinh?.mauInPhieu?.tenCuaHang}
                diaChiCuaHang={cauHinh?.mauInPhieu?.diaChi}
                sdtCuaHang={cauHinh?.mauInPhieu?.soDienThoai}
              />
              {!selected.daXacDinhDichVu && (
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'warning.main' }}>
                    ⚠ Dịch vụ và giá sẽ được xác định sau khi giặt
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintOpen(false)}>Đóng</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>In</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
