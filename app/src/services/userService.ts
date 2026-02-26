import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { db } from '../config/firebase';
import type { User } from '../types';
import { TrangThaiNhanVien } from '../types';

const COLLECTION = 'users';

export const userService = {
  /**
   * Create a new user WITHOUT switching the current Admin's session.
   * Uses a secondary Firebase app so createUserWithEmailAndPassword
   * doesn't auto-login on the primary auth instance.
   */
  async create(
    email: string,
    password: string,
    data: Omit<User, 'uid' | 'trangThai'>
  ): Promise<string> {
    // Create a temporary secondary Firebase app
    const secondaryApp = initializeApp(
      // Reuse the same config from environment
      {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      },
      'secondaryApp-' + Date.now() // Unique name to avoid conflicts
    );

    try {
      const secondaryAuth = getAuth(secondaryApp);
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCred.user.uid;

      // Save user profile to Firestore (uses main db, not secondary)
      await setDoc(doc(db, COLLECTION, uid), {
        ...data,
        uid,
        trangThai: TrangThaiNhanVien.DANG_LAM_VIEC,
      });

      // Sign out from secondary auth (cleanup)
      await signOut(secondaryAuth);

      return uid;
    } finally {
      // Always delete the secondary app to prevent memory leaks
      await deleteApp(secondaryApp);
    }
  },

  async getById(uid: string): Promise<User | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, uid));
    if (!docSnap.exists()) return null;
    return docSnap.data() as User;
  },

  async getByMaCuaHang(maCuaHang: string): Promise<User[]> {
    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => d.data() as User)
      .sort((a, b) => (a.hoTen || '').localeCompare(b.hoTen || ''));
  },

  async getAll(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map((d) => d.data() as User);
  },

  async update(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, uid), { ...data });
  },

  async delete(uid: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, uid));
  },

  async updateStatus(uid: string, trangThai: TrangThaiNhanVien): Promise<void> {
    await updateDoc(doc(db, COLLECTION, uid), { trangThai });
  },
};
