import {
  collection, doc, setDoc, getDocs, query, where, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BaoCao } from '../types';
import { CacheStore } from '../utils/cacheUtils';

const COLLECTION = 'baoCao';

// Yêu Cầu 12, Criteria 6: Cache báo cáo (TTL 10 phút)
const baoCaoCache = new CacheStore<BaoCao[]>(10);
export const baoCaoService = {
  async save(data: Omit<BaoCao, 'maBaoCao'>): Promise<string> {
    const maBaoCao = `BC${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    await setDoc(doc(db, COLLECTION, maBaoCao), {
      ...data,
      maBaoCao,
    });
    baoCaoCache.invalidate(); // Invalidate list cache
    return maBaoCao;
  },

  async getByMaCuaHang(maCuaHang: string): Promise<BaoCao[]> {
    if (!maCuaHang) return [];
    const cached = baoCaoCache.get(maCuaHang);
    if (cached) return cached;

    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang),
    );
    const snap = await getDocs(q);
    // Sort client-side to avoid Firestore composite index requirement
    const result = snap.docs
      .map((d) => d.data() as BaoCao)
      .sort((a, b) => (b.ngayTao?.toMillis?.() || 0) - (a.ngayTao?.toMillis?.() || 0));
    baoCaoCache.set(maCuaHang, result);
    return result;
  },

  // Báo Cáo là immutable, không có hàm update hoặc delete theo chuẩn Yêu Cầu 8 Tiêu Chí 8
  
  async getById(maBaoCao: string): Promise<BaoCao | null> {
    const d = await getDoc(doc(db, COLLECTION, maBaoCao));
    return d.exists() ? (d.data() as BaoCao) : null;
  }
};
