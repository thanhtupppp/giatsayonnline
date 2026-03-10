import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

// Khởi tạo Firebase Admin (Chỉ một lần trên môi trường Serverless)
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized with Environment Variables.');
    } else {
      // Fallback for local testing or if deployed securely within GCP (Vercel isn't GCP, so env vars are needed)
      initializeApp();
      console.log('Firebase Admin initialized with default application credentials.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export default async function handler(req: any, res: any) {
  // --- 보안 Kiểm tra ---
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Invalid CRON_SECRET.' });
    }
  }

  try {
    const db = getFirestore();
    
    // Lấy danh sách toàn bộ các Collection có trong Database
    const collections = await db.listCollections();
    
    const backupData: Record<string, any> = {
      thoiGianBackup: new Date().toISOString(),
      tongSoCollection: collections.length,
      chiTietData: {}
    };

    let totalDocs = 0;

    // Duyệt qua từng Collection và tải toàn bộ Document
    for (const collection of collections) {
      const snapshot = await collection.get();
      backupData.chiTietData[collection.id] = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      totalDocs += snapshot.size;
    }

    const backupString = JSON.stringify(backupData, null, 2);
    
    // Gửi email bằng Nodemailer
    // Yêu cầu: EMAIL_USER (vd: admin@gmail.com), EMAIL_PASS (App Password), BACKUP_RECEIVER_EMAIL (người nhận)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.BACKUP_RECEIVER_EMAIL) {
      throw new Error('Chưa cấu hình biến môi trường Email (EMAIL_USER, EMAIL_PASS, BACKUP_RECEIVER_EMAIL).');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const dateStr = new Date().toISOString().split('T')[0];
    
    await transporter.sendMail({
      from: `"Giặt Sấy Online Backup" <${process.env.EMAIL_USER}>`,
      to: process.env.BACKUP_RECEIVER_EMAIL,
      subject: `[Backup] Giặt Sấy Online - ${dateStr} - Toàn bộ dữ liệu`,
      text: `Chào quản trị viên,\n\nHệ thống Vercel Cron đã tự động sao lưu dữ liệu TOÀN BỘ hệ thống thành công lúc ${new Date().toLocaleString('vi-VN')}.\n\nThống kê cơ bản:\n- Số lượng Bảng (Collections): ${collections.length}\n- Tổng Dữ liệu (Documents): ${totalDocs}\n\nVui lòng tải file JSON (Full Database Dump) đính kèm để lưu trữ.\n\nTrân trọng,\nGiặt Sấy Online System.`,
      attachments: [
        {
          filename: `giatsay_backup_full_${dateStr}.json`,
          content: backupString,
          contentType: 'application/json'
        }
      ]
    });

    res.status(200).json({ success: true, message: `Backup full db (${collections.length} collections, ${totalDocs} docs), emailed to ${process.env.BACKUP_RECEIVER_EMAIL}.` });
  } catch (error: any) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi không xác định.' });
  }
}
