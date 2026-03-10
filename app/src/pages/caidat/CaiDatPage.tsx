import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Select,
  MenuItem, FormControl, InputLabel, Alert, Autocomplete,
  Chip, CircularProgress, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Save, CloudDownload } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { cauHinhService } from '../../services/cauHinhService';
import { auditLogService } from '../../services/auditLogService';
import type { CauHinhCuaHang } from '../../types';
import { CheDoTaoDonHang, VaiTro } from '../../types';
import { donHangService } from '../../services/donHangService';
import { khachHangService } from '../../services/khachHangService';
import { giaoDichService } from '../../services/giaoDichService';
import { dichVuService } from '../../services/dichVuService';

const DAYS_OF_WEEK = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

// VietQR Bank Type
interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

export default function CaiDatPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [config, setConfig] = useState<Partial<CauHinhCuaHang>>({
    cheDoTaoDonHang: CheDoTaoDonHang.CHON_DICH_VU_TRUOC,
    gioMoCua: '07:00',
    gioDongCua: '21:00',
    ngayNghiTrongTuan: [],
  });

  // TC 14: Keep backup for rollback
  const savedConfigRef = useRef<Partial<CauHinhCuaHang>>({});

  // TC 8: Mode change confirmation
  const [modeConfirmOpen, setModeConfirmOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<CheDoTaoDonHang | null>(null);

  // VietQR Banks
  const [banks, setBanks] = useState<VietQRBank[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await cauHinhService.get(userProfile?.maCuaHang || '');
        if (data) {
          setConfig(data);
          savedConfigRef.current = { ...data };
        }
      } catch { /* use defaults */ }

      // Fetch VietQR banks
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const bankData = await response.json();
        if (bankData.code === '00') {
          setBanks(bankData.data);
        }
      } catch {
        console.error('Failed to fetch VietQR banks');
      }

      setLoading(false);
    };
    load();
  }, []);

  // TC 13+14: Save with audit log and rollback on error
  const handleSave = async () => {
    setSaving(true);
    try {
      await cauHinhService.update(
        userProfile?.maCuaHang || '',
        config,
        userProfile?.uid || ''
      );

      // YC 18+19, TC 13: Audit log
      auditLogService.log({
        maCuaHang: userProfile?.maCuaHang || '',
        userId: userProfile?.uid || '',
        action: 'cauhinh.update',
        beforeData: savedConfigRef.current as Record<string, unknown>,
        afterData: config as Record<string, unknown>,
      });

      savedConfigRef.current = { ...config };
      toast.success('Lưu cấu hình thành công ✅');
    } catch {
      // TC 14: Rollback to last saved config
      setConfig({ ...savedConfigRef.current });
      toast.error('Lỗi lưu cấu hình — đã khôi phục cấu hình cũ');
    }
    setSaving(false);
  };

  const toggleDay = (day: number) => {
    const current = config.ngayNghiTrongTuan || [];
    const newDays = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setConfig({ ...config, ngayNghiTrongTuan: newDays });
  };

  // TC 8: Mode change with confirmation dialog
  const handleModeChange = (newMode: CheDoTaoDonHang) => {
    if (newMode !== config.cheDoTaoDonHang) {
      setPendingMode(newMode);
      setModeConfirmOpen(true);
    }
  };

  const confirmModeChange = () => {
    if (pendingMode) {
      setConfig({ ...config, cheDoTaoDonHang: pendingMode });
    }
    setModeConfirmOpen(false);
    setPendingMode(null);
  };

  // Yêu Cầu 15, TC 4: Export all data to JSON
  const handleExportData = async () => {
    setExporting(true);
    try {
      const maCuaHang = userProfile?.maCuaHang || '';
      const [donHangs, khachHangs, giaoDichs, dichVus] = await Promise.all([
        donHangService.getByMaCuaHang(maCuaHang),
        khachHangService.getByMaCuaHang(maCuaHang),
        giaoDichService.getByMaCuaHang(maCuaHang),
        dichVuService.getByMaCuaHang(maCuaHang),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        maCuaHang,
        data: { donHangs, khachHangs, giaoDichs, dichVus },
        counts: {
          donHangs: donHangs.length,
          khachHangs: khachHangs.length,
          giaoDichs: giaoDichs.length,
          dichVus: dichVus.length,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `giatsay-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export thành công! ${donHangs.length} đơn, ${khachHangs.length} KH, ${giaoDichs.length} GD, ${dichVus.length} DV`);
    } catch {
      toast.error('Lỗi export dữ liệu');
    }
    setExporting(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Cài đặt cửa hàng</Typography>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* TC 5-8: Chế độ tạo đơn hàng */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Chế độ tạo đơn hàng</Typography>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Chế độ</InputLabel>
                <Select
                  value={config.cheDoTaoDonHang}
                  label="Chế độ"
                  onChange={(e) => handleModeChange(e.target.value as CheDoTaoDonHang)}
                >
                  <MenuItem value={CheDoTaoDonHang.CHON_DICH_VU_TRUOC}>
                    Chọn dịch vụ trước (tính giá ngay)
                  </MenuItem>
                  <MenuItem value={CheDoTaoDonHang.CHON_DICH_VU_SAU}>
                    Chọn dịch vụ sau (cân ký trước, chọn dịch vụ sau)
                  </MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {config.cheDoTaoDonHang === CheDoTaoDonHang.CHON_DICH_VU_TRUOC
                  ? 'Khách hàng chọn dịch vụ và thanh toán ngay khi gửi đồ.'
                  : 'Nhận đồ trước, cân ký và tính giá sau. Phù hợp cho cửa hàng có quy trình tiếp nhận nhanh.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* TC 9: Giờ mở cửa */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Giờ hoạt động</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  label="Giờ mở cửa" type="time" fullWidth
                  value={config.gioMoCua}
                  onChange={(e) => setConfig({ ...config, gioMoCua: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Giờ đóng cửa" type="time" fullWidth
                  value={config.gioDongCua}
                  onChange={(e) => setConfig({ ...config, gioDongCua: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* TC 10: Ngày nghỉ */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Ngày nghỉ trong tuần</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <Chip
                    key={idx}
                    label={day}
                    onClick={() => toggleDay(idx)}
                    color={(config.ngayNghiTrongTuan || []).includes(idx) ? 'error' : 'default'}
                    variant={(config.ngayNghiTrongTuan || []).includes(idx) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* TC 11: Thông tin thanh toán */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Thông tin thanh toán (VietQR)</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Autocomplete
                  options={banks}
                  getOptionLabel={(option) => `${option.shortName} - ${option.name}`}
                  value={banks.find((b) => b.bin === config.thongTinThanhToan?.maNganHang) || null}
                  onChange={(_, newValue) => {
                    setConfig({
                      ...config,
                      thongTinThanhToan: {
                        ...(config.thongTinThanhToan as any),
                        maNganHang: newValue?.bin || '',
                        tenNganHang: newValue?.shortName || '',
                      },
                    });
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                      <img loading="lazy" width="40" src={option.logo} alt="" />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{option.shortName}</Typography>
                        <Typography variant="caption" color="text.secondary">{option.name}</Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => <TextField {...params} label="Chọn ngân hàng" />}
                />
                <TextField label="Số tài khoản"
                  value={config.thongTinThanhToan?.soTaiKhoan || ''}
                  onChange={(e) => setConfig({ ...config, thongTinThanhToan: { ...config.thongTinThanhToan, soTaiKhoan: e.target.value } as any })} />
                <TextField label="Chủ tài khoản"
                  value={config.thongTinThanhToan?.chuTaiKhoan || ''}
                  onChange={(e) => setConfig({ ...config, thongTinThanhToan: { ...config.thongTinThanhToan, chuTaiKhoan: e.target.value } as any })} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* TC 12: Mẫu in phiếu */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Thông tin cửa hàng (In Phiếu)</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField label="Tên cửa hàng"
                  value={config.mauInPhieu?.tenCuaHang || ''}
                  onChange={(e) => setConfig({ ...config, mauInPhieu: { ...config.mauInPhieu, tenCuaHang: e.target.value, footer: config.mauInPhieu?.footer || '' } })} />
                <TextField label="Địa chỉ"
                  value={config.mauInPhieu?.diaChi || ''}
                  onChange={(e) => setConfig({ ...config, mauInPhieu: { ...config.mauInPhieu, diaChi: e.target.value, footer: config.mauInPhieu?.footer || '' } })} />
                <TextField label="Số điện thoại"
                  value={config.mauInPhieu?.soDienThoai || ''}
                  onChange={(e) => setConfig({ ...config, mauInPhieu: { ...config.mauInPhieu, soDienThoai: e.target.value, footer: config.mauInPhieu?.footer || '' } })} />
                <TextField label="Email (Tuỳ chọn)"
                  value={config.mauInPhieu?.email || ''}
                  onChange={(e) => setConfig({ ...config, mauInPhieu: { ...config.mauInPhieu, email: e.target.value, footer: config.mauInPhieu?.footer || '' } })} />
                <TextField label="URL Logo (tuỳ chọn)"
                  value={config.mauInPhieu?.logoUrl || ''}
                  placeholder="https://example.com/logo.png"
                  onChange={(e) => setConfig({ ...config, mauInPhieu: { ...config.mauInPhieu, logoUrl: e.target.value, footer: config.mauInPhieu?.footer || '' } })} />
                <TextField label="Lời cảm ơn (Footer)"
                  placeholder="Ví dụ: Cảm ơn quý khách!"
                  value={config.mauInPhieu?.footer || ''}
                  onChange={(e) => setConfig({ ...config, mauInPhieu: { ...config.mauInPhieu, footer: e.target.value } })} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Export dữ liệu — chỉ Super Admin */}
        {userProfile?.vaiTro === VaiTro.SUPER_ADMIN && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Sao lưu dữ liệu</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Xuất toàn bộ dữ liệu cửa hàng ra file JSON để lưu trữ hoặc chuyển đổi.
              </Typography>
              <Button
                variant="outlined" startIcon={<CloudDownload />}
                onClick={handleExportData} disabled={exporting}
              >
                {exporting ? 'Đang export...' : 'Export dữ liệu (JSON)'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        )}
      </Grid>

      {/* TC 8: Mode change confirmation dialog */}
      <Dialog open={modeConfirmOpen} onClose={() => setModeConfirmOpen(false)} maxWidth="sm">
        <DialogTitle>Xác nhận thay đổi chế độ tạo đơn</DialogTitle>
        <DialogContent>
          {pendingMode === CheDoTaoDonHang.CHON_DICH_VU_TRUOC ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Chọn dịch vụ trước:</strong> Nhân viên phải chọn dịch vụ và tính giá khi tạo đơn hàng.
              Khách hàng thanh toán ngay khi gửi đồ.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Chọn dịch vụ sau:</strong> Nhân viên chỉ cần tạo phiếu hẹn khi nhận đồ.
              Dịch vụ và giá sẽ được xác định sau khi cân ký/giặt xong.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Thay đổi này sẽ áp dụng cho tất cả nhân viên sau khi lưu cấu hình.
            Các đơn hàng đang xử lý sẽ không bị ảnh hưởng.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModeConfirmOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={confirmModeChange}>Xác nhận thay đổi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
