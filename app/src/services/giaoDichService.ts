import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
  QueryConstraint,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { GiaoDich } from '../types';
import { TrangThaiGiaoDich, PhuongThucThanhToan } from '../types';

import { donHangService } from './donHangService';

const COLLECTION = 'giaoDich';
const DEFAULT_PAGE_SIZE = 50;

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const giaoDichService = {
  // Atomic Transaction for Yêu Cầu 6: Criteria 1-6 & 8-10
  async processPayment(data: {
    maCuaHang: string;
    maDonHang: string;
    maKhachHang: string;
    maNhanVien: string;
    soTien: number;
    phuongThucThanhToan: PhuongThucThanhToan;
    ghiChu?: string;
  }): Promise<string> {
    if (data.soTien === 0) throw new Error('Số tiền phải khác 0');

    // Resolve maDonHang to actual Firestore doc ID
    const donHangDocId = await donHangService._resolveDocId(data.maDonHang);

    // Mượn reference trước khi transaction
    const giaoDichRef = doc(collection(db, COLLECTION));
    const donHangRef = doc(db, 'donHang', donHangDocId);
    const khachHangRef = doc(db, 'khachHang', data.maKhachHang);

    await runTransaction(db, async (transaction) => {
      // === ALL READS FIRST ===
      const donHangDoc = await transaction.get(donHangRef);
      if (!donHangDoc.exists()) throw new Error('Đơn hàng không tồn tại');
      const khachHangDoc = await transaction.get(khachHangRef);

      const currentDonHang = donHangDoc.data();
      const isRefund = data.soTien < 0; // C8: Hoàn tiền (số tiền âm)

      if (!isRefund) {
        // C2, C3: Kiểm tra tiền thanh toán không vượt quá tiền còn lại
        if (data.soTien > currentDonHang.tienConLai) {
          throw new Error('Số tiền thanh toán vượt quá số tiền còn lại');
        }
      } else {
        // Nếu là hoàn tiền, số tiền hoàn (absolute) không được vượt quá số tiền đã trả
        if (Math.abs(data.soTien) > currentDonHang.tienDaTra) {
          throw new Error('Số tiền hoàn vượt quá số tiền khách đã trả');
        }
      }

      // C4, C5: Cập nhật tiền đã trả & tiền còn lại (đảm bảo tổng không đổi)
      const newTienDaTra = currentDonHang.tienDaTra + data.soTien;
      const newTienConLai = currentDonHang.tongTien - newTienDaTra;

      let donHangUpdates: any = {
        tienDaTra: newTienDaTra,
        tienConLai: newTienConLai,
      };

      // C6: Cập nhật điểm tích lũy khi hoàn thành thanh toán
      // (chỉ cập nhật 1 lần khi thanh toán đủ và chưa tích điểm)
      if (newTienConLai === 0 && !currentDonHang.daTichDiem && !isRefund) {
        if (khachHangDoc.exists()) {
          const khData = khachHangDoc.data();
          const p = Math.floor(currentDonHang.tongTien / 1000); // 1 điểm = 1,000đ
          
          let newTier = khData.loaiKhachHang;
          const newSpend = khData.tongChiTieu + currentDonHang.tongTien;
          
          // Nâng cấp hạng
          if (newSpend >= 10000000) newTier = 'VIP';
          else if (newSpend >= 5000000) newTier = 'THAN_THIET';

          transaction.update(khachHangRef, {
            diemTichLuy: khData.diemTichLuy + p,
            tongChiTieu: newSpend,
            soLanGiaoDich: khData.soLanGiaoDich + 1,
            loaiKhachHang: newTier,
          });

          donHangUpdates.daTichDiem = true;
        }
      }

      // === ALL WRITES AFTER READS ===
      transaction.set(giaoDichRef, {
        ...data,
        ngayGiaoDich: serverTimestamp(),
        trangThai: TrangThaiGiaoDich.THANH_CONG,
      });

      transaction.update(donHangRef, donHangUpdates);
    });

    return giaoDichRef.id;
  },

  async getById(id: string): Promise<GiaoDich | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), maGiaoDich: docSnap.id } as GiaoDich;
  },

  async getByDonHang(maDonHang: string): Promise<GiaoDich[]> {
    const q = query(
      collection(db, COLLECTION),
      where('maDonHang', '==', maDonHang)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ ...d.data(), maGiaoDich: d.id }) as GiaoDich)
      .sort((a, b) => {
        const ta = a.ngayGiaoDich?.toDate?.() || new Date(0);
        const tb = b.ngayGiaoDich?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
  },

  async getByMaCuaHang(maCuaHang: string): Promise<GiaoDich[]> {
    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang),
      limit(DEFAULT_PAGE_SIZE)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ ...d.data(), maGiaoDich: d.id }) as GiaoDich)
      .sort((a, b) => {
        const ta = a.ngayGiaoDich?.toDate?.() || new Date(0);
        const tb = b.ngayGiaoDich?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
  },

  // Yêu Cầu 11, Criteria 10: Cursor-based pagination (max 50/page)
  async getByMaCuaHangPaginated(
    maCuaHang: string,
    options?: {
      pageSize?: number;
      lastDoc?: DocumentSnapshot | null;
    }
  ): Promise<PaginatedResult<GiaoDich>> {
    const pageSize = Math.min(options?.pageSize || DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const constraints: QueryConstraint[] = [
      where('maCuaHang', '==', maCuaHang),
    ];
    constraints.push(limit(pageSize + 1));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
    return {
      data: docs.map((d) => ({ ...d.data(), maGiaoDich: d.id }) as GiaoDich)
        .sort((a, b) => {
          const ta = a.ngayGiaoDich?.toDate?.() || new Date(0);
          const tb = b.ngayGiaoDich?.toDate?.() || new Date(0);
          return tb.getTime() - ta.getTime();
        }),
      lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },

  async updateStatus(id: string, trangThai: TrangThaiGiaoDich): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { trangThai });
  },
};
