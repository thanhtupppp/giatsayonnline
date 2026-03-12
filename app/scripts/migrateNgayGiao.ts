import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

type LichSuTrangThai = {
  trangThaiCu?: string;
  trangThaiMoi?: string;
  nguoiCapNhat?: string;
  thoiGian?: unknown; // Firestore Timestamp (admin) or plain object
  ghiChu?: string;
};

type DonHangDoc = {
  maDonHang: string;
  maCuaHang: string;
  ngayTao?: unknown;
  ngayGiao?: unknown;
  trangThai?: string;
  lichSuCapNhat?: LichSuTrangThai[];
};

function initAdmin() {
  if (getApps().length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }

  // Fallback: will work only if Application Default Credentials are set
  initializeApp();
}

function toAdminTimestamp(tsLike: unknown): Timestamp | null {
  if (!tsLike) return null;
  if (tsLike instanceof Timestamp) return tsLike;
  const maybeObj = tsLike as Record<string, unknown>;
  if (typeof maybeObj?.toDate === "function") {
    const d = (maybeObj.toDate as () => unknown)();
    return d instanceof Date ? Timestamp.fromDate(d) : null;
  }
  if (typeof maybeObj?.seconds === "number") {
    const seconds = maybeObj.seconds as number;
    const nanos =
      typeof maybeObj.nanoseconds === "number"
        ? (maybeObj.nanoseconds as number)
        : 0;
    return new Timestamp(seconds, nanos);
  }
  return null;
}

function pickNgayGiao(dh: DonHangDoc): Timestamp | null {
  // PRD BR-08: backfill từ lịch sử cập nhật (thời điểm chuyển sang DA_GIAO)
  const ls = Array.isArray(dh.lichSuCapNhat) ? dh.lichSuCapNhat : [];
  const deliveredTimes: Timestamp[] = [];
  for (const e of ls) {
    if (e?.trangThaiMoi !== "DA_GIAO") continue;
    const t = toAdminTimestamp(e.thoiGian);
    if (t) deliveredTimes.push(t);
  }
  if (deliveredTimes.length) {
    deliveredTimes.sort((a, b) => a.toMillis() - b.toMillis());
    return deliveredTimes[0];
  }

  // Fallback theo PRD: dùng ngày tạo nếu thiếu lịch sử
  const ngayTao = toAdminTimestamp(dh.ngayTao);
  return ngayTao;
}

async function main() {
  initAdmin();
  const db = getFirestore();

  console.log("=== migrateNgayGiao: start ===");
  console.log("Project:", process.env.FIREBASE_PROJECT_ID || "(ADC/default)");

  const col = db.collection("donHang");

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  // Ưu tiên query chỉ các đơn đã giao và chưa có ngayGiao (idempotent)
  // Lưu ý: where('ngayGiao','==',null) thường match cả null và missing field
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  const pageSize = 300;

  for (;;) {
    let q = col
      .where("trangThai", "==", "DA_GIAO")
      .where("ngayGiao", "==", null)
      .orderBy("ngayTao", "desc")
      .limit(pageSize);
    if (lastDoc) q = q.startAfter(lastDoc);

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await q.get();
    } catch {
      // Fallback nếu thiếu index: query theo trạng thái rồi filter client-side
      console.warn(
        "Query tối ưu bị lỗi (có thể thiếu index). Fallback scan theo trangThai...",
      );
      let q2 = col
        .where("trangThai", "==", "DA_GIAO")
        .orderBy("ngayTao", "desc");
      if (lastDoc) q2 = q2.startAfter(lastDoc);
      snap = await q2.limit(pageSize).get();
    }

    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    const batch = db.batch();
    let batchCount = 0;

    for (const docSnap of snap.docs) {
      const dh = docSnap.data() as DonHangDoc;
      scanned += 1;

      if (dh.ngayGiao) {
        skipped += 1;
        continue;
      }
      if (dh.trangThai !== "DA_GIAO") {
        skipped += 1;
        continue;
      }

      const ngayGiao = pickNgayGiao(dh);
      if (!ngayGiao) {
        skipped += 1;
        continue;
      }

      batch.update(docSnap.ref, {
        ngayGiao,
      });
      batchCount += 1;
      updated += 1;

      // Firestore batch tối đa 500 ops
      if (batchCount >= 450) break;
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(
        `Committed batch: updated=${batchCount} | scanned=${scanned} | skipped=${skipped}`,
      );
    } else {
      console.log(
        `No updates in page | scanned=${scanned} | skipped=${skipped}`,
      );
    }

    // Nếu đã cắt sớm do batchCount >= 450, giữ lastDoc như cũ => sẽ tiếp tục trang kế tiếp bình thường
  }

  console.log("=== migrateNgayGiao: done ===");
  console.log({ scanned, updated, skipped });
}

main().catch((err) => {
  console.error("migrateNgayGiao failed:", err);
  process.exitCode = 1;
});
