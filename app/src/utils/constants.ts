import { TrangThaiDonHang, VaiTro } from "../types";

/**
 * Removes Vietnamese diacritics and converts to uppercase for standardization
 * (Required by Napas247 VietQR parameters)
 */
export const removeVietnameseTones = (str: string): string => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|M/g, "O"); // Fix O
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Remove trailing and extra spaces
  return str.trim().replace(/\s+/g, " ").toUpperCase();
};

// ===== CHUYỂN TRẠNG THÁI HỢP LỆ =====
export const VALID_STATUS_TRANSITIONS: Record<
  TrangThaiDonHang,
  TrangThaiDonHang[]
> = {
  [TrangThaiDonHang.CHO_XU_LY]: [
    TrangThaiDonHang.DANG_XU_LY,
    TrangThaiDonHang.HOAN_THANH,
    TrangThaiDonHang.DA_HUY,
  ],
  [TrangThaiDonHang.CHO_CAN_KY]: [
    TrangThaiDonHang.HOAN_THANH,
    TrangThaiDonHang.DA_HUY,
  ],
  [TrangThaiDonHang.DANG_XU_LY]: [
    TrangThaiDonHang.HOAN_THANH,
    TrangThaiDonHang.DA_HUY,
  ],
  [TrangThaiDonHang.HOAN_THANH]: [TrangThaiDonHang.DA_GIAO],
  [TrangThaiDonHang.DA_GIAO]: [],
  [TrangThaiDonHang.DA_HUY]: [],
};

// ===== NHÃN TRẠNG THÁI =====
export const TRANG_THAI_LABELS: Record<TrangThaiDonHang, string> = {
  [TrangThaiDonHang.CHO_XU_LY]: "Chờ xử lý",
  [TrangThaiDonHang.CHO_CAN_KY]: "Chờ cân ký",
  [TrangThaiDonHang.DANG_XU_LY]: "Đang xử lý",
  [TrangThaiDonHang.HOAN_THANH]: "Hoàn thành",
  [TrangThaiDonHang.DA_GIAO]: "Đã giao",
  [TrangThaiDonHang.DA_HUY]: "Đã hủy",
};

// ===== MÀU TRẠNG THÁI =====
export const TRANG_THAI_COLORS: Record<TrangThaiDonHang, string> = {
  [TrangThaiDonHang.CHO_XU_LY]: "#FFA726",
  [TrangThaiDonHang.CHO_CAN_KY]: "#AB47BC",
  [TrangThaiDonHang.DANG_XU_LY]: "#42A5F5",
  [TrangThaiDonHang.HOAN_THANH]: "#4CAF50",
  [TrangThaiDonHang.DA_GIAO]: "#78909C",
  [TrangThaiDonHang.DA_HUY]: "#EF5350",
};

// ===== MA TRẬN PHÂN QUYỀN =====
export const PERMISSIONS: Record<VaiTro, string[]> = {
  [VaiTro.SUPER_ADMIN]: [
    "cuaHang.create",
    "cuaHang.read",
    "cuaHang.update",
    "cuaHang.delete",
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    "donHang.read",
    "khachHang.read",
    "dichVu.read",
    "giaoDich.read",
    "baoCao.create",
    "baoCao.read",
    "auditLog.read",
    "cauHinh.read",
    "cauHinh.update",
  ],
  [VaiTro.ADMIN]: [
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    "donHang.create",
    "donHang.read",
    "donHang.update",
    "donHang.delete",
    "khachHang.create",
    "khachHang.read",
    "khachHang.update",
    "khachHang.delete",
    "dichVu.create",
    "dichVu.read",
    "dichVu.update",
    "dichVu.delete",
    "giaoDich.create",
    "giaoDich.read",
    "giaoDich.update",
    "baoCao.create",
    "baoCao.read",
    "auditLog.read",
    "cauHinh.read",
    "cauHinh.update",
  ],
  [VaiTro.NHAN_VIEN_QUAY]: [
    "donHang.create",
    "donHang.read",
    "donHang.update",
    "khachHang.create",
    "khachHang.read",
    "khachHang.update",
    "dichVu.read",
    "giaoDich.create",
    "giaoDich.read",
    "giaoDich.update",
  ],
  [VaiTro.KY_THUAT_VIEN]: [
    "donHang.read",
    "donHang.updateStatus",
    "dichVu.read",
  ],
};

// ===== HELPER =====
export function hasPermission(vaiTro: VaiTro, permission: string): boolean {
  return PERMISSIONS[vaiTro]?.includes(permission) ?? false;
}

export function isValidStatusTransition(
  current: TrangThaiDonHang,
  next: TrangThaiDonHang,
): boolean {
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

// #1-2: Yêu Cầu 3 - Role-based status transitions
const KY_THUAT_VIEN_ALLOWED_STATUSES = new Set([
  TrangThaiDonHang.DANG_XU_LY,
  TrangThaiDonHang.HOAN_THANH,
]);

export function getStatusTransitionsForRole(
  currentStatus: TrangThaiDonHang,
  vaiTro: VaiTro,
): TrangThaiDonHang[] {
  const allValid = VALID_STATUS_TRANSITIONS[currentStatus] || [];

  // KY_THUAT_VIEN: chỉ được chuyển sang DANG_GIAT, DANG_SAY, DANG_UI, HOAN_THANH
  if (vaiTro === VaiTro.KY_THUAT_VIEN) {
    return allValid.filter((s) => KY_THUAT_VIEN_ALLOWED_STATUSES.has(s));
  }

  // NHAN_VIEN_QUAY, ADMIN, SUPER_ADMIN: tất cả trạng thái hợp lệ
  return allValid;
}

// ===== ROLE LABELS =====
export const VAI_TRO_LABELS: Record<VaiTro, string> = {
  [VaiTro.SUPER_ADMIN]: "Super Admin",
  [VaiTro.ADMIN]: "Admin",
  [VaiTro.NHAN_VIEN_QUAY]: "Nhân viên quầy",
  [VaiTro.KY_THUAT_VIEN]: "Kỹ thuật viên",
};

// ===== FORMAT HELPERS =====
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}
