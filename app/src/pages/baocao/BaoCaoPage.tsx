import { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Button,
  TextField,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Chip,
  ButtonGroup,
  LinearProgress,
  Avatar,
  alpha,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  TrendingUp,
  Receipt,
  People,
  LocalLaundryService,
  Save,
  Download,
  Print,
  CheckCircle,
  HourglassEmpty,
  LocalShipping,
  Warning,
  AccountBalanceWallet,
  CreditCard,
  AccessTime,
  BarChart as BarChartIcon,
  Close,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfYear,
  startOfDay,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
} from "date-fns";
import { vi } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { donHangService } from "../../services/donHangService";
import { khachHangService } from "../../services/khachHangService";
import { baoCaoService } from "../../services/baoCaoService";
import { giaoDichService } from "../../services/giaoDichService";
import { userService } from "../../services/userService";
import type { DonHang, KhachHang, BaoCao, GiaoDich, User } from "../../types";
import {
  TrangThaiDonHang,
  LoaiKhachHang,
  PhuongThucThanhToan,
  TrangThaiGiaoDich,
} from "../../types";
import {
  formatCurrency,
  TRANG_THAI_LABELS,
  TRANG_THAI_COLORS,
} from "../../utils/constants";

// ===== TYPES =====
type TimeRange = "today" | "week" | "month" | "year" | "custom";
type CardKey =
  | "revenue"
  | "actualRevenue"
  | "total"
  | "completed"
  | "daGiao"
  | "chuaGiat"
  | "dangGiat"
  | "chuaTra"
  | "daHuy"
  | "tienMat"
  | "chuyenKhoan"
  | null;

// ===== HELPERS =====
const PIE_COLORS = [
  "#5C6BC0",
  "#42A5F5",
  "#26C6DA",
  "#66BB6A",
  "#FFA726",
  "#EF5350",
  "#AB47BC",
  "#78909C",
];

function getTimeRange(range: TimeRange): { from: Date; to: Date } {
  const now = new Date();
  switch (range) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "year":
      return { from: startOfYear(now), to: endOfDay(now) };
    default:
      return { from: startOfMonth(now), to: endOfDay(now) };
  }
}

// ===== STAT CARD COMPONENT =====
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
  active,
  onClick,
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        border: active ? `2px solid ${color}` : "none",
        borderRadius: 3,
        background: active
          ? `linear-gradient(135deg, ${alpha(color, 0.18)} 0%, ${alpha(color, 0.08)} 100%)`
          : `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.03)} 100%)`,
        boxShadow: active
          ? `0 4px 20px ${alpha(color, 0.3)}`
          : `0 2px 12px ${alpha(color, 0.12)}`,
        transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: `0 6px 20px ${alpha(color, 0.25)}`,
            }
          : {},
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
                mb: 0.5,
                fontSize: "0.78rem",
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", mt: 0.5, display: "block" }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{ bgcolor: alpha(color, 0.12), color, width: 44, height: 44 }}
            className="no-print"
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BaoCaoPage() {
  const { userProfile } = useAuth();

  // Data State
  const [donHangNhanVao, setDonHangNhanVao] = useState<DonHang[]>([]);
  const [donHangDaGiao, setDonHangDaGiao] = useState<DonHang[]>([]);
  const [allKhachHangs, setAllKhachHangs] = useState<KhachHang[]>([]);
  const [allGiaoDichs, setAllGiaoDichs] = useState<GiaoDich[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [overdueOrders, setOverdueOrders] = useState<DonHang[]>([]);
  const [lichSuBaoCao, setLichSuBaoCao] = useState<BaoCao[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState(false);

  // Filter State
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [tuNgay, setTuNgay] = useState(
    format(startOfDay(new Date()), "yyyy-MM-dd"),
  );
  const [denNgay, setDenNgay] = useState(format(new Date(), "yyyy-MM-dd"));

  // Tab State
  const [tabValue, setTabValue] = useState(0);

  // Detail drill-down state
  const [selectedCard, setSelectedCard] = useState<CardKey>(null);
  const lichSuLoadedRef = useRef(false);
  const initialLoadRef = useRef(true);
  const toggleCard = (key: CardKey) =>
    setSelectedCard((prev) => (prev === key ? null : key));

  // Handle time range selection
  useEffect(() => {
    if (timeRange !== "custom") {
      const { from, to } = getTimeRange(timeRange);
      setTuNgay(format(from, "yyyy-MM-dd"));
      setDenNgay(format(to, "yyyy-MM-dd"));
    }
  }, [timeRange]);

  useEffect(() => {
    const loadReferenceData = async () => {
      if (!userProfile?.maCuaHang) return;
      try {
        const [kh, users, history] = await Promise.all([
          khachHangService.getByMaCuaHang(userProfile.maCuaHang),
          userService.getByMaCuaHang(userProfile.maCuaHang),
          lichSuLoadedRef.current
            ? Promise.resolve([])
            : baoCaoService.getByMaCuaHang(userProfile.maCuaHang),
        ]);
        setAllKhachHangs(kh);
        setAllUsers(users);
        if (!lichSuLoadedRef.current) {
          setLichSuBaoCao(history as BaoCao[]);
          lichSuLoadedRef.current = true;
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu tham chiếu:", err);
        toast.error("Lỗi tải dữ liệu tham chiếu");
      }
    };

    loadReferenceData();
  }, [userProfile?.maCuaHang]);

  useEffect(() => {
    const loadRangeData = async () => {
      if (!userProfile?.maCuaHang) return;
      setRangeLoading(true);
      try {
        const from = startOfDay(new Date(tuNgay));
        const to = endOfDay(new Date(denNgay));
        const [dhNhanVao, dhDaGiao, gd, overdue] = await Promise.all([
          donHangService.getByDateRange(userProfile.maCuaHang, from, to),
          donHangService.getByNgayGiao(userProfile.maCuaHang, from, to),
          giaoDichService.getByDateRange(userProfile.maCuaHang, from, to),
          donHangService.getOverdue(userProfile.maCuaHang),
        ]);
        setDonHangNhanVao(dhNhanVao);
        setDonHangDaGiao(dhDaGiao);
        setAllGiaoDichs(gd);
        setOverdueOrders(overdue);
      } catch (err) {
        console.error("Lỗi tải dữ liệu báo cáo:", err);
        toast.error("Lỗi tải dữ liệu báo cáo");
      } finally {
        setLoading(false);
        setRangeLoading(false);
        initialLoadRef.current = false;
      }
    };

    loadRangeData();
  }, [denNgay, tuNgay, userProfile?.maCuaHang]);

  // ===== DERIVED DATA =====
  const startTimestamp = startOfDay(new Date(tuNgay)).getTime();
  const endTimestamp = endOfDay(new Date(denNgay)).getTime();

  // allGiaoDichs đã fetch theo khoảng ngày, filter lại để an toàn nếu dữ liệu cũ còn cache
  const filteredGiaoDichs = useMemo(
    () =>
      allGiaoDichs.filter((gd) => {
        if (gd.trangThai !== TrangThaiGiaoDich.THANH_CONG) return false;
        const time = gd.ngayGiaoDich?.toMillis?.();
        if (!time) return false;
        return time >= startTimestamp && time <= endTimestamp;
      }),
    [allGiaoDichs, startTimestamp, endTimestamp],
  );

  // Doanh thu theo ngày giao thực tế (PRD): chỉ tính đơn có ngayGiao trong khoảng
  const revenueOrders = useMemo(
    () =>
      donHangDaGiao.filter(
        (d) => d.trangThai === TrangThaiDonHang.DA_GIAO && !!d.ngayGiao,
      ),
    [donHangDaGiao],
  );

  // Nhóm thống kê trạng thái đơn theo khoảng ngày nhận vào (ngayTao)
  const statusOrders = useMemo(() => donHangNhanVao, [donHangNhanVao]);

  const filteredKhachHangs = useMemo(
    () =>
      allKhachHangs.filter((k) => {
        const time = k.ngayDangKy?.toMillis?.();
        if (!time) return false;
        return time >= startTimestamp && time <= endTimestamp;
      }),
    [allKhachHangs, startTimestamp, endTimestamp],
  );

  // User map for name lookups
  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    allUsers.forEach((u) => m.set(u.uid, u.hoTen));
    return m;
  }, [allUsers]);

  // Customer map for name lookups
  const customerMap = useMemo(() => {
    const m = new Map<string, string>();
    allKhachHangs.forEach((k) => m.set(k.maKhachHang, k.hoTen));
    return m;
  }, [allKhachHangs]);

  // ===== STATISTICS =====
  const stats = useMemo(() => {
    const total = statusOrders.length;
    const completed = statusOrders.filter(
      (d) =>
        d.trangThai === TrangThaiDonHang.HOAN_THANH ||
        d.trangThai === TrangThaiDonHang.DA_GIAO,
    );
    const chuaGiat = statusOrders.filter(
      (d) =>
        d.trangThai === TrangThaiDonHang.CHO_XU_LY ||
        d.trangThai === TrangThaiDonHang.CHO_CAN_KY,
    );
    const chuaTra = statusOrders.filter(
      (d) => d.trangThai === TrangThaiDonHang.HOAN_THANH,
    );
    const dangGiat = statusOrders.filter(
      (d) => d.trangThai === TrangThaiDonHang.DANG_XU_LY,
    );
    const daHuy = statusOrders.filter(
      (d) => d.trangThai === TrangThaiDonHang.DA_HUY,
    );
    const revenue = revenueOrders.reduce((sum, d) => sum + d.tongTien, 0);
    const actualRevenue = filteredGiaoDichs.reduce(
      (sum, g) => sum + g.soTien,
      0,
    );

    const overdue = overdueOrders;

    // Payment method stats from GiaoDich
    const tienMat = filteredGiaoDichs.filter(
      (gd) => gd.phuongThucThanhToan === PhuongThucThanhToan.TIEN_MAT,
    );
    const chuyenKhoan = filteredGiaoDichs.filter(
      (gd) => gd.phuongThucThanhToan === PhuongThucThanhToan.CHUYEN_KHOAN,
    );
    const tienMatTotal = tienMat.reduce((s, g) => s + g.soTien, 0);
    const chuyenKhoanTotal = chuyenKhoan.reduce((s, g) => s + g.soTien, 0);

    return {
      total,
      completed: completed.length,
      chuaGiat: chuaGiat.length,
      chuaTra: chuaTra.length,
      daGiao: revenueOrders.length,
      dangGiat: dangGiat.length,
      daHuy: daHuy.length,
      revenue,
      actualRevenue,
      overdue,
      tienMatCount: tienMat.length,
      chuyenKhoanCount: chuyenKhoan.length,
      tienMatTotal,
      chuyenKhoanTotal,
    };
  }, [statusOrders, revenueOrders, overdueOrders, filteredGiaoDichs]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    statusOrders.forEach((d) => {
      counts[d.trangThai] = (counts[d.trangThai] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: TRANG_THAI_LABELS[status as TrangThaiDonHang],
        value: count,
        color: TRANG_THAI_COLORS[status as TrangThaiDonHang],
        percent:
          stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.value - a.value);
  }, [statusOrders, stats.total]);

  // Revenue over time (for chart)
  const revenueChartData = useMemo(() => {
    const from = new Date(tuNgay);
    const to = new Date(denNgay);
    const diffDays = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Decide grouping
    let intervals: Date[];
    let labelFn: (d: Date) => string;
    if (diffDays <= 7) {
      intervals = eachDayOfInterval({ start: from, end: to });
      labelFn = (d) => format(d, "dd/MM", { locale: vi });
    } else if (diffDays <= 62) {
      intervals = eachWeekOfInterval(
        { start: from, end: to },
        { weekStartsOn: 1 },
      );
      labelFn = (d) => `T${format(d, "w")}`;
    } else {
      intervals = eachMonthOfInterval({ start: from, end: to });
      labelFn = (d) => format(d, "MM/yyyy", { locale: vi });
    }

    return intervals.map((intStart, idx) => {
      const intEnd =
        idx < intervals.length - 1
          ? new Date(startOfDay(intervals[idx + 1]).getTime() - 1)
          : endOfDay(to);
      const ordersInRange = revenueOrders.filter((d) => {
        const t = d.ngayGiao?.toMillis?.();
        return t ? t >= intStart.getTime() && t < intEnd.getTime() : false;
      });
      return {
        name: labelFn(intStart),
        doanhThu: ordersInRange.reduce((s, d) => s + d.tongTien, 0),
        soDon: ordersInRange.length,
      };
    });
  }, [revenueOrders, tuNgay, denNgay]);

  // Per-employee stats
  const employeeStats = useMemo(() => {
    const map = new Map<
      string,
      { soDon: number; doanhThu: number; hoanThanh: number }
    >();
    revenueOrders.forEach((d) => {
      const key = d.maNhanVien;
      if (!map.has(key)) map.set(key, { soDon: 0, doanhThu: 0, hoanThanh: 0 });
      const entry = map.get(key)!;
      entry.doanhThu += d.tongTien;
      entry.soDon += 1;
      entry.hoanThanh += 1;
    });
    return Array.from(map.entries())
      .map(([uid, data]) => ({ uid, name: userMap.get(uid) || uid, ...data }))
      .sort((a, b) => b.doanhThu - a.doanhThu);
  }, [revenueOrders, userMap]);

  // Service stats
  const serviceData = useMemo(() => {
    const serviceStats: Record<string, { count: number; revenue: number }> = {};
    revenueOrders.forEach((dh) => {
      dh.danhSachDichVu.forEach((dv) => {
        if (!serviceStats[dv.tenDichVu])
          serviceStats[dv.tenDichVu] = { count: 0, revenue: 0 };
        serviceStats[dv.tenDichVu].count += dv.soLuong || dv.trongLuong || 1;
        serviceStats[dv.tenDichVu].revenue += dv.thanhTien;
      });
    });
    return Object.entries(serviceStats)
      .map(([name, s]) => ({ name, value: s.count, revenue: s.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [revenueOrders]);

  // Customer stats
  const tongKhachHangMoi = filteredKhachHangs.length;
  const khachHangThanThiet = allKhachHangs.filter(
    (k) => k.loaiKhachHang === LoaiKhachHang.THAN_THIET,
  ).length;
  const khachHangVip = allKhachHangs.filter(
    (k) => k.loaiKhachHang === LoaiKhachHang.VIP,
  ).length;

  // ===== EXPORT HANDLERS =====
  const handleSaveReport = async () => {
    if (!userProfile?.maCuaHang) return;
    try {
      const currentReportData = {
        tongDonHang: stats.total,
        tongDoanhThu: stats.revenue,
        donHangHoanThanh: stats.completed,
        donHangHuy: stats.daHuy,
        tongKhachHangMoi,
        khachHangThanThiet,
        khachHangVip,
        statusData,
        serviceData,
      };
      const maBaoCao = await baoCaoService.save({
        maCuaHang: userProfile.maCuaHang,
        loaiBaoCao: "DOANH_THU",
        tuNgay: Timestamp.fromMillis(startTimestamp),
        denNgay: Timestamp.fromMillis(endTimestamp),
        ngayTao: Timestamp.now(),
        nguoiTao: userProfile.uid,
        duLieu: currentReportData,
      });
      toast.success("Đã lưu báo cáo thành công!");
      setLichSuBaoCao((prev) => [
        {
          maBaoCao,
          maCuaHang: userProfile.maCuaHang!,
          loaiBaoCao: "DOANH_THU",
          tuNgay: Timestamp.fromMillis(startTimestamp),
          denNgay: Timestamp.fromMillis(endTimestamp),
          ngayTao: Timestamp.now(),
          nguoiTao: userProfile.uid,
          duLieu: currentReportData,
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Lỗi khi lưu báo cáo:", err);
      toast.error("Lỗi khi lưu báo cáo");
    }
  };

  const handleExportExcel = () => {
    const csvRows: string[] = [];
    csvRows.push("Báo cáo doanh thu Giặt Sấy");
    csvRows.push(`Từ: ${tuNgay},Đến: ${denNgay}`);
    csvRows.push(`Tổng doanh thu: ${stats.revenue}`);
    csvRows.push(`Tổng đơn: ${stats.total}`);
    csvRows.push("");
    csvRows.push("Trạng thái,Số lượng,Tỷ lệ (%)");
    statusData.forEach((s) =>
      csvRows.push(`${s.name},${s.value},${s.percent}%`),
    );
    csvRows.push("");
    csvRows.push("Nhân viên,Số đơn,Doanh thu");
    employeeStats.forEach((e) =>
      csvRows.push(`${e.name},${e.soDon},${e.doanhThu}`),
    );
    csvRows.push("");
    csvRows.push("Dịch vụ,Số lượng,Doanh thu");
    serviceData.forEach((s) =>
      csvRows.push(`${s.name},${s.value},${s.revenue}`),
    );
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bao_cao_${tuNgay}_${denNgay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
        className="no-print"
      >
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <BarChartIcon color="primary" /> Báo cáo & thống kê
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Save />}
            onClick={handleSaveReport}
          >
            Lưu
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            onClick={handleExportExcel}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            In
          </Button>
        </Box>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 2 }}
        className="no-print"
      >
        <Tab label="📊 Tổng Quan" />
        <Tab label="👤 Theo Nhân Viên" />
        <Tab label="📋 Lịch Sử" />
      </Tabs>
      {rangeLoading && (
        <Box sx={{ mb: 2 }} className="no-print">
          <LinearProgress />
        </Box>
      )}

      {/* TIME FILTER */}
      <Card sx={{ mb: 3, borderRadius: 3 }} className="no-print">
        <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <ButtonGroup
                size="small"
                variant="outlined"
                sx={{ flexWrap: "wrap" }}
              >
                {(
                  [
                    ["today", "Hôm nay"],
                    ["week", "Tuần này"],
                    ["month", "Tháng này"],
                    ["year", "Năm nay"],
                    ["custom", "Tùy chọn"],
                  ] as [TimeRange, string][]
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={timeRange === key ? "contained" : "outlined"}
                    onClick={() => setTimeRange(key)}
                  >
                    {label}
                  </Button>
                ))}
              </ButtonGroup>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                size="small"
                label="Từ ngày"
                InputLabelProps={{ shrink: true }}
                value={tuNgay}
                onChange={(e) => {
                  setTuNgay(e.target.value);
                  setTimeRange("custom");
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                size="small"
                label="Đến ngày"
                InputLabelProps={{ shrink: true }}
                value={denNgay}
                onChange={(e) => {
                  setDenNgay(e.target.value);
                  setTimeRange("custom");
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ===== TAB 0: TỔNG QUAN ===== */}
      {tabValue === 0 && (
        <Box id="report-content">
          {/* ROW 1: Main stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatCard
                title="Doanh thu (theo ngày giao)"
                value={formatCurrency(stats.revenue)}
                icon={<TrendingUp />}
                color="#1565C0"
                subtitle="Tổng tiền đơn đã giao khách"
                active={selectedCard === "revenue"}
                onClick={() => toggleCard("revenue")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatCard
                title="Thực Thu"
                value={formatCurrency(stats.actualRevenue)}
                icon={<AccountBalanceWallet />}
                color="#00897B"
                subtitle="Tổng giao dịch trong kỳ"
                active={selectedCard === "actualRevenue"}
                onClick={() => toggleCard("actualRevenue")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatCard
                title="Tổng Đơn Hàng"
                value={stats.total}
                icon={<Receipt />}
                color="#2E7D32"
                active={selectedCard === "total"}
                onClick={() => toggleCard("total")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatCard
                title="Hoàn Thành"
                value={stats.completed}
                icon={<CheckCircle />}
                color="#4CAF50"
                subtitle={`${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}% đơn`}
                active={selectedCard === "completed"}
                onClick={() => toggleCard("completed")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <StatCard
                title="Đã Giao Khách"
                value={stats.daGiao}
                icon={<LocalShipping />}
                color="#7B1FA2"
                active={selectedCard === "daGiao"}
                onClick={() => toggleCard("daGiao")}
              />
            </Grid>
          </Grid>

          {/* ROW 2: Order status detail */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard
                title="Chưa Giặt"
                value={stats.chuaGiat}
                icon={<HourglassEmpty />}
                color="#FFA726"
                subtitle="Chờ xử lý + Chờ cân ký"
                active={selectedCard === "chuaGiat"}
                onClick={() => toggleCard("chuaGiat")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard
                title="Đang Xử Lý"
                value={stats.dangGiat}
                icon={<LocalLaundryService />}
                color="#42A5F5"
                subtitle="Theo trạng thái đang xử lý"
                active={selectedCard === "dangGiat"}
                onClick={() => toggleCard("dangGiat")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard
                title="Chưa Trả Khách"
                value={stats.chuaTra}
                icon={<AccessTime />}
                color="#E91E63"
                subtitle="Xong nhưng chưa giao"
                active={selectedCard === "chuaTra"}
                onClick={() => toggleCard("chuaTra")}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard
                title="Đã Hủy"
                value={stats.daHuy}
                icon={<Warning />}
                color="#EF5350"
                active={selectedCard === "daHuy"}
                onClick={() => toggleCard("daHuy")}
              />
            </Grid>
          </Grid>

          {/* ROW 3: Payment method stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Tiền Mặt"
                value={formatCurrency(stats.tienMatTotal)}
                icon={<AccountBalanceWallet />}
                color="#43A047"
                subtitle={`${stats.tienMatCount} giao dịch`}
                active={selectedCard === "tienMat"}
                onClick={() => toggleCard("tienMat")}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Chuyển Khoản"
                value={formatCurrency(stats.chuyenKhoanTotal)}
                icon={<CreditCard />}
                color="#1E88E5"
                subtitle={`${stats.chuyenKhoanCount} giao dịch`}
                active={selectedCard === "chuyenKhoan"}
                onClick={() => toggleCard("chuyenKhoan")}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Khách Hàng Mới"
                value={tongKhachHangMoi}
                icon={<People />}
                color="#7E57C2"
                subtitle="trong kỳ"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Khách VIP / Thân Thiết"
                value={`${khachHangVip} / ${khachHangThanThiet}`}
                icon={<People />}
                color="#FF7043"
                subtitle="tổng cộng"
              />
            </Grid>
          </Grid>

          {/* ===== DETAIL DRILL-DOWN PANEL ===== */}
          <Collapse in={selectedCard !== null}>
            {selectedCard &&
              (() => {
                // Determine title + data based on selected card
                const cardConfigs: Record<
                  Exclude<CardKey, null>,
                  {
                    title: string;
                    type: "order" | "transaction";
                    useRevenueOrders?: boolean;
                    filterOrders?: (d: DonHang) => boolean;
                    filterGD?: (g: GiaoDich) => boolean;
                  }
                > = {
                  revenue: {
                    title: "💰 Đơn đã giao khách trong kỳ",
                    type: "order",
                    useRevenueOrders: true,
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.DA_GIAO,
                  },
                  actualRevenue: {
                    title: "💵 Thực thu từ giao dịch trong kỳ",
                    type: "transaction",
                    filterGD: () => true,
                  },
                  total: {
                    title: "📋 Tất cả đơn hàng",
                    type: "order",
                    filterOrders: () => true,
                  },
                  completed: {
                    title: "✅ Đơn hoàn thành + Đã giao",
                    type: "order",
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.HOAN_THANH ||
                      d.trangThai === TrangThaiDonHang.DA_GIAO,
                  },
                  daGiao: {
                    title: "🚚 Đơn đã giao khách",
                    type: "order",
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.DA_GIAO,
                  },
                  chuaGiat: {
                    title: "⏳ Đơn chưa giặt (Chờ xử lý + Chờ cân ký)",
                    type: "order",
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.CHO_XU_LY ||
                      d.trangThai === TrangThaiDonHang.CHO_CAN_KY,
                  },
                  dangGiat: {
                    title: "🧺 Đơn đang xử lý",
                    type: "order",
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.DANG_XU_LY,
                  },
                  chuaTra: {
                    title: "⏰ Đơn chưa trả khách (Hoàn thành nhưng chưa giao)",
                    type: "order",
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.HOAN_THANH,
                  },
                  daHuy: {
                    title: "❌ Đơn đã hủy",
                    type: "order",
                    filterOrders: (d) =>
                      d.trangThai === TrangThaiDonHang.DA_HUY,
                  },
                  tienMat: {
                    title: "💵 Giao dịch tiền mặt",
                    type: "transaction",
                    filterGD: (g) =>
                      g.phuongThucThanhToan === PhuongThucThanhToan.TIEN_MAT,
                  },
                  chuyenKhoan: {
                    title: "🏦 Giao dịch chuyển khoản",
                    type: "transaction",
                    filterGD: (g) =>
                      g.phuongThucThanhToan ===
                      PhuongThucThanhToan.CHUYEN_KHOAN,
                  },
                };
                const cfg = cardConfigs[selectedCard];
                const isOrder = cfg.type === "order";
                const sourceOrders = cfg.useRevenueOrders
                  ? revenueOrders
                  : statusOrders;
                const orderList = isOrder
                  ? sourceOrders.filter(cfg.filterOrders!)
                  : [];
                const gdList = !isOrder
                  ? filteredGiaoDichs.filter(cfg.filterGD!)
                  : [];

                return (
                  <Card
                    sx={{
                      mb: 3,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={700}>
                          {cfg.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setSelectedCard(null)}
                        >
                          <Close />
                        </IconButton>
                      </Box>

                      {isOrder ? (
                        <TableContainer
                          component={Paper}
                          elevation={0}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            maxHeight: 400,
                            overflow: "auto",
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow
                                sx={{
                                  "& th": {
                                    bgcolor: "grey.100",
                                    fontWeight: 700,
                                  },
                                }}
                              >
                                <TableCell>Mã ĐH</TableCell>
                                <TableCell>Khách hàng</TableCell>
                                <TableCell>
                                  {selectedCard === "revenue" ||
                                  selectedCard === "daGiao"
                                    ? "Ngày giao"
                                    : "Ngày tạo"}
                                </TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Nhân viên</TableCell>
                                <TableCell>Hẹn trả</TableCell>
                                <TableCell align="right">Tổng tiền</TableCell>
                                <TableCell align="right">Đã trả</TableCell>
                                <TableCell align="right">Còn lại</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {orderList.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={9}
                                    align="center"
                                    sx={{ py: 4, color: "text.secondary" }}
                                  >
                                    Không có đơn hàng nào
                                  </TableCell>
                                </TableRow>
                              ) : (
                                orderList.map((d) => (
                                  <TableRow key={d.maDonHang} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                      {d.maDonHang}
                                    </TableCell>
                                    <TableCell>
                                      {customerMap.get(d.maKhachHang) || "—"}
                                    </TableCell>
                                    <TableCell>
                                      {(() => {
                                        const isNgayGiao =
                                          selectedCard === "revenue" ||
                                          selectedCard === "daGiao";
                                        const ts = isNgayGiao
                                          ? d.ngayGiao
                                          : d.ngayTao;
                                        return ts?.toDate
                                          ? format(ts.toDate(), "dd/MM HH:mm")
                                          : "—";
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={TRANG_THAI_LABELS[d.trangThai]}
                                        size="small"
                                        sx={{
                                          bgcolor:
                                            TRANG_THAI_COLORS[d.trangThai],
                                          color: "#fff",
                                          fontWeight: 600,
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {userMap.get(d.maNhanVien) ||
                                        d.maNhanVien}
                                    </TableCell>
                                    <TableCell>
                                      {d.ngayHenTra?.toDate
                                        ? format(
                                            d.ngayHenTra.toDate(),
                                            "dd/MM HH:mm",
                                          )
                                        : "—"}
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {formatCurrency(d.tongTien)}
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {formatCurrency(d.tienDaTra)}
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        color:
                                          d.tienConLai > 0
                                            ? "error.main"
                                            : "success.main",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {formatCurrency(d.tienConLai)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <TableContainer
                          component={Paper}
                          elevation={0}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            maxHeight: 400,
                            overflow: "auto",
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow
                                sx={{
                                  "& th": {
                                    bgcolor: "grey.100",
                                    fontWeight: 700,
                                  },
                                }}
                              >
                                <TableCell>Mã GD</TableCell>
                                <TableCell>Mã ĐH</TableCell>
                                <TableCell>Ngày GD</TableCell>
                                <TableCell>Nhân viên</TableCell>
                                <TableCell>Phương thức</TableCell>
                                <TableCell align="right">Số tiền</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {gdList.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    align="center"
                                    sx={{ py: 4, color: "text.secondary" }}
                                  >
                                    Không có giao dịch nào
                                  </TableCell>
                                </TableRow>
                              ) : (
                                gdList.map((g) => (
                                  <TableRow key={g.maGiaoDich} hover>
                                    <TableCell
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      {g.maGiaoDich.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                      {g.maDonHang}
                                    </TableCell>
                                    <TableCell>
                                      {g.ngayGiaoDich?.toDate
                                        ? format(
                                            g.ngayGiaoDich.toDate(),
                                            "dd/MM HH:mm",
                                          )
                                        : "—"}
                                    </TableCell>
                                    <TableCell>
                                      {userMap.get(g.maNhanVien) ||
                                        g.maNhanVien}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        label={
                                          g.phuongThucThanhToan ===
                                          PhuongThucThanhToan.TIEN_MAT
                                            ? "Tiền mặt"
                                            : "Chuyển khoản"
                                        }
                                        color={
                                          g.phuongThucThanhToan ===
                                          PhuongThucThanhToan.TIEN_MAT
                                            ? "success"
                                            : "info"
                                        }
                                        variant="outlined"
                                        sx={{
                                          fontWeight: 600,
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        fontWeight: 700,
                                        color: "primary.main",
                                      }}
                                    >
                                      {formatCurrency(g.soTien)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1.5, display: "block" }}
                      >
                        Tổng:{" "}
                        {isOrder
                          ? `${orderList.length} đơn hàng — ${formatCurrency(orderList.reduce((s, d) => s + d.tongTien, 0))}`
                          : `${gdList.length} giao dịch — ${formatCurrency(gdList.reduce((s, g) => s + g.soTien, 0))}`}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })()}
          </Collapse>

          {/* OVERDUE WARNING */}
          {stats.overdue.length > 0 && (
            <Card
              sx={{
                mb: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "warning.main",
                bgcolor: alpha("#FF9800", 0.04),
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  color="warning.main"
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Warning /> ⚠️ {stats.overdue.length} đơn quá hạn chưa giao
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Mã ĐH</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Khách hàng
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Trạng thái
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Hẹn trả</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Tổng tiền
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.overdue.slice(0, 10).map((d) => (
                        <TableRow key={d.maDonHang}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {d.maDonHang}
                          </TableCell>
                          <TableCell>
                            {customerMap.get(d.maKhachHang) || "—"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={TRANG_THAI_LABELS[d.trangThai]}
                              size="small"
                              sx={{
                                bgcolor: TRANG_THAI_COLORS[d.trangThai],
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.7rem",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{ color: "error.main", fontWeight: 600 }}
                          >
                            {d.ngayHenTra?.toDate
                              ? format(d.ngayHenTra.toDate(), "dd/MM HH:mm")
                              : "—"}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(d.tongTien)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {stats.overdue.length > 10 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    ...và {stats.overdue.length - 10} đơn khác
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* CHARTS ROW */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Revenue chart */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    📈 Biểu đồ doanh thu
                  </Typography>
                  {revenueChartData.length > 0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height={300}
                      className="no-print"
                    >
                      <BarChart
                        data={revenueChartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={alpha("#000", 0.06)}
                        />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(v: number | undefined) =>
                            formatCurrency(v ?? 0)
                          }
                        />
                        <Bar
                          dataKey="doanhThu"
                          name="Doanh thu"
                          fill="#1565C0"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography
                      color="text.secondary"
                      textAlign="center"
                      sx={{ py: 8 }}
                    >
                      Chưa có dữ liệu
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Status pie */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    🥧 Tình trạng đơn hàng
                  </Typography>
                  {statusData.length > 0 ? (
                    <>
                      <ResponsiveContainer
                        width="100%"
                        height={220}
                        className="no-print"
                      >
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={
                                  entry.color ||
                                  PIE_COLORS[i % PIE_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(
                              v: number | undefined,
                              name?: string,
                            ) => [`${v ?? 0} đơn`, name ?? ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: 1,
                          justifyContent: "center",
                        }}
                      >
                        {statusData.map((s, i) => (
                          <Chip
                            key={i}
                            size="small"
                            label={`${s.name}: ${s.value} (${s.percent}%)`}
                            sx={{
                              bgcolor: alpha(s.color || PIE_COLORS[i], 0.12),
                              color: s.color || PIE_COLORS[i],
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Typography
                      color="text.secondary"
                      textAlign="center"
                      sx={{ py: 8 }}
                    >
                      Chưa có đơn
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* SERVICE STATS TABLE */}
          {serviceData.length > 0 && (
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  🧺 Top dịch vụ phổ biến
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Dịch vụ</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Số lượng
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Doanh thu
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 200 }}>
                          Tỷ trọng
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {serviceData.map((row) => {
                        const maxRev = serviceData[0]?.revenue || 1;
                        return (
                          <TableRow key={row.name}>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {row.name}
                            </TableCell>
                            <TableCell align="right">{row.value}</TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontWeight: 600, color: "primary.main" }}
                            >
                              {formatCurrency(row.revenue)}
                            </TableCell>
                            <TableCell>
                              <LinearProgress
                                variant="determinate"
                                value={(row.revenue / maxRev) * 100}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: alpha("#1565C0", 0.1),
                                  "& .MuiLinearProgress-bar": {
                                    borderRadius: 4,
                                  },
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ===== TAB 1: THEO NHÂN VIÊN ===== */}
      {tabValue === 1 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              👤 Thống kê theo nhân viên
            </Typography>
            {employeeStats.length > 0 ? (
              <>
                <ResponsiveContainer
                  width="100%"
                  height={300}
                  className="no-print"
                >
                  <BarChart
                    data={employeeStats}
                    margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha("#000", 0.06)}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(v: number | undefined, name?: string) =>
                        name === "Doanh thu"
                          ? formatCurrency(v ?? 0)
                          : `${v ?? 0} đơn`
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="doanhThu"
                      name="Doanh thu"
                      fill="#1565C0"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="soDon"
                      name="Số đơn"
                      fill="#66BB6A"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  variant="outlined"
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "grey.50" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Nhân viên
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Số đơn
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Hoàn thành
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Doanh thu
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Tỷ trọng
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employeeStats.map((e) => (
                        <TableRow key={e.uid}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {e.name}
                          </TableCell>
                          <TableCell align="right">{e.soDon}</TableCell>
                          <TableCell align="right">{e.hoanThanh}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "primary.main", fontWeight: 700 }}
                          >
                            {formatCurrency(e.doanhThu)}
                          </TableCell>
                          <TableCell align="right">
                            {stats.revenue > 0
                              ? `${((e.doanhThu / stats.revenue) * 100).toFixed(1)}%`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: 800 }}>
                          Tổng cộng
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {stats.total}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {stats.completed}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 800, color: "primary.main" }}
                        >
                          {formatCurrency(stats.revenue)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          100%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography
                color="text.secondary"
                textAlign="center"
                sx={{ py: 8 }}
              >
                Chưa có dữ liệu
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== TAB 2: LỊCH SỬ BÁO CÁO ===== */}
      {tabValue === 2 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              📋 Lịch sử báo cáo đã lưu
            </Typography>
            {lichSuBaoCao.length === 0 ? (
              <Typography
                color="text.secondary"
                sx={{ py: 4, textAlign: "center" }}
              >
                Chưa có báo cáo nào được lưu
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <Table>
                  <TableHead sx={{ bgcolor: "grey.50" }}>
                    <TableRow>
                      <TableCell>Mã Báo Cáo</TableCell>
                      <TableCell>Ngày Lưu</TableCell>
                      <TableCell>Kỳ Báo Cáo</TableCell>
                      <TableCell align="right">
                        Doanh thu (theo ngày giao)
                      </TableCell>
                      <TableCell align="right">Số Đơn</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lichSuBaoCao.map((bc) => {
                      const dl = bc.duLieu as {
                        tongDoanhThu?: number;
                        tongDonHang?: number;
                      };
                      return (
                        <TableRow key={bc.maBaoCao}>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {bc.maBaoCao}
                          </TableCell>
                          <TableCell>
                            {format(bc.ngayTao.toDate(), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {format(bc.tuNgay.toDate(), "dd/MM/yyyy")} -{" "}
                            {format(bc.denNgay.toDate(), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "primary.main", fontWeight: 600 }}
                          >
                            {formatCurrency(dl.tongDoanhThu ?? 0)}
                          </TableCell>
                          <TableCell align="right">
                            {dl.tongDonHang ?? 0}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; padding: 0; margin: 0; }
          @page { margin: 2cm; }
        }
      `}</style>
    </Box>
  );
}
