import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress,
} from '@mui/material';
import { Add, Block, CheckCircle } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { cuaHangService } from '../../services/cuaHangService';
import type { CuaHang } from '../../types';
import { TrangThaiCuaHang, VaiTro, TrangThaiNhanVien } from '../../types';

interface ShopStats {
  maCuaHang: string;
  donHangCount: number;
  khachHangCount: number;
}

export default function CuaHangPage() {
  const [cuaHangs, setCuaHangs] = useState<CuaHang[]>([]);
  const [stats, setStats] = useState<Record<string, ShopStats>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    tenCuaHang: '', diaChi: '', soDienThoai: '', email: '',
    adminEmail: '', adminPassword: '', adminName: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await cuaHangService.getAll();
      setCuaHangs(data);

      // Requirement #5: Load basic stats per shop
      const statsMap: Record<string, ShopStats> = {};
      for (const ch of data) {
        try {
          const [dhSnap, khSnap] = await Promise.all([
            getDocs(query(collection(db, 'donHang'), where('maCuaHang', '==', ch.maCuaHang))),
            getDocs(query(collection(db, 'khachHang'), where('maCuaHang', '==', ch.maCuaHang))),
          ]);
          statsMap[ch.maCuaHang] = {
            maCuaHang: ch.maCuaHang,
            donHangCount: dhSnap.size,
            khachHangCount: khSnap.size,
          };
        } catch {
          statsMap[ch.maCuaHang] = { maCuaHang: ch.maCuaHang, donHangCount: 0, khachHangCount: 0 };
        }
      }
      setStats(statsMap);
    } catch { toast.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Requirement #4: Auto-create admin account when creating a new shop
  const handleCreate = async () => {
    if (!form.tenCuaHang || !form.diaChi || !form.soDienThoai) {
      toast.error('Vui lòng nhập đầy đủ thông tin cửa hàng');
      return;
    }
    if (!form.adminEmail || !form.adminPassword) {
      toast.error('Vui lòng nhập email và mật khẩu cho Admin cửa hàng');
      return;
    }
    if (form.adminPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setCreating(true);
    try {
      // Step 1: Create the shop
      const maCuaHang = await cuaHangService.create({
        tenCuaHang: form.tenCuaHang,
        diaChi: form.diaChi,
        soDienThoai: form.soDienThoai,
        email: form.email,
        maAdminChinh: '', // will be updated after creating admin
      } as any);

      // Step 2: Create Firebase Auth account for Admin
      const adminCred = await createUserWithEmailAndPassword(auth, form.adminEmail, form.adminPassword);

      // Step 3: Create user profile in Firestore with ADMIN role and maCuaHang
      await setDoc(doc(db, 'users', adminCred.user.uid), {
        uid: adminCred.user.uid,
        maCuaHang,
        hoTen: form.adminName || form.adminEmail.split('@')[0],
        soDienThoai: '',
        email: form.adminEmail,
        vaiTro: VaiTro.ADMIN,
        trangThai: TrangThaiNhanVien.DANG_LAM_VIEC,
        ngayVaoLam: Timestamp.now(),
        createdBy: 'SUPER_ADMIN',
      });

      // Step 4: Update shop with admin UID
      await cuaHangService.update(maCuaHang, { maAdminChinh: adminCred.user.uid });

      toast.success(`Tạo cửa hàng "${form.tenCuaHang}" và tài khoản Admin thành công! 🎉`);
      setOpen(false);
      setForm({ tenCuaHang: '', diaChi: '', soDienThoai: '', email: '', adminEmail: '', adminPassword: '', adminName: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo cửa hàng');
    }
    setCreating(false);
  };

  const statusColor = (s: TrangThaiCuaHang) => {
    if (s === TrangThaiCuaHang.HOAT_DONG) return 'success';
    if (s === TrangThaiCuaHang.TAM_NGUNG) return 'warning';
    return 'error';
  };

  const statusLabel = (s: TrangThaiCuaHang) => {
    if (s === TrangThaiCuaHang.HOAT_DONG) return 'Hoạt động';
    if (s === TrangThaiCuaHang.TAM_NGUNG) return 'Tạm ngừng';
    return 'Đóng cửa';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Quản lý cửa hàng</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Thêm cửa hàng
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Mã</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tên cửa hàng</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Địa chỉ</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SĐT</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Đơn hàng</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Khách hàng</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cuaHangs.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>Chưa có cửa hàng nào</TableCell></TableRow>
              ) : cuaHangs.map((ch) => (
                <TableRow key={ch.maCuaHang} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{ch.maCuaHang}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{ch.tenCuaHang}</TableCell>
                  <TableCell>{ch.diaChi}</TableCell>
                  <TableCell>{ch.soDienThoai}</TableCell>
                  <TableCell>
                    <Chip label={stats[ch.maCuaHang]?.donHangCount ?? 0} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={stats[ch.maCuaHang]?.khachHangCount ?? 0} size="small" color="secondary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={statusLabel(ch.trangThai)} color={statusColor(ch.trangThai)} size="small" />
                  </TableCell>
                  <TableCell>
                    {ch.trangThai === TrangThaiCuaHang.HOAT_DONG ? (
                      <IconButton size="small" color="warning" title="Vô hiệu hóa"
                        onClick={async () => { await cuaHangService.toggleStatus(ch.maCuaHang, TrangThaiCuaHang.TAM_NGUNG); loadData(); }}>
                        <Block fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" color="success" title="Kích hoạt"
                        onClick={async () => { await cuaHangService.toggleStatus(ch.maCuaHang, TrangThaiCuaHang.HOAT_DONG); loadData(); }}>
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog tạo cửa hàng + auto-create Admin */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm cửa hàng mới</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="subtitle2" color="text.secondary">Thông tin cửa hàng</Typography>
          <TextField label="Tên cửa hàng" value={form.tenCuaHang} onChange={(e) => setForm({ ...form, tenCuaHang: e.target.value })} required />
          <TextField label="Địa chỉ" value={form.diaChi} onChange={(e) => setForm({ ...form, diaChi: e.target.value })} required />
          <TextField label="Số điện thoại" value={form.soDienThoai} onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })} required />
          <TextField label="Email cửa hàng" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Tài khoản Admin (tự động tạo)
          </Typography>
          <TextField label="Tên Admin" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
          <TextField label="Email đăng nhập Admin" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
          <TextField label="Mật khẩu Admin" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required
            helperText="Tối thiểu 6 ký tự" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Đang tạo...' : 'Tạo cửa hàng + Admin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
