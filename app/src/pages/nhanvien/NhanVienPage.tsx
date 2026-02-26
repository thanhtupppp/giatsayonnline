import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, CircularProgress, Alert,
} from '@mui/material';
import { Add, Edit, Block, CheckCircle } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { cuaHangService } from '../../services/cuaHangService';
import type { User, CuaHang } from '../../types';
import { VaiTro, TrangThaiNhanVien } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { VAI_TRO_LABELS } from '../../utils/constants';

export default function NhanVienPage() {
  const { userProfile, hasRole } = useAuth();
  const isSuperAdmin = hasRole(VaiTro.SUPER_ADMIN);

  const [users, setUsers] = useState<User[]>([]);
  const [cuaHangs, setCuaHangs] = useState<CuaHang[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', hoTen: '', soDienThoai: '',
    vaiTro: VaiTro.NHAN_VIEN_QUAY as VaiTro,
    maCuaHang: '' as string,
  });

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editVaiTro, setEditVaiTro] = useState<VaiTro>(VaiTro.NHAN_VIEN_QUAY);

  const loadData = async () => {
    setLoading(true);
    try {
      // Criteria #7: SUPER_ADMIN sees all users. #8: ADMIN sees only their shop's employees
      const data = isSuperAdmin
        ? await userService.getAll()
        : await userService.getByMaCuaHang(userProfile?.maCuaHang || '');
      setUsers(data);

      // Load shop list for SUPER_ADMIN (criteria #2: select shop when creating Admin)
      if (isSuperAdmin) {
        const shops = await cuaHangService.getAll();
        setCuaHangs(shops);
      }
    } catch { toast.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Criteria #5: Admin can only create NHAN_VIEN_QUAY or KY_THUAT_VIEN
  // Criteria #6: Admin cannot create Admin - explicit check
  const availableRolesCreate = isSuperAdmin
    ? [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN]
    : [VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN];

  const availableRolesEdit = isSuperAdmin
    ? [VaiTro.ADMIN, VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN]
    : [VaiTro.NHAN_VIEN_QUAY, VaiTro.KY_THUAT_VIEN];

  const handleCreate = async () => {
    if (!form.hoTen || !form.email || !form.password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Criteria #6: Admin cannot create Admin
    if (!isSuperAdmin && form.vaiTro === VaiTro.ADMIN) {
      toast.error('Chỉ Super Admin mới có quyền tạo Admin');
      return;
    }

    // Criteria #2: SUPER_ADMIN creating Admin must select shop
    if (isSuperAdmin && form.vaiTro === VaiTro.ADMIN && !form.maCuaHang) {
      toast.error('Vui lòng chọn cửa hàng cho Admin');
      return;
    }

    setCreating(true);
    try {
      // Criteria #4: Admin auto-assigns their maCuaHang; SUPER_ADMIN chooses
      const maCuaHang = isSuperAdmin
        ? (form.vaiTro === VaiTro.ADMIN ? form.maCuaHang : (form.maCuaHang || null))
        : (userProfile?.maCuaHang || null);

      await userService.create(form.email, form.password, {
        hoTen: form.hoTen,
        soDienThoai: form.soDienThoai,
        email: form.email,
        vaiTro: form.vaiTro,
        maCuaHang,
        ngayVaoLam: Timestamp.now(),
      });

      toast.success('Tạo nhân viên thành công! 🎉');
      setOpenCreate(false);
      setForm({ email: '', password: '', hoTen: '', soDienThoai: '', vaiTro: VaiTro.NHAN_VIEN_QUAY, maCuaHang: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo nhân viên');
    }
    setCreating(false);
  };

  // Criteria #9: Super Admin can change user role
  const handleEditRole = async () => {
    if (!editUser) return;

    // Criteria #10: Admin cannot edit employees of another shop
    if (!isSuperAdmin && editUser.maCuaHang !== userProfile?.maCuaHang) {
      toast.error('Bạn không có quyền chỉnh sửa nhân viên cửa hàng khác');
      return;
    }

    try {
      await userService.update(editUser.uid, { vaiTro: editVaiTro });
      toast.success(`Đã cập nhật vai trò thành ${VAI_TRO_LABELS[editVaiTro]}`);
      setOpenEdit(false);
      setEditUser(null);
      loadData();
    } catch { toast.error('Lỗi cập nhật vai trò'); }
  };

  const handleToggleStatus = async (u: User, newStatus: TrangThaiNhanVien) => {
    // Criteria #10: Admin cannot modify employees of another shop
    if (!isSuperAdmin && u.maCuaHang !== userProfile?.maCuaHang) {
      toast.error('Bạn không có quyền thay đổi trạng thái nhân viên cửa hàng khác');
      return;
    }
    await userService.updateStatus(u.uid, newStatus);
    loadData();
  };

  const openEditDialog = (u: User) => {
    setEditUser(u);
    setEditVaiTro(u.vaiTro);
    setOpenEdit(true);
  };

  const statusColor = (s: TrangThaiNhanVien) => {
    if (s === TrangThaiNhanVien.DANG_LAM_VIEC) return 'success' as const;
    if (s === TrangThaiNhanVien.NGHI_PHEP) return 'warning' as const;
    return 'error' as const;
  };

  const statusLabel = (s: TrangThaiNhanVien) => {
    if (s === TrangThaiNhanVien.DANG_LAM_VIEC) return 'Đang làm việc';
    if (s === TrangThaiNhanVien.NGHI_PHEP) return 'Nghỉ phép';
    return 'Đã nghỉ việc';
  };

  const getShopName = (maCH: string | null) => {
    if (!maCH) return '-';
    const shop = cuaHangs.find((s) => s.maCuaHang === maCH);
    return shop ? shop.tenCuaHang : maCH;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Quản lý nhân viên</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}>
          Thêm nhân viên
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Họ tên</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SĐT</TableCell>
                {isSuperAdmin && <TableCell sx={{ fontWeight: 600 }}>Cửa hàng</TableCell>}
                <TableCell sx={{ fontWeight: 600 }}>Vai trò</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={isSuperAdmin ? 7 : 6} align="center" sx={{ py: 4 }}>Chưa có nhân viên nào</TableCell></TableRow>
              ) : users.map((u) => (
                <TableRow key={u.uid} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{u.hoTen}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.soDienThoai || '-'}</TableCell>
                  {isSuperAdmin && <TableCell>{getShopName(u.maCuaHang)}</TableCell>}
                  <TableCell>
                    <Chip label={VAI_TRO_LABELS[u.vaiTro]} size="small" color={u.vaiTro === VaiTro.SUPER_ADMIN ? 'error' : u.vaiTro === VaiTro.ADMIN ? 'primary' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell><Chip label={statusLabel(u.trangThai)} color={statusColor(u.trangThai)} size="small" /></TableCell>
                  <TableCell>
                    {/* Don't allow editing SUPER_ADMIN */}
                    {u.vaiTro !== VaiTro.SUPER_ADMIN && (
                      <>
                        <IconButton size="small" color="primary" title="Sửa vai trò" onClick={() => openEditDialog(u)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        {u.trangThai === TrangThaiNhanVien.DANG_LAM_VIEC ? (
                          <IconButton size="small" color="warning" title="Vô hiệu hóa"
                            onClick={() => handleToggleStatus(u, TrangThaiNhanVien.DA_NGHI_VIEC)}>
                            <Block fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton size="small" color="success" title="Kích hoạt"
                            onClick={() => handleToggleStatus(u, TrangThaiNhanVien.DANG_LAM_VIEC)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ===== CREATE DIALOG ===== */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm nhân viên mới</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Họ tên" value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} required />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <TextField label="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required helperText="Tối thiểu 6 ký tự" />
          <TextField label="Số điện thoại" value={form.soDienThoai} onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })} />
          <FormControl>
            <InputLabel>Vai trò</InputLabel>
            <Select value={form.vaiTro} label="Vai trò" onChange={(e) => setForm({ ...form, vaiTro: e.target.value as VaiTro })}>
              {availableRolesCreate.map((r) => (
                <MenuItem key={r} value={r}>{VAI_TRO_LABELS[r]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Criteria #2: SUPER_ADMIN must select shop when creating ADMIN */}
          {isSuperAdmin && (form.vaiTro === VaiTro.ADMIN || form.vaiTro === VaiTro.NHAN_VIEN_QUAY || form.vaiTro === VaiTro.KY_THUAT_VIEN) && (
            <FormControl required={form.vaiTro === VaiTro.ADMIN}>
              <InputLabel>Cửa hàng</InputLabel>
              <Select value={form.maCuaHang} label="Cửa hàng" onChange={(e) => setForm({ ...form, maCuaHang: e.target.value })}>
                {cuaHangs.map((ch) => (
                  <MenuItem key={ch.maCuaHang} value={ch.maCuaHang}>{ch.tenCuaHang} ({ch.maCuaHang})</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Criteria #6: explicit warning */}
          {!isSuperAdmin && (
            <Alert severity="info" variant="outlined">
              Nhân viên sẽ được tạo cho cửa hàng của bạn. Chỉ Super Admin mới có quyền tạo Admin.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Đang tạo...' : 'Tạo nhân viên'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== EDIT ROLE DIALOG (Criteria #9) ===== */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cập nhật vai trò</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="body2">
            Nhân viên: <strong>{editUser?.hoTen}</strong> ({editUser?.email})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vai trò hiện tại: <Chip label={editUser ? VAI_TRO_LABELS[editUser.vaiTro] : ''} size="small" />
          </Typography>
          <FormControl>
            <InputLabel>Vai trò mới</InputLabel>
            <Select value={editVaiTro} label="Vai trò mới" onChange={(e) => setEditVaiTro(e.target.value as VaiTro)}>
              {availableRolesEdit.map((r) => (
                <MenuItem key={r} value={r}>{VAI_TRO_LABELS[r]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleEditRole} disabled={editVaiTro === editUser?.vaiTro}>
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
