import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  TextField,
  InputAdornment,
  TableSortLabel,
} from "@mui/material";
import {
  Visibility,
  Search,
  Print,
  Warning,
  NavigateNext,
  NavigateBefore,
  Delete,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { donHangService } from "../../services/donHangService";
import { userService } from "../../services/userService";
import type { DonHang } from "../../types";
import { TrangThaiDonHang, VaiTro } from "../../types";
import {
  TRANG_THAI_LABELS,
  TRANG_THAI_COLORS,
  formatCurrency,
  getStatusTransitionsForRole,
  VALID_STATUS_TRANSITIONS,
} from "../../utils/constants";
import { logError, getUserMessage } from "../../utils/errorHandler";
import { printService } from "../../services/printService";
import { khachHangService } from "../../services/khachHangService";

export default function DonHangPage() {
  const { userProfile } = useAuth();
  const vaiTro = userProfile?.vaiTro;
  const [donHangs, setDonHangs] = useState<DonHang[]>([]);

  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TrangThaiDonHang | "">("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<DonHang | null>(null);

  // Sorting state
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = useState<string>("ngayTao");

  // Delete control
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<DonHang | null>(null);

  // Employee name mapping: uid → hoTen
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  // Customer mapping: maKhachHang → { hoTen, soDienThoai }
  const [customerMap, setCustomerMap] = useState<
    Record<string, { hoTen: string; soDienThoai: string }>
  >({});

  // Yêu Cầu 11: Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const cursorStackRef = useRef<any[]>([null]); // stack of lastDoc cursors per page

  const loadData = async (
    cursor?: any,
    currentPage = 0,
  ): Promise<DonHang[] | null> => {
    setLoading(true);
    try {
      const maCuaHang = userProfile?.maCuaHang || "";
      const result = await donHangService.getByMaCuaHangPaginated(maCuaHang, {
        trangThai: filterStatus
          ? (filterStatus as TrangThaiDonHang)
          : undefined,
        lastDoc: cursor || null,
      });
      setDonHangs(result.data);
      setHasMore(result.hasMore);
      // Store cursor for next page
      if (result.lastDoc) {
        cursorStackRef.current[currentPage + 1] = result.lastDoc;
      }
      return result.data;
    } catch (err) {
      logError(err, "DonHangPage.loadData");
      toast.error(getUserMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const maCuaHang = userProfile?.maCuaHang || "";
    if (!maCuaHang) return;
    Promise.all([
      userService.getByMaCuaHang(maCuaHang),
      khachHangService.getByMaCuaHang(maCuaHang),
    ])
      .then(([employees, customers]) => {
        const map: Record<string, string> = {};
        employees.forEach((e) => {
          map[e.uid] = e.hoTen;
        });
        setEmployeeMap(map);

        const custMap: Record<string, { hoTen: string; soDienThoai: string }> =
          {};
        customers.forEach((c) => {
          custMap[c.maKhachHang] = {
            hoTen: c.hoTen,
            soDienThoai: c.soDienThoai,
          };
        });
        setCustomerMap(custMap);
      })
      .catch((err) => {
        logError(err, "DonHangPage.loadReferenceData");
        toast.error(getUserMessage(err));
      });
  }, [userProfile?.maCuaHang]);

  useEffect(() => {
    if (!userProfile?.maCuaHang) return;
    setPage(0);
    cursorStackRef.current = [null];
    loadData(undefined, 0);
  }, [filterStatus, userProfile?.maCuaHang]);

  const handleNextPage = () => {
    const nextPage = page + 1;
    const nextCursor = cursorStackRef.current[nextPage];
    setPage(nextPage);
    loadData(nextCursor, nextPage);
  };

  const handlePrevPage = () => {
    if (page <= 0) return;
    const prevPage = page - 1;
    const prevCursor = cursorStackRef.current[prevPage];
    setPage(prevPage);
    loadData(prevCursor, prevPage);
  };

  // #25-27: Filter by phone/code and date range (client-side)
  const filteredOrders = donHangs.filter((dh) => {
    // Search by maDonHang or maKhachHang
    if (searchPhone.trim()) {
      const s = searchPhone.trim().toLowerCase();
      const sUpper = s.toUpperCase();
      const custInfo = customerMap[dh.maKhachHang];
      const matchCode = dh.maDonHang.toUpperCase().includes(sUpper);
      const matchCustName = custInfo?.hoTen?.toLowerCase().includes(s);
      const matchCustPhone = custInfo?.soDienThoai?.includes(
        searchPhone.trim(),
      );
      if (!matchCode && !matchCustName && !matchCustPhone) return false;
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

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let result = 0;
    switch (orderBy) {
      case "maDonHang":
        result = a.maDonHang.localeCompare(b.maDonHang);
        break;
      case "khachHang":
        const nameA = customerMap[a.maKhachHang]?.hoTen || "";
        const nameB = customerMap[b.maKhachHang]?.hoTen || "";
        result = nameA.localeCompare(nameB, "vi");
        break;
      case "ngayHenTra":
        const timeA = a.ngayHenTra?.toMillis?.() || 0;
        const timeB = b.ngayHenTra?.toMillis?.() || 0;
        result = timeA - timeB;
        break;
      case "tongTien":
        result = a.tongTien - b.tongTien;
        break;
      case "tienDaTra":
        result = a.tienDaTra - b.tienDaTra;
        break;
      case "maNhanVien":
        const empA = employeeMap[a.maNhanVien] || "";
        const empB = employeeMap[b.maNhanVien] || "";
        result = empA.localeCompare(empB, "vi");
        break;
      case "ngayTao":
      default:
        const tA = a.ngayTao?.toMillis?.() || 0;
        const tB = b.ngayTao?.toMillis?.() || 0;
        result = tA - tB;
        break;
    }
    return orderDirection === "asc" ? result : -result;
  });

  const handleUpdateStatus = async (
    id: string,
    newStatus: TrangThaiDonHang,
    isAdminOverride = false,
  ) => {
    try {
      await donHangService.updateStatus(
        id,
        newStatus,
        userProfile?.uid || "",
        isAdminOverride ? "Admin sửa trạng thái" : undefined,
        isAdminOverride ? vaiTro : undefined,
        userProfile?.maCuaHang || "",
      );
      toast.success("Cập nhật trạng thái thành công");

      // #8: Notify when HOAN_THANH or DA_GIAO
      if (newStatus === TrangThaiDonHang.HOAN_THANH) {
        toast('📱 Đã gửi thông báo "Đơn hàng hoàn thành" cho khách hàng', {
          icon: "🔔",
          duration: 4000,
        });
      } else if (newStatus === TrangThaiDonHang.DA_GIAO) {
        toast('📱 Đã gửi thông báo "Đơn hàng đã giao" cho khách hàng', {
          icon: "🔔",
          duration: 4000,
        });
      }

      const refreshed = await loadData(
        cursorStackRef.current[page] || null,
        page,
      );
      if (selected && refreshed) {
        const updated = refreshed.find((order) => order.maDonHang === id);
        if (!updated) {
          // Criteria 1: Order not found
          toast.error(
            "Không tìm thấy đơn hàng. Thử tìm kiếm theo số điện thoại khách hàng.",
            { duration: 5000 },
          );
          setSelected(null);
          setDetailOpen(false);
          return;
        }
        setSelected(updated);
      }
    } catch (err: any) {
      logError(err, "DonHangPage.handleUpdateStatus", { id, newStatus });
      // Criteria 2: Invalid status transition → show valid statuses
      if (err.message?.includes("Không thể chuyển")) {
        const current = selected?.trangThai;
        if (current) {
          const validStatuses = VALID_STATUS_TRANSITIONS[current]
            ?.map((s) => TRANG_THAI_LABELS[s])
            .join(", ");
          toast.error(
            `${err.message}\n\nTrạng thái hợp lệ: ${validStatuses || "Không có"}`,
            { duration: 6000 },
          );
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error(getUserMessage(err));
      }
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await donHangService.delete(orderToDelete.maDonHang, userProfile?.maCuaHang || "");
      toast.success("Xóa đơn hàng thành công");
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
      await loadData(cursorStackRef.current[page] || null, page);
    } catch (err) {
      logError(err, "DonHangPage.handleDeleteOrder", {
        id: orderToDelete.maDonHang,
      });
      toast.error(getUserMessage(err));
    }
  };

  // Admin edit status control
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [statusToEdit, setStatusToEdit] = useState<TrangThaiDonHang | null>(
    null,
  );

  const confirmAdminEditStatus = async () => {
    if (!selected || !statusToEdit) return;
    await handleUpdateStatus(selected.maDonHang, statusToEdit, true);
    setEditConfirmOpen(false);
    setStatusToEdit(null);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "-";
    return format(timestamp.toDate(), "dd/MM/yyyy HH:mm", { locale: vi });
  };

  const statusSteps = [
    TrangThaiDonHang.CHO_XU_LY,
    TrangThaiDonHang.DANG_XU_LY,
    TrangThaiDonHang.HOAN_THANH,
    TrangThaiDonHang.DA_GIAO,
  ];

  const getActiveStep = (status: TrangThaiDonHang) => {
    const idx = statusSteps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const handlePrint = async (donHangToPrint?: DonHang) => {
    const targetOrder = donHangToPrint || selected;
    if (!targetOrder) return;
    const maCuaHang = userProfile?.maCuaHang || "";
    try {
      const jobId = await printService.requestPrint(
        maCuaHang,
        targetOrder.maDonHang,
        userProfile?.hoTen || "NV",
        "IN_LAI",
      );
      toast.loading("🖨 Đang gửi lệnh in lại...", { id: `print-${jobId}` });

      // Listen for realtime print status from print-server
      const unsubscribe = printService.listenForPrintStatus(
        jobId,
        (status, errorMsg) => {
          if (status === "PRINTING") {
            toast.loading("🖨 Đang in...", { id: `print-${jobId}` });
          } else if (status === "SUCCESS") {
            toast.success(`✅ In lại thành công đơn ${targetOrder.maDonHang}`, {
              id: `print-${jobId}`,
            });
            unsubscribe();
          } else if (status === "FAILED") {
            toast.error(`❌ Lỗi in: ${errorMsg || "Không xác định"}`, {
              id: `print-${jobId}`,
              duration: 5000,
            });
            unsubscribe();
          }
        },
      );
      setTimeout(() => unsubscribe(), 30000);
    } catch (err) {
      toast.error("Lỗi khi gửi lệnh in");
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Quản lý đơn hàng
        </Typography>
      </Box>

      {/* Filters: #25 (phone/code search), #26 (status filter) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "auto auto auto auto",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder="Tìm mã đơn, SĐT..."
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: { xs: "100%", md: 220 } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
          <InputLabel>Lọc trạng thái</InputLabel>
          <Select
            value={filterStatus}
            label="Lọc trạng thái"
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(TRANG_THAI_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="date"
          label="Từ ngày"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: "100%", md: 160 } }}
        />
        <TextField
          size="small"
          type="date"
          label="Đến ngày"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: "100%", md: 160 } }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {hasMore && orderBy !== "ngayTao" && (
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ display: "block", mb: 1 }}
            >
              Lưu ý: Sắp xếp chỉ áp dụng cho trang hiện tại
            </Typography>
          )}
          <TableContainer
            component={Paper}
            sx={{ borderRadius: 3, overflowX: "auto" }}
          >
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={orderBy === "maDonHang"}
                      direction={
                        orderBy === "maDonHang" ? orderDirection : "asc"
                      }
                      onClick={() => handleRequestSort("maDonHang")}
                    >
                      Mã đơn
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={orderBy === "khachHang"}
                      direction={
                        orderBy === "khachHang" ? orderDirection : "asc"
                      }
                      onClick={() => handleRequestSort("khachHang")}
                    >
                      Khách hàng
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === "ngayTao"}
                      direction={orderBy === "ngayTao" ? orderDirection : "asc"}
                      onClick={() => handleRequestSort("ngayTao")}
                    >
                      Ngày tạo
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === "ngayHenTra"}
                      direction={
                        orderBy === "ngayHenTra" ? orderDirection : "asc"
                      }
                      onClick={() => handleRequestSort("ngayHenTra")}
                    >
                      Hẹn trả
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === "tongTien"}
                      direction={
                        orderBy === "tongTien" ? orderDirection : "asc"
                      }
                      onClick={() => handleRequestSort("tongTien")}
                    >
                      Tổng tiền
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === "tienDaTra"}
                      direction={
                        orderBy === "tienDaTra" ? orderDirection : "asc"
                      }
                      onClick={() => handleRequestSort("tienDaTra")}
                    >
                      Đã trả
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === "maNhanVien"}
                      direction={
                        orderBy === "maNhanVien" ? orderDirection : "asc"
                      }
                      onClick={() => handleRequestSort("maNhanVien")}
                    >
                      Nhân viên
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    Trạng thái
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      Chưa có đơn hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((dh) => (
                    <TableRow key={dh.maDonHang} hover>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dh.maDonHang}
                        {/* #29: Badge "Chưa xác định dịch vụ" for mode 2 orders */}
                        {!dh.daXacDinhDichVu && (
                          <Chip
                            label="Chưa XĐ DV"
                            size="small"
                            color="warning"
                            variant="outlined"
                            icon={
                              <Warning sx={{ fontSize: "14px !important" }} />
                            }
                            sx={{ ml: 1, height: 22, fontSize: "0.65rem" }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {customerMap[dh.maKhachHang] ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {customerMap[dh.maKhachHang].hoTen}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {customerMap[dh.maKhachHang].soDienThoai}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          display: { xs: "none", md: "table-cell" },
                        }}
                      >
                        {formatDate(dh.ngayTao)}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          display: { xs: "none", md: "table-cell" },
                        }}
                      >
                        {formatDate(dh.ngayHenTra)}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          display: { xs: "none", sm: "table-cell" },
                        }}
                      >
                        {dh.tongTien > 0 ? (
                          formatCurrency(dh.tongTien)
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: "italic" }}
                          >
                            Chưa XĐ
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          display: { xs: "none", sm: "table-cell" },
                        }}
                      >
                        {formatCurrency(dh.tienDaTra)}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          display: { xs: "none", md: "table-cell" },
                          fontSize: "0.85rem",
                        }}
                      >
                        {employeeMap[dh.maNhanVien] || "-"}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          label={TRANG_THAI_LABELS[dh.trangThai]}
                          size="small"
                          sx={{
                            bgcolor: TRANG_THAI_COLORS[dh.trangThai],
                            color: "white",
                            fontWeight: 600,
                            minWidth: 90,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Chi tiết"
                          onClick={() => {
                            setSelected(dh);
                            setDetailOpen(true);
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          title="In phiếu"
                          onClick={() => {
                            handlePrint(dh);
                          }}
                        >
                          <Print fontSize="small" />
                        </IconButton>
                        {(vaiTro === VaiTro.ADMIN ||
                          vaiTro === VaiTro.SUPER_ADMIN) && (
                          <IconButton
                            size="small"
                            color="error"
                            title="Xóa đơn"
                            onClick={() => {
                              setOrderToDelete(dh);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Yêu Cầu 11: Pagination Controls */}
      {!loading && (page > 0 || hasMore) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 2,
          }}
        >
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
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selected ? (
          <>
            <DialogTitle>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6">
                  Đơn hàng {selected.maDonHang}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {!selected.daXacDinhDichVu && (
                    <Chip
                      label="Chưa xác định dịch vụ"
                      color="warning"
                      size="small"
                      icon={<Warning />}
                    />
                  )}
                  <Chip
                    label={TRANG_THAI_LABELS[selected.trangThai]}
                    sx={{
                      bgcolor: TRANG_THAI_COLORS[selected.trangThai],
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* Customer info */}
              {customerMap[selected.maKhachHang] ? (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  👤 Khách hàng:{" "}
                  <strong>{customerMap[selected.maKhachHang].hoTen}</strong> —{" "}
                  {customerMap[selected.maKhachHang].soDienThoai}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ mb: 1 }}
                  color="text.secondary"
                >
                  👤 Khách hàng: <em>{selected.maKhachHang}</em>
                </Typography>
              )}
              {/* Employee info */}
              <Typography variant="body2" sx={{ mb: 2 }}>
                💼 Nhân viên tiếp nhận:{" "}
                <strong>
                  {employeeMap[selected.maNhanVien] ||
                    selected.maNhanVien ||
                    "-"}
                </strong>
              </Typography>
              {selected.trangThai !== TrangThaiDonHang.DA_HUY ? (
                <Stepper
                  activeStep={getActiveStep(selected.trangThai)}
                  alternativeLabel
                  sx={{ mb: 3 }}
                >
                  {statusSteps.map((s) => (
                    <Step key={s}>
                      <StepLabel>{TRANG_THAI_LABELS[s]}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              ) : null}

              {/* Services table */}
              {selected.danhSachDichVu.length > 0 ? (
                <>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Dịch vụ
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  >
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
                            <TableCell align="right">
                              {dv.trongLuong > 0
                                ? `${dv.trongLuong} kg`
                                : `${dv.soLuong}`}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(dv.donGia)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(dv.thanhTien)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                            Tổng tiền
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(selected.tongTien)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Box
                  sx={{
                    p: 3,
                    textAlign: "center",
                    bgcolor: "warning.50",
                    borderRadius: 2,
                    mb: 2,
                    border: "1px dashed",
                    borderColor: "warning.main",
                  }}
                >
                  <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Chưa xác định dịch vụ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dịch vụ và giá sẽ được xác định sau khi giặt
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Đã trả
                  </Typography>
                  <Typography fontWeight={600} color="success.main">
                    {formatCurrency(selected.tienDaTra)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Còn lại
                  </Typography>
                  <Typography fontWeight={600} color="error.main">
                    {formatCurrency(selected.tienConLai)}
                  </Typography>
                </Box>
              </Box>

              {/* Status History */}
              {selected.lichSuCapNhat?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Lịch sử trạng thái
                  </Typography>
                  {selected.lichSuCapNhat.map((ls, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        gap: 1,
                        mb: 0.5,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(ls.thoiGian)}
                      </Typography>
                      <Chip
                        label={TRANG_THAI_LABELS[ls.trangThaiCu]}
                        size="small"
                        sx={{ height: 20, fontSize: "0.6rem" }}
                      />
                      <Typography variant="caption">→</Typography>
                      <Chip
                        label={TRANG_THAI_LABELS[ls.trangThaiMoi]}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.6rem",
                          bgcolor: TRANG_THAI_COLORS[ls.trangThaiMoi],
                          color: "white",
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              {/* Status update buttons */}
              {/* #1-4: Role-based status transitions */}
              {vaiTro &&
              getStatusTransitionsForRole(selected.trangThai, vaiTro).length >
                0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Cập nhật trạng thái
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {getStatusTransitionsForRole(
                      selected.trangThai,
                      vaiTro,
                    ).map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: TRANG_THAI_COLORS[nextStatus],
                          color: TRANG_THAI_COLORS[nextStatus],
                        }}
                        onClick={() =>
                          handleUpdateStatus(selected.maDonHang, nextStatus)
                        }
                      >
                        → {TRANG_THAI_LABELS[nextStatus]}
                      </Button>
                    ))}
                  </Box>
                </Box>
              ) : null}

              {/* Admin Override: Allow changing to ANY status */}
              {(vaiTro === VaiTro.ADMIN || vaiTro === VaiTro.SUPER_ADMIN) && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: "error.50",
                    borderRadius: 2,
                    border: "1px dashed",
                    borderColor: "error.main",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    color="error.main"
                    gutterBottom
                  >
                    ⚠️ Sửa trạng thái bất kỳ (Admin)
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <FormControl
                      size="small"
                      sx={{ minWidth: 200, bgcolor: "white" }}
                    >
                      <InputLabel>Chọn trạng thái</InputLabel>
                      <Select
                        value={statusToEdit || ""}
                        label="Chọn trạng thái"
                        onChange={(e) =>
                          setStatusToEdit(e.target.value as TrangThaiDonHang)
                        }
                      >
                        {Object.entries(TRANG_THAI_LABELS).map(([k, v]) => (
                          <MenuItem
                            key={k}
                            value={k}
                            disabled={k === selected.trangThai}
                          >
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      disabled={!statusToEdit}
                      onClick={() => setEditConfirmOpen(true)}
                    >
                      Xác nhận sửa
                    </Button>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<Print />}
                onClick={() => {
                  handlePrint();
                  setDetailOpen(false);
                }}
              >
                In phiếu (Gửi đến máy in)
              </Button>
              <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Xác nhận xóa đơn hàng</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa đơn hàng{" "}
            <strong>{orderToDelete?.maDonHang}</strong> không? Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button onClick={handleDeleteOrder} color="error" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Status Confirmation Dialog */}
      <Dialog open={editConfirmOpen} onClose={() => setEditConfirmOpen(false)}>
        <DialogTitle>Xác nhận sửa trạng thái đơn hàng</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn đang thay đổi trạng thái đơn hàng{" "}
            <strong>{selected?.maDonHang}</strong> từ{" "}
            <strong>
              {selected ? TRANG_THAI_LABELS[selected.trangThai] : ""}
            </strong>{" "}
            sang{" "}
            <strong style={{ color: "red" }}>
              {statusToEdit ? TRANG_THAI_LABELS[statusToEdit] : ""}
            </strong>
            .
          </Typography>
          <Typography sx={{ mt: 1 }} color="text.secondary" variant="body2">
            Lưu ý: Hành động này dành cho Admin để sửa sai sót. Lịch sử trạng
            thái sẽ ghi nhận sự thay đổi này.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditConfirmOpen(false);
              setStatusToEdit(null);
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={confirmAdminEditStatus}
            color="error"
            variant="contained"
          >
            Đồng ý sửa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
