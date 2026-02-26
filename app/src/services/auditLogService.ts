/**
 * Yêu Cầu 18: Audit Log Service
 * 
 * TC 7: Audit logs are write-only from client (no update/delete).
 * TC 8: Logs kept at least 1 year (Firestore retention).
 */
import {
  collection, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'auditLog';

export interface AuditLogEntry {
  maCuaHang: string;
  userId: string;
  action: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const auditLogService = {
  /**
   * TC 1-5: Write an audit log entry.
   * This is intentionally write-only — no update/delete methods (TC 7).
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTION), {
        ...entry,
        timestamp: serverTimestamp(),
      });
    } catch {
      // Audit logging should never break the main flow
      console.error('[AuditLog] Failed to write log:', entry.action);
    }
  },
};
