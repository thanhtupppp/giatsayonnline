import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Chip, IconButton, Paper, Divider, CircularProgress,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Collapse, Badge, List, ListItemButton, ListItemText,
} from '@mui/material';
import {
  Search, Add, Remove, ShoppingCart, Delete, Payment,
  LocalLaundryService, Print, PersonAdd, Cancel, ExpandMore,
  ExpandLess, Receipt, AttachMoney, AccountBalance, CreditCard,
  PhoneAndroid, ArrowBack, CheckCircle, LocalShipping,
  QrCodeScanner, CameraAlt, SwapHoriz, Person,
  ChevronLeft, ChevronRight,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dichVuService } from '../../services/dichVuService';
import { khachHangService } from '../../services/khachHangService';
import { donHangService } from '../../services/donHangService';
import { giaoDichService } from '../../services/giaoDichService';
import { cauHinhService } from '../../services/cauHinhService';
import type { DichVu, KhachHang, ChiTietDichVu } from '../../types';
import { CheDoTaoDonHang, LoaiTinhGia, PhuongThucThanhToan, TrangThaiDonHang } from '../../types';
import { formatCurrency, TRANG_THAI_LABELS, TRANG_THAI_COLORS } from '../../utils/constants';
import { logError, getUserMessage } from '../../utils/errorHandler';
import { printService } from '../../services/printService';

import BarcodeScanner from '../../components/scanner/BarcodeScanner';
import BankQRCode from '../../components/payment/BankQRCode';
import type { DonHang } from '../../types';

interface CartItem extends ChiTietDichVu {
  dichVu: DichVu;
}

export default function POSPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const maCuaHang = userProfile?.maCuaHang || '';
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const lookupInputRef = useRef<HTMLInputElement>(null);

  // POS Tabs: 0=Tạo đơn, 1=Giặt xong, 2=Trả đồ
  const [posTab, setPosTab] = useState(0);

  // State
  const [dichVus, setDichVus] = useState<DichVu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [customer, setCustomer] = useState<KhachHang | null>(null);
  const [allCustomers, setAllCustomers] = useState<KhachHang[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Order mode
  const [cheDoTaoDon, setCheDoTaoDon] = useState<CheDoTaoDonHang>(CheDoTaoDonHang.CHON_DICH_VU_TRUOC);


  // Quick create customer
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Print receipt
  const [printOpen, setPrintOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<DonHang | null>(null);


  // TC 12-14: Payment flow
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PhuongThucThanhToan.TIEN_MAT);
  const [paying, setPaying] = useState(false);

  // TC 20: Recent orders
  const [recentOrders, setRecentOrders] = useState<DonHang[]>([]);
  const [recentExpanded, setRecentExpanded] = useState(false);

  // TC 21: Today's stats
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });

  // Badge counts & lists: pending wash & pending return
  const [pendingWashCount, setPendingWashCount] = useState(0);
  const [pendingWashOrders, setPendingWashOrders] = useState<DonHang[]>([]);
  const [pendingReturnCount, setPendingReturnCount] = useState(0);
  const [pendingReturnOrders, setPendingReturnOrders] = useState<DonHang[]>([]);

  // TC 25: Cancel confirmation
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // YC 17: Bank info for QR payment
  const [bankInfo, setBankInfo] = useState<{ maNganHang: string; tenNganHang: string; soTaiKhoan: string; chuTaiKhoan: string } | null>(null);

  // Tab 1+2: Order lookup
  const [lookupCode, setLookupCode] = useState('');
  const [lookupOrder, setLookupOrder] = useState<DonHang | null>(null);
  const [lookupCustomer, setLookupCustomer] = useState<KhachHang | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Customer name search mode (fallback when scanner unavailable)
  const [customerSearchMode, setCustomerSearchMode] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [customerPendingOrders, setCustomerPendingOrders] = useState<DonHang[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Tab 1: Mode 2 add services
  const [addServiceCart, setAddServiceCart] = useState<CartItem[]>([]);

  // ---- REMOTE PRINTING STATE ----
  // Removed remote printing state variables as they are unused and the logic is disabled.

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [services, config] = await Promise.all([
          dichVuService.getByMaCuaHang(maCuaHang, true),
          cauHinhService.get(maCuaHang),
        ]);
        setDichVus(services);
        if (config) {

          if (config.cheDoTaoDonHang) {
            setCheDoTaoDon(config.cheDoTaoDonHang);
          }
        }
        // YC 17: Store bank info for QR
        if (config?.thongTinThanhToan) {
          setBankInfo(config.thongTinThanhToan);
        }
      } catch (err) {
        logError(err, 'POSPage.loadData');
        toast.error(getUserMessage(err));
      }

      // Load customers separately — must not fail together with services
      try {
        const customers = await khachHangService.getByMaCuaHang(maCuaHang);
        console.log('[POS] Loaded customers for autocomplete:', customers.length);
        setAllCustomers(customers);
      } catch (err) {
        console.error('[POS] Failed to load customers:', err);
      }

      setLoading(false);
    };
    load();
  }, []);

  // Real-time listener for orders — auto-sync badge counts, recent orders, today stats
  useEffect(() => {
    if (!maCuaHang) return;
    const unsubscribe = donHangService.listenByMaCuaHang(maCuaHang, (orders) => {
      updateStatsFromOrders(orders);
    });
    return () => unsubscribe();
  }, [maCuaHang]);

  // ---- REMOTE PRINTING LOGIC (DISABLED FOR STANDALONE SERVER) ----
  // 1. PC listens to print queue 
  // Disable in browser so that the Node.js zero-UI print server handles this
  /*
  useEffect(() => {
    if (isMobile || !maCuaHang) return; // Mobile pushes to queue; PC listens

    const unsubscribe = printService.listenForPrintJobs(maCuaHang, (job) => {
      setRemotePrintQueue(prev => [...prev, job]);
      toast(`Nhận lệnh in đơn: ${job.maDonHang}`, { icon: '🖨️' });
    });
    return () => unsubscribe();
  }, [maCuaHang, isMobile]);

  // 2. Process queue sequentially
  useEffect(() => {
    if (remotePrintQueue.length === 0 || remotePrintingJob) return;

    const processJob = async () => {
      const job = remotePrintQueue[0];
      setRemotePrintingJob(job);
      try {
        const order = await donHangService.getByMaDonHang(job.maDonHang);
        if (order) {
          const cust = await khachHangService.getById(order.maKhachHang);
          setRemotePrintingCustomer(cust);
          setRemotePrintingOrder(order);
          // DOM will render the hidden bills, next useEffect triggers print
        } else {
          finishRemoteJob(job.id);
        }
      } catch (err) {
        logError(err, 'POSPage.processRemotePrintJob');
        finishRemoteJob(job.id);
      }
    };
    processJob();
  }, [remotePrintQueue, remotePrintingJob]);

  // 3. Trigger printing once DOM renders the bills
  useEffect(() => {
    if (remotePrintingOrder && remotePrintingJob) {
      const timer = setTimeout(() => {
        const receiptEl = document.getElementById('remote-print-receipt-area');
        const tagEl = document.getElementById('remote-print-tag-area');
        if (receiptEl) {
          const tagHtml = tagEl ? tagEl.innerHTML.trim() : '';
          if (tagHtml) {
            silentPrintMultiple([
              { html: receiptEl.innerHTML, title: \`Phiếu tiếp nhận (\${remotePrintingOrder.maDonHang})\` },
              { html: tagHtml, title: 'Tag dán đồ' },
            ]);
          } else {
            silentPrint(receiptEl.innerHTML);
          }
        }
        finishRemoteJob(remotePrintingJob.id);
      }, 500); // 500ms for React/MUI to fully render the hidden DOM wrapper
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remotePrintingOrder]);

  const finishRemoteJob = async (jobId: string) => {
    await printService.markPrinted(jobId);
    setRemotePrintQueue(prev => prev.filter(j => j.id !== jobId));
    setRemotePrintingJob(null);
    setRemotePrintingOrder(null);
    setRemotePrintingCustomer(null);
  };
  */
  // -------------------------------
  // -------------------------------

  // TC 20+21: Update stats from orders array (pure calculation, used by real-time listener)
  const updateStatsFromOrders = (orders: DonHang[]) => {
    setRecentOrders(orders.slice(0, 5));

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => {
      const orderDate = o.ngayTao?.toDate ? o.ngayTao.toDate() : new Date(0);
      return orderDate >= today;
    });
    setTodayStats({
      count: todayOrders.length,
      revenue: todayOrders.reduce((sum, o) => sum + o.tienDaTra, 0),
    });

    // Badge counts and lists
    const washStatuses = [
      TrangThaiDonHang.CHO_XU_LY, TrangThaiDonHang.CHO_CAN_KY,
      TrangThaiDonHang.DANG_GIAT, TrangThaiDonHang.DANG_SAY, TrangThaiDonHang.DANG_UI,
    ];
    const washOrders = orders.filter((o) => washStatuses.includes(o.trangThai));
    setPendingWashCount(washOrders.length);
    setPendingWashOrders(washOrders);

    const returnOrders = orders.filter((o) => o.trangThai === TrangThaiDonHang.HOAN_THANH);
    setPendingReturnCount(returnOrders.length);
    setPendingReturnOrders(returnOrders);
  };

  // UI scroll helper for POS machines where swiping is difficult
  const handleScroll = (e: React.MouseEvent, direction: 'left' | 'right') => {
    const container = (e.currentTarget.closest('.scroll-wrapper') as HTMLElement)?.querySelector('.order-scroll-container');
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -250 : 250, behavior: 'smooth' });
    }
  };

  // Helper: switch tab and auto-focus the relevant input
  const switchTab = useCallback((tab: number) => {
    setPosTab(tab);
    if (tab !== 0) {
      setLookupOrder(null);
      setLookupCode('');
      setLookupCustomer(null);
      // Reset customer search state
      setCustomerSearchMode(false);
      setCustomerSearchText('');
      setCustomerPendingOrders([]);
      setShowCustomerSuggestions(false);
    }
    // Auto-focus the relevant input after React re-renders
    setTimeout(() => {
      if (tab === 0) {
        phoneInputRef.current?.focus();
      } else {
        lookupInputRef.current?.focus();
      }
    }, 100);
  }, []);

  // TC 19: Consolidated keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape from any input to blur
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
          e.preventDefault();
          return;
        }
        // F1/F2/F3 should work even from within an input
        if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
          e.preventDefault();
          const tab = e.key === 'F1' ? 0 : e.key === 'F2' ? 1 : 2;
          switchTab(tab);
          return;
        }
        // Other shortcuts should not fire from within inputs
        return;
      }
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          switchTab(0);
          break;
        case 'F2':
          e.preventDefault();
          switchTab(1);
          break;
        case 'F3':
          e.preventDefault();
          switchTab(2);
          break;
        case 'F4':
          e.preventDefault();
          if (customer && (isMode2 || cart.length > 0)) handleCreateOrder();
          break;
        case 'F8':
          e.preventDefault();
          if (printOpen) handlePrint();
          break;
        case 'Escape':
          e.preventDefault();
          if (paymentOpen) setPaymentOpen(false);
          else if (printOpen) setPrintOpen(false);
          else if (cart.length > 0 || customer) setCancelConfirmOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customer, cart, printOpen, paymentOpen, switchTab]);

  // Vietnamese accent-insensitive search helper
  const removeAccents = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

  // Customer autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!searchText.trim() || customer) return [];
    const s = removeAccents(searchText.trim().toLowerCase());
    return allCustomers.filter(
      (kh) => removeAccents(kh.hoTen.toLowerCase()).includes(s) || kh.soDienThoai.includes(searchText.trim())
    ).slice(0, 8);
  }, [searchText, allCustomers, customer]);

  const selectCustomer = (kh: KhachHang) => {
    setCustomer(kh);
    setSearchText(kh.hoTen);
    setShowSuggestions(false);
    toast.success(`Đã chọn: ${kh.hoTen}`);
  };

  const openQuickCreate = () => {
    // Pre-fill: if searchText looks like a phone number, put it in phone field
    const isPhone = /^[0-9]+$/.test(searchText.trim());
    setNewCustomerPhone(isPhone ? searchText.trim() : '');
    setNewCustomerName(isPhone ? '' : searchText.trim());
    setCreateCustomerOpen(true);
    setShowSuggestions(false);
  };

  // Quick-create customer
  const handleQuickCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Vui lòng nhập tên khách hàng');
      return;
    }
    if (!newCustomerPhone.trim() || !/^[0-9]{10,11}$/.test(newCustomerPhone.trim())) {
      toast.error('Số điện thoại phải có 10-11 chữ số');
      return;
    }
    try {
      const id = await khachHangService.create({
        hoTen: newCustomerName.trim(),
        soDienThoai: newCustomerPhone.trim(),
        maCuaHang,
      });
      const newCust = await khachHangService.getById(id);
      if (newCust) {
        setCustomer(newCust);
        setSearchText(newCust.hoTen);
        setAllCustomers([...allCustomers, newCust]);
        toast.success(`Tạo khách hàng: ${newCustomerName} 🎉`);
      }
      setCreateCustomerOpen(false);
    } catch (err) {
      logError(err, 'POSPage.handleQuickCreateCustomer');
      toast.error(getUserMessage(err));
    }
  };

  // Cart operations
  const addToCart = (dv: DichVu) => {
    try {
      if (!dv.trangThai) {
        const similar = dichVus.filter(
          (d) => d.maDichVu !== dv.maDichVu && d.trangThai && d.loaiTinhGia === dv.loaiTinhGia
        );
        const suggestion = similar.length > 0
          ? `\nDịch vụ tương tự: ${similar.slice(0, 3).map((d) => d.tenDichVu).join(', ')}`
          : '';
        toast.error(
          `Dịch vụ "${dv.tenDichVu}" đã ngừng hoạt động.${suggestion}`,
          { duration: 5000 }
        );
        return;
      }

      const existing = cart.find((item) => item.maDichVu === dv.maDichVu);
      if (existing) {
        setCart(cart.map((item) =>
          item.maDichVu === dv.maDichVu
            ? {
                ...item,
                soLuong: item.soLuong + 1,
                trongLuong: dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? item.trongLuong + 1 : item.trongLuong,
                thanhTien: dichVuService.tinhGia(dv, item.soLuong + 1, dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? item.trongLuong + 1 : item.trongLuong),
              }
            : item
        ));
      } else {
        const newItem: CartItem = {
          maDichVu: dv.maDichVu,
          tenDichVu: dv.tenDichVu,
          soLuong: 1,
          trongLuong: dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? 1 : 0,
          donGia: dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? dv.giaTheoKg : dv.giaTheoSoLuong,
          thanhTien: dichVuService.tinhGia(dv, 1, 1),
          dichVu: dv,
        };
        setCart([...cart, newItem]);
      }
    } catch (err: any) {
      logError(err, 'POSPage.addToCart', { maDichVu: dv.maDichVu });
      toast.error(getUserMessage(err));
    }
  };

  const updateQuantity = (maDichVu: string, delta: number) => {
    try {
      setCart(cart.map((item) => {
        if (item.maDichVu !== maDichVu) return item;
        const newQty = Math.max(0, item.soLuong + delta);
        const newWeight = item.dichVu.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG
          ? Math.max(0, item.trongLuong + delta) : item.trongLuong;
        return { ...item, soLuong: newQty, trongLuong: newWeight, thanhTien: dichVuService.tinhGia(item.dichVu, newQty, newWeight) };
      }).filter((item) => item.soLuong > 0));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateWeight = (maDichVu: string, weight: number) => {
    try {
      setCart(cart.map((item) => {
        if (item.maDichVu !== maDichVu) return item;
        return { ...item, trongLuong: weight, thanhTien: dichVuService.tinhGia(item.dichVu, item.soLuong, weight) };
      }));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.thanhTien, 0);
  const isMode2 = cheDoTaoDon === CheDoTaoDonHang.CHON_DICH_VU_SAU;

  // Create order → show payment
  const handleCreateOrder = async () => {
    if (!customer) {
      toast.error('Vui lòng chọn khách hàng trước');
      return;
    }
    if (!isMode2 && cart.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 dịch vụ');
      return;
    }

    setCreating(true);
    try {
      const services: ChiTietDichVu[] = isMode2 ? [] : cart.map(({ dichVu, ...rest }) => rest);
      const orderId = await donHangService.create({
        maCuaHang,
        maKhachHang: customer.maKhachHang,
        maNhanVien: userProfile?.uid || '',
        danhSachDichVu: services,
        cheDoTaoDonHang: cheDoTaoDon,
      });

      const order = await donHangService.getById(orderId);
      if (order) {
        setCreatedOrder(order);
        
        // Auto-print immediately without dialog
        try {
          const jobId = await printService.requestPrint(maCuaHang, order.maDonHang, userProfile?.hoTen || 'NV', 'TAO_MOI');
          toast.loading('🖨 Đang gửi lệnh in...', { id: `print-${jobId}` });
          
          const unsubscribe = printService.listenForPrintStatus(jobId, (status, errorMsg) => {
            if (status === 'PRINTING') {
              toast.loading('🖨 Đang in...', { id: `print-${jobId}` });
            } else if (status === 'SUCCESS') {
              toast.success(`✅ In thành công đơn ${order.maDonHang}`, { id: `print-${jobId}` });
              unsubscribe();
            } else if (status === 'FAILED') {
              toast.error(`❌ Lỗi in: ${errorMsg || 'Không xác định'}`, { id: `print-${jobId}`, duration: 5000 });
              unsubscribe();
            }
          });
          setTimeout(() => unsubscribe(), 30000);
        } catch (err) {
          toast.error('Lỗi khi tự động gửi lệnh in');
        }
      }

      toast.success(isMode2 ? 'Tạo phiếu hẹn thành công! 🎫' : 'Tạo đơn hàng thành công! 🎉');
      setCart([]);
      setCustomer(null);
      setSearchText('');
      // Refresh stats
      // Stats auto-updated by real-time listener
    } catch (err) {
      logError(err, 'POSPage.handleCreateOrder');
      toast.error(getUserMessage(err));
    }
    setCreating(false);
  };

  // TC 12-14: Process payment
  const handlePayment = async () => {
    if (!createdOrder) return;
    const amount = Number(paymentAmount);
    if (amount <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán');
      return;
    }

    setPaying(true);
    try {
      const soTienThanhToan = Math.min(amount, createdOrder.tienConLai);
      await giaoDichService.processPayment({
        maDonHang: createdOrder.maDonHang,
        maCuaHang,
        maKhachHang: createdOrder.maKhachHang,
        soTien: soTienThanhToan,
        phuongThucThanhToan: paymentMethod,
        maNhanVien: userProfile?.uid || '',
      });

      // Refresh order
      const updated = await donHangService.getById(createdOrder.maDonHang);
      if (updated) setCreatedOrder(updated);

      toast.success(`Thanh toán ${formatCurrency(soTienThanhToan)} thành công!`);
      setPaymentOpen(false);
      setPrintOpen(true);
      // Stats auto-updated by real-time listener
    } catch (err) {
      logError(err, 'POSPage.handlePayment');
      toast.error(getUserMessage(err));
    }
    setPaying(false);
  };

  // TC 13: Change calculation
  const changeAmount = (() => {
    if (!createdOrder || !paymentAmount) return 0;
    const paid = Number(paymentAmount);
    return Math.max(0, paid - createdOrder.tienConLai);
  })();

  // TC 25: Cancel/Reset
  const handleCancelOrder = () => {
    setCart([]);
    setCustomer(null);
    setSearchText('');
    setPaymentOpen(false);
    setPrintOpen(false);
    setCreatedOrder(null);
    setCancelConfirmOpen(false);
    toast('Đã hủy đơn hàng', { icon: '🗑️' });
  };

  // Print handler — directly requests print server
  const handlePrint = async () => {
    if (!createdOrder) return;
    try {
      const jobId = await printService.requestPrint(maCuaHang, createdOrder.maDonHang, userProfile?.hoTen || 'NV', 'TAO_MOI');
      toast.loading('🖨 Đang gửi lệnh in...', { id: `print-${jobId}` });
      setPrintOpen(false);

      // Listen for realtime print status from print-server
      const unsubscribe = printService.listenForPrintStatus(jobId, (status, errorMsg) => {
        if (status === 'PRINTING') {
          toast.loading('🖨 Đang in...', { id: `print-${jobId}` });
        } else if (status === 'SUCCESS') {
          toast.success(`✅ In thành công đơn ${createdOrder.maDonHang}`, { id: `print-${jobId}` });
          unsubscribe();
        } else if (status === 'FAILED') {
          toast.error(`❌ Lỗi in: ${errorMsg || 'Không xác định'}`, { id: `print-${jobId}`, duration: 5000 });
          unsubscribe();
        }
      });

      // Auto-cleanup after 30s to prevent memory leak
      setTimeout(() => unsubscribe(), 30000);
    } catch (err) {
      toast.error('Lỗi khi gửi lệnh in');
    }
  };

  // TC 12: Numpad handler
  const handleNumpadClick = (val: string) => {
    if (val === 'C') {
      setPaymentAmount('');
    } else if (val === '⌫') {
      setPaymentAmount((prev) => prev.slice(0, -1));
    } else {
      setPaymentAmount((prev) => prev + val);
    }
  };

  // Tab 1+2: Lookup order by maDonHang
  const handleLookupOrder = async () => {
    if (!lookupCode.trim()) {
      toast.error('Vui lòng nhập mã đơn hàng');
      return;
    }
    setLookupLoading(true);
    try {
      const order = await donHangService.getByMaDonHang(lookupCode.trim());
      if (!order) {
        toast.error('Không tìm thấy đơn hàng');
        setLookupOrder(null);
        setLookupCustomer(null);
        setLookupLoading(false);
        return;
      }
      setLookupOrder(order);
      // Load customer info
      const kh = await khachHangService.getById(order.maKhachHang);
      setLookupCustomer(kh);
      // Pre-populate service cart for Mode 2 if empty
      if (order.danhSachDichVu.length === 0) {
        setAddServiceCart([]);
      }
    } catch (err) {
      logError(err, 'POSPage.handleLookupOrder');
      toast.error(getUserMessage(err));
    }
    setLookupLoading(false);
  };

  // Tab 1: Mark laundry done (HOAN_THANH)
  const handleMarkDone = async () => {
    if (!lookupOrder) return;
    try {
      // For Mode 2 with added services, update the order first
      if (lookupOrder.danhSachDichVu.length === 0 && addServiceCart.length > 0) {
        const services: ChiTietDichVu[] = addServiceCart.map(({ dichVu, ...rest }) => rest);
        await donHangService.capNhatDichVuSauCanKy(
          lookupOrder.maDonHang,
          services,
          userProfile?.uid || ''
        );
      }
      await donHangService.updateStatus(
        lookupOrder.maDonHang,
        TrangThaiDonHang.HOAN_THANH,
        userProfile?.uid || '',
        'Giặt xong — POS'
      );
      toast.success('Đã báo giặt xong! ✅');
      // Refresh
      const updated = await donHangService.getById(lookupOrder.maDonHang);
      setLookupOrder(updated);
      setAddServiceCart([]);
      // Stats auto-updated by real-time listener
    } catch (err) {
      logError(err, 'POSPage.handleMarkDone');
      toast.error(getUserMessage(err));
    }
  };

  // Tab 2: Return clothes (DA_GIAO) — auto-pay remaining balance + mark returned in one step
  const handleReturnClothes = async () => {
    if (!lookupOrder) return;
    setPaying(true);
    try {
      // Step 1: Auto-pay remaining balance if any
      if (lookupOrder.tienConLai > 0) {
        const isBankTransfer = paymentMethod === PhuongThucThanhToan.CHUYEN_KHOAN;
        const amount = isBankTransfer ? lookupOrder.tienConLai : Number(paymentAmount);
        const soTienThanhToan = amount > 0 ? Math.min(amount, lookupOrder.tienConLai) : lookupOrder.tienConLai;

        await giaoDichService.processPayment({
          maDonHang: lookupOrder.maDonHang,
          maCuaHang,
          maKhachHang: lookupOrder.maKhachHang,
          soTien: soTienThanhToan,
          phuongThucThanhToan: paymentMethod,
          maNhanVien: userProfile?.uid || '',
        });
        toast.success(`Thanh toán ${formatCurrency(soTienThanhToan)} thành công!`);
      }

      // Step 2: Mark as returned
      await donHangService.updateStatus(
        lookupOrder.maDonHang,
        TrangThaiDonHang.DA_GIAO,
        userProfile?.uid || '',
        'Thanh toán & Trả đồ cho KH — POS'
      );
      toast.success('Đã trả đồ cho khách hàng! 🎉');
      const updated = await donHangService.getById(lookupOrder.maDonHang);
      setLookupOrder(updated);
      setPaymentAmount('');
      // Stats auto-updated by real-time listener
    } catch (err) {
      logError(err, 'POSPage.handleReturnClothes');
      toast.error(getUserMessage(err));
    }
    setPaying(false);
  };

  // Add service to Mode 2 order
  const addToServiceCart = (dv: DichVu) => {
    const existing = addServiceCart.find((item) => item.maDichVu === dv.maDichVu);
    if (existing) {
      setAddServiceCart(addServiceCart.map((item) =>
        item.maDichVu === dv.maDichVu
          ? {
              ...item,
              soLuong: item.soLuong + 1,
              trongLuong: dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? item.trongLuong + 1 : item.trongLuong,
              thanhTien: dichVuService.tinhGia(dv, item.soLuong + 1, dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? item.trongLuong + 1 : item.trongLuong),
            }
          : item
      ));
    } else {
      setAddServiceCart([...addServiceCart, {
        maDichVu: dv.maDichVu,
        tenDichVu: dv.tenDichVu,
        soLuong: 1,
        trongLuong: dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? 1 : 0,
        donGia: dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? dv.giaTheoKg : dv.giaTheoSoLuong,
        thanhTien: dichVuService.tinhGia(dv, 1, 1),
        dichVu: dv,
      }]);
    }
  };

  // Helper: Order lookup UI (shared between tab 1 & 2)
  const [cameraScanOpen, setCameraScanOpen] = useState(false);

  const handleCameraScan = (code: string) => {
    const trimmedCode = code.trim();
    setLookupCode(trimmedCode);
    setCameraScanOpen(false);
    // Auto-lookup after scanning — use same method as manual lookup
    setTimeout(() => {
      (async () => {
        setLookupLoading(true);
        try {
          const order = await donHangService.getByMaDonHang(trimmedCode);
          if (!order) {
            toast.error('Không tìm thấy đơn hàng');
            setLookupOrder(null);
            setLookupCustomer(null);
          } else {
            setLookupOrder(order);
            const kh = await khachHangService.getById(order.maKhachHang);
            setLookupCustomer(kh);
            if (order.danhSachDichVu.length === 0) {
              setAddServiceCart([]);
            }
            toast.success('Đã tìm thấy đơn hàng!');
          }
        } catch (err) {
          logError(err, 'POSPage.handleCameraScan');
          toast.error(getUserMessage(err));
        }
        setLookupLoading(false);
      })();
    }, 100);
  };

  // Customer name search: filter allCustomers by name
  const customerSuggestions = useMemo(() => {
    if (!customerSearchText.trim()) return [];
    const s = removeAccents(customerSearchText.trim().toLowerCase());
    return allCustomers.filter(
      (kh) => removeAccents(kh.hoTen.toLowerCase()).includes(s) || kh.soDienThoai.includes(customerSearchText.trim())
    ).slice(0, 8);
  }, [customerSearchText, allCustomers]);

  // When user selects a customer from suggestions → load their pending orders
  const handleSelectCustomerForLookup = async (kh: KhachHang) => {
    setCustomerSearchText(kh.hoTen);
    setShowCustomerSuggestions(false);
    setLookupLoading(true);
    try {
      const orders = await donHangService.getByKhachHang(kh.maKhachHang);
      // Filter: only show orders NOT yet returned (DA_GIAO) and NOT cancelled (DA_HUY)
      const pending = orders.filter(
        (o) => o.trangThai !== TrangThaiDonHang.DA_GIAO && o.trangThai !== TrangThaiDonHang.DA_HUY
      );
      setCustomerPendingOrders(pending);
      if (pending.length === 0) {
        toast('Khách hàng này không có đơn chưa hoàn thành', { icon: 'ℹ️' });
      } else if (pending.length === 1) {
        // Auto-select if only 1 pending order
        setLookupOrder(pending[0]);
        setLookupCustomer(kh);
        setLookupCode(pending[0].maDonHang);
        if (pending[0].danhSachDichVu.length === 0) setAddServiceCart([]);
        toast.success(`Đã chọn đơn ${pending[0].maDonHang}`);
      } else {
        toast.success(`Tìm thấy ${pending.length} đơn chưa hoàn thành`);
      }
    } catch (err) {
      logError(err, 'POSPage.handleSelectCustomerForLookup');
      toast.error(getUserMessage(err));
    }
    setLookupLoading(false);
  };

  // When user clicks on a pending order from the list
  const handleSelectPendingOrder = async (order: DonHang) => {
    setLookupOrder(order);
    setLookupCode(order.maDonHang);
    const kh = await khachHangService.getById(order.maKhachHang);
    setLookupCustomer(kh);
    if (order.danhSachDichVu.length === 0) setAddServiceCart([]);
    setCustomerPendingOrders([]);
    toast.success(`Đã chọn đơn ${order.maDonHang}`);
  };

  const renderOrderLookup = () => (
    <Card sx={{ mb: 2, overflow: 'visible' }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 }, overflow: 'visible' }}>
        {/* Header with toggle button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {customerSearchMode
              ? <><Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />Tìm đơn theo tên khách hàng</>
              : <><QrCodeScanner sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />Quét barcode hoặc nhập mã đơn hàng</>
            }
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SwapHoriz />}
            onClick={() => {
              setCustomerSearchMode(!customerSearchMode);
              setCustomerSearchText('');
              setCustomerPendingOrders([]);
              setShowCustomerSuggestions(false);
              setLookupOrder(null);
              setLookupCustomer(null);
              setLookupCode('');
            }}
            sx={{
              textTransform: 'none', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              borderRadius: 2, px: 1.5, py: 0.5,
              borderWidth: 2,
              ...(customerSearchMode
                ? {
                    borderColor: '#1565c0', color: '#1565c0',
                    bgcolor: 'rgba(21,101,192,0.08)',
                    '&:hover': { bgcolor: 'rgba(21,101,192,0.16)', borderWidth: 2 },
                  }
                : {
                    borderColor: '#e65100', color: '#e65100',
                    bgcolor: 'rgba(230,81,0,0.08)',
                    '&:hover': { bgcolor: 'rgba(230,81,0,0.16)', borderWidth: 2 },
                  }
              ),
            }}
          >
            {customerSearchMode ? '🔢 Nhập mã đơn' : '👤 Tìm theo tên KH'}
          </Button>
        </Box>

        {customerSearchMode ? (
          /* ===== CUSTOMER NAME SEARCH MODE ===== */
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                inputRef={lookupInputRef}
                size="small" fullWidth
                placeholder="Nhập tên hoặc SĐT khách hàng..."
                value={customerSearchText}
                onChange={(e) => {
                  setCustomerSearchText(e.target.value);
                  setShowCustomerSuggestions(true);
                  // Reset selected order when typing
                  setCustomerPendingOrders([]);
                  setLookupOrder(null);
                  setLookupCustomer(null);
                }}
                onFocus={() => setShowCustomerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
              />
            </Box>

            {/* Customer suggestions dropdown */}
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <Paper
                elevation={4}
                sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, mt: 0.5, maxHeight: 250, overflow: 'auto' }}
              >
                <List dense disablePadding>
                  {customerSuggestions.map((kh) => (
                    <ListItemButton
                      key={kh.maKhachHang}
                      onClick={() => handleSelectCustomerForLookup(kh)}
                      sx={{ py: 1 }}
                    >
                      <ListItemText
                        primary={kh.hoTen}
                        secondary={kh.soDienThoai}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )}

            {/* Loading indicator */}
            {lookupLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {/* Pending orders list */}
            {customerPendingOrders.length > 1 && !lookupOrder && (
              <Paper variant="outlined" sx={{ mt: 1.5, maxHeight: 300, overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5, pb: 0.5, color: 'text.secondary' }}>
                  📋 Chọn đơn hàng ({customerPendingOrders.length} đơn chưa hoàn thành):
                </Typography>
                <List dense disablePadding>
                  {customerPendingOrders.map((order) => (
                    <ListItemButton
                      key={order.maDonHang}
                      onClick={() => handleSelectPendingOrder(order)}
                      sx={{ py: 1, px: 2, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight={700}>{order.maDonHang}</Typography>
                            <Chip
                              label={TRANG_THAI_LABELS[order.trangThai]}
                              size="small"
                              sx={{ bgcolor: TRANG_THAI_COLORS[order.trangThai], color: 'white', fontWeight: 600, fontSize: 11, height: 22 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {order.ngayTao?.toDate ? order.ngayTao.toDate().toLocaleDateString('vi-VN') : ''}
                            </Typography>
                            <Typography variant="caption" fontWeight={600} color="primary">
                              {formatCurrency(order.tongTien)} {order.tienConLai > 0 && `(còn ${formatCurrency(order.tienConLai)})`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        ) : (
          /* ===== BARCODE / ORDER CODE MODE (original) ===== */
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              inputRef={lookupInputRef}
              size="small" fullWidth
              placeholder="Nhập mã đơn hàng..."
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLookupOrder(); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            />
            {/* Camera scan button — only on mobile (desktop has physical scanner) */}
            <IconButton
              onClick={() => setCameraScanOpen(true)}
              color="primary"
              title="Quét bằng camera"
              sx={{
                display: { xs: 'flex', md: 'none' },
                border: '1px solid', borderColor: 'primary.main',
                borderRadius: 2, minWidth: 48, minHeight: 48,
              }}
            >
              <CameraAlt />
            </IconButton>
            <Button variant="contained" onClick={handleLookupOrder}
              disabled={lookupLoading}
              sx={{ minWidth: 80, minHeight: 48 }}>
              {lookupLoading ? <CircularProgress size={20} /> : 'Tìm'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Helper: Order info card
  const renderOrderInfo = () => {
    if (!lookupOrder) return null;
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>{lookupOrder.maDonHang}</Typography>
            <Chip
              label={TRANG_THAI_LABELS[lookupOrder.trangThai]}
              sx={{ bgcolor: TRANG_THAI_COLORS[lookupOrder.trangThai], color: 'white', fontWeight: 600 }}
            />
          </Box>
          {lookupCustomer && (
            <Typography variant="body2" gutterBottom>
              👤 <strong>{lookupCustomer.hoTen}</strong> — {lookupCustomer.soDienThoai}
            </Typography>
          )}
          {lookupOrder.danhSachDichVu.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              {/* Scrollable service list — limits height to prevent pushing buttons off screen */}
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {lookupOrder.danhSachDichVu.map((dv, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{dv.tenDichVu} {dv.trongLuong > 0 ? `(${dv.trongLuong}kg)` : `x${dv.soLuong}`}</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(dv.thanhTien)}</Typography>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>Tổng cộng</Typography>
                <Typography fontWeight={700} color="primary">{formatCurrency(lookupOrder.tongTien)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Đã trả</Typography>
                <Typography variant="body2">{formatCurrency(lookupOrder.tienDaTra)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" fontWeight={600}>Còn lại</Typography>
                <Typography variant="body2" fontWeight={700} color="error">{formatCurrency(lookupOrder.tienConLai)}</Typography>
              </Box>
            </Box>
          ) : (
            <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>Chưa có dịch vụ — cần thêm dịch vụ trước khi báo giặt xong</Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // Keyboard shortcuts are now consolidated in the single useEffect above

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default', overflow: 'hidden', maxWidth: '100vw' }}>
      {/* POS Header — compact bar with back button */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: { xs: 1, sm: 2 }, py: 1, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0,
        overflow: 'hidden', minHeight: { xs: 48, sm: 56 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
          <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'text.secondary' }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main" noWrap>
            🧳 POS
          </Typography>
          <Chip label={userProfile?.hoTen || ''} size="small" variant="outlined"
            sx={{ ml: 0.5, display: { xs: 'none', sm: 'flex' }, maxWidth: 120 }} />
        </Box>
        {/* Stats — hidden on xs, shown on sm+ */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: 'primary.50', px: 1.5, py: 0.5, borderRadius: 2,
            border: '1px solid', borderColor: 'primary.100',
          }}>
            <Receipt sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={700} color="primary.main" noWrap>
              {todayStats.count} đơn
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: 'success.50', px: 1.5, py: 0.5, borderRadius: 2,
            border: '1px solid', borderColor: 'success.100',
          }}>
            <AttachMoney sx={{ fontSize: 18, color: 'success.main' }} />
            <Typography variant="body2" fontWeight={700} color="success.main" noWrap>
              {formatCurrency(todayStats.revenue)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* POS Step Buttons */}
      <Box sx={{
        display: 'flex', gap: { xs: 0.5, sm: 1.5 }, px: { xs: 0.5, sm: 2 }, py: { xs: 0.5, sm: 1.5 },
        bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', flexShrink: 0,
      }}>
        {/* Tạo đơn - Green (F1) */}
        <Button
          variant={posTab === 0 ? 'contained' : 'outlined'}
          onClick={() => switchTab(0)}
          startIcon={<Add sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          sx={{
            flex: 1, minHeight: { xs: 44, sm: 56 }, fontSize: { xs: 13, sm: 16 }, fontWeight: 700,
            textTransform: 'none', borderRadius: 3, px: { xs: 0.5, sm: 2 },
            ...(posTab === 0
              ? { bgcolor: '#2e7d32', color: 'white', boxShadow: '0 4px 12px rgba(46,125,50,0.4)', '&:hover': { bgcolor: '#1b5e20' } }
              : { borderColor: '#2e7d32', color: '#2e7d32', borderWidth: 2, '&:hover': { bgcolor: '#e8f5e9', borderWidth: 2 } }
            ),
          }}
        >
          Tạo đơn
          <Typography component="span" sx={{ ml: 0.5, fontSize: 11, opacity: 0.7, display: { xs: 'none', sm: 'inline' } }}>(F1)</Typography>
        </Button>
        {/* Giặt xong - Orange + Badge */}
        <Badge
          badgeContent={pendingWashCount}
          color="error"
          max={99}
          sx={{
            flex: 1,
            '& .MuiBadge-badge': {
              fontSize: { xs: 11, sm: 14 }, fontWeight: 700,
              minWidth: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 12,
              top: 4, right: { xs: 4, sm: 8 }, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            },
          }}
        >
          <Button
            variant={posTab === 1 ? 'contained' : 'outlined'}
            onClick={() => switchTab(1)}
            startIcon={<CheckCircle sx={{ fontSize: { xs: 20, sm: 24 } }} />}
            fullWidth
            sx={{
              minHeight: { xs: 44, sm: 56 }, fontSize: { xs: 13, sm: 16 }, fontWeight: 700,
              textTransform: 'none', borderRadius: 3, px: { xs: 0.5, sm: 2 },
              ...(posTab === 1
                ? { bgcolor: '#e65100', color: 'white', boxShadow: '0 4px 12px rgba(230,81,0,0.4)', '&:hover': { bgcolor: '#bf360c' } }
                : { borderColor: '#e65100', color: '#e65100', borderWidth: 2, '&:hover': { bgcolor: '#fff3e0', borderWidth: 2 } }
              ),
            }}
          >
            Giặt xong
            <Typography component="span" sx={{ ml: 0.5, fontSize: 11, opacity: 0.7, display: { xs: 'none', sm: 'inline' } }}>(F2)</Typography>
          </Button>
        </Badge>
        {/* Trả đồ - Blue + Badge */}
        <Badge
          badgeContent={pendingReturnCount}
          color="error"
          max={99}
          sx={{
            flex: 1,
            '& .MuiBadge-badge': {
              fontSize: { xs: 11, sm: 14 }, fontWeight: 700,
              minWidth: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 }, borderRadius: 12,
              top: 4, right: { xs: 4, sm: 8 }, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            },
          }}
        >
          <Button
            variant={posTab === 2 ? 'contained' : 'outlined'}
            onClick={() => switchTab(2)}
            startIcon={<LocalShipping sx={{ fontSize: { xs: 20, sm: 24 } }} />}
            fullWidth
            sx={{
              minHeight: { xs: 44, sm: 56 }, fontSize: { xs: 13, sm: 16 }, fontWeight: 700,
              textTransform: 'none', borderRadius: 3, px: { xs: 0.5, sm: 2 },
              ...(posTab === 2
                ? { bgcolor: '#1565c0', color: 'white', boxShadow: '0 4px 12px rgba(21,101,192,0.4)', '&:hover': { bgcolor: '#0d47a1' } }
                : { borderColor: '#1565c0', color: '#1565c0', borderWidth: 2, '&:hover': { bgcolor: '#e3f2fd', borderWidth: 2 } }
              ),
            }}
          >
            Trả đồ
            <Typography component="span" sx={{ ml: 0.5, fontSize: 11, opacity: 0.7, display: { xs: 'none', sm: 'inline' } }}>(F3)</Typography>
          </Button>
        </Badge>
      </Box>

      {/* Main POS content */}
      <Box sx={{ flex: 1, overflow: 'hidden', p: { xs: 0.5, sm: 1.5 }, display: 'flex', flexDirection: 'column' }}>

      {/* ===== TAB 0: TẠO ĐƠN ===== */}
      {posTab === 0 && (
      <Box sx={{ display: 'flex', gap: 1.5, flex: 1, flexDirection: { xs: 'column', md: 'row' }, overflow: { xs: 'hidden', md: 'hidden' } }}>
        {/* Left: Customer + Services */}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: { xs: '40vh', md: 0 } }}>
          {/* Mode indicator — compact chip instead of large warning banner */}
          <Chip
            icon={isMode2 ? undefined : undefined}
            label={isMode2 ? '⏳ Chọn dịch vụ SAU (cân ký sau giặt)' : '✅ Chọn dịch vụ TRƯỚC (mặc định)'}
            size="small"
            variant="outlined"
            sx={{
              mb: 2,
              bgcolor: isMode2 ? '#fff8e1' : '#e3f2fd',
              borderColor: isMode2 ? '#ffe082' : '#90caf9',
              color: isMode2 ? '#e65100' : '#1565c0',
              fontWeight: 600,
              fontSize: '0.8rem',
              height: 32,
            }}
          />

          {/* Customer Search with Autocomplete */}
          <Card sx={{ mb: 2, overflow: 'visible' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 }, overflow: 'visible' }}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  inputRef={phoneInputRef}
                  size="small" fullWidth
                  placeholder="Nhập tên hoặc SĐT khách hàng..."
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setShowSuggestions(true); if (customer) setCustomer(null); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
                {/* Suggestion dropdown */}
                {showSuggestions && searchText.trim() && !customer && (
                  <Paper sx={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    maxHeight: 280, overflow: 'auto', mt: 0.5,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}>
                    {suggestions.length > 0 ? (
                      suggestions.map((kh) => (
                        <Box
                          key={kh.maKhachHang}
                          onClick={() => selectCustomer(kh)}
                          sx={{
                            px: 2, py: 1.5, cursor: 'pointer', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center',
                            '&:hover': { bgcolor: 'primary.50' },
                            borderBottom: '1px solid', borderColor: 'divider',
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{kh.hoTen}</Typography>
                            <Typography variant="caption" color="text.secondary">{kh.soDienThoai}</Typography>
                          </Box>
                          <Chip label={kh.loaiKhachHang === 'VIP' ? 'VIP' : kh.loaiKhachHang === 'THAN_THIET' ? 'Thân thiết' : 'Thường'}
                            size="small" variant="outlined" color={kh.loaiKhachHang === 'VIP' ? 'warning' : 'default'} />
                        </Box>
                      ))
                    ) : (
                      <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Không tìm thấy khách hàng
                        </Typography>
                      </Box>
                    )}
                    {/* Quick add button always at bottom */}
                    <Box
                      onClick={openQuickCreate}
                      sx={{
                        px: 2, py: 1.5, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 1, bgcolor: 'primary.50',
                        '&:hover': { bgcolor: 'primary.100' },
                      }}
                    >
                      <PersonAdd fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={600} color="primary">
                        + Thêm khách hàng mới
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </Box>
              {customer ? (
                <Chip label={`${customer.hoTen} - ${customer.soDienThoai}`} color="primary" sx={{ mt: 1 }}
                  onDelete={() => { setCustomer(null); setSearchText(''); }} />
              ) : null}
            </CardContent>
          </Card>

          {/* Service Grid (Mode 1 only) */}
          {!isMode2 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Chọn dịch vụ</Typography>
              <Grid container spacing={1.5}>
                {dichVus.map((dv) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={dv.maDichVu}>
                    <Card
                      onClick={() => addToCart(dv)}
                      sx={{
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.15s',
                        '&:hover': { transform: 'scale(1.03)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
                        '&:active': { transform: 'scale(0.97)' },
                        border: cart.some((c) => c.maDichVu === dv.maDichVu) ? '2px solid' : '1px solid',
                        borderColor: cart.some((c) => c.maDichVu === dv.maDichVu) ? 'primary.main' : 'divider',
                        // TC 23: Touch-friendly min height
                        minHeight: 80,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 1, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.light', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 0.5 }}>
                          <LocalLaundryService fontSize="small" />
                        </Box>
                        <Typography variant="body2" fontWeight={600} noWrap>{dv.tenDichVu}</Typography>
                        <Typography variant="caption" color="primary" fontWeight={700}>
                          {dv.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? `${formatCurrency(dv.giaTheoKg)}/kg` : formatCurrency(dv.giaTheoSoLuong)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Mode 2 info */}
          {isMode2 && customer && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Khách hàng đã chọn. Bấm <strong>"Tạo phiếu hẹn"</strong> để in phiếu.
            </Alert>
          )}
        </Box>

        {/* Right: Cart Sidebar — compact for square POS screens */}
        <Box sx={{
          width: { xs: '100%', md: 280 },
          minWidth: { md: 250 },
          display: 'flex', flexDirection: 'column',
          maxHeight: { xs: '50vh', md: 'none' },
          borderLeft: { md: '1px solid' }, borderTop: { xs: '1px solid', md: 'none' },
          borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 2,
        }}>
          {/* Cart Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCart color="primary" />
              <Typography variant="h6" fontWeight={700}>Giỏ hàng</Typography>
            </Box>
            {cart.length > 0 && (
              <Chip label={`${cart.length} món`} size="small" color="primary" />
            )}
          </Box>

          {/* Cart Items */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {isMode2 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">Chế độ "Chọn dịch vụ sau"</Typography>
                <Typography variant="caption" color="text.secondary">Dịch vụ sẽ được xác định sau khi cân ký</Typography>
              </Box>
            ) : cart.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                Chọn dịch vụ để thêm vào giỏ hàng
              </Typography>
            ) : (
              cart.map((item) => (
                <Box key={item.maDichVu} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={600}>{item.tenDichVu}</Typography>
                    <IconButton size="small" color="error" onClick={() => setCart(cart.filter((c) => c.maDichVu !== item.maDichVu))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {item.dichVu.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? (
                      <TextField
                        size="small" type="number" label="Kg"
                        value={item.trongLuong}
                        onChange={(e) => updateWeight(item.maDichVu, Number(e.target.value))}
                        sx={{ width: 80 }}
                        inputProps={{ min: 0, step: 0.5 }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="primary" fontWeight={600}>
                        {formatCurrency(item.donGia)} 
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
                        <IconButton size="small" onClick={() => updateQuantity(item.maDichVu, -1)} sx={{ width: 36, height: 36 }}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography sx={{ width: 28, textAlign: 'center', fontWeight: 600 }}>{item.soLuong}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.maDichVu, 1)} sx={{ width: 36, height: 36 }}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>)}
                    <Box sx={{ flex: 1, textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700} color="primary">{formatCurrency(item.thanhTien)}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          <Divider />
          <Box sx={{ p: 2 }}>
            {!isMode2 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Tổng cộng</Typography>
                <Typography variant="h6" fontWeight={700} color="primary">{formatCurrency(totalAmount)}</Typography>
              </Box>
            )}

            {/* TC 25: Cancel button */}
            {(cart.length > 0 || customer) && (
              <Button
                fullWidth variant="outlined" color="error" size="large"
                startIcon={<Cancel />}
                onClick={() => setCancelConfirmOpen(true)}
                sx={{ mb: 1, minHeight: 48 }}
              >
                Hủy đơn (Esc)
              </Button>
            )}

            <Button
              fullWidth variant="contained" size="large"
              startIcon={isMode2 ? <Print /> : <Payment />}
              onClick={handleCreateOrder}
              disabled={creating || !customer || (!isMode2 && cart.length === 0)}
              sx={{
                py: 1.5, minHeight: 52, fontSize: '1rem', /* TC 23: Touch-friendly */
                background: isMode2
                  ? 'linear-gradient(135deg, #E65100, #F57C00)'
                  : 'linear-gradient(135deg, #1565C0, #00897B)',
                '&:hover': { background: isMode2
                  ? 'linear-gradient(135deg, #BF360C, #E65100)'
                  : 'linear-gradient(135deg, #0D47A1, #00695C)' },
              }}
            >
              {creating ? 'Đang tạo...' : isMode2 ? 'Tạo phiếu hẹn (F4)' : 'Tạo đơn hàng (F4)'}
            </Button>

            {/* TC 20: Recent Orders */}
            {recentOrders.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth size="small" variant="text"
                  endIcon={recentExpanded ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setRecentExpanded(!recentExpanded)}
                  sx={{ justifyContent: 'space-between', color: 'text.secondary' }}
                >
                  Đơn gần đây ({recentOrders.length})
                </Button>
                <Collapse in={recentExpanded}>
                  {recentOrders.map((o) => (
                    <Box key={o.maDonHang} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, px: 1, fontSize: '0.75rem' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{o.maDonHang}</Typography>
                      <Typography variant="caption" fontWeight={600} color="primary">{formatCurrency(o.tongTien)}</Typography>
                    </Box>
                  ))}
                </Collapse>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      )}

      {/* ===== TAB 1: BÁO GIẶT XONG ===== */}
      {posTab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 700, mx: 'auto', width: '100%', overflow: 'hidden' }}>
          {/* Scrollable content area */}
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {renderOrderLookup()}

            {/* Quick list of orders needing "Giặt xong" (if no order is currently looked up) */}
            {!lookupOrder && pendingWashOrders.length > 0 && (
              <Card sx={{ mb: 2 }} className="scroll-wrapper">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      ⏳ Đơn đang xử lý ({pendingWashCount})
                    </Typography>
                    {pendingWashOrders.length > 2 && (
                      <Box>
                        <IconButton size="small" onClick={(e) => handleScroll(e, 'left')} sx={{ border: '1px solid', borderColor: 'divider', mr: 1, bgcolor: 'background.paper', boxShadow: 1 }}><ChevronLeft /></IconButton>
                        <IconButton size="small" onClick={(e) => handleScroll(e, 'right')} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 1 }}><ChevronRight /></IconButton>
                      </Box>
                    )}
                  </Box>
                  <Box className="order-scroll-container" sx={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    whiteSpace: 'nowrap',
                    mx: -1.5, // Negate card padding to let scroll edge hit the bounds
                    px: 1.5,
                    pb: 1,
                    scrollBehavior: 'smooth',
                    // Hide scrollbar for a cleaner look
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { display: 'none' }
                  }}>
                    <List dense disablePadding sx={{ display: 'flex', gap: 1 }}>
                      {pendingWashOrders.map(order => {
                        const custName = allCustomers.find(c => c.maKhachHang === order.maKhachHang)?.hoTen || order.maKhachHang;
                        return (
                          <ListItemButton key={order.maDonHang} onClick={() => setLookupOrder(order)} sx={{ 
                            p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', 
                            minWidth: 220, maxWidth: 280, display: 'block', whiteSpace: 'normal',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', bgcolor: 'background.paper'
                          }}>
                            <ListItemText
                              primaryTypographyProps={{ component: 'div' }}
                              secondaryTypographyProps={{ component: 'div' }}
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={700}>{order.maDonHang}</Typography>
                                  <Chip label={TRANG_THAI_LABELS[order.trangThai]} size="small" sx={{ bgcolor: TRANG_THAI_COLORS[order.trangThai], color: 'white', fontWeight: 600, fontSize: 10, height: 20 }} />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '60%' }}>👤 {custName}</Typography>
                                  <Typography variant="body2" fontWeight={700} color="primary">{formatCurrency(order.tongTien)}</Typography>
                                </Box>
                              }
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Box>
                </CardContent>
              </Card>
            )}

            {renderOrderInfo()}
            {/* Mode 2: Add services for orders with empty danhSachDichVu */}
            {lookupOrder && lookupOrder.danhSachDichVu.length === 0 && lookupOrder.trangThai !== TrangThaiDonHang.HOAN_THANH && lookupOrder.trangThai !== TrangThaiDonHang.DA_GIAO && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Thêm dịch vụ (cân ký)</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {dichVus.filter(dv => dv.trangThai).map((dv) => (
                      <Grid size={{ xs: 6, sm: 4 }} key={dv.maDichVu}>
                        <Button
                          fullWidth variant={addServiceCart.some(c => c.maDichVu === dv.maDichVu) ? 'contained' : 'outlined'}
                          onClick={() => addToServiceCart(dv)}
                          sx={{ textTransform: 'none', py: 1 }}
                        >
                          {dv.tenDichVu}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                  {addServiceCart.length > 0 && (
                    <Box>
                      {addServiceCart.map((item) => (
                        <Box key={item.maDichVu} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                          <Typography variant="body2">{item.tenDichVu}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {item.dichVu.loaiTinhGia === LoaiTinhGia.THEO_TRONG_LUONG ? (
                              <TextField
                                size="small" type="number" label="Kg" value={item.trongLuong}
                                onChange={(e) => {
                                  const w = Number(e.target.value);
                                  setAddServiceCart(addServiceCart.map(c =>
                                    c.maDichVu === item.maDichVu ? { ...c, trongLuong: w, thanhTien: dichVuService.tinhGia(c.dichVu, c.soLuong, w) } : c
                                  ));
                                }}
                                sx={{ width: 80 }} inputProps={{ min: 0, step: 0.5 }}
                              />
                            ) : (
                              <Typography variant="body2">x{item.soLuong}</Typography>
                            )}
                            <Typography variant="body2" fontWeight={700} color="primary">{formatCurrency(item.thanhTien)}</Typography>
                            <IconButton size="small" color="error" onClick={() => setAddServiceCart(addServiceCart.filter(c => c.maDichVu !== item.maDichVu))}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      ))}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography fontWeight={700}>Tổng</Typography>
                        <Typography fontWeight={700} color="primary">
                          {formatCurrency(addServiceCart.reduce((s, i) => s + i.thanhTien, 0))}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
          {/* Sticky action button at bottom */}
          {lookupOrder && (
            <Box sx={{ flexShrink: 0, pt: 1, pb: 1, bgcolor: 'background.default' }}>
              {lookupOrder.trangThai === TrangThaiDonHang.HOAN_THANH || lookupOrder.trangThai === TrangThaiDonHang.DA_GIAO ? (
                <Alert severity="success">✅ Đơn hàng đã hoàn thành</Alert>
              ) : (
                <Button
                  fullWidth variant="contained" size="large" color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleMarkDone}
                  disabled={lookupOrder.danhSachDichVu.length === 0 && addServiceCart.length === 0}
                  sx={{ py: 1.5, fontSize: '1rem' }}
                >
                  ✅ Báo giặt xong
                </Button>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ===== TAB 2: TRẢ ĐỒ ===== */}
      {posTab === 2 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 700, mx: 'auto', width: '100%', overflow: 'hidden' }}>
          {/* Scrollable content area — order info + payment details */}
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {renderOrderLookup()}

            {/* Quick list of orders needing "Trả đồ" (if no order is currently looked up) */}
            {!lookupOrder && pendingReturnOrders.length > 0 && (
              <Card sx={{ mb: 2 }} className="scroll-wrapper">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      ✅ Đơn đã xong, chờ trả khách ({pendingReturnCount})
                    </Typography>
                    {pendingReturnOrders.length > 2 && (
                      <Box>
                        <IconButton size="small" onClick={(e) => handleScroll(e, 'left')} sx={{ border: '1px solid', borderColor: 'divider', mr: 1, bgcolor: 'background.paper', boxShadow: 1 }}><ChevronLeft /></IconButton>
                        <IconButton size="small" onClick={(e) => handleScroll(e, 'right')} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 1 }}><ChevronRight /></IconButton>
                      </Box>
                    )}
                  </Box>
                  <Box className="order-scroll-container" sx={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    whiteSpace: 'nowrap',
                    mx: -1.5,
                    px: 1.5,
                    pb: 1,
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { display: 'none' }
                  }}>
                    <List dense disablePadding sx={{ display: 'flex', gap: 1 }}>
                      {pendingReturnOrders.map(order => {
                        const custName = allCustomers.find(c => c.maKhachHang === order.maKhachHang)?.hoTen || order.maKhachHang;
                        return (
                          <ListItemButton key={order.maDonHang} onClick={() => setLookupOrder(order)} sx={{ 
                            p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', 
                            minWidth: 220, maxWidth: 280, display: 'block', whiteSpace: 'normal',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', bgcolor: 'background.paper'
                          }}>
                            <ListItemText
                              primaryTypographyProps={{ component: 'div' }}
                              secondaryTypographyProps={{ component: 'div' }}
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={700}>{order.maDonHang}</Typography>
                                  {order.tienConLai > 0 ? (
                                    <Chip label={`Thiếu ${formatCurrency(order.tienConLai)}`} size="small" color="error" variant="outlined" sx={{ fontWeight: 600, fontSize: 10, height: 20 }} />
                                  ) : (
                                    <Chip label="Đã TT" size="small" color="success" variant="outlined" sx={{ fontWeight: 600, fontSize: 10, height: 20 }} />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '60%' }}>👤 {custName}</Typography>
                                  <Typography variant="body2" fontWeight={700} color="primary">{formatCurrency(order.tongTien)}</Typography>
                                </Box>
                              }
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Box>
                </CardContent>
              </Card>
            )}

            {renderOrderInfo()}
            {lookupOrder && (
              <Box>
                {/* Payment section */}
                {lookupOrder.tienConLai > 0 && lookupOrder.trangThai !== TrangThaiDonHang.DA_GIAO && (
                  <Card sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" gutterBottom>💰 Thanh toán</Typography>
                      {/* Payment method */}
                      <Grid container spacing={0.5} sx={{ mb: 1 }}>
                        {[
                          { value: PhuongThucThanhToan.TIEN_MAT, label: 'Tiền mặt', icon: <AttachMoney /> },
                          { value: PhuongThucThanhToan.CHUYEN_KHOAN, label: 'CK', icon: <AccountBalance /> },
                          { value: PhuongThucThanhToan.THE_ATM, label: 'ATM', icon: <CreditCard /> },
                          { value: PhuongThucThanhToan.VI_DIEN_TU, label: 'Ví ĐT', icon: <PhoneAndroid /> },
                        ].map((m) => (
                          <Grid size={3} key={m.value}>
                            <Button
                              fullWidth size="small"
                              variant={paymentMethod === m.value ? 'contained' : 'outlined'}
                              startIcon={m.icon}
                              onClick={() => setPaymentMethod(m.value)}
                              sx={{ py: 0.5, textTransform: 'none', fontSize: '0.7rem', minHeight: 36 }}
                            >
                              {m.label}
                            </Button>
                          </Grid>
                        ))}
                      </Grid>
                      {/* QR for bank transfer */}
                      {paymentMethod === PhuongThucThanhToan.CHUYEN_KHOAN && bankInfo && (
                        <Box sx={{ mb: 1 }}>
                          <BankQRCode
                            maNganHang={bankInfo.maNganHang}
                            tenNganHang={bankInfo.tenNganHang}
                            soTaiKhoan={bankInfo.soTaiKhoan}
                            chuTaiKhoan={bankInfo.chuTaiKhoan}
                            soTien={lookupOrder.tienConLai}
                            maDonHang={lookupOrder.maDonHang}
                          />
                        </Box>
                      )}
                      {/* Amount input — hide for bank transfer */}
                      {paymentMethod !== PhuongThucThanhToan.CHUYEN_KHOAN && (
                        <>
                          <TextField
                            fullWidth label="Số tiền" value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                            size="small" sx={{ mb: 1 }}
                            InputProps={{ sx: { fontSize: '1rem', fontWeight: 700 } }}
                          />
                          {Number(paymentAmount) > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 0.5, px: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                              <Typography variant="body2">Tiền thối:</Typography>
                              <Typography variant="body2" fontWeight={700} color="success.main">
                                {formatCurrency(Math.max(0, Number(paymentAmount) - lookupOrder.tienConLai))}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </Box>
          {/* Sticky action buttons at bottom — always visible on POS touch screen */}
          {lookupOrder && (
            <Box sx={{ flexShrink: 0, pt: 1, pb: 1, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {lookupOrder.trangThai === TrangThaiDonHang.DA_GIAO ? (
                <Alert severity="success">🎉 Đã thanh toán & trả đồ cho khách hàng</Alert>
              ) : lookupOrder.trangThai === TrangThaiDonHang.HOAN_THANH ? (
                <Button
                  fullWidth variant="contained" size="large" color="success"
                  startIcon={<LocalShipping />}
                  onClick={handleReturnClothes}
                  disabled={paying}
                  sx={{ py: 1.5, fontSize: '1rem', minHeight: 52 }}
                >
                  {paying ? 'Đang xử lý...' : lookupOrder.tienConLai > 0
                    ? `🎉 Thanh toán ${formatCurrency(lookupOrder.tienConLai)} & Trả đồ`
                    : '🎉 Xác nhận trả đồ cho KH'
                  }
                </Button>
              ) : (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Đơn hàng đang ở trạng thái <strong>{TRANG_THAI_LABELS[lookupOrder.trangThai]}</strong>. Cần giặt xong trước khi trả đồ.
                </Alert>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* TC 25: Cancel Confirmation Dialog */}
      <Dialog open={cancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Xác nhận hủy đơn</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc chắn muốn hủy đơn hàng đang tạo? Tất cả dữ liệu sẽ bị xóa.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmOpen(false)}>Quay lại</Button>
          <Button variant="contained" color="error" onClick={handleCancelOrder}>Xác nhận hủy</Button>
        </DialogActions>
      </Dialog>

      {/* Quick Create Customer Dialog */}
      <Dialog open={createCustomerOpen} onClose={() => setCreateCustomerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd /> Thêm khách hàng mới
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Tên khách hàng" fullWidth value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            autoFocus required />
          <TextField label="Số điện thoại" fullWidth value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreateCustomer(); }}
            required
            error={newCustomerPhone.length > 0 && !/^[0-9]{10,11}$/.test(newCustomerPhone)}
            helperText={newCustomerPhone.length > 0 && !/^[0-9]{10,11}$/.test(newCustomerPhone) ? '10-11 chữ số' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCustomerOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleQuickCreateCustomer} sx={{ minHeight: 44 }}>Tạo nhanh</Button>
        </DialogActions>
      </Dialog>

      {/* TC 12-14: Payment Dialog with Numpad */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          💰 Thanh toán
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          {createdOrder && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Tổng tiền:</Typography>
                <Typography fontWeight={700} color="primary" variant="h6">{formatCurrency(createdOrder.tongTien)}</Typography>
              </Box>

              {/* TC 14: Payment method buttons */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Phương thức thanh toán</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  { value: PhuongThucThanhToan.TIEN_MAT, label: 'Tiền mặt', icon: <AttachMoney /> },
                  { value: PhuongThucThanhToan.CHUYEN_KHOAN, label: 'Chuyển khoản', icon: <AccountBalance /> },
                  { value: PhuongThucThanhToan.THE_ATM, label: 'Thẻ ATM', icon: <CreditCard /> },
                  { value: PhuongThucThanhToan.VI_DIEN_TU, label: 'Ví điện tử', icon: <PhoneAndroid /> },
                ].map((m) => (
                  <Grid size={6} key={m.value}>
                    <Button
                      fullWidth variant={paymentMethod === m.value ? 'contained' : 'outlined'}
                      startIcon={m.icon}
                      onClick={() => setPaymentMethod(m.value)}
                      sx={{ py: 1.5, minHeight: 56, fontSize: '0.85rem' /* TC 23: Touch */ }}
                    >
                      {m.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>

              {/* YC 17: Show QR code for bank transfer */}
              {paymentMethod === PhuongThucThanhToan.CHUYEN_KHOAN && bankInfo && createdOrder && (
                <Box sx={{ mb: 2 }}>
                  <BankQRCode
                    maNganHang={bankInfo.maNganHang}
                    tenNganHang={bankInfo.tenNganHang}
                    soTaiKhoan={bankInfo.soTaiKhoan}
                    chuTaiKhoan={bankInfo.chuTaiKhoan}
                    soTien={createdOrder.tienConLai}
                    maDonHang={createdOrder.maDonHang}
                  />
                </Box>
              )}

              {/* TC 12: Payment amount display */}
              <TextField
                fullWidth label="Số tiền khách đưa" value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: '1.5rem', fontWeight: 700, textAlign: 'right' },
                }}
                sx={{ mb: 1 }}
              />

              {/* TC 13: Change display */}
              {Number(paymentAmount) > 0 && (
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', p: 1.5, mb: 2,
                  bgcolor: changeAmount > 0 ? 'success.50' : 'background.default', borderRadius: 2,
                  border: '1px solid', borderColor: changeAmount > 0 ? 'success.main' : 'divider',
                }}>
                  <Typography fontWeight={600}>Tiền thối:</Typography>
                  <Typography fontWeight={700} color={changeAmount > 0 ? 'success.main' : 'text.primary'} variant="h6">
                    {formatCurrency(changeAmount)}
                  </Typography>
                </Box>
              )}

              {/* TC 12: Numpad */}
              <Grid container spacing={1}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((val) => (
                  <Grid size={4} key={val}>
                    <Button
                      fullWidth variant={val === 'C' ? 'outlined' : 'contained'}
                      color={val === 'C' ? 'error' : val === '⌫' ? 'warning' : 'inherit'}
                      onClick={() => handleNumpadClick(val)}
                      sx={{
                        py: 2, fontSize: '1.2rem', fontWeight: 700,
                        minHeight: 56, /* TC 23: Touch-friendly */
                        bgcolor: !['C', '⌫'].includes(val) ? 'action.hover' : undefined,
                        color: !['C', '⌫'].includes(val) ? 'text.primary' : undefined,
                        '&:hover': { bgcolor: !['C', '⌫'].includes(val) ? 'action.selected' : undefined },
                      }}
                    >
                      {val}
                    </Button>
                  </Grid>
                ))}
                {/* Quick amount buttons */}
                {createdOrder.tongTien > 0 && (
                  <Grid size={12}>
                    <Button
                      fullWidth variant="outlined" color="primary"
                      onClick={() => setPaymentAmount(String(createdOrder.tongTien))}
                      sx={{ mt: 1, minHeight: 48 }}
                    >
                      Đúng {formatCurrency(createdOrder.tongTien)}
                    </Button>
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setPaymentOpen(false); setPrintOpen(true); }}>Bỏ qua</Button>
          <Button
            variant="contained" size="large"
            onClick={handlePayment}
            disabled={paying || Number(paymentAmount) <= 0}
            sx={{ minHeight: 48, px: 4 }}
          >
            {paying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Success Dialog */}
      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          {isMode2 ? 'Khởi tạo phiếu hẹn thành công 🎉' : 'Tạo đơn thành công 🎉'}
        </DialogTitle>
        <DialogContent>
          <Typography textAlign="center" color="text.secondary" mb={2}>
            Lệnh in đang được tự động gửi đến máy in...
          </Typography>
          {createdOrder && (
            <>
              {isMode2 && (
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'warning.main' }}>
                    ⚠ Dịch vụ và giá cả sẽ được xác định sau khi giặt xong.
                  </Typography>
                </Box>
              )}
              {/* Show order amount info for Mode 1 */}
              {!isMode2 && createdOrder.tongTien > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1">Tổng tiền:</Typography>
                    <Typography variant="body1" fontWeight={700}>{formatCurrency(createdOrder.tongTien)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1">Còn lại (Chưa thanh toán):</Typography>
                    <Typography variant="body1" fontWeight={700} color="error">{formatCurrency(createdOrder.tienConLai)}</Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 3, justifyContent: 'center', gap: 2 }}>
          <Button variant="outlined" sx={{ minWidth: 120 }} onClick={() => setPrintOpen(false)}>Đóng</Button>
          {/* Optional: pay now */}
          {createdOrder && !isMode2 && createdOrder.tienConLai > 0 && (
            <Button
              variant="contained" color="success" startIcon={<Payment />}
              onClick={() => {
                setPrintOpen(false);
                setPaymentAmount('');
                setPaymentMethod(PhuongThucThanhToan.TIEN_MAT);
                setPaymentOpen(true);
              }}
              sx={{ minWidth: 160 }}
            >
              Thanh toán ngay
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Camera barcode scanner dialog */}
      <BarcodeScanner
        open={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onScan={handleCameraScan}
        title="Quét mã đơn hàng"
      />

      {/* ===== HIDDEN REMOTE PRINT CONTAINER ===== */}
      {/* Remote printing is disabled, removing unused DOM nodes */}

      </Box>
    </Box>
  );
}
