import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Box, IconButton, Dialog, DialogTitle, DialogContent, Typography,
} from '@mui/material';
import { Close, CameraAlt, FlipCameraAndroid } from '@mui/icons-material';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export default function BarcodeScanner({ open, onClose, onScan, title = 'Quét mã barcode' }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Keep refs up to date without re-triggering useEffect
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    setError('');
    let cancelled = false;
    let running = false;
    const scannerId = '__barcode-scanner-region';

    const startScanner = async () => {
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;

      const el = document.getElementById(scannerId);
      if (!el || cancelled) return;

      try {
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          { fps: 10, qrbox: { width: 280, height: 150 } },
          (decodedText) => {
            if (cancelled) return;
            cancelled = true; // Prevent duplicate scans

            if (navigator.vibrate) navigator.vibrate(200);

            // Stop scanner, then notify parent
            (async () => {
              running = false;
              try { await scanner.stop(); } catch {}
              try { scanner.clear(); } catch {}
              scannerRef.current = null;

              // Delay to let DOM settle
              setTimeout(() => {
                onScanRef.current(decodedText);
                onCloseRef.current();
              }, 300);
            })();
          },
          () => {} // Ignore continuous failures
        );

        if (!cancelled) {
          running = true;
        } else {
          try { await scanner.stop(); } catch {}
          try { scanner.clear(); } catch {}
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message?.includes('Permission')
              ? 'Vui lòng cho phép truy cập camera để quét mã'
              : 'Không thể mở camera. Vui lòng thử lại.'
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (running && scannerRef.current) {
        running = false;
        const s = scannerRef.current;
        scannerRef.current = null;
        (async () => {
          try { await s.stop(); } catch {}
          try { s.clear(); } catch {}
        })();
      }
    };
  }, [open, facingMode]); // NO onScan/onClose — use refs instead

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleClose = () => {
    onCloseRef.current();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        bgcolor: 'primary.main', color: 'white', py: 1.5,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraAlt />
          <Typography fontWeight={700}>{title}</Typography>
        </Box>
        <Box>
          <IconButton onClick={handleFlipCamera} size="small" sx={{ color: 'white', mr: 0.5 }}
            title="Đổi camera">
            <FlipCameraAndroid />
          </IconButton>
          <IconButton onClick={handleClose} size="small" sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: '#000' }}>
        {error ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'white' }}>
            <CameraAlt sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography color="error.light" fontWeight={600}>{error}</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'grey.400' }}>
              Kiểm tra quyền camera trong cài đặt trình duyệt
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <div id="__barcode-scanner-region" style={{ width: '100%', minHeight: 300 }} />
            <Typography variant="caption" sx={{
              position: 'absolute', bottom: 8, left: 0, right: 0,
              textAlign: 'center', color: 'white', bgcolor: 'rgba(0,0,0,0.5)',
              py: 0.5, fontSize: '0.75rem',
            }}>
              Hướng camera vào mã barcode
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
