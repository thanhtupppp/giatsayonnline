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

export type LoaiIn = 'TAO_MOI' | 'IN_LAI';
export type PrintJobStatus = 'PENDING' | 'PRINTING' | 'SUCCESS' | 'FAILED';

export interface PrintJob {
  id: string;
  maCuaHang: string;
  maDonHang: string;
  thoiGianTao: Timestamp;
  nguoiYeuCau: string; // Tên nhân viên hoặc máy yêu cầu in
  loaiIn?: LoaiIn;
  trangThaiIn?: PrintJobStatus;
  loiIn?: string;
}

export const printService = {
  /**
   * (Mobile) Push a new print job to Firestore
   */
  async requestPrint(
    maCuaHang: string,
    maDonHang: string,
    nguoiYeuCau: string,
    loaiIn: LoaiIn = 'TAO_MOI',
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION), {
        maCuaHang,
        maDonHang,
        nguoiYeuCau,
        loaiIn,
        trangThaiIn: 'PENDING',
        thoiGianTao: Timestamp.now(),
      });
      return docRef.id;
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
   * Listen for print status changes on a specific job.
   * Returns unsubscribe function.
   */
  listenForPrintStatus(
    jobId: string,
    callback: (status: PrintJobStatus, errorMsg?: string) => void,
  ): () => void {
    if (!jobId) return () => {};

    return onSnapshot(
      doc(db, COLLECTION, jobId),
      (snap) => {
        if (!snap.exists()) {
          // Job deleted = successfully processed
          callback('SUCCESS');
          return;
        }
        const data = snap.data();
        const status = (data.trangThaiIn || 'PENDING') as PrintJobStatus;
        callback(status, data.loiIn);
      },
      (err) => {
        logError(err, 'printService.listenForPrintStatus');
        callback('FAILED', err.message);
      },
    );
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
              loaiIn: data.loaiIn,
              trangThaiIn: data.trangThaiIn,
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
