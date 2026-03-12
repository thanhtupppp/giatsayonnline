import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CauHinhCuaHang } from '../types';
import { CheDoTaoDonHang } from '../types';

const COLLECTION = 'cauHinhCuaHang';

export const cauHinhService = {
  async get(maCuaHang: string): Promise<CauHinhCuaHang | null> {
    if (!maCuaHang) return null; // Guard: tránh lỗi segment khi chưa có maCuaHang
    const docSnap = await getDoc(doc(db, COLLECTION, maCuaHang));
    if (!docSnap.exists()) return null;
    return docSnap.data() as CauHinhCuaHang;
  },

  async createDefault(maCuaHang: string, nguoiCapNhat: string): Promise<void> {
    await setDoc(doc(db, COLLECTION, maCuaHang), {
      maCuaHang,
      cheDoTaoDonHang: CheDoTaoDonHang.CHON_DICH_VU_TRUOC,
      gioMoCua: '07:00',
      gioDongCua: '21:00',
      ngayNghiTrongTuan: [],
      capNhatLanCuoi: serverTimestamp(),
      nguoiCapNhat,
    });
  },

  async update(maCuaHang: string, data: Partial<CauHinhCuaHang>, nguoiCapNhat: string): Promise<void> {
    await setDoc(doc(db, COLLECTION, maCuaHang), {
      ...data,
      capNhatLanCuoi: serverTimestamp(),
      nguoiCapNhat,
    }, { merge: true });
  },
};
