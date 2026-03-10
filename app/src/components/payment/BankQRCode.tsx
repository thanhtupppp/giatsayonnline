import { Box, Typography, Paper } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency, removeVietnameseTones } from '../../utils/constants';

interface BankQRCodeProps {
  maNganHang?: string; // BIN for VietQR
  tenNganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  soTien: number;
  maDonHang: string;
}

/**
 * Yêu Cầu 17: Generate bank transfer QR code
 * Uses VietQR-style format: bank info + amount + order reference
 * Customer scans with banking app → staff confirms manually
 */
export default function BankQRCode({ maNganHang, tenNganHang, soTaiKhoan, chuTaiKhoan, soTien, maDonHang }: BankQRCodeProps) {
  // Generate VietQR URL if BIN is available (Napas247 strictly requires ascii uppercase for accountName and addInfo)
  const safeAccountName = encodeURIComponent(removeVietnameseTones(chuTaiKhoan));
  const safeAddInfo = encodeURIComponent(removeVietnameseTones(maDonHang));
  
  const qrUrl = maNganHang 
    ? `https://img.vietqr.io/image/${maNganHang}-${soTaiKhoan}-compact.png?amount=${soTien}&addInfo=${safeAddInfo}&accountName=${safeAccountName}`
    : '';

  // Fallback text QR Code for older configs without maNganHang (BIN)
  const qrContent = [
    `Ngan hang: ${tenNganHang}`,
    `STK: ${soTaiKhoan}`,
    `Chu TK: ${chuTaiKhoan}`,
    `So tien: ${soTien}`,
    `Noi dung: ${maDonHang}`,
  ].join('\n');

  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Quét mã để chuyển khoản
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        {qrUrl ? (
          <img src={qrUrl} alt="VietQR" style={{ width: 220, borderRadius: 8, objectFit: 'contain' }} />
        ) : (
          <QRCodeSVG
            value={qrContent}
            size={180}
            level="M"
            includeMargin
            style={{ borderRadius: 8 }}
          />
        )}
      </Box>

      <Box sx={{ textAlign: 'left', bgcolor: 'grey.50', borderRadius: 2, p: 1.5, fontSize: '0.85rem' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Ngân hàng:</Typography>
          <Typography variant="caption" fontWeight={600}>{tenNganHang}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Số TK:</Typography>
          <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{soTaiKhoan}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Chủ TK:</Typography>
          <Typography variant="caption" fontWeight={600}>{chuTaiKhoan}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Số tiền:</Typography>
          <Typography variant="caption" fontWeight={700} color="primary">{formatCurrency(soTien)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">Nội dung CK:</Typography>
          <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{maDonHang}</Typography>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Khách hàng quét QR bằng app ngân hàng → Nhân viên bấm "Xác nhận" sau khi nhận tiền
      </Typography>
    </Paper>
  );
}
