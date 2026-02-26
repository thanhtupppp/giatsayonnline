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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DichVu } from '../types';
import { LoaiTinhGia } from '../types';
import { CacheStore } from '../utils/cacheUtils';

const COLLECTION = 'dichVu';

// Yêu Cầu 12, Criteria 4: Cache dịch vụ với TTL 5 phút
const dichVuCache = new CacheStore<DichVu[]>(5);
export const dichVuService = {
  async create(data: Omit<DichVu, 'maDichVu'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      trangThai: true,
    });
    dichVuCache.invalidate(); // Invalidate all cached lists
    return docRef.id;
  },

  async getById(id: string): Promise<DichVu | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), maDichVu: docSnap.id } as DichVu;
  },

  async getByMaCuaHang(maCuaHang: string, activeOnly = false): Promise<DichVu[]> {
    const cacheKey = `${maCuaHang}:${activeOnly}`;
    const cached = dichVuCache.get(cacheKey);
    if (cached) return cached;

    const constraints = [
      where('maCuaHang', '==', maCuaHang),
    ];
    if (activeOnly) {
      constraints.push(where('trangThai', '==', true));
    }
    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    const result = snapshot.docs
      .map((d) => ({ ...d.data(), maDichVu: d.id }) as DichVu)
      .sort((a, b) => (a.tenDichVu || '').localeCompare(b.tenDichVu || ''));
    dichVuCache.set(cacheKey, result);
    return result;
  },

  async update(id: string, data: Partial<DichVu>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
    dichVuCache.invalidate();
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
    dichVuCache.invalidate();
  },

  async toggleStatus(id: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { trangThai: active });
    dichVuCache.invalidate();
  },

  tinhGia(dichVu: DichVu, soLuong: number, trongLuong: number): number {
    if (!dichVu.trangThai) {
      throw new Error(`Dịch vụ "${dichVu.tenDichVu}" đã ngừng hoạt động, không thể tính giá.`);
    }

    let rawPrice = 0;
    switch (dichVu.loaiTinhGia) {
      case LoaiTinhGia.THEO_TRONG_LUONG:
        rawPrice = dichVu.giaTheoKg * trongLuong;
        break;
      case LoaiTinhGia.THEO_SO_LUONG:
        rawPrice = dichVu.giaTheoSoLuong * soLuong;
        break;
      case LoaiTinhGia.CO_DINH:
        rawPrice = dichVu.giaTheoSoLuong;
        break;
    }
    return Math.round(rawPrice);
  },
};
