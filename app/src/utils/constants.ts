import { TrangThaiDonHang, VaiTro } from '../types';

// ===== CHUYỂN TRẠNG THÁI HỢP LỆ =====
export const VALID_STATUS_TRANSITIONS: Record<TrangThaiDonHang, TrangThaiDonHang[]> = {
  [TrangThaiDonHang.CHO_XU_LY]: [TrangThaiDonHang.DANG_GIAT, TrangThaiDonHang.HOAN_THANH, TrangThaiDonHang.DA_HUY],
  [TrangThaiDonHang.CHO_CAN_KY]: [TrangThaiDonHang.HOAN_THANH, TrangThaiDonHang.DA_HUY],
  [TrangThaiDonHang.DANG_GIAT]: [TrangThaiDonHang.DANG_SAY, TrangThaiDonHang.DA_HUY],
  [TrangThaiDonHang.DANG_SAY]: [TrangThaiDonHang.DANG_UI, TrangThaiDonHang.HOAN_THANH, TrangThaiDonHang.DA_HUY],
  [TrangThaiDonHang.DANG_UI]: [TrangThaiDonHang.HOAN_THANH, TrangThaiDonHang.DA_HUY],
  [TrangThaiDonHang.HOAN_THANH]: [TrangThaiDonHang.DA_GIAO],
  [TrangThaiDonHang.DA_GIAO]: [],
  [TrangThaiDonHang.DA_HUY]: [],
};

// ===== NHÃN TRẠNG THÁI =====
export const TRANG_THAI_LABELS: Record<TrangThaiDonHang, string> = {
  [TrangThaiDonHang.CHO_XU_LY]: 'Chờ xử lý',
  [TrangThaiDonHang.CHO_CAN_KY]: 'Chờ cân ký',
  [TrangThaiDonHang.DANG_GIAT]: 'Đang giặt',
  [TrangThaiDonHang.DANG_SAY]: 'Đang sấy',
  [TrangThaiDonHang.DANG_UI]: 'Đang ủi',
  [TrangThaiDonHang.HOAN_THANH]: 'Hoàn thành',
  [TrangThaiDonHang.DA_GIAO]: 'Đã giao',
  [TrangThaiDonHang.DA_HUY]: 'Đã hủy',
};

// ===== MÀU TRẠNG THÁI =====
export const TRANG_THAI_COLORS: Record<TrangThaiDonHang, string> = {
  [TrangThaiDonHang.CHO_XU_LY]: '#FFA726',
  [TrangThaiDonHang.CHO_CAN_KY]: '#AB47BC',
  [TrangThaiDonHang.DANG_GIAT]: '#42A5F5',
  [TrangThaiDonHang.DANG_SAY]: '#26C6DA',
  [TrangThaiDonHang.DANG_UI]: '#66BB6A',
  [TrangThaiDonHang.HOAN_THANH]: '#4CAF50',
  [TrangThaiDonHang.DA_GIAO]: '#78909C',
  [TrangThaiDonHang.DA_HUY]: '#EF5350',
};

// ===== MA TRẬN PHÂN QUYỀN =====
export const PERMISSIONS: Record<VaiTro, string[]> = {
  [VaiTro.SUPER_ADMIN]: [
    'cuaHang.create', 'cuaHang.read', 'cuaHang.update', 'cuaHang.delete',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'donHang.read',
    'khachHang.read',
    'dichVu.read',
    'giaoDich.read',
    'baoCao.create', 'baoCao.read',
    'auditLog.read',
    'cauHinh.read', 'cauHinh.update',
  ],
  [VaiTro.ADMIN]: [
    'user.create', 'user.read', 'user.update', 'user.delete',
    'donHang.create', 'donHang.read', 'donHang.update', 'donHang.delete',
    'khachHang.create', 'khachHang.read', 'khachHang.update', 'khachHang.delete',
    'dichVu.create', 'dichVu.read', 'dichVu.update', 'dichVu.delete',
    'giaoDich.create', 'giaoDich.read', 'giaoDich.update',
    'baoCao.create', 'baoCao.read',
    'auditLog.read',
    'cauHinh.read', 'cauHinh.update',
  ],
  [VaiTro.NHAN_VIEN_QUAY]: [
    'donHang.create', 'donHang.read', 'donHang.update',
    'khachHang.create', 'khachHang.read', 'khachHang.update',
    'dichVu.read',
    'giaoDich.create', 'giaoDich.read', 'giaoDich.update',
  ],
  [VaiTro.KY_THUAT_VIEN]: [
    'donHang.read', 'donHang.updateStatus',
    'dichVu.read',
  ],
};

// ===== HELPER =====
export function hasPermission(vaiTro: VaiTro, permission: string): boolean {
  return PERMISSIONS[vaiTro]?.includes(permission) ?? false;
}

export function isValidStatusTransition(
  current: TrangThaiDonHang,
  next: TrangThaiDonHang
): boolean {
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

// #1-2: Yêu Cầu 3 - Role-based status transitions
const KY_THUAT_VIEN_ALLOWED_STATUSES = new Set([
  TrangThaiDonHang.DANG_GIAT,
  TrangThaiDonHang.DANG_SAY,
  TrangThaiDonHang.DANG_UI,
  TrangThaiDonHang.HOAN_THANH,
]);

export function getStatusTransitionsForRole(
  currentStatus: TrangThaiDonHang,
  vaiTro: VaiTro
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
  [VaiTro.SUPER_ADMIN]: 'Super Admin',
  [VaiTro.ADMIN]: 'Admin',
  [VaiTro.NHAN_VIEN_QUAY]: 'Nhân viên quầy',
  [VaiTro.KY_THUAT_VIEN]: 'Kỹ thuật viên',
};

// ===== FORMAT HELPERS =====
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}
