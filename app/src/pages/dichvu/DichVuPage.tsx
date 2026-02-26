import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Switch,
  CircularProgress, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { dichVuService } from '../../services/dichVuService';
import type { DichVu } from '../../types';
import { LoaiTinhGia } from '../../types';
import { formatCurrency } from '../../utils/constants';

const LOAI_TINH_GIA_LABELS: Record<LoaiTinhGia, string> = {
  [LoaiTinhGia.THEO_TRONG_LUONG]: 'Theo kg',
  [LoaiTinhGia.THEO_SO_LUONG]: 'Theo số lượng',
  [LoaiTinhGia.CO_DINH]: 'Cố định',
};

export default function DichVuPage() {
  const { userProfile } = useAuth();
  const [dichVus, setDichVus] = useState<DichVu[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenDichVu: '', moTa: '', loaiTinhGia: LoaiTinhGia.THEO_TRONG_LUONG,
    giaTheoKg: 0, giaTheoSoLuong: 0, thoiGianXuLy: 24,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dichVuService.getByMaCuaHang(userProfile?.maCuaHang || '');
      setDichVus(data);
    } catch { toast.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    try {
      if (editId) {
        await dichVuService.update(editId, { ...form } as any);
        toast.success('Cập nhật dịch vụ thành công');
      } else {
        await dichVuService.create({
          ...form,
          maCuaHang: userProfile?.maCuaHang || '',
          trangThai: true,
        } as any);
        toast.success('Tạo dịch vụ thành công');
      }
      setOpen(false);
      setEditId(null);
      setForm({ tenDichVu: '', moTa: '', loaiTinhGia: LoaiTinhGia.THEO_TRONG_LUONG, giaTheoKg: 0, giaTheoSoLuong: 0, thoiGianXuLy: 24 });
      loadData();
    } catch { toast.error('Lỗi lưu dịch vụ'); }
  };

  const handleDelete = async (dv: DichVu) => {
    if (!window.confirm(`Bạn có chắc muốn xóa dịch vụ "${dv.tenDichVu}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await dichVuService.delete(dv.maDichVu);
      toast.success('Xóa dịch vụ thành công');
      loadData();
    } catch { toast.error('Lỗi xóa dịch vụ'); }
  };

  const openEdit = (dv: DichVu) => {
    setEditId(dv.maDichVu);
    setForm({
      tenDichVu: dv.tenDichVu, moTa: dv.moTa || '', loaiTinhGia: dv.loaiTinhGia,
      giaTheoKg: dv.giaTheoKg, giaTheoSoLuong: dv.giaTheoSoLuong, thoiGianXuLy: dv.thoiGianXuLy,
    });
    setOpen(true);
  };

  const getPrice = (dv: DichVu) => {
    if (dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG) return `${formatCurrency(dv.giaTheoKg)}/kg`;
    if (dv.loaiTinhGia === LoaiTinhGia.THEO_SO_LUONG) return `${formatCurrency(dv.giaTheoSoLuong)}/cái`;
    return formatCurrency(dv.giaTheoSoLuong);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Quản lý dịch vụ</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditId(null); setOpen(true); }}>
          Thêm dịch vụ
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Tên dịch vụ</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Đơn giá</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Loại tính giá</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dichVus.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Chưa có dịch vụ nào</TableCell></TableRow>
              ) : dichVus.map((dv) => (
                <TableRow key={dv.maDichVu} hover>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{dv.tenDichVu}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography color="primary" fontWeight={600}>
                      {getPrice(dv)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Chip
                      label={LOAI_TINH_GIA_LABELS[dv.loaiTinhGia]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Switch
                      checked={dv.trangThai}
                      onChange={async () => { await dichVuService.toggleStatus(dv.maDichVu, !dv.trangThai); loadData(); }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => openEdit(dv)} title="Sửa">
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(dv)} title="Xóa">
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Tên dịch vụ" value={form.tenDichVu} onChange={(e) => setForm({ ...form, tenDichVu: e.target.value })} required />
          <TextField label="Mô tả" multiline rows={2} value={form.moTa} onChange={(e) => setForm({ ...form, moTa: e.target.value })} />
          <FormControl>
            <InputLabel>Loại tính giá</InputLabel>
            <Select value={form.loaiTinhGia} label="Loại tính giá" onChange={(e) => setForm({ ...form, loaiTinhGia: e.target.value as LoaiTinhGia })}>
              {Object.entries(LOAI_TINH_GIA_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {form.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? (
            <TextField label="Giá theo kg" type="number" value={form.giaTheoKg}
              onChange={(e) => setForm({ ...form, giaTheoKg: Number(e.target.value) })}
              InputProps={{ endAdornment: <InputAdornment position="end">₫/kg</InputAdornment> }} />
          ) : (
            <TextField label="Giá theo số lượng / cố định" type="number" value={form.giaTheoSoLuong}
              onChange={(e) => setForm({ ...form, giaTheoSoLuong: Number(e.target.value) })}
              InputProps={{ endAdornment: <InputAdornment position="end">₫</InputAdornment> }} />
          )}
          <TextField label="Thời gian xử lý" type="number" value={form.thoiGianXuLy}
            onChange={(e) => setForm({ ...form, thoiGianXuLy: Number(e.target.value) })}
            InputProps={{ endAdornment: <InputAdornment position="end">giờ</InputAdornment> }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSave}>{editId ? 'Cập nhật' : 'Tạo'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
