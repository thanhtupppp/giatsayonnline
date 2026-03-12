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
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  runTransaction,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { DonHang, LichSuTrangThai, ChiTietDichVu } from "../types";
import { TrangThaiDonHang, CheDoTaoDonHang, VaiTro } from "../types";
import { isValidStatusTransition } from "../utils/constants";
import { format } from "date-fns";
import { khachHangService } from "./khachHangService";
import { auditLogService } from "./auditLogService";

// Helper để dọn dẹp data trước khi gửi lên Firestore, loại bỏ undefined hoặc NaN gây lỗi
function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData) as unknown as T;
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof Timestamp) return obj;
    const cleaned = {} as any;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as any)[key];
        if (value !== undefined) {
          if (typeof value === 'number' && Number.isNaN(value)) {
            cleaned[key] = 0; // Replace NaN with 0
          } else {
            cleaned[key] = cleanFirestoreData(value);
          }
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

const COLLECTION = "donHang";
const DEFAULT_PAGE_SIZE = 50;

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

async function generateMaDonHang(maCuaHang: string): Promise<string> {
  const today = format(new Date(), "yyyyMMdd");
  const prefix = `${today}`;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, COLLECTION),
    where("maCuaHang", "==", maCuaHang),
    where("ngayTao", ">=", Timestamp.fromDate(todayStart)),
    orderBy("ngayTao", "desc"),
    limit(1),
  );
  const snapshot = await getDocs(q);
  let nextNum = 1;
  if (!snapshot.empty) {
    const lastCode = snapshot.docs[0].data().maDonHang as string;
    const seqStr = lastCode.substring(8, 12);
    const lastNum = parseInt(seqStr, 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }
  const randomSuffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${prefix}${String(nextNum).padStart(4, "0")}${randomSuffix}`;
}

export const donHangService = {
  // Helper: resolve maDonHang to Firestore document ID
  async _resolveDocId(idOrMaDonHang: string): Promise<string> {
    const docSnap = await getDoc(doc(db, COLLECTION, idOrMaDonHang));
    if (!docSnap.exists()) {
      throw new Error("Đơn hàng không tồn tại");
    }
    return idOrMaDonHang;
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
    const maDonHang = await generateMaDonHang(data.maCuaHang);
    const tongTien = data.danhSachDichVu.reduce(
      (sum, dv) => sum + dv.thanhTien,
      0,
    );
    const tongTrongLuong = data.danhSachDichVu.reduce(
      (sum, dv) => sum + dv.trongLuong,
      0,
    );
    const ngayTao = Timestamp.now();

    // Ngày hẹn trả = ngày tạo + max thời gian xử lý (mặc định 48h)
    const hoursToAdd = data.thoiGianXuLyMax || 48;
    const henTraDate = new Date(
      ngayTao.toDate().getTime() + hoursToAdd * 60 * 60 * 1000,
    );
    const ngayHenTra = Timestamp.fromDate(henTraDate);

    const donHang: Omit<DonHang, "maDonHang"> & { maDonHang: string } = {
      maDonHang,
      maCuaHang: data.maCuaHang || "",
      maKhachHang: data.maKhachHang || "",
      maNhanVien: data.maNhanVien || "",
      ngayTao,
      ngayHenTra,
      trangThai:
        data.cheDoTaoDonHang === CheDoTaoDonHang.CHON_DICH_VU_SAU
          ? TrangThaiDonHang.CHO_CAN_KY
          : TrangThaiDonHang.CHO_XU_LY,
      danhSachDichVu: data.danhSachDichVu,
      tongTrongLuong,
      tongTien,
      tienDaTra: 0,
      tienConLai: tongTien,
      ghiChu: data.ghiChu || "",
      lichSuCapNhat: [],
      cheDoTaoDonHang: data.cheDoTaoDonHang,
      daXacDinhDichVu:
        data.cheDoTaoDonHang === CheDoTaoDonHang.CHON_DICH_VU_TRUOC,
    };

    const cleanedDonHang = cleanFirestoreData(donHang);
    await setDoc(doc(db, COLLECTION, maDonHang), cleanedDonHang);

    // YC 18, TC 1: Audit log for order creation
    auditLogService.log(cleanFirestoreData({
      maCuaHang: data.maCuaHang,
      userId: data.maNhanVien,
      action: "donhang.create",
      afterData: {
        maDonHang,
        tongTien,
        maKhachHang: data.maKhachHang,
        cheDoTaoDonHang: data.cheDoTaoDonHang,
      },
    }));

    return maDonHang;
  },

  async getById(id: string): Promise<DonHang | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) return docSnap.data() as DonHang;
    return null;
  },

  async getByMaDonHang(maDonHang: string): Promise<DonHang | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, maDonHang));
    if (docSnap.exists()) return docSnap.data() as DonHang;
    return null;
  },

  async getByMaCuaHang(
    maCuaHang: string,
    filters?: { trangThai?: TrangThaiDonHang; limitCount?: number },
  ): Promise<DonHang[]> {
    const constraints: QueryConstraint[] = [
      where("maCuaHang", "==", maCuaHang),
    ];
    if (filters?.trangThai) {
      constraints.push(where("trangThai", "==", filters.trangThai));
    }
    constraints.push(orderBy("ngayTao", "desc"));
    constraints.push(limit(filters?.limitCount || DEFAULT_PAGE_SIZE));
    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as DonHang);
  },

  async getByDateRange(
    maCuaHang: string,
    from: Date,
    to: Date,
    options?: { trangThai?: TrangThaiDonHang },
  ): Promise<DonHang[]> {
    const constraints: QueryConstraint[] = [
      where("maCuaHang", "==", maCuaHang),
      where("ngayTao", ">=", Timestamp.fromDate(from)),
      where("ngayTao", "<=", Timestamp.fromDate(to)),
    ];
    if (options?.trangThai) {
      constraints.push(where("trangThai", "==", options.trangThai));
    }
    constraints.push(orderBy("ngayTao", "desc"));
    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as DonHang);
  },

  async getOverdue(maCuaHang: string, now = new Date()): Promise<DonHang[]> {
    // Note: requires composite index maCuaHang ASC + ngayHenTra ASC
    const q = query(
      collection(db, COLLECTION),
      where("maCuaHang", "==", maCuaHang),
      where("ngayHenTra", "<", Timestamp.fromDate(now)),
    );
    const snapshot = await getDocs(q);
    return (
      snapshot.docs
        .map((d) => d.data() as DonHang)
        // Firestore doesn't support not-in with range on another field; filter here
        .filter(
          (d) =>
            d.trangThai !== TrangThaiDonHang.DA_GIAO &&
            d.trangThai !== TrangThaiDonHang.DA_HUY,
        )
        .sort((a, b) => {
          const ta = a.ngayHenTra?.toDate?.() || new Date(0);
          const tb = b.ngayHenTra?.toDate?.() || new Date(0);
          return ta.getTime() - tb.getTime();
        })
    );
  },

  // Yêu Cầu 11, Criteria 10: Cursor-based pagination (max 50/page)
  async getByMaCuaHangPaginated(
    maCuaHang: string,
    options?: {
      trangThai?: TrangThaiDonHang;
      pageSize?: number;
      lastDoc?: DocumentSnapshot | null;
    },
  ): Promise<PaginatedResult<DonHang>> {
    const pageSize = Math.min(
      options?.pageSize || DEFAULT_PAGE_SIZE,
      DEFAULT_PAGE_SIZE,
    );
    const constraints: QueryConstraint[] = [
      where("maCuaHang", "==", maCuaHang),
    ];
    if (options?.trangThai) {
      constraints.push(where("trangThai", "==", options.trangThai));
    }
    constraints.push(orderBy("ngayTao", "desc"));
    constraints.push(limit(pageSize + 1));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
    return {
      data: docs.map((d) => d.data() as DonHang),
      lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },

  async getByKhachHang(maCuaHang: string, maKhachHang: string): Promise<DonHang[]> {
    const q = query(
      collection(db, COLLECTION),
      where("maCuaHang", "==", maCuaHang),
      where("maKhachHang", "==", maKhachHang),
      orderBy("ngayTao", "desc"),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as DonHang);
  },

  async updateStatus(
    id: string,
    newStatus: TrangThaiDonHang,
    userId: string,
    ghiChu?: string,
    vaiTro?: VaiTro,
  ): Promise<void> {
    const docId = await donHangService._resolveDocId(id);
    const docSnap = await getDoc(doc(db, COLLECTION, docId));
    if (!docSnap.exists()) throw new Error("Đơn hàng không tồn tại");

    const current = docSnap.data() as DonHang;
    const isAdmin = vaiTro === VaiTro.ADMIN || vaiTro === VaiTro.SUPER_ADMIN;

    if (!isAdmin && !isValidStatusTransition(current.trangThai, newStatus)) {
      throw new Error(
        `Không thể chuyển từ ${current.trangThai} sang ${newStatus}`,
      );
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
      action: "donhang.update_status",
      beforeData: { trangThai: current.trangThai },
      afterData: { trangThai: newStatus },
      metadata: { maDonHang: current.maDonHang, ghiChu },
    });
  },

  // Cập nhật dịch vụ sau cân ký (Chế độ 2)
  async capNhatDichVuSauCanKy(
    id: string,
    danhSachDichVu: ChiTietDichVu[],
    userId: string,
  ): Promise<void> {
    const docId = await donHangService._resolveDocId(id);
    const docSnap = await getDoc(doc(db, COLLECTION, docId));
    if (!docSnap.exists()) throw new Error("Đơn hàng không tồn tại");

    const current = docSnap.data() as DonHang;
    const tongTien = danhSachDichVu.reduce((sum, dv) => sum + dv.thanhTien, 0);
    const tongTrongLuong = danhSachDichVu.reduce(
      (sum, dv) => sum + dv.trongLuong,
      0,
    );
    const tienConLai = Math.max(0, tongTien - current.tienDaTra);

    await updateDoc(doc(db, COLLECTION, docId), {
      danhSachDichVu,
      tongTien,
      tongTrongLuong,
      tienConLai,
      daXacDinhDichVu: true,
    });

    // YC 18: Audit log for service update after weighing
    auditLogService.log({
      maCuaHang: current.maCuaHang,
      userId,
      action: "donhang.cap_nhat_dich_vu",
      afterData: {
        tongTien,
        tongTrongLuong,
        tienConLai,
        soLuongDichVu: danhSachDichVu.length,
      },
    });
  },

  async updatePayment(id: string, soTienTra: number): Promise<void> {
    const docId = await donHangService._resolveDocId(id);

    const awardInfo = await runTransaction(
      db,
      async (tx): Promise<{ maKhachHang: string; tongTien: number } | null> => {
        const docRef = doc(db, COLLECTION, docId);
        const docSnap = await tx.get(docRef);
        if (!docSnap.exists()) throw new Error("Đơn hàng không tồn tại");

        const current = docSnap.data() as DonHang;
        const newTienDaTra = current.tienDaTra + soTienTra;
        if (newTienDaTra > current.tongTien) {
          throw new Error("Số tiền thanh toán vượt quá tổng tiền");
        }

        const updates: Record<string, unknown> = {
          tienDaTra: newTienDaTra,
          tienConLai: current.tongTien - newTienDaTra,
        };

        let nextAwardInfo: { maKhachHang: string; tongTien: number } | null =
          null;
        if (newTienDaTra >= current.tongTien && !current.daTichDiem) {
          updates.daTichDiem = true;
          nextAwardInfo = {
            maKhachHang: current.maKhachHang,
            tongTien: current.tongTien,
          };
        }

        tx.update(docRef, updates);
        return nextAwardInfo;
      },
    );

    // #6-9: Auto add points when fully paid (outside transaction)
    if (awardInfo) {
      await khachHangService.capNhatDiemTichLuy(
        awardInfo.maKhachHang,
        awardInfo.tongTien,
      );
    }
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
    limitCount = 200,
  ): () => void {
    const q = query(
      collection(db, COLLECTION),
      where("maCuaHang", "==", maCuaHang),
      orderBy("ngayTao", "desc"),
      limit(limitCount),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((d) => d.data() as DonHang);
      callback(orders);
    });
    return unsubscribe;
  },
};
