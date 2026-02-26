import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logError } from '../utils/errorHandler';

const COLLECTION = 'print_jobs';

export interface PrintJob {
  id: string;
  maCuaHang: string;
  maDonHang: string;
  thoiGianTao: Timestamp;
  nguoiYeuCau: string; // Tên nhân viên hoặc máy yêu cầu in
}

export const printService = {
  /**
   * (Mobile) Push a new print job to Firestore
   */
  async requestPrint(maCuaHang: string, maDonHang: string, nguoiYeuCau: string): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTION), {
        maCuaHang,
        maDonHang,
        nguoiYeuCau,
        thoiGianTao: Timestamp.now(),
      });
    } catch (err) {
      logError(err, 'printService.requestPrint');
      throw err;
    }
  },

  /**
   * (PC) Delete a print job after it's been processed
   */
  async markPrinted(jobId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION, jobId));
    } catch (err) {
      logError(err, 'printService.markPrinted');
    }
  },

  /**
   * (PC) Listen to new print jobs for a specific store
   */
  listenForPrintJobs(
    maCuaHang: string,
    callback: (job: PrintJob) => void
  ): () => void {
    if (!maCuaHang) return () => {};

    // Get current time to filter out old jobs client-side
    // This avoids needing a composite index in Firestore for maCuaHang + thoiGianTao
    const nowMillis = Date.now();
    const q = query(
      collection(db, COLLECTION),
      where('maCuaHang', '==', maCuaHang)
    );

    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Filter out old jobs on the client using milliseconds
          if (data.thoiGianTao && data.thoiGianTao.toMillis() >= nowMillis - 5000) { // allow 5s leeway
            const job: PrintJob = {
              id: change.doc.id,
              maCuaHang: data.maCuaHang,
              maDonHang: data.maDonHang,
              thoiGianTao: data.thoiGianTao,
              nguoiYeuCau: data.nguoiYeuCau,
            };
            callback(job);
          }
        }
      });
    }, (err) => {
      logError(err, 'printService.listenForPrintJobs');
    });
  }
};
