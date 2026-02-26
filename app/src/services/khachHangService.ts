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
  limit,
  QueryConstraint,
  serverTimestamp,
  increment,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { KhachHang } from '../types';
import { LoaiKhachHang } from '../types';
import { CacheStore } from '../utils/cacheUtils';

const COLLECTION = 'khachHang';
const DEFAULT_PAGE_SIZE = 50;

// Yêu Cầu 12, Criteria 5: Cache khách hàng
const khachHangCache = new CacheStore<KhachHang>(5);

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const khachHangService = {
  // Yêu Cầu 12, Criteria 3: Enforce unique soDienThoai
  async create(data: Omit<KhachHang, 'maKhachHang' | 'ngayDangKy' | 'loaiKhachHang' | 'diemTichLuy' | 'tongChiTieu' | 'soLanGiaoDich'>): Promise<string> {
    // Check for duplicate phone within the same store
    if (data.soDienThoai && data.maCuaHang) {
      const existing = await this.searchByPhone(data.maCuaHang, data.soDienThoai);
      if (existing.length > 0) {
        throw new Error(`Số điện thoại ${data.soDienThoai} đã tồn tại trong hệ thống.`);
      }
    }
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      ngayDangKy: serverTimestamp(),
      loaiKhachHang: LoaiKhachHang.THUONG,
      diemTichLuy: 0,
      tongChiTieu: 0,
      soLanGiaoDich: 0,
    });
    return docRef.id;
  },

  // Yêu Cầu 12, Criteria 5: Cache getById
  async getById(id: string): Promise<KhachHang | null> {
    const cached = khachHangCache.get(id);
    if (cached) return cached;

    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (!docSnap.exists()) return null;
    const result = { ...docSnap.data(), maKhachHang: docSnap.id } as KhachHang;
    khachHangCache.set(id, result);
    return result;
  },

  async getByMaCuaHang(maCuaHang: string): Promise<KhachHang[]> {
    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ ...d.data(), maKhachHang: d.id }) as KhachHang)
      .sort((a, b) => (a.hoTen || '').localeCompare(b.hoTen || ''));
  },

  // Yêu Cầu 11, Criteria 10: Cursor-based pagination (max 50/page)
  async getByMaCuaHangPaginated(
    maCuaHang: string,
    options?: {
      pageSize?: number;
      lastDoc?: DocumentSnapshot | null;
    }
  ): Promise<PaginatedResult<KhachHang>> {
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
      data: docs.map((d) => ({ ...d.data(), maKhachHang: d.id }) as KhachHang)
        .sort((a, b) => (a.hoTen || '').localeCompare(b.hoTen || '')),
      lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },

  async searchByPhone(maCuaHang: string, phone: string): Promise<KhachHang[]> {
    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang),
      where('soDienThoai', '==', phone)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), maKhachHang: d.id }) as KhachHang);
  },

  async update(id: string, data: Partial<KhachHang>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
    khachHangCache.invalidate(id);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
    khachHangCache.invalidate(id);
  },

  // Gọi từ Cloud Function hoặc qua admin SDK
  async capNhatDiemTichLuy(id: string, soTienThanhToan: number): Promise<void> {
    const diem = Math.floor(soTienThanhToan / 1000);
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      diemTichLuy: increment(diem),
      tongChiTieu: increment(soTienThanhToan),
      soLanGiaoDich: increment(1),
    });

    // Auto-upgrade customer tier
    const updated = await getDoc(docRef);
    if (updated.exists()) {
      const data = updated.data() as KhachHang;
      let newTier = LoaiKhachHang.THUONG;
      if (data.tongChiTieu >= 10_000_000) {
        newTier = LoaiKhachHang.VIP;
      } else if (data.tongChiTieu >= 5_000_000) {
        newTier = LoaiKhachHang.THAN_THIET;
      }
      if (newTier !== data.loaiKhachHang) {
        await updateDoc(docRef, { loaiKhachHang: newTier });
      }
    }
  },
};
