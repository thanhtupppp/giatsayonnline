import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DonHang, LichSuTrangThai, ChiTietDichVu } from '../types';
import { TrangThaiDonHang, CheDoTaoDonHang, VaiTro } from '../types';
import { isValidStatusTransition } from '../utils/constants';
import { format } from 'date-fns';
import { khachHangService } from './khachHangService';
import { auditLogService } from './auditLogService';

const COLLECTION = 'donHang';
const DEFAULT_PAGE_SIZE = 50;

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

async function generateMaDonHang(): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `${today}`;
  const q = query(
    collection(db, COLLECTION),
    where('maDonHang', '>=', prefix),
    where('maDonHang', '<=', prefix + '\uf8ff'),
    orderBy('maDonHang', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  let nextNum = 1;
  if (!snapshot.empty) {
    const lastCode = snapshot.docs[0].data().maDonHang as string;
    const lastNum = parseInt(lastCode.slice(-4), 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

export const donHangService = {
  // Helper: resolve maDonHang to Firestore document ID
  async _resolveDocId(idOrMaDonHang: string): Promise<string> {
    // First try as document ID directly
    const docSnap = await getDoc(doc(db, COLLECTION, idOrMaDonHang));
    if (docSnap.exists()) return idOrMaDonHang;
    // Fallback: query by maDonHang field
    const q = query(
      collection(db, COLLECTION),
      where('maDonHang', '==', idOrMaDonHang),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs[0].id;
    throw new Error('Đơn hàng không tồn tại');
  },

  async create(data: {
    maCuaHang: string;
    maKhachHang: string;
    maNhanVien: string;
    danhSachDichVu: ChiTietDichVu[];
    ghiChu?: string;
    cheDoTaoDonHang: CheDoTaoDonHang;
    thoiGianXuLyMax?: number;
  }): Promise<string> {
    const maDonHang = await generateMaDonHang();
    const tongTien = data.danhSachDichVu.reduce((sum, dv) => sum + dv.thanhTien, 0);
    const tongTrongLuong = data.danhSachDichVu.reduce((sum, dv) => sum + dv.trongLuong, 0);
    const ngayTao = Timestamp.now();

    // Ngày hẹn trả = ngày tạo + max thời gian xử lý (mặc định 48h)
    const hoursToAdd = data.thoiGianXuLyMax || 48;
    const henTraDate = new Date(ngayTao.toDate().getTime() + hoursToAdd * 60 * 60 * 1000);
    const ngayHenTra = Timestamp.fromDate(henTraDate);

    const donHang: Omit<DonHang, 'maDonHang'> & { maDonHang: string } = {
      maDonHang,
      maCuaHang: data.maCuaHang,
      maKhachHang: data.maKhachHang,
      maNhanVien: data.maNhanVien,
      ngayTao,
      ngayHenTra,
      trangThai: data.cheDoTaoDonHang === CheDoTaoDonHang.CHON_DICH_VU_SAU
        ? TrangThaiDonHang.CHO_CAN_KY
        : TrangThaiDonHang.CHO_XU_LY,
      danhSachDichVu: data.danhSachDichVu,
      tongTrongLuong,
      tongTien,
      tienDaTra: 0,
      tienConLai: tongTien,
      ghiChu: data.ghiChu || '',
      lichSuCapNhat: [],
      cheDoTaoDonHang: data.cheDoTaoDonHang,
      daXacDinhDichVu: data.cheDoTaoDonHang === CheDoTaoDonHang.CHON_DICH_VU_TRUOC,
    };

    const docRef = await addDoc(collection(db, COLLECTION), donHang);

    // YC 18, TC 1: Audit log for order creation
    auditLogService.log({
      maCuaHang: data.maCuaHang,
      userId: data.maNhanVien,
      action: 'donhang.create',
      afterData: { maDonHang, tongTien, maKhachHang: data.maKhachHang, cheDoTaoDonHang: data.cheDoTaoDonHang },
    });

    return docRef.id;
  },

  async getById(id: string): Promise<DonHang | null> {
    // Try by doc ID first
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) return docSnap.data() as DonHang;
    // Fallback: query by maDonHang field
    const q = query(
      collection(db, COLLECTION),
      where('maDonHang', '==', id),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as DonHang;
  },

  async getByMaDonHang(maDonHang: string): Promise<DonHang | null> {
    const q = query(
      collection(db, COLLECTION),
      where('maDonHang', '==', maDonHang),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as DonHang;
  },

  async getByMaCuaHang(
    maCuaHang: string,
    filters?: { trangThai?: TrangThaiDonHang; limitCount?: number }
  ): Promise<DonHang[]> {
    const constraints: QueryConstraint[] = [
      where('maCuaHang', '==', maCuaHang),
    ];
    if (filters?.trangThai) {
      constraints.push(where('trangThai', '==', filters.trangThai));
    }
    constraints.push(limit(filters?.limitCount || DEFAULT_PAGE_SIZE));
    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => d.data() as DonHang)
      .sort((a, b) => {
        const ta = a.ngayTao?.toDate?.() || new Date(0);
        const tb = b.ngayTao?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
  },

  // Yêu Cầu 11, Criteria 10: Cursor-based pagination (max 50/page)
  async getByMaCuaHangPaginated(
    maCuaHang: string,
    options?: {
      trangThai?: TrangThaiDonHang;
      pageSize?: number;
      lastDoc?: DocumentSnapshot | null;
    }
  ): Promise<PaginatedResult<DonHang>> {
    const pageSize = Math.min(options?.pageSize || DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const constraints: QueryConstraint[] = [
      where('maCuaHang', '==', maCuaHang),
    ];
    if (options?.trangThai) {
      constraints.push(where('trangThai', '==', options.trangThai));
    }
    constraints.push(limit(pageSize + 1));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
    return {
      data: docs.map((d) => d.data() as DonHang)
        .sort((a, b) => {
          const ta = a.ngayTao?.toDate?.() || new Date(0);
          const tb = b.ngayTao?.toDate?.() || new Date(0);
          return tb.getTime() - ta.getTime();
        }),
      lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },

  async getByKhachHang(maKhachHang: string): Promise<DonHang[]> {
    const q = query(
      collection(db, COLLECTION),
      where('maKhachHang', '==', maKhachHang)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => d.data() as DonHang)
      .sort((a, b) => {
        const ta = a.ngayTao?.toDate?.() || new Date(0);
        const tb = b.ngayTao?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
  },

  async updateStatus(
    id: string,
    newStatus: TrangThaiDonHang,
    userId: string,
    ghiChu?: string,
    vaiTro?: VaiTro
  ): Promise<void> {
    const docId = await donHangService._resolveDocId(id);
    const docSnap = await getDoc(doc(db, COLLECTION, docId));
    if (!docSnap.exists()) throw new Error('Đơn hàng không tồn tại');

    const current = docSnap.data() as DonHang;
    const isAdmin = vaiTro === VaiTro.ADMIN || vaiTro === VaiTro.SUPER_ADMIN;

    if (!isAdmin && !isValidStatusTransition(current.trangThai, newStatus)) {
      throw new Error(`Không thể chuyển từ ${current.trangThai} sang ${newStatus}`);
    }

    const lichSuMoi: LichSuTrangThai = {
      trangThaiCu: current.trangThai,
      trangThaiMoi: newStatus,
      nguoiCapNhat: userId,
      thoiGian: Timestamp.now(),
      ghiChu,
    };

    await updateDoc(doc(db, COLLECTION, docId), {
      trangThai: newStatus,
      lichSuCapNhat: [...current.lichSuCapNhat, lichSuMoi],
    });

    // YC 18, TC 2: Audit log for status update
    auditLogService.log({
      maCuaHang: current.maCuaHang,
      userId,
      action: 'donhang.update_status',
      beforeData: { trangThai: current.trangThai },
      afterData: { trangThai: newStatus },
      metadata: { maDonHang: current.maDonHang, ghiChu },
    });
  },

  // Cập nhật dịch vụ sau cân ký (Chế độ 2)
  async capNhatDichVuSauCanKy(
    id: string,
    danhSachDichVu: ChiTietDichVu[],
    userId: string
  ): Promise<void> {
    const docId = await donHangService._resolveDocId(id);
    const tongTien = danhSachDichVu.reduce((sum, dv) => sum + dv.thanhTien, 0);
    const tongTrongLuong = danhSachDichVu.reduce((sum, dv) => sum + dv.trongLuong, 0);
    await updateDoc(doc(db, COLLECTION, docId), {
      danhSachDichVu,
      tongTien,
      tongTrongLuong,
      tienConLai: tongTien,
      daXacDinhDichVu: true,
    });

    // YC 18: Audit log for service update after weighing
    auditLogService.log({
      maCuaHang: '',
      userId,
      action: 'donhang.cap_nhat_dich_vu',
      afterData: { tongTien, tongTrongLuong, soLuongDichVu: danhSachDichVu.length },
    });
  },

  async updatePayment(id: string, soTienTra: number): Promise<void> {
    const docId = await donHangService._resolveDocId(id);
    const docSnap = await getDoc(doc(db, COLLECTION, docId));
    if (!docSnap.exists()) throw new Error('Đơn hàng không tồn tại');

    const current = docSnap.data() as DonHang;
    const newTienDaTra = current.tienDaTra + soTienTra;
    if (newTienDaTra > current.tongTien) {
      throw new Error('Số tiền thanh toán vượt quá tổng tiền');
    }

    let updates: any = {
      tienDaTra: newTienDaTra,
      tienConLai: current.tongTien - newTienDaTra,
    };

    // #6-9: Auto add points when fully paid
    if (newTienDaTra >= current.tongTien && !current.daTichDiem) {
      await khachHangService.capNhatDiemTichLuy(current.maKhachHang, current.tongTien);
      updates.daTichDiem = true;
    }

    await updateDoc(doc(db, COLLECTION, docId), updates);
  },

  async delete(id: string): Promise<void> {
    const docId = await donHangService._resolveDocId(id);
    await deleteDoc(doc(db, COLLECTION, docId));
  },

  /**
   * Real-time listener for orders by maCuaHang.
   * Calls `callback` with the latest orders whenever Firestore data changes.
   * Returns an unsubscribe function.
   */
  listenByMaCuaHang(
    maCuaHang: string,
    callback: (orders: DonHang[]) => void,
    limitCount = 200
  ): () => void {
    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang),
      limit(limitCount)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs
        .map((d) => d.data() as DonHang)
        .sort((a, b) => {
          const ta = a.ngayTao?.toDate?.() || new Date(0);
          const tb = b.ngayTao?.toDate?.() || new Date(0);
          return tb.getTime() - ta.getTime();
        });
      callback(orders);
    });
    return unsubscribe;
  },
};
