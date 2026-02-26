import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid,
  Avatar, Divider, CircularProgress, Chip,
} from '@mui/material';
import { Person, Save, VpnKey } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { VAI_TRO_LABELS } from '../../utils/constants';

export default function ProfilePage() {
  const { userProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [hoTen, setHoTen] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');

  useEffect(() => {
    if (userProfile) {
      setHoTen(userProfile.hoTen);
      setSoDienThoai(userProfile.soDienThoai || '');
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    if (!hoTen.trim()) {
      toast.error('Họ tên không được để trống');
      return;
    }

    setSaving(true);
    try {
      // Yêu Cầu 7, Tiêu chí 6: Cho phép cập nhật thông tin (trừ vai trò và quyền)
      await userService.update(userProfile.uid, {
        hoTen,
        soDienThoai,
      });
      toast.success('Cập nhật thông tin thành công!');
      window.location.reload(); 
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật thông tin');
    }
    setSaving(false);
  };

  const handlePasswordReset = () => {
    toast('Chức năng đổi mật khẩu đang được phát triển', { icon: '🚧' });
  };

  if (!userProfile) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Hồ sơ cá nhân</Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3 }}>
            <Avatar 
              sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '2.5rem' }}
            >
              {userProfile.hoTen.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" fontWeight={700}>{userProfile.hoTen}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{userProfile.email}</Typography>
            <Chip 
              label={VAI_TRO_LABELS[userProfile.vaiTro]} 
              color="primary" 
              variant="outlined" 
              sx={{ fontWeight: 600 }}
            />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Person color="primary" /> Thông tin chung
              </Typography>
              
              <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Họ tên"
                      value={hoTen}
                      onChange={(e) => setHoTen(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Số điện thoại"
                      value={soDienThoai}
                      onChange={(e) => setSoDienThoai(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={userProfile.email}
                      disabled
                      helperText="Không thể thay đổi email sau khi tạo"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Vai trò"
                      value={VAI_TRO_LABELS[userProfile.vaiTro]}
                      disabled
                      helperText="Chỉ Quản lý (Admin) hoặc Super Admin mới có thể thay đổi vai trò"
                    />
                  </Grid>
                </Grid>

                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large" 
                  startIcon={<Save />}
                  disabled={saving}
                  sx={{ alignSelf: 'flex-start', mt: 1 }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <VpnKey color="primary" /> Bảo mật
              </Typography>

              <Button 
                variant="outlined" 
                color="primary"
                onClick={handlePasswordReset}
              >
                Đổi mật khẩu
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
