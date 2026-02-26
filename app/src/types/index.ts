import { Timestamp } from 'firebase/firestore';

// ===== CỬA HÀNG =====
export interface CuaHang {
  maCuaHang: string;
  tenCuaHang: string;
  diaChi: string;
  soDienThoai: string;
  email: string;
  trangThai: TrangThaiCuaHang;
  ngayTao: Timestamp;
  maAdminChinh: string;
  thongTinThanhToan?: {
    tenNganHang: string;
    soTaiKhoan: string;
    chuTaiKhoan: string;
  };
  cauHinh?: {
    gioMoCua: string;
    gioDongCua: string;
    ngayNghiTrongTuan: number[];
  };
}

export enum TrangThaiCuaHang {
  HOAT_DONG = 'HOAT_DONG',
  TAM_NGUNG = 'TAM_NGUNG',
  DONG_CUA = 'DONG_CUA',
}

// ===== CẤU HÌNH CỬA HÀNG =====
export interface CauHinhCuaHang {
  maCuaHang: string;
  cheDoTaoDonHang: CheDoTaoDonHang;
  gioMoCua: string;
  gioDongCua: string;
  ngayNghiTrongTuan: number[];
  thongTinThanhToan?: {
    tenNganHang: string;
    soTaiKhoan: string;
    chuTaiKhoan: string;
  };
  mauInPhieu?: {
    logoUrl?: string;
    tenCuaHang?: string;
    diaChi?: string;
    soDienThoai?: string;
    email?: string;
    footer: string;
  };
  capNhatLanCuoi: Timestamp;
  nguoiCapNhat: string;
}

export enum CheDoTaoDonHang {
  CHON_DICH_VU_TRUOC = 'CHON_DICH_VU_TRUOC',
  CHON_DICH_VU_SAU = 'CHON_DICH_VU_SAU',
}

// ===== NGƯỜI DÙNG =====
export interface User {
  uid: string;
  maCuaHang: string | null;
  hoTen: string;
  soDienThoai: string;
  email: string;
  vaiTro: VaiTro;
  trangThai: TrangThaiNhanVien;
  ngayVaoLam: Timestamp;
  danhSachQuyen?: string[];
  createdBy?: string;
}

export enum VaiTro {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  NHAN_VIEN_QUAY = 'NHAN_VIEN_QUAY',
  KY_THUAT_VIEN = 'KY_THUAT_VIEN',
}

export enum TrangThaiNhanVien {
  DANG_LAM_VIEC = 'DANG_LAM_VIEC',
  NGHI_PHEP = 'NGHI_PHEP',
  DA_NGHI_VIEC = 'DA_NGHI_VIEC',
}

export interface CustomClaims {
  vaiTro: VaiTro;
  maCuaHang: string | null;
}

// ===== ĐƠN HÀNG =====
export interface DonHang {
  maDonHang: string;
  maCuaHang: string;
  maKhachHang: string;
  maNhanVien: string;
  ngayTao: Timestamp;
  ngayHenTra: Timestamp;
  trangThai: TrangThaiDonHang;
  danhSachDichVu: ChiTietDichVu[];
  tongTrongLuong: number;
  tongTien: number;
  tienDaTra: number;
  tienConLai: number;
  ghiChu?: string;
  lichSuCapNhat: LichSuTrangThai[];
  cheDoTaoDonHang: CheDoTaoDonHang;
  daXacDinhDichVu: boolean;
  daTichDiem?: boolean;
}

export enum TrangThaiDonHang {
  CHO_XU_LY = 'CHO_XU_LY',
  CHO_CAN_KY = 'CHO_CAN_KY',
  DANG_GIAT = 'DANG_GIAT',
  DANG_SAY = 'DANG_SAY',
  DANG_UI = 'DANG_UI',
  HOAN_THANH = 'HOAN_THANH',
  DA_GIAO = 'DA_GIAO',
  DA_HUY = 'DA_HUY',
}

export interface ChiTietDichVu {
  maDichVu: string;
  tenDichVu: string;
  soLuong: number;
  trongLuong: number;
  donGia: number;
  thanhTien: number;
  ghiChu?: string;
  nguoiCapNhat?: string;
  thoiGianCapNhat?: Timestamp;
}

export interface LichSuTrangThai {
  trangThaiCu: TrangThaiDonHang;
  trangThaiMoi: TrangThaiDonHang;
  nguoiCapNhat: string;
  thoiGian: Timestamp;
  ghiChu?: string;
}

// ===== KHÁCH HÀNG =====
export interface KhachHang {
  maKhachHang: string;
  maCuaHang: string;
  hoTen: string;
  soDienThoai: string;
  email?: string;
  diaChi?: string;
  ngayDangKy: Timestamp;
  loaiKhachHang: LoaiKhachHang;
  diemTichLuy: number;
  tongChiTieu: number;
  soLanGiaoDich: number;
}

export enum LoaiKhachHang {
  THUONG = 'THUONG',
  THAN_THIET = 'THAN_THIET',
  VIP = 'VIP',
}

// ===== DỊCH VỤ =====
export interface DichVu {
  maDichVu: string;
  maCuaHang: string;
  tenDichVu: string;
  moTa?: string;
  icon?: string;
  loaiTinhGia: LoaiTinhGia;
  giaTheoKg: number;
  giaTheoSoLuong: number;
  thoiGianXuLy: number;
  trangThai: boolean;
}

export enum LoaiTinhGia {
  THEO_TRONG_LUONG = 'THEO_TRONG_LUONG',
  THEO_SO_LUONG = 'THEO_SO_LUONG',
  CO_DINH = 'CO_DINH',
}

// ===== GIAO DỊCH =====
export interface GiaoDich {
  maGiaoDich: string;
  maCuaHang: string;
  maDonHang: string;
  maKhachHang: string;
  maNhanVien: string;
  ngayGiaoDich: Timestamp;
  soTien: number;
  phuongThucThanhToan: PhuongThucThanhToan;
  trangThai: TrangThaiGiaoDich;
  ghiChu?: string;
}

export enum PhuongThucThanhToan {
  TIEN_MAT = 'TIEN_MAT',
  CHUYEN_KHOAN = 'CHUYEN_KHOAN',
  THE_ATM = 'THE_ATM',
  VI_DIEN_TU = 'VI_DIEN_TU',
}

export enum TrangThaiGiaoDich {
  CHO_XAC_NHAN = 'CHO_XAC_NHAN',
  THANH_CONG = 'THANH_CONG',
  THAT_BAI = 'THAT_BAI',
  DA_HOAN = 'DA_HOAN',
}

// ===== BÁO CÁO =====
export interface BaoCao {
  maBaoCao: string;
  maCuaHang: string;
  loaiBaoCao: string;
  tuNgay: Timestamp;
  denNgay: Timestamp;
  ngayTao: Timestamp;
  nguoiTao: string;
  duLieu: Record<string, unknown>;
}

// ===== AUDIT LOG =====
export interface AuditLog {
  maLog: string;
  maCuaHang: string;
  userId: string;
  action: string;
  timestamp: Timestamp;
  ipAddress?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
}

// ===== COMMON TYPES =====
export interface TieuChiTimKiem {
  maDonHang?: string;
  maKhachHang?: string;
  soDienThoai?: string;
  trangThai?: TrangThaiDonHang;
  tuNgay?: Date;
  denNgay?: Date;
  maCuaHang?: string;
}
