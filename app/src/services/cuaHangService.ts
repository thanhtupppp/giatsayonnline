import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CuaHang } from '../types';
import { TrangThaiCuaHang } from '../types';

const COLLECTION = 'cuaHang';

async function generateMaCuaHang(): Promise<string> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const num = snapshot.size + 1;
  return `CH${String(num).padStart(4, '0')}`;
}

export const cuaHangService = {
  async create(data: Omit<CuaHang, 'maCuaHang' | 'ngayTao' | 'trangThai'>): Promise<string> {
    const maCuaHang = await generateMaCuaHang();
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      maCuaHang,
      trangThai: TrangThaiCuaHang.HOAT_DONG,
      ngayTao: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(id: string): Promise<CuaHang | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), maCuaHang: docSnap.id } as CuaHang;
  },

  async getAll(): Promise<CuaHang[]> {
    const q = query(collection(db, COLLECTION), orderBy('ngayTao', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), maCuaHang: d.id }) as CuaHang);
  },

  async update(id: string, data: Partial<CuaHang>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  async toggleStatus(id: string, newStatus: TrangThaiCuaHang): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { trangThai: newStatus });
  },
};
