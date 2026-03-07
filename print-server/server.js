const admin = require("firebase-admin");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { print: printPdfFile } = require("pdf-to-printer");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
require("dotenv").config();

// Look for serviceAccountKey.json in same dir first (portable), then parent dir (dev)
const serviceAccountPath = fs.existsSync(path.join(__dirname, "serviceAccountKey.json"))
  ? path.join(__dirname, "serviceAccountKey.json")
  : path.join(__dirname, "..", "serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const STORE_SELECTION_FILE = path.join(__dirname, "selected_store.json");

// Vietnamese font paths
const FONT_DIR = path.join(__dirname, "fonts");
const FONTS = {
  regular: path.join(FONT_DIR, "Roboto-Regular.ttf"),
  bold: path.join(FONT_DIR, "Roboto-Bold.ttf"),
  italic: path.join(FONT_DIR, "Roboto-Italic.ttf"),
};
const HAS_VN_FONT = fs.existsSync(FONTS.regular) && fs.existsSync(FONTS.bold);

function getArgValue(key) {
  const arg = process.argv.find((x) => x.startsWith(`--${key}=`));
  return arg ? arg.split("=").slice(1).join("=").trim() : "";
}

const CONFIG = {
  storeId: process.env.MA_CUA_HANG || getArgValue("store") || "",
  collection: process.env.PRINT_COLLECTION || "print_jobs",
  orderCollection: process.env.ORDER_COLLECTION || "donHang",
  storeCollection: process.env.STORE_COLLECTION || "cuaHang",
  customerCollection: process.env.CUSTOMER_COLLECTION || "khachHang",
  logCollection: process.env.PRINT_LOG_COLLECTION || "print_job_logs",

  // in pdf để ổn định + có barcode
  printMode: process.env.PRINT_MODE || "pdf", // pdf | notepad
  printerName: process.env.PRINTER_NAME || "",
  printSilent: process.env.PRINT_SILENT !== "false",
  printDialog: process.env.PRINT_DIALOG === "true",

  interactiveStoreSelect: process.env.INTERACTIVE_STORE_SELECT === "true",
  lockStoreSelection: process.env.LOCK_STORE_SELECTION !== "false",

  paperSizeMm: Number(process.env.PAPER_SIZE_MM || 80),
  skipOldJobMs: Number(process.env.SKIP_OLD_JOB_MS || 5000),
  maxRetry: Number(process.env.PRINT_MAX_RETRY || 2),
  retryDelayMs: Number(process.env.PRINT_RETRY_DELAY_MS || 1500),

  printLaundryTag: process.env.PRINT_LAUNDRY_TAG !== "false",

  fallbackStoreName: process.env.STORE_NAME || "Giat Say",
  fallbackStoreAddress: process.env.STORE_ADDRESS || "",
  fallbackStorePhone: process.env.STORE_PHONE || "",
  receiptFooter: (
    process.env.RECEIPT_FOOTER ||
    "Cảm ơn quý khách!\nVui lòng giữ phiếu này để nhận đồ"
  ).replace(/\\n/g, "\n"),

  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000), // 5 minutes
  configCollection: process.env.CONFIG_COLLECTION || "cauHinhCuaHang",
};

const storeInfoCache = { data: null, ts: 0 };
const customerInfoCache = new Map();

function removeAccents(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function formatVND(num) {
  return `${Number(num || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")} đ`;
}

function formatDateTime(timestampLike) {
  if (!timestampLike) return "";

  let d = null;
  if (typeof timestampLike?.toDate === "function") d = timestampLike.toDate();
  else if (timestampLike instanceof Date) d = timestampLike;
  else if (timestampLike?.seconds) d = new Date(timestampLike.seconds * 1000);
  else if (typeof timestampLike === "number") d = new Date(timestampLike);

  if (!d || Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function readStoredStoreSelection() {
  try {
    if (!fs.existsSync(STORE_SELECTION_FILE)) return "";
    const data = JSON.parse(
      fs.readFileSync(STORE_SELECTION_FILE, "utf8") || "{}",
    );
    return data.storeId || "";
  } catch {
    return "";
  }
}

function writeStoredStoreSelection(storeId) {
  fs.writeFileSync(
    STORE_SELECTION_FILE,
    JSON.stringify({ storeId, savedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

async function chooseStoreInteractively() {
  const snap = await db
    .collection(CONFIG.storeCollection)
    .orderBy("ngayTao", "desc")
    .limit(50)
    .get();

  if (snap.empty) {
    throw new Error(
      `Không có dữ liệu cửa hàng trong ${CONFIG.storeCollection}`,
    );
  }

  const stores = snap.docs.map((doc, idx) => {
    const d = doc.data() || {};
    return {
      index: idx + 1,
      id: doc.id,
      name: d.tenCuaHang || d.ten || d.name || doc.id,
    };
  });

  console.log("\n=== DANH SÁCH CỬA HÀNG ===");
  stores.forEach((s) => console.log(`${s.index}. ${s.name} (${s.id})`));

  const answer = Number(
    await askQuestion("\nChọn số thứ tự cửa hàng muốn lắng nghe lệnh in: "),
  );
  const selected = stores.find((x) => x.index === answer);
  if (!selected) throw new Error("Lựa chọn cửa hàng không hợp lệ.");
  return selected.id;
}

async function resolveActiveStoreId() {
  const fromArgOrEnv = CONFIG.storeId;
  const fromLocal = readStoredStoreSelection();

  if (fromArgOrEnv) {
    if (CONFIG.lockStoreSelection) writeStoredStoreSelection(fromArgOrEnv);
    return fromArgOrEnv;
  }

  if (fromLocal) return fromLocal;

  if (CONFIG.interactiveStoreSelect) {
    const picked = await chooseStoreInteractively();
    if (CONFIG.lockStoreSelection) writeStoredStoreSelection(picked);
    return picked;
  }

  throw new Error(
    "Chưa chọn mã cửa hàng. Set MA_CUA_HANG hoặc chạy --store=<id> hoặc bật INTERACTIVE_STORE_SELECT=true",
  );
}

async function getStoreInfo(storeId) {
  // TTL cache: reload every cacheTtlMs
  if (storeInfoCache.data && Date.now() - storeInfoCache.ts < CONFIG.cacheTtlMs) {
    return storeInfoCache.data;
  }

  const fallback = {
    name: CONFIG.fallbackStoreName,
    address: CONFIG.fallbackStoreAddress,
    phone: CONFIG.fallbackStorePhone,
  };

  try {
    // 1. Try cauHinhCuaHang.mauInPhieu first (user-customized print template)
    const configSnap = await db
      .collection(CONFIG.configCollection)
      .doc(storeId)
      .get();

    if (configSnap.exists) {
      const cfg = configSnap.data() || {};
      const mauIn = cfg.mauInPhieu || {};
      if (mauIn.tenCuaHang || mauIn.diaChi || mauIn.soDienThoai) {
        const info = {
          name: mauIn.tenCuaHang || fallback.name,
          address: mauIn.diaChi || fallback.address,
          phone: mauIn.soDienThoai || fallback.phone,
        };
        // Optionally merge with the default subtitle if they didn't specify one
        let footerText = mauIn.footer;
        if (footerText && !footerText.includes('\n')) {
          footerText = `${footerText}\nVui lòng giữ phiếu này để nhận đồ`;
        }
        
        info.footer = footerText || CONFIG.receiptFooter;
        
        storeInfoCache.data = info;
        storeInfoCache.ts = Date.now();
        return info;
      }
    }

    // 2. Fallback to cuaHang collection
    const snap = await db.collection(CONFIG.storeCollection).doc(storeId).get();
    if (!snap.exists) {
      fallback.footer = CONFIG.receiptFooter;
      storeInfoCache.data = fallback;
      storeInfoCache.ts = Date.now();
      return fallback;
    }

    const d = snap.data() || {};
    const info = {
      name: d.tenCuaHang || d.ten || d.name || fallback.name,
      address: d.diaChi || fallback.address,
      phone: d.soDienThoai || fallback.phone,
      footer: CONFIG.receiptFooter,
    };
    storeInfoCache.data = info;
    storeInfoCache.ts = Date.now();
    return info;
  } catch (e) {
    console.warn("⚠️ Không tải được thông tin cửa hàng:", e.message);
    return fallback;
  }
}

async function getCustomerInfo(customerId) {
  if (!customerId) return { name: "", phone: "" };
  // TTL cache per customer
  const cached = customerInfoCache.get(customerId);
  if (cached && Date.now() - cached.ts < CONFIG.cacheTtlMs) return cached.data;

  try {
    const snap = await db.collection(CONFIG.customerCollection).doc(customerId).get();
    if (!snap.exists) {
      const fallback = { name: "", phone: "" };
      customerInfoCache.set(customerId, { data: fallback, ts: Date.now() });
      return fallback;
    }
    const d = snap.data() || {};
    const info = {
      name: d.hoTen || "",
      phone: d.soDienThoai || "",
    };
    customerInfoCache.set(customerId, { data: info, ts: Date.now() });
    return info;
  } catch (e) {
    console.warn("⚠️ Không tải được thông tin khách hàng:", e.message);
    return { name: "", phone: "" };
  }
}

function buildReceiptData(orderData) {
  const rows = (
    Array.isArray(orderData.danhSachDichVu) ? orderData.danhSachDichVu : []
  ).map((dv) => ({
    serviceName: dv.tenDichVu || "Dịch vụ",
    qty: dv.trongLuong > 0 ? String(dv.trongLuong) : String(dv.soLuong || 0),
    price: formatVND(dv.thanhTien || 0),
    amount: Number(dv.thanhTien || 0),
  }));

  const tongTien = rows.reduce((sum, r) => sum + r.amount, 0);
  const tienDaTra = Number(orderData.tienDaTra || tongTien || 0);
  const tienConLai = Number(orderData.tienConLai || 0);

  return {
    maDonHang: String(orderData.maDonHang || ""),
    ngayNhan: formatDateTime(orderData.ngayTao || orderData.thoiGianTao),
    ngayHenTra: formatDateTime(orderData.ngayHenTra || orderData.henTra),
    rows,
    tongTien,
    tienDaTra,
    tienConLai,
  };
}

function mmToPt(mm) {
  return (mm * 72) / 25.4;
}

function tempPdfPath(orderCode) {
  const safe = removeAccents(orderCode || "unknown").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  return path.join(os.tmpdir(), `receipt_${safe}_${Date.now()}.pdf`);
}

async function buildReceiptPdf(orderData, storeInfo, customerInfo) {
  const data = buildReceiptData(orderData);
  const pdfPath = tempPdfPath(data.maDonHang);

  const pageWidth = mmToPt(CONFIG.paperSizeMm);
  const marginLeft = 8;
  const marginRight = 22; // Nới lề phải nhiều hơn để không bị mất chữ số cuối
  const contentW = pageWidth - marginLeft - marginRight;

  // fixed grid cho 80mm
  const serviceW = 90;
  const qtyW = 28;
  const priceW = contentW - serviceW - qtyW;

  const barcodeBuf = await bwipjs.toBuffer({
    bcid: "code128",
    text: data.maDonHang || "000000",
    scale: 2,
    height: 12,
    includetext: false,
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidth, 2000],
      margins: { top: 10, bottom: 10, left: marginLeft, right: marginRight },
      bufferPages: true,
      autoFirstPage: true,
    });

    // Register Vietnamese fonts
    if (HAS_VN_FONT) {
      doc.registerFont("VN", FONTS.regular);
      doc.registerFont("VN-Bold", FONTS.bold);
      doc.registerFont("VN-Italic", FONTS.italic);
    }
    const fRegular = HAS_VN_FONT ? "VN" : "Helvetica";
    const fBold = HAS_VN_FONT ? "VN-Bold" : "Helvetica-Bold";
    const fItalic = HAS_VN_FONT ? "VN-Italic" : "Helvetica-Oblique";

    const out = fs.createWriteStream(pdfPath);
    doc.pipe(out);

    const hr = () => {
      const y = doc.y;
      doc
        .moveTo(marginLeft, y)
        .lineTo(pageWidth - marginRight, y)
        .strokeColor("#666")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.35);
    };

    // Header — use Vietnamese font if available
    const storeName = HAS_VN_FONT ? storeInfo.name : removeAccents(storeInfo.name);
    doc
      .font(fBold)
      .fontSize(11)
      .text(storeName, {
        width: contentW,
        align: "center",
      });
    if (storeInfo.address) {
      const addr = HAS_VN_FONT ? storeInfo.address : removeAccents(storeInfo.address);
      doc
        .font(fRegular)
        .fontSize(8)
        .text(`ĐC: ${addr}`, {
          width: contentW,
          align: "center",
        });
    }
    if (storeInfo.phone) {
      doc
        .font(fRegular)
        .fontSize(8)
        .text(`ĐT: ${storeInfo.phone}`, {
          width: contentW,
          align: "center",
        });
    }

    doc.moveDown(0.2);
    hr();

    doc.font(fBold).fontSize(11).text(HAS_VN_FONT ? "PHIẾU TIẾP NHẬN" : "PHIEU TIEP NHAN", {
      width: contentW,
      align: "center",
    });

    doc.moveDown(0.25);
    doc.font(fRegular).fontSize(8.5);

    const infoY = doc.y;
    doc.text(`Mã: ${data.maDonHang}`, marginLeft, infoY, {
      width: contentW * 0.62,
      align: "left",
    });
    doc.text(data.ngayNhan, marginLeft + contentW * 0.62, infoY, {
      width: contentW * 0.38,
      align: "right",
    });

    doc.y = infoY + 12;
    doc.text(`Hẹn trả: ${data.ngayHenTra}`, marginLeft, doc.y, {
      width: contentW,
      align: "left",
    });

    // Customer info
    if (customerInfo && customerInfo.name) {
      doc.y += 2;
      doc.font(fBold).fontSize(9);
      const custName = HAS_VN_FONT ? customerInfo.name : removeAccents(customerInfo.name);
      doc.text(
        `KH: ${custName}${customerInfo.phone ? " - " + customerInfo.phone : ""}`,
        marginLeft,
        doc.y,
        { width: contentW, align: "left" },
      );
    }

    doc.moveDown(0.25);
    hr();

    // Header row
    doc.font(fBold).fontSize(8.5);
    const rowTop = doc.y;
    doc.text(HAS_VN_FONT ? "Dịch vụ" : "Dich vu", marginLeft, rowTop, { width: serviceW, align: "left" });
    doc.text("SL", marginLeft + serviceW, rowTop, {
      width: qtyW,
      align: "center",
    });
    doc.text("T.Tiền", marginLeft + serviceW + qtyW, rowTop, {
      width: priceW,
      align: "right",
    });
    doc.y = rowTop + 11;

    // Data rows
    doc.font(fRegular).fontSize(8.5);
    data.rows.forEach((r) => {
      const y = doc.y;
      const svcName = HAS_VN_FONT ? r.serviceName : removeAccents(r.serviceName);
      doc.text(svcName, marginLeft, y, {
        width: serviceW,
        align: "left",
        lineBreak: false,
      });
      doc.text(r.qty, marginLeft + serviceW, y, {
        width: qtyW,
        align: "center",
        lineBreak: false,
      });
      doc.text(r.price, marginLeft + serviceW + qtyW, y, {
        width: priceW,
        align: "right",
        lineBreak: false,
      });
      doc.y = y + 15;
    });

    hr();

    const totalRow = (label, value, bold = false) => {
      doc.font(bold ? fBold : fRegular).fontSize(9.5);
      const y = doc.y;
      doc.text(label, marginLeft, y, { width: contentW * 0.55, align: "left" });
      doc.text(value, marginLeft + contentW * 0.55, y, {
        width: contentW * 0.45,
        align: "right",
      });
      doc.y = y + 14;
    };

    totalRow(HAS_VN_FONT ? "TỔNG CỘNG" : "TONG CONG", formatVND(data.tongTien), true);
    totalRow(HAS_VN_FONT ? "Đã trả" : "Da tra", formatVND(data.tienDaTra));
    totalRow(HAS_VN_FONT ? "Còn lại" : "Con lai", formatVND(data.tienConLai));

    hr();

    const barcodeW = Math.min(140, contentW - 10);
    const barcodeX = marginLeft + (contentW - barcodeW) / 2;
    doc.image(barcodeBuf, barcodeX, doc.y + 2, { width: barcodeW });
    doc.y += 55;

    doc.font(fRegular).fontSize(8.5).text(data.maDonHang, marginLeft, doc.y, {
      width: contentW,
      align: "center",
    });

    hr();

    const finalFooter = storeInfo.footer || CONFIG.receiptFooter;
    const footerLines = (finalFooter || "").split("\n");
    footerLines.forEach((line) => {
      const footerLine = HAS_VN_FONT ? line : removeAccents(line);
      doc.font(fItalic).fontSize(8).text(footerLine, marginLeft, doc.y, {
        width: contentW,
        align: "center",
      });
    });

    doc.moveDown(0.25);

    // cắt page height đúng nội dung
    const finalHeight = Math.ceil(doc.y + 10);
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.page.height = finalHeight;
      doc.page.maxY = finalHeight - doc.page.margins.bottom;
    }

    doc.end();

    out.on("finish", () => resolve(pdfPath));
    out.on("error", reject);
  });
}

async function buildLaundryTagPdf(orderData, customerName) {
  const data = buildReceiptData(orderData);
  const pdfPath = tempPdfPath(`tag_${data.maDonHang}`);

  const pageWidth = mmToPt(CONFIG.paperSizeMm);
  const margin = 10;
  const contentW = pageWidth - margin * 2;

  const barcodeBuf = await bwipjs.toBuffer({
    bcid: "code128",
    text: data.maDonHang || "000000",
    scale: 2,
    height: 12,
    includetext: false,
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidth, 2000],
      margins: { top: 4, bottom: 4, left: margin, right: margin },
      bufferPages: true,
      autoFirstPage: true,
    });

    // Register Vietnamese fonts
    if (HAS_VN_FONT) {
      doc.registerFont("VN", FONTS.regular);
      doc.registerFont("VN-Bold", FONTS.bold);
      doc.registerFont("VN-Italic", FONTS.italic);
    }
    const fRegular = HAS_VN_FONT ? "VN" : "Helvetica";
    const fBold = HAS_VN_FONT ? "VN-Bold" : "Helvetica-Bold";

    const out = fs.createWriteStream(pdfPath);
    doc.pipe(out);

    const hr = () => {
      const y = doc.y;
      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor("#666")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.35);
    };

    // Large customer name
    const displayName = HAS_VN_FONT ? (customerName || "Khách hàng") : removeAccents(customerName || "Khach hang");
    doc
      .font(fBold)
      .fontSize(22)
      .text(displayName, {
        width: contentW,
        align: "center",
      });

    doc.moveDown(0.2);
    hr();

    // Barcode
    const barcodeW = Math.min(140, contentW - 20);
    const barcodeX = margin + (contentW - barcodeW) / 2;
    doc.image(barcodeBuf, barcodeX, doc.y + 2, { width: barcodeW });
    doc.y += 55;

    doc.font(fRegular).fontSize(10).text(data.maDonHang, margin, doc.y, {
      width: contentW,
      align: "center",
    });

    hr();

    // Cut line hint
    doc
      .font(fRegular)
      .fontSize(8)
      .fillColor("#666")
      .text(HAS_VN_FONT ? "Dán lên đồ giặt / máy giặt" : "Dan len do giat / may giat", {
        width: contentW,
        align: "center",
      });
    doc.fillColor("#000");

    doc.moveDown(0.25);

    // Trim page height
    const finalHeight = Math.ceil(doc.y + margin);
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.page.height = finalHeight;
      doc.page.maxY = finalHeight - doc.page.margins.bottom;
    }

    doc.end();

    out.on("finish", () => resolve(pdfPath));
    out.on("error", reject);
  });
}

async function printPdfFile_safe(pdfPath) {
  try {
    await printPdfFile(pdfPath, {
      printer: CONFIG.printerName || undefined,
      scale: "fit",
      monochrome: true,
      silent: CONFIG.printSilent,
      printDialog: CONFIG.printDialog,
    });
  } finally {
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }, 2500);
  }
}

async function printWithPdf(orderData, storeInfo, customerInfo) {
  // 1. Print receipt
  const receiptPath = await buildReceiptPdf(orderData, storeInfo, customerInfo);
  await printPdfFile_safe(receiptPath);

  // 2. Print laundry tag (optional)
  if (CONFIG.printLaundryTag && customerInfo && customerInfo.name) {
    await sleep(800); // Small delay between print jobs for POS auto-cutter
    const tagPath = await buildLaundryTagPdf(orderData, customerInfo.name);
    await printPdfFile_safe(tagPath);
  }
}

async function printWithNotepad(orderData) {
  const data = buildReceiptData(orderData);
  const tmpTxt = path.join(
    os.tmpdir(),
    `receipt_${data.maDonHang}_${Date.now()}.txt`,
  );
  const lines = [
    `Ma don: ${data.maDonHang}`,
    `Ngay nhan: ${data.ngayNhan}`,
    `Hen tra: ${data.ngayHenTra}`,
    `Tong cong: ${formatVND(data.tongTien)}`,
  ];
  fs.writeFileSync(tmpTxt, lines.join("\n"), "utf8");
  // fallback only
  const cmd = CONFIG.printerName
    ? `notepad /pt "${tmpTxt}" "${CONFIG.printerName}"`
    : `notepad /p "${tmpTxt}"`;
  await new Promise((resolve, reject) => {
    require("child_process").exec(cmd, (e) => (e ? reject(e) : resolve()));
  });
  setTimeout(() => {
    if (fs.existsSync(tmpTxt)) fs.unlinkSync(tmpTxt);
  }, 1500);
}

async function printOrder(orderData, storeInfo, customerInfo) {
  if (CONFIG.printMode === "notepad") return printWithNotepad(orderData);
  return printWithPdf(orderData, storeInfo, customerInfo);
}

async function writePrintLog(payload) {
  try {
    await db.collection(CONFIG.logCollection).add({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("⚠️ Không ghi được print log:", e.message);
  }
}

async function updateJobStatus(jobId, status, extra = {}) {
  try {
    await db
      .collection(CONFIG.collection)
      .doc(jobId)
      .update({
        trangThaiIn: status,
        ...extra,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (e) {
    // Job may have been deleted already
    if (e.code !== 5) console.warn("⚠️ Không cập nhật được trạng thái job:", e.message);
  }
}

async function processPrintJob(jobId, jobData, activeStoreId) {
  const startedAt = Date.now();
  const orderCode = jobData.maDonHang;

  // Update status → PRINTING
  await updateJobStatus(jobId, "PRINTING");

  const orderSnap = await db
    .collection(CONFIG.orderCollection)
    .where("maDonHang", "==", orderCode)
    .where("maCuaHang", "==", activeStoreId)
    .limit(1)
    .get();

  if (orderSnap.empty) {
    throw new Error(
      `Không tìm thấy đơn ${orderCode} của cửa hàng ${activeStoreId}`,
    );
  }

  const orderData = orderSnap.docs[0].data();
  const storeInfo = await getStoreInfo(activeStoreId);
  const customerInfo = await getCustomerInfo(orderData.maKhachHang);

  for (let attempt = 1; attempt <= CONFIG.maxRetry + 1; attempt++) {
    try {
      console.log(
        `🖨 In đơn ${orderCode} - lần ${attempt} (store: ${activeStoreId})`,
      );
      await printOrder(orderData, storeInfo, customerInfo);

      await writePrintLog({
        jobId,
        maCuaHang: activeStoreId,
        maDonHang: orderCode,
        status: "SUCCESS",
        attempt,
        printMode: CONFIG.printMode,
        durationMs: Date.now() - startedAt,
      });

      // Update status → SUCCESS (keep briefly so frontend can read)
      await updateJobStatus(jobId, "SUCCESS");
      return;
    } catch (error) {
      const isLastAttempt = attempt >= CONFIG.maxRetry + 1;
      const errorMessage = error?.message || "Unknown print error";
      const errorCode = error?.code || "N/A";
      const errorStackTop = String(error?.stack || "")
        .split("\n")
        .slice(0, 2)
        .join(" | ");

      await writePrintLog({
        jobId,
        maCuaHang: activeStoreId,
        maDonHang: orderCode,
        status: isLastAttempt ? "FAILED" : "RETRYING",
        attempt,
        printMode: CONFIG.printMode,
        error: errorMessage,
        errorCode,
        errorStackTop,
        durationMs: Date.now() - startedAt,
      });

      console.error(
        `❌ Chi tiết lỗi in (attempt ${attempt}/${CONFIG.maxRetry + 1}) | job=${jobId} | order=${orderCode} | store=${activeStoreId} | mode=${CONFIG.printMode} | code=${errorCode} | message=${errorMessage}`,
      );
      if (errorStackTop) console.error(`🧵 Stack: ${errorStackTop}`);

      if (isLastAttempt) throw error;
      console.warn(
        `⚠️ In lỗi lần ${attempt}, thử lại sau ${CONFIG.retryDelayMs}ms`,
      );
      await sleep(CONFIG.retryDelayMs);
    }
  }
}

async function start() {
  const activeStoreId = await resolveActiveStoreId();
  console.log(
    `📡 Đang lắng nghe yêu cầu in (cố định cửa hàng: ${activeStoreId})...`,
  );

  const nowMillis = Date.now();

  db.collection(CONFIG.collection)
    .where("maCuaHang", "==", activeStoreId)
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== "added") return;

          const jobData = change.doc.data();
          const jobId = change.doc.id;

          if ((jobData.maCuaHang || "") !== activeStoreId) {
            console.warn(
              `⚠️ Bỏ qua job ${jobId} vì khác cửa hàng. expected=${activeStoreId}, actual=${jobData.maCuaHang || ""}`,
            );
            return;
          }

          // Skip old jobs — unless it's a re-print request
          const isReprint = jobData.loaiIn === "IN_LAI";
          if (!isReprint) {
            const jobTime = jobData.thoiGianTao
              ? jobData.thoiGianTao.toMillis()
              : 0;
            if (jobTime < nowMillis - CONFIG.skipOldJobMs) return;
          }

          console.log(
            `\n🔔 ${isReprint ? "In lại" : "Nhận lệnh in mới"}: Đơn ${jobData.maDonHang} (Job: ${jobId})`,
          );

          try {
            await processPrintJob(jobId, jobData, activeStoreId);
            console.log(`✅ In thành công đơn ${jobData.maDonHang}`);
            // Delay delete so frontend can read SUCCESS status
            await sleep(2000);
            await db.collection(CONFIG.collection).doc(jobId).delete();
            console.log(`🗑 Đã dọn queue lệnh in ${jobId}`);
          } catch (error) {
            console.error(
              `❌ Lỗi xử lý in cho đơn ${jobData.maDonHang}:`,
              error.message,
            );
            await updateJobStatus(jobId, "FAILED", {
              loiIn: error.message,
            });
          }
        });
      },
      (error) => {
        console.error("Lỗi kết nối Firestore Listener:", error);
      },
    );
}

start().catch((error) => {
  console.error("❌ Không thể khởi động print-server:", error.message);
  process.exit(1);
});

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);
