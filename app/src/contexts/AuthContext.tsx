import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types';
import { VaiTro, TrangThaiNhanVien } from '../types';
import { auditLogService } from '../services/auditLogService';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // check every 60s

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: VaiTro[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Requirement 9, Criteria 22: Auto-timeout session after 1 hour of inactivity
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }));

    const intervalId = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > SESSION_TIMEOUT_MS) {
        console.warn('Session timeout: auto-logout after 1 hour of inactivity');
        await signOut(auth);
        setUserProfile(null);
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetActivity));
      clearInterval(intervalId);
    };
  }, [firebaseUser, resetActivity]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profile = { uid: user.uid, ...userDoc.data() } as User;
            
            // Requirement 7, Criteria 8: Block login if user is disabled
            if (profile.trangThai !== TrangThaiNhanVien.DANG_LAM_VIEC) {
              setError('Tài khoản của bạn đã bị vô hiệu hóa hoặc đang nghỉ phép.');
              await signOut(auth);
              setUserProfile(null);
              setLoading(false);
              return;
            }

            // Requirement #6: Block login if shop is disabled (non-SUPER_ADMIN only)
            if (profile.maCuaHang && profile.vaiTro !== VaiTro.SUPER_ADMIN) {
              const shopDoc = await getDoc(doc(db, 'cuaHang', profile.maCuaHang));
              if (shopDoc.exists()) {
                const shopData = shopDoc.data();
                if (shopData.trangThai !== 'HOAT_DONG') {
                  setError('Cửa hàng đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.');
                  await signOut(auth);
                  setUserProfile(null);
                  setLoading(false);
                  return;
                }
              }
            }
            
            setUserProfile(profile);
          } else {
            // Bootstrap: tạo profile tự động cho user đầu tiên
            const usersSnap = await getDocs(collection(db, 'users'));
            const isFirstUser = usersSnap.empty;

            const newProfile: User = {
              uid: user.uid,
              maCuaHang: null,
              hoTen: user.displayName || user.email?.split('@')[0] || 'Admin',
              soDienThoai: '',
              email: user.email || '',
              vaiTro: isFirstUser ? VaiTro.SUPER_ADMIN : VaiTro.NHAN_VIEN_QUAY,
              trangThai: TrangThaiNhanVien.DANG_LAM_VIEC,
              ngayVaoLam: Timestamp.now(),
            };

            await setDoc(doc(db, 'users', user.uid), newProfile);
            setUserProfile(newProfile);
            console.log(`Auto-created user profile: ${newProfile.vaiTro}`);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // YC 18, TC 5: Audit log for login
      auditLogService.log({
        maCuaHang: '',
        userId: cred.user.uid,
        action: 'auth.login',
        metadata: { email },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const hasRole = (...roles: VaiTro[]) => {
    if (!userProfile) return false;
    return roles.includes(userProfile.vaiTro);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userProfile, loading, error, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
