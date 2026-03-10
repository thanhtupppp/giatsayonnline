import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin (Only once)
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized with Environment Variables.');
    } else {
      // Fallback for local testing or if deployed securely within GCP (Vercel isn't GCP, so env vars are needed)
      admin.initializeApp();
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
    const db = admin.firestore();
    
    // Tải dữ liệu từ 3 collection chính
    const [donHangs, khachHangs, giaoDichs] = await Promise.all([
      db.collection('donHang').get(),
      db.collection('khachHang').get(),
      db.collection('giaoDich').get()
    ]);

    const backupData = {
      thoiGianBackup: new Date().toISOString(),
      tongSoDonHang: donHangs.size,
      tongSoKhachHang: khachHangs.size,
      tongSoGiaoDich: giaoDichs.size,
      donHang: donHangs.docs.map(d => ({id: d.id, ...d.data()})),
      khachHang: khachHangs.docs.map(d => ({id: d.id, ...d.data()})),
      giaoDich: giaoDichs.docs.map(d => ({id: d.id, ...d.data()}))
    };

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
      subject: `[Backup] Giặt Sấy Online - ${dateStr}`,
      text: `Chào quản trị viên,\n\nHệ thống Vercel Cron đã tự động sao lưu dữ liệu thành công lúc ${new Date().toLocaleString('vi-VN')}.\n\nTổng cộng:\n- ${donHangs.size} Đơn hàng\n- ${khachHangs.size} Khách hàng\n- ${giaoDichs.size} Giao dịch.\n\nVui lòng tải file JSON đính kèm để lưu trữ.\n\nTrân trọng,\nGiặt Sấy Online System.`,
      attachments: [
        {
          filename: `giatsay_backup_${dateStr}.json`,
          content: backupString,
          contentType: 'application/json'
        }
      ]
    });

    res.status(200).json({ success: true, message: `Backup array ${donHangs.size} orders, emailed to ${process.env.BACKUP_RECEIVER_EMAIL}.` });
  } catch (error: any) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi không xác định.' });
  }
}
