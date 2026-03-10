// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require('bwip-js')

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { print as printPdfFile } from 'pdf-to-printer'
import PDFDocument from 'pdfkit'
import dotenv from 'dotenv'
import { app } from 'electron'

// Try multiple .env locations
const envCandidates = app.isPackaged
  ? [
      path.join((process as any).resourcesPath, '.env'),
      path.join(path.dirname(app.getPath('exe')), '.env')
    ]
  : [path.resolve(process.cwd(), '.env')]

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    console.log('Loaded .env from:', envPath)
    break
  }
}

// Vietnamese font paths — try multiple locations
function resolveFontDir(): string {
  const candidates = [
    path.join(process.cwd(), 'fonts'),
    path.join(app.getAppPath(), 'fonts'),
    path.join(__dirname, 'fonts'),
    path.join(__dirname, '../../fonts'),
    path.join(__dirname, '../../../src/main/fonts')
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return path.join(__dirname, 'fonts')
}

const FONT_DIR = resolveFontDir()
const FONTS = {
  regular: path.join(FONT_DIR, 'Roboto-Regular.ttf'),
  bold: path.join(FONT_DIR, 'Roboto-Bold.ttf'),
  italic: path.join(FONT_DIR, 'Roboto-Italic.ttf')
}
const HAS_VN_FONT = fs.existsSync(FONTS.regular) && fs.existsSync(FONTS.bold)
console.log(`Fonts: ${FONT_DIR} (${HAS_VN_FONT ? 'OK' : 'NOT FOUND'})`)

let db: any
let currentListener: (() => void) | null = null

// Caches
const storeInfoCache: { data: any; ts: number } = { data: null, ts: 0 }
const customerInfoCache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

// CONFIG from env
const CONFIG = {
  printSilent: process.env.PRINT_SILENT !== 'false',
  printDialog: process.env.PRINT_DIALOG === 'true',
  printerName: process.env.PRINTER_NAME || '',
  paperSizeMm: Number(process.env.PAPER_SIZE_MM || 80),
  maxRetry: Number(process.env.PRINT_MAX_RETRY || 2),
  retryDelayMs: Number(process.env.PRINT_RETRY_DELAY_MS || 1500),
  skipOldJobMs: Number(process.env.SKIP_OLD_JOB_MS || 5000),
  printLaundryTag: process.env.PRINT_LAUNDRY_TAG !== 'false',
  fallbackStoreName: process.env.STORE_NAME || 'Giặt Sấy Online',
  fallbackStoreAddress: process.env.STORE_ADDRESS || '',
  fallbackStorePhone: process.env.STORE_PHONE || '',
  receiptFooter: (
    process.env.RECEIPT_FOOTER || 'Cảm ơn quý khách!\nVui lòng giữ phiếu này để nhận đồ'
  ).replace(/\\n/g, '\n')
}

// ========== HELPERS ==========

function removeAccents(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

function formatVND(num: number): string {
  return `${Number(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`
}

function formatDateTime(timestampLike: any): string {
  if (!timestampLike) return ''
  let d: Date | null = null
  if (typeof timestampLike?.toDate === 'function') d = timestampLike.toDate()
  else if (timestampLike instanceof Date) d = timestampLike
  else if (timestampLike?.seconds) d = new Date(timestampLike.seconds * 1000)
  else if (typeof timestampLike === 'number') d = new Date(timestampLike)

  if (!d || Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mmToPt(mm: number) {
  return (mm * 72) / 25.4
}

function tempPdfPath(orderCode: string) {
  const safe = removeAccents(orderCode || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(os.tmpdir(), `receipt_${safe}_${Date.now()}.pdf`)
}

// ========== FIREBASE ==========

export function initFirebase(): { success: boolean; error?: string } {
  try {
    const possiblePaths = [
      path.join((process as any).resourcesPath, 'serviceAccountKey.json'), // When extraResources is used
      path.join(process.cwd(), 'serviceAccountKey.json'),
      path.join(app.getAppPath(), 'serviceAccountKey.json'),
      path.join(
        app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd(),
        'serviceAccountKey.json'
      ),
      path.join(__dirname, '../../serviceAccountKey.json'),
      path.join(__dirname, '../../../src/main/serviceAccountKey.json'),
      path.join(__dirname, 'serviceAccountKey.json')
    ]

    console.log('Đang tìm serviceAccountKey.json...')

    let serviceAccountPath = ''
    for (const p of possiblePaths) {
      const exists = fs.existsSync(p)
      console.log(`  [${exists ? 'OK' : '--'}] ${p}`)
      if (exists && !serviceAccountPath) {
        serviceAccountPath = p
      }
    }

    if (serviceAccountPath) {
      console.log('Sử dụng:', serviceAccountPath)
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
      if (!admin.apps?.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      }
      db = admin.firestore()
      return { success: true }
    }

    const triedPaths = possiblePaths.map(p => `  ${p}`).join('\n')
    const errMsg = `Không tìm thấy serviceAccountKey.json! Đã thử:\n${triedPaths}`
    console.error(errMsg)
    return { success: false, error: errMsg }
  } catch (err: any) {
    const errMsg = `Lỗi khởi tạo Firebase: ${err?.message || err}`
    console.error(errMsg)
    return { success: false, error: errMsg }
  }
}

export async function getStores(): Promise<{ stores: {id: string, name: string}[]; error?: string }> {
  if (!db) {
    const errMsg = 'Firebase chưa được khởi tạo (db = null). Kiểm tra lại serviceAccountKey.json'
    console.error('getStores:', errMsg)
    return { stores: [], error: errMsg }
  }
  try {
    // Thử collection cuaHang trước
    let snap = await db.collection('cuaHang').get()
    if (!snap.empty) {
      console.log(`Tìm thấy ${snap.size} cửa hàng trong collection cuaHang`)
      return {
        stores: snap.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.data()?.tenCuaHang || doc.data()?.ten || doc.data()?.name || doc.id
        }))
      }
    }

    // Fallback: lấy từ cauHinhCuaHang
    console.log('Collection cuaHang trống, thử cauHinhCuaHang...')
    snap = await db.collection('cauHinhCuaHang').get()
    if (!snap.empty) {
      console.log(`Tìm thấy ${snap.size} cửa hàng trong collection cauHinhCuaHang`)
      return {
        stores: snap.docs.map((doc: any) => {
          const data = doc.data()
          const name =
            data?.mauInPhieu?.tenCuaHang || data?.tenCuaHang || data?.ten || data?.name || doc.id
          return { id: doc.id, name }
        })
      }
    }

    console.warn('Không tìm thấy cửa hàng nào trong cả 2 collection')
    return { stores: [], error: 'Không tìm thấy cửa hàng nào trong database (cuaHang & cauHinhCuaHang đều trống)' }
  } catch (err: any) {
    const errMsg = `Lỗi lấy danh sách cửa hàng: ${err?.message || err}`
    console.error(errMsg)
    return { stores: [], error: errMsg }
  }
}

// ========== STORE & CUSTOMER INFO ==========

async function getStoreInfo(storeId: string) {
  if (storeInfoCache.data && Date.now() - storeInfoCache.ts < CACHE_TTL_MS) {
    return storeInfoCache.data
  }

  const fallback = {
    name: CONFIG.fallbackStoreName,
    address: CONFIG.fallbackStoreAddress,
    phone: CONFIG.fallbackStorePhone,
    footer: CONFIG.receiptFooter
  }

  try {
    // 1. Try cauHinhCuaHang.mauInPhieu first
    const configSnap = await db.collection('cauHinhCuaHang').doc(storeId).get()
    if (configSnap.exists) {
      const cfg = configSnap.data() || {}
      const mauIn = cfg.mauInPhieu || {}
      if (mauIn.tenCuaHang || mauIn.diaChi || mauIn.soDienThoai) {
        const info = {
          name: mauIn.tenCuaHang || fallback.name,
          address: mauIn.diaChi || fallback.address,
          phone: mauIn.soDienThoai || fallback.phone,
          footer: mauIn.footer || CONFIG.receiptFooter
        }
        storeInfoCache.data = info
        storeInfoCache.ts = Date.now()
        return info
      }
    }

    // 2. Fallback to cuaHang collection
    const snap = await db.collection('cuaHang').doc(storeId).get()
    if (snap.exists) {
      const d = snap.data() || {}
      const info = {
        name: d.tenCuaHang || d.ten || d.name || fallback.name,
        address: d.diaChi || fallback.address,
        phone: d.soDienThoai || fallback.phone,
        footer: CONFIG.receiptFooter
      }
      storeInfoCache.data = info
      storeInfoCache.ts = Date.now()
      return info
    }

    storeInfoCache.data = fallback
    storeInfoCache.ts = Date.now()
    return fallback
  } catch (e: any) {
    console.warn('⚠️ Không tải được thông tin cửa hàng:', e.message)
    return fallback
  }
}

async function getCustomerInfo(customerId: string) {
  if (!customerId) return { name: '', phone: '' }

  const cached = customerInfoCache.get(customerId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  try {
    const snap = await db.collection('khachHang').doc(customerId).get()
    if (!snap.exists) {
      const fallback = { name: '', phone: '' }
      customerInfoCache.set(customerId, { data: fallback, ts: Date.now() })
      return fallback
    }
    const d = snap.data() || {}
    const info = { name: d.hoTen || '', phone: d.soDienThoai || '' }
    customerInfoCache.set(customerId, { data: info, ts: Date.now() })
    return info
  } catch (e: any) {
    console.warn('⚠️ Không tải được thông tin khách hàng:', e.message)
    return { name: '', phone: '' }
  }
}

// ========== RECEIPT DATA ==========

function buildReceiptData(orderData: any) {
  const rows = (Array.isArray(orderData.danhSachDichVu) ? orderData.danhSachDichVu : []).map(
    (dv: any) => ({
      serviceName: dv.tenDichVu || 'Dịch vụ',
      qty: dv.trongLuong > 0 ? String(dv.trongLuong) : String(dv.soLuong || 0),
      price: formatVND(dv.thanhTien || 0),
      amount: Number(dv.thanhTien || 0)
    })
  )

  const tongTien = rows.reduce((sum: number, r: any) => sum + r.amount, 0)
  const tienDaTra = Number(orderData.tienDaTra ?? 0)
  const tienConLai = Number(orderData.tienConLai || 0)

  return {
    maDonHang: String(orderData.maDonHang || ''),
    ngayNhan: formatDateTime(orderData.ngayTao || orderData.thoiGianTao),
    ngayHenTra: formatDateTime(orderData.ngayHenTra || orderData.henTra),
    rows,
    tongTien,
    tienDaTra,
    tienConLai
  }
}

// ========== PDF RECEIPT ==========

async function buildReceiptPdf(
  orderData: any,
  storeInfo: any,
  customerInfo: any
): Promise<string> {
  const data = buildReceiptData(orderData)
  const pdfPath = tempPdfPath(data.maDonHang)

  const pageWidth = mmToPt(CONFIG.paperSizeMm)
  const marginLeft = 8
  const marginRight = 22
  const contentW = pageWidth - marginLeft - marginRight

  const serviceW = 90
  const qtyW = 28
  const priceW = contentW - serviceW - qtyW

  const barcodeBuf = await bwipjs.toBuffer({
    bcid: 'code128',
    text: data.maDonHang || '000000',
    scale: 2,
    height: 12,
    includetext: false
  })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidth, 2000],
      margins: { top: 10, bottom: 10, left: marginLeft, right: marginRight },
      bufferPages: true,
      autoFirstPage: true
    })

    // Register Vietnamese fonts
    if (HAS_VN_FONT) {
      doc.registerFont('VN', FONTS.regular)
      doc.registerFont('VN-Bold', FONTS.bold)
      doc.registerFont('VN-Italic', FONTS.italic)
    }
    const fRegular = HAS_VN_FONT ? 'VN' : 'Helvetica'
    const fBold = HAS_VN_FONT ? 'VN-Bold' : 'Helvetica-Bold'
    const fItalic = HAS_VN_FONT ? 'VN-Italic' : 'Helvetica-Oblique'

    const out = fs.createWriteStream(pdfPath)
    doc.pipe(out)

    const hr = () => {
      const y = doc.y
      doc
        .moveTo(marginLeft, y)
        .lineTo(pageWidth - marginRight, y)
        .strokeColor('#666')
        .lineWidth(0.5)
        .stroke()
      doc.moveDown(0.35)
    }

    // ===== HEADER =====
    const storeName = HAS_VN_FONT ? storeInfo.name : removeAccents(storeInfo.name)
    doc.font(fBold).fontSize(11).text(storeName, { width: contentW, align: 'center' })

    if (storeInfo.address) {
      const addr = HAS_VN_FONT ? storeInfo.address : removeAccents(storeInfo.address)
      doc.font(fRegular).fontSize(8).text(`ĐC: ${addr}`, { width: contentW, align: 'center' })
    }
    if (storeInfo.phone) {
      doc.font(fRegular).fontSize(8).text(`ĐT: ${storeInfo.phone}`, {
        width: contentW,
        align: 'center'
      })
    }

    doc.moveDown(0.2)
    hr()

    // ===== TITLE =====
    doc
      .font(fBold)
      .fontSize(11)
      .text(HAS_VN_FONT ? 'PHIẾU TIẾP NHẬN' : 'PHIEU TIEP NHAN', {
        width: contentW,
        align: 'center'
      })

    doc.moveDown(0.25)
    doc.font(fRegular).fontSize(8.5)

    // ===== ORDER INFO =====
    const infoY = doc.y
    doc.text(`Mã: ${data.maDonHang}`, marginLeft, infoY, {
      width: contentW * 0.62,
      align: 'left'
    })
    doc.text(data.ngayNhan, marginLeft + contentW * 0.62, infoY, {
      width: contentW * 0.38,
      align: 'right'
    })

    doc.y = infoY + 12
    doc.text(`Hẹn trả: ${data.ngayHenTra}`, marginLeft, doc.y, {
      width: contentW,
      align: 'left'
    })

    // ===== CUSTOMER INFO =====
    if (customerInfo && customerInfo.name) {
      doc.y += 2
      doc.font(fBold).fontSize(9)
      const custName = HAS_VN_FONT ? customerInfo.name : removeAccents(customerInfo.name)
      doc.text(
        `KH: ${custName}${customerInfo.phone ? ' - ' + customerInfo.phone : ''}`,
        marginLeft,
        doc.y,
        { width: contentW, align: 'left' }
      )
    }

    doc.moveDown(0.25)
    hr()

    // ===== SERVICE TABLE HEADER =====
    doc.font(fBold).fontSize(8.5)
    const rowTop = doc.y
    doc.text(HAS_VN_FONT ? 'Dịch vụ' : 'Dich vu', marginLeft, rowTop, {
      width: serviceW,
      align: 'left'
    })
    doc.text('SL', marginLeft + serviceW, rowTop, { width: qtyW, align: 'center' })
    doc.text('T.Tiền', marginLeft + serviceW + qtyW, rowTop, { width: priceW, align: 'right' })
    doc.y = rowTop + 11

    // ===== SERVICE ROWS =====
    doc.font(fRegular).fontSize(8.5)
    data.rows.forEach((r: any) => {
      const y = doc.y
      const svcName = HAS_VN_FONT ? r.serviceName : removeAccents(r.serviceName)
      doc.text(svcName, marginLeft, y, { width: serviceW, align: 'left', lineBreak: false })
      doc.text(r.qty, marginLeft + serviceW, y, { width: qtyW, align: 'center', lineBreak: false })
      doc.text(r.price, marginLeft + serviceW + qtyW, y, {
        width: priceW,
        align: 'right',
        lineBreak: false
      })
      doc.y = y + 15
    })

    hr()

    // ===== TOTALS =====
    const totalRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? fBold : fRegular).fontSize(9.5)
      const y = doc.y
      doc.text(label, marginLeft, y, { width: contentW * 0.55, align: 'left' })
      doc.text(value, marginLeft + contentW * 0.55, y, { width: contentW * 0.45, align: 'right' })
      doc.y = y + 14
    }

    totalRow(HAS_VN_FONT ? 'TỔNG CỘNG' : 'TONG CONG', formatVND(data.tongTien), true)
    totalRow(HAS_VN_FONT ? 'Đã trả' : 'Da tra', formatVND(data.tienDaTra))
    totalRow(HAS_VN_FONT ? 'Còn lại' : 'Con lai', formatVND(data.tienConLai))

    hr()

    // ===== BARCODE =====
    const barcodeW = Math.min(140, contentW - 10)
    const barcodeX = marginLeft + (contentW - barcodeW) / 2
    doc.image(barcodeBuf, barcodeX, doc.y + 2, { width: barcodeW })
    doc.y += 55

    doc.font(fRegular).fontSize(8.5).text(data.maDonHang, marginLeft, doc.y, {
      width: contentW,
      align: 'center'
    })

    hr()

    // ===== FOOTER =====
    const finalFooter = storeInfo.footer || CONFIG.receiptFooter
    const footerLines = (finalFooter || '').split('\n')
    footerLines.forEach((line: string) => {
      const footerLine = HAS_VN_FONT ? line : removeAccents(line)
      doc.font(fItalic).fontSize(8).text(footerLine, marginLeft, doc.y, {
        width: contentW,
        align: 'center'
      })
    })

    doc.moveDown(0.25)

    // ===== TRIM PAGE HEIGHT =====
    const finalHeight = Math.ceil(doc.y + 10)
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      doc.page.height = finalHeight
      ;(doc.page as any).maxY = finalHeight - doc.page.margins.bottom
    }

    doc.end()
    out.on('finish', () => resolve(pdfPath))
    out.on('error', reject)
  })
}

// ========== LAUNDRY TAG ==========

async function buildLaundryTagPdf(orderData: any, customerName: string): Promise<string> {
  const data = buildReceiptData(orderData)
  const pdfPath = tempPdfPath(`tag_${data.maDonHang}`)

  const pageWidth = mmToPt(CONFIG.paperSizeMm)
  const margin = 10
  const contentW = pageWidth - margin * 2

  const barcodeBuf = await bwipjs.toBuffer({
    bcid: 'code128',
    text: data.maDonHang || '000000',
    scale: 2,
    height: 12,
    includetext: false
  })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidth, 2000],
      margins: { top: 4, bottom: 4, left: margin, right: margin },
      bufferPages: true,
      autoFirstPage: true
    })

    if (HAS_VN_FONT) {
      doc.registerFont('VN', FONTS.regular)
      doc.registerFont('VN-Bold', FONTS.bold)
      doc.registerFont('VN-Italic', FONTS.italic)
    }
    const fRegular = HAS_VN_FONT ? 'VN' : 'Helvetica'
    const fBold = HAS_VN_FONT ? 'VN-Bold' : 'Helvetica-Bold'

    const out = fs.createWriteStream(pdfPath)
    doc.pipe(out)

    const hr = () => {
      const y = doc.y
      doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor('#666')
        .lineWidth(0.5)
        .stroke()
      doc.moveDown(0.35)
    }

    // Large customer name
    const displayName = HAS_VN_FONT
      ? customerName || 'Khách hàng'
      : removeAccents(customerName || 'Khach hang')
    doc.font(fBold).fontSize(22).text(displayName, { width: contentW, align: 'center' })

    doc.moveDown(0.2)
    hr()

    // Barcode
    const barcodeW = Math.min(140, contentW - 20)
    const barcodeX = margin + (contentW - barcodeW) / 2
    doc.image(barcodeBuf, barcodeX, doc.y + 2, { width: barcodeW })
    doc.y += 55

    doc.font(fRegular).fontSize(10).text(data.maDonHang, margin, doc.y, {
      width: contentW,
      align: 'center'
    })

    hr()

    // Cut line hint
    doc
      .font(fRegular)
      .fontSize(8)
      .fillColor('#666')
      .text(HAS_VN_FONT ? 'Dán lên đồ giặt / máy giặt' : 'Dan len do giat / may giat', {
        width: contentW,
        align: 'center'
      })
    doc.fillColor('#000')

    doc.moveDown(0.25)

    // Trim page height
    const finalHeight = Math.ceil(doc.y + margin)
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      doc.page.height = finalHeight
      ;(doc.page as any).maxY = finalHeight - doc.page.margins.bottom
    }

    doc.end()
    out.on('finish', () => resolve(pdfPath))
    out.on('error', reject)
  })
}

// ========== PRINT HELPERS ==========

async function printPdfFileSafe(pdfPath: string) {
  try {
    await printPdfFile(pdfPath, {
      printer: CONFIG.printerName || undefined,
      scale: 'fit',
      monochrome: true,
      silent: CONFIG.printSilent
    })
  } finally {
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
    }, 2500)
  }
}

async function printWithPdf(orderData: any, storeInfo: any, customerInfo: any) {
  // 1. Print receipt
  const receiptPath = await buildReceiptPdf(orderData, storeInfo, customerInfo)
  await printPdfFileSafe(receiptPath)

  // 2. Print laundry tag (optional)
  if (CONFIG.printLaundryTag && customerInfo && customerInfo.name) {
    await sleep(800)
    const tagPath = await buildLaundryTagPdf(orderData, customerInfo.name)
    await printPdfFileSafe(tagPath)
  }
}

// ========== PRINT LOG ==========

async function writePrintLog(payload: any) {
  try {
    await db.collection('print_job_logs').add({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  } catch (e: any) {
    console.error('⚠️ Không ghi được print log:', e.message)
  }
}

async function updateJobStatus(jobId: string, status: string, extra: any = {}) {
  try {
    await db
      .collection('print_jobs')
      .doc(jobId)
      .update({
        trangThaiIn: status,
        ...extra,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
  } catch (e: any) {
    if (e.code !== 5) console.warn('⚠️ Không cập nhật được trạng thái job:', e.message)
  }
}

// ========== PROCESS PRINT JOB ==========

async function processPrintJob(jobId: string, jobData: any, storeId: string) {
  const startedAt = Date.now()
  const orderCode = jobData.maDonHang

  await updateJobStatus(jobId, 'PRINTING')

  const orderSnap = await db
    .collection('donHang')
    .where('maDonHang', '==', orderCode)
    .where('maCuaHang', '==', storeId)
    .limit(1)
    .get()

  if (orderSnap.empty) throw new Error(`Không tìm thấy đơn ${orderCode}`)
  const orderData = orderSnap.docs[0].data()

  const storeInfo = await getStoreInfo(storeId)
  const customerInfo = await getCustomerInfo(orderData.maKhachHang)

  for (let attempt = 1; attempt <= CONFIG.maxRetry + 1; attempt++) {
    try {
      console.log(`🖨 In đơn ${orderCode} - lần ${attempt} (store: ${storeId})`)
      await printWithPdf(orderData, storeInfo, customerInfo)

      await writePrintLog({
        jobId,
        maCuaHang: storeId,
        maDonHang: orderCode,
        status: 'SUCCESS',
        attempt,
        durationMs: Date.now() - startedAt
      })

      await updateJobStatus(jobId, 'SUCCESS')

      // Clean up job after short delay
      await sleep(2000)
      try {
        await db.collection('print_jobs').doc(jobId).delete()
      } catch (_e) { /* ignore */ }
      return
    } catch (error: any) {
      const isLastAttempt = attempt >= CONFIG.maxRetry + 1

      await writePrintLog({
        jobId,
        maCuaHang: storeId,
        maDonHang: orderCode,
        status: isLastAttempt ? 'FAILED' : 'RETRYING',
        attempt,
        error: error?.message || 'Unknown',
        durationMs: Date.now() - startedAt
      })

      console.error(`❌ Lỗi in (lần ${attempt}): ${error?.message}`)

      if (isLastAttempt) throw error
      console.warn(`⚠️ Thử lại sau ${CONFIG.retryDelayMs}ms`)
      await sleep(CONFIG.retryDelayMs)
    }
  }
}

// ========== LISTENER ==========

export function startListening(
  storeId: string,
  onJobStart: (id: string, code: string) => void,
  onJobEnd: (id: string, status: string, msg?: string) => void
) {
  if (!db) return false
  if (currentListener) {
    currentListener()
  }

  console.log(`📡 Bắt đầu lắng nghe lệnh in cho cửa hàng: ${storeId}`)

  const nowMillis = Date.now()

  currentListener = db
    .collection('print_jobs')
    .where('maCuaHang', '==', storeId)
    .onSnapshot(
      (snapshot: any) => {
        snapshot.docChanges().forEach(async (change: any) => {
          if (change.type !== 'added') return

          const jobData = change.doc.data()
          const jobId = change.doc.id

          if ((jobData.maCuaHang || '') !== storeId) return

          // Skip old jobs unless it's a re-print
          const isReprint = jobData.loaiIn === 'IN_LAI'
          if (!isReprint) {
            const jobTime = jobData.thoiGianTao ? jobData.thoiGianTao.toMillis() : 0
            if (jobTime < nowMillis - CONFIG.skipOldJobMs) return
          }

          const orderCode = jobData.maDonHang
          console.log(
            `\n🔔 ${isReprint ? 'In lại' : 'Nhận lệnh in mới'}: Đơn ${orderCode} (Job: ${jobId})`
          )

          onJobStart(jobId, orderCode)
          try {
            await processPrintJob(jobId, jobData, storeId)
            console.log(`✅ In thành công đơn ${orderCode}`)
            onJobEnd(jobId, 'SUCCESS')
          } catch (err: any) {
            console.error(`❌ Lỗi xử lý in cho đơn ${orderCode}:`, err.message)
            await updateJobStatus(jobId, 'FAILED', { loiIn: err.message })
            onJobEnd(jobId, 'FAILED', err.message)
          }
        })
      },
      (error: any) => {
        console.error('Lỗi kết nối Firestore Listener:', error)
      }
    )

  return true
}

export function stopListening() {
  if (currentListener) {
    currentListener()
    currentListener = null
  }
}
