# Danh Sách Công Việc: Hệ Thống Quản Lý Cửa Hàng Giặt Sấy

## Tổng Quan

Tài liệu này liệt kê các công việc cần thực hiện để xây dựng hệ thống quản lý cửa hàng giặt sấy theo thiết kế và yêu cầu đã được phê duyệt.

**Công nghệ**: React webapp (PC & mobile), Firebase Firestore, Vercel deployment

**Ưu tiên**: Bảo mật database và phân quyền user là ưu tiên cao nhất

## Giai Đoạn 1: Thiết Lập Dự Án và Cơ Sở Hạ Tầng

### 1.1 Khởi Tạo Dự Án

- [x] 1.1.1 Tạo React project với Vite hoặc Create React App
- [x] 1.1.2 Cấu hình TypeScript cho type safety
- [x] 1.1.3 Cài đặt và cấu hình ESLint + Prettier
- [x] 1.1.4 Thiết lập Git repository và .gitignore
- [x] 1.1.5 Tạo cấu trúc thư mục dự án (components, pages, services, utils, types)

### 1.2 Thiết Lập Firebase

- [x] 1.2.1 Tạo Firebase project trên Firebase Console
- [x] 1.2.2 Bật Firebase Authentication (Email/Password)
- [x] 1.2.3 Tạo Firestore database (chế độ production)
- [x] 1.2.4 Cài đặt Firebase SDK vào React project
- [x] 1.2.5 Cấu hình Firebase config với environment variables
- [x] 1.2.6 Tạo Firebase service wrapper (auth, firestore)

### 1.3 Thiết Lập Vercel Deployment

- [ ] 1.3.1 Kết nối Git repository với Vercel
- [x] 1.3.2 Cấu hình environment variables (.env)
- [ ] 1.3.3 Thiết lập automatic deployment từ main branch
- [ ] 1.3.4 Cấu hình custom domain (nếu có)

## Giai Đoạn 2: Bảo Mật và Phân Quyền (ƯU TIÊN CAO)

### 2.1 Firebase Security Rules - Multi-Tenant

- [x] 2.1.1 Viết Security Rules cho collection cuaHang
- [x] 2.1.2 Viết Security Rules cho collection users với multi-tenant
- [x] 2.1.3 Viết Security Rules cho collection donHang với data isolation
- [x] 2.1.4 Viết Security Rules cho collection khachHang với maCuaHang filter
- [x] 2.1.5 Viết Security Rules cho collection dichVu
- [x] 2.1.6 Viết Security Rules cho collection giaoDich
- [x] 2.1.7 Viết Security Rules cho collection cauHinhCuaHang
- [x] 2.1.8 Viết Security Rules cho collection baoCao (immutable)
- [x] 2.1.9 Viết Security Rules cho collection auditLog (immutable, Cloud Functions only)
- [ ] 2.1.10 Deploy Security Rules lên Firebase
- [ ] 2.1.11 Test Security Rules với Firebase Emulator

### 2.2 Firebase Authentication và Custom Claims

- [ ] 2.2.1 Tạo Cloud Function setUserRole cho SUPER_ADMIN
- [ ] 2.2.2 Tạo Cloud Function setUserRole cho ADMIN tạo nhân viên
- [ ] 2.2.3 Implement Custom Claims với vaiTro và maCuaHang
- [ ] 2.2.4 Tạo middleware kiểm tra Custom Claims trong React
- [ ] 2.2.5 Implement refresh token logic để cập nhật Custom Claims

### 2.3 Firestore Indexes - Multi-Tenant

- [x] 2.3.1 Tạo composite index (maCuaHang, trangThai, ngayTao DESC) cho donHang
- [x] 2.3.2 Tạo composite index (maCuaHang, maKhachHang, ngayTao DESC) cho donHang
- [x] 2.3.3 Tạo composite index (maCuaHang, maNhanVien, ngayTao DESC) cho donHang
- [x] 2.3.4 Tạo composite index (maCuaHang, daXacDinhDichVu, ngayTao DESC) cho donHang
- [x] 2.3.5 Tạo composite index (maCuaHang, vaiTro, trangThai) cho users
- [x] 2.3.6 Tạo unique index cho soDienThoai trong khachHang (per maCuaHang)
- [ ] 2.3.7 Deploy indexes lên Firestore

## Giai Đoạn 3: Quản Lý Cửa Hàng (Multi-Tenant Core)

### 3.1 Model và Service cho Cửa Hàng

- [x] 3.1.1 Tạo TypeScript interface CuaHang
- [x] 3.1.2 Tạo service cuaHangService với CRUD operations
- [x] 3.1.3 Implement tạo mã cửa hàng tự động (CH + 4 số)
- [x] 3.1.4 Implement validation cho thông tin cửa hàng

### 3.2 UI Quản Lý Cửa Hàng (SUPER_ADMIN only)

- [x] 3.2.1 Tạo trang danh sách cửa hàng
- [x] 3.2.2 Tạo form tạo cửa hàng mới
- [ ] 3.2.3 Tạo form chỉnh sửa thông tin cửa hàng
- [x] 3.2.4 Implement vô hiệu hóa/kích hoạt cửa hàng
- [ ] 3.2.5 Hiển thị thống kê cơ bản cho mỗi cửa hàng

## Giai Đoạn 4: Quản Lý Người Dùng và Phân Quyền

### 4.1 Model và Service cho Users

- [x] 4.1.1 Tạo TypeScript interface User với maCuaHang
- [x] 4.1.2 Tạo enum VaiTro (SUPER_ADMIN, ADMIN, NHAN_VIEN_QUAY, KY_THUAT_VIEN)
- [x] 4.1.3 Tạo userService với phân quyền multi-tenant
- [x] 4.1.4 Implement đăng ký user mới với Custom Claims
- [x] 4.1.5 Implement cập nhật vai trò user

### 4.2 Authentication UI

- [x] 4.2.1 Tạo trang đăng nhập
- [x] 4.2.2 Tạo trang đăng ký (chỉ cho SUPER_ADMIN/ADMIN)
- [x] 4.2.3 Implement AuthContext với Custom Claims
- [x] 4.2.4 Tạo ProtectedRoute component với role checking
- [x] 4.2.5 Implement đăng xuất
- [x] 4.2.6 Hiển thị thông tin user và vai trò trên header

### 4.3 UI Quản Lý Nhân Viên

- [x] 4.3.1 Tạo trang danh sách nhân viên (filter theo maCuaHang)
- [x] 4.3.2 Tạo form tạo nhân viên mới (ADMIN tạo cho cửa hàng mình)
- [ ] 4.3.3 Tạo form chỉnh sửa thông tin nhân viên
- [x] 4.3.4 Implement vô hiệu hóa/kích hoạt nhân viên
- [x] 4.3.5 Hiển thị vai trò và quyền hạn của nhân viên

## Giai Đoạn 5: Quản Lý Dịch Vụ

### 5.1 Model và Service cho Dịch Vụ

- [x] 5.1.1 Tạo TypeScript interface DichVu với maCuaHang
- [x] 5.1.2 Tạo enum LoaiTinhGia
- [x] 5.1.3 Tạo dichVuService với CRUD operations (filter theo maCuaHang)
- [x] 5.1.4 Implement tính giá dịch vụ theo loại (trọng lượng/số lượng/cố định)
- [x] 5.1.5 Implement validation cho dịch vụ

### 5.2 UI Quản Lý Dịch Vụ

- [x] 5.2.1 Tạo trang danh sách dịch vụ (filter theo maCuaHang)
- [x] 5.2.2 Tạo form tạo dịch vụ mới
- [x] 5.2.3 Tạo form chỉnh sửa dịch vụ
- [x] 5.2.4 Implement vô hiệu hóa/kích hoạt dịch vụ
- [x] 5.2.5 Hiển thị bảng giá và thời gian xử lý

## Giai Đoạn 6: Quản Lý Khách Hàng

### 6.1 Model và Service cho Khách Hàng

- [x] 6.1.1 Tạo TypeScript interface KhachHang với maCuaHang
- [x] 6.1.2 Tạo enum LoaiKhachHang
- [x] 6.1.3 Tạo khachHangService với CRUD operations (filter theo maCuaHang)
- [x] 6.1.4 Implement tìm kiếm khách hàng theo số điện thoại
- [x] 6.1.5 Implement cập nhật điểm tích lũy và tổng chi tiêu
- [x] 6.1.6 Implement tự động nâng cấp loại khách hàng

### 6.2 UI Quản Lý Khách Hàng

- [x] 6.2.1 Tạo trang danh sách khách hàng (filter theo maCuaHang)
- [x] 6.2.2 Tạo form tạo khách hàng nhanh (tên + SĐT)
- [ ] 6.2.3 Tạo form chỉnh sửa thông tin khách hàng
- [ ] 6.2.4 Hiển thị lịch sử giao dịch của khách hàng
- [x] 6.2.5 Hiển thị điểm tích lũy và loại khách hàng

## Giai Đoạn 7: Cấu Hình Cửa Hàng (Settings)

### 7.1 Model và Service cho Cấu Hình

- [x] 7.1.1 Tạo TypeScript interface CauHinhCuaHang
- [x] 7.1.2 Tạo enum CheDoTaoDonHang (CHON_DICH_VU_TRUOC, CHON_DICH_VU_SAU)
- [x] 7.1.3 Tạo cauHinhService với get/update operations
- [x] 7.1.4 Implement load cấu hình khi user đăng nhập

### 7.2 UI Cấu Hình Cửa Hàng

- [x] 7.2.1 Tạo trang Settings cho ADMIN
- [x] 7.2.2 Tạo form chọn chế độ tạo đơn hàng
- [x] 7.2.3 Tạo form cấu hình giờ mở cửa/đóng cửa
- [x] 7.2.4 Tạo form cấu hình ngày nghỉ trong tuần
- [x] 7.2.5 Tạo form cấu hình thông tin thanh toán
- [ ] 7.2.6 Tạo form cấu hình mẫu in phiếu
- [ ] 7.2.7 Implement lưu cấu hình với audit log

## Giai Đoạn 8: Quản Lý Đơn Hàng - Chế Độ 1 (Chọn Dịch Vụ Trước)

### 8.1 Model và Service cho Đơn Hàng

- [x] 8.1.1 Tạo TypeScript interface DonHang với maCuaHang
- [x] 8.1.2 Tạo enum TrangThaiDonHang
- [x] 8.1.3 Tạo interface ChiTietDichVu
- [x] 8.1.4 Tạo donHangService với CRUD operations (filter theo maCuaHang)
- [x] 8.1.5 Implement tạo mã đơn hàng tự động (DH + YYYYMMDD + 4 số)
- [x] 8.1.6 Implement tính tổng tiền đơn hàng
- [x] 8.1.7 Implement tính ngày hẹn trả
- [x] 8.1.8 Implement validation chuyển trạng thái

### 8.2 UI Tạo Đơn Hàng - Chế Độ 1

- [x] 8.2.1 Tạo form tìm/tạo khách hàng (nhập SĐT) _(trong POSPage)_
- [x] 8.2.2 Tạo grid chọn dịch vụ với hình ảnh _(trong POSPage)_
- [ ] 8.2.3 Tạo numpad nhập trọng lượng/số lượng
- [x] 8.2.4 Tạo giỏ hàng hiển thị dịch vụ đã chọn _(trong POSPage)_
- [x] 8.2.5 Hiển thị tổng tiền realtime _(trong POSPage)_
- [x] 8.2.6 Implement xác nhận tạo đơn hàng _(trong POSPage)_
- [x] 8.2.7 Tạo màn hình thanh toán _(ThanhToanPage)_
- [x] 8.2.8 Implement in phiếu tiếp nhận với barcode _(PrintReceipt)_

### 8.3 UI Quản Lý Đơn Hàng

- [x] 8.3.1 Tạo trang danh sách đơn hàng (filter theo maCuaHang)
- [x] 8.3.2 Tạo filter theo trạng thái, ngày tạo, khách hàng
- [x] 8.3.3 Tạo trang chi tiết đơn hàng
- [x] 8.3.4 Implement cập nhật trạng thái đơn hàng
- [x] 8.3.5 Hiển thị lịch sử chuyển trạng thái
- [ ] 8.3.6 Implement hủy đơn hàng với lý do

## Giai Đoạn 9: Quản Lý Đơn Hàng - Chế Độ 2 (Chọn Dịch Vụ Sau)

### 9.1 Service cho Chế Độ 2

- [x] 9.1.1 Implement tạo đơn hàng không có dịch vụ (tongTien = 0)
- [x] 9.1.2 Implement cập nhật dịch vụ sau khi cân ký
- [x] 9.1.3 Implement validation cho đơn hàng chế độ 2
- [x] 9.1.4 Implement chuyển trạng thái CHO_CAN_KY

### 9.2 UI Tạo Đơn Hàng - Chế Độ 2

- [ ] 9.2.1 Tạo form tìm/tạo khách hàng (chỉ SĐT + tên)
- [ ] 9.2.2 Implement tạo đơn hàng với danhSachDichVu rỗng
- [ ] 9.2.3 Implement in phiếu hẹn với bardcode
- [ ] 9.2.4 Tạo màn hình quét bardcode
- [ ] 9.2.5 Tạo màn hình cập nhật dịch vụ sau cân ký
- [ ] 9.2.6 Implement nhập trọng lượng và chọn dịch vụ
- [ ] 9.2.7 Implement tính giá và cập nhật đơn hàng
- [ ] 9.2.8 Implement in bill chính thức sau cân ký

### 9.3 UI Hiển Thị Đơn Hàng Chế Độ 2

- [ ] 9.3.1 Hiển thị badge "Chưa xác định dịch vụ" cho đơn chưa cân ký
- [ ] 9.3.2 Hiển thị thông tin người cân ký và thời gian
- [ ] 9.3.3 Filter đơn hàng chưa cân ký (daXacDinhDichVu = false)

## Giai Đoạn 10: Màn Hình POS (Point of Sale) - QUAN TRỌNG

### 10.1 UI Màn Hình POS

- [x] 10.1.1 Tạo layout POS với 3 cột (PC) / responsive (mobile)
- [x] 10.1.2 Tạo section tìm kiếm khách hàng với autocomplete
- [x] 10.1.3 Tạo grid dịch vụ với icon và giá
- [x] 10.1.4 Tạo giỏ hàng với chức năng chỉnh sửa/xóa
- [ ] 10.1.5 Tạo sidebar đơn hàng gần đây
- [ ] 10.1.6 Tạo section thống kê hôm nay
- [ ] 10.1.7 Implement keyboard shortcuts (F1-F4, ESC, Enter)
- [x] 10.1.8 Tối ưu cho màn hình cảm ứng (touch-friendly)

### 10.2 Chức Năng POS

- [x] 10.2.1 Implement tạo đơn hàng nhanh từ POS
- [ ] 10.2.2 Implement thanh toán với numpad
- [ ] 10.2.3 Implement tính tiền thối tự động
- [ ] 10.2.4 Implement chọn phương thức thanh toán
- [ ] 10.2.5 Implement in phiếu tự động sau thanh toán
- [ ] 10.2.6 Implement preview phiếu trước khi in
- [x] 10.2.7 Implement reset màn hình sau hoàn tất
- [ ] 10.2.8 Implement quét QR code để mở đơn hàng

## Giai Đoạn 11: Quản Lý Thanh Toán

### 11.1 Model và Service cho Giao Dịch

- [x] 11.1.1 Tạo TypeScript interface GiaoDich với maCuaHang
- [x] 11.1.2 Tạo enum PhuongThucThanhToan
- [x] 11.1.3 Tạo enum TrangThaiGiaoDich
- [x] 11.1.4 Tạo giaoDichService với CRUD operations (filter theo maCuaHang)
- [x] 11.1.5 Implement tạo giao dịch với validation
- [x] 11.1.6 Implement cập nhật đơn hàng sau thanh toán (transaction)
- [x] 11.1.7 Implement cập nhật điểm tích lũy khách hàng sau thanh toán

### 11.2 UI Thanh Toán

- [x] 11.2.1 Tạo màn hình thanh toán với numpad
- [x] 11.2.2 Hiển thị tổng tiền, đã trả, còn lại
- [x] 11.2.3 Tạo nút chọn phương thức thanh toán
- [x] 11.2.4 Implement nhập số tiền khách đưa
- [x] 11.2.5 Hiển thị tiền thối tự động
- [x] 11.2.6 Implement xác nhận thanh toán
- [ ] 11.2.7 Hiển thị lịch sử thanh toán của đơn hàng
- [ ] 11.2.8 Implement in hóa đơn sau thanh toán

## Giai Đoạn 12: Báo Cáo và Thống Kê

### 12.1 Service cho Báo Cáo

- [x] 12.1.1 Tạo TypeScript interface BaoCao với maCuaHang
- [ ] 12.1.2 Tạo baoCaoService với query operations (filter theo maCuaHang)
- [ ] 12.1.3 Implement báo cáo doanh thu theo khoảng thời gian
- [x] 12.1.4 Implement thống kê đơn hàng theo trạng thái _(trong BaoCaoPage)_
- [x] 12.1.5 Implement thống kê dịch vụ phổ biến _(trong BaoCaoPage)_
- [x] 12.1.6 Implement thống kê khách hàng (mới, thân thiết, VIP) _(trong BaoCaoPage)_
- [ ] 12.1.7 Implement lưu báo cáo vào Firestore (immutable)

### 12.2 UI Báo Cáo

- [x] 12.2.1 Tạo trang báo cáo doanh thu (ADMIN xem cửa hàng mình, SUPER_ADMIN xem tất cả)
- [ ] 12.2.2 Tạo date picker chọn khoảng thời gian
- [x] 12.2.3 Hiển thị biểu đồ doanh thu (chart.js hoặc recharts)
- [x] 12.2.4 Hiển thị thống kê đơn hàng theo trạng thái
- [x] 12.2.5 Hiển thị top dịch vụ phổ biến
- [x] 12.2.6 Hiển thị thống kê khách hàng
- [ ] 12.2.7 Implement xuất báo cáo PDF
- [ ] 12.2.8 Implement xuất báo cáo Excel

## Giai Đoạn 13: Audit Log và Giám Sát

### 13.1 Cloud Functions cho Audit Log

- [ ] 13.1.1 Tạo Cloud Function ghi log khi tạo đơn hàng
- [ ] 13.1.2 Tạo Cloud Function ghi log khi cập nhật đơn hàng
- [ ] 13.1.3 Tạo Cloud Function ghi log khi xóa dữ liệu
- [ ] 13.1.4 Tạo Cloud Function ghi log khi thay đổi vai trò
- [ ] 13.1.5 Tạo Cloud Function ghi log khi đăng nhập
- [ ] 13.1.6 Deploy Cloud Functions lên Firebase

### 13.2 UI Audit Log

- [x] 13.2.1 Tạo trang xem audit log (ADMIN xem cửa hàng mình, SUPER_ADMIN xem tất cả)
- [x] 13.2.2 Tạo filter theo userId, action, khoảng thời gian
- [ ] 13.2.3 Hiển thị chi tiết log (before/after data)
- [ ] 13.2.4 Implement phân trang cho audit log

## Giai Đoạn 14: In Phiếu và QR Code

### 14.1 Service In Phiếu

- [x] 14.1.1 Cài đặt thư viện barcode (react-barcode)
- [x] 14.1.2 Tạo template phiếu tiếp nhận
- [ ] 14.1.3 Tạo template phiếu hẹn (chế độ 2)
- [x] 14.1.4 Tạo template hóa đơn
- [x] 14.1.5 Implement tạo barcode chứa mã đơn hàng
- [ ] 14.1.6 Implement print preview
- [x] 14.1.7 Implement print với window.print()

### 14.2 Quét QR Code

- [ ] 14.2.1 Cài đặt thư viện quét QR (react-qr-reader)
- [ ] 14.2.2 Tạo component quét QR code
- [ ] 14.2.3 Implement mở đơn hàng từ QR code
- [ ] 14.2.4 Implement xử lý lỗi khi QR không hợp lệ

## Giai Đoạn 15: Thông Báo

### 15.1 Cloud Functions cho Thông Báo

- [ ] 15.1.1 Tạo Cloud Function gửi SMS khi đơn hàng hoàn thành
- [ ] 15.1.2 Tạo Cloud Function gửi SMS khi đơn hàng đã giao
- [ ] 15.1.3 Tạo Cloud Function gửi email hóa đơn
- [ ] 15.1.4 Implement retry logic cho thông báo thất bại
- [ ] 15.1.5 Deploy Cloud Functions lên Firebase

### 15.2 Thông Báo Realtime

- [ ] 15.2.1 Implement Firestore realtime listener cho đơn hàng
- [x] 15.2.2 Hiển thị toast notification khi có cập nhật _(react-hot-toast)_
- [ ] 15.2.3 Implement notification center trong app

## Giai Đoạn 16: Tối Ưu Hóa Hiệu Năng

### 16.1 Caching và Lazy Loading

- [x] 16.1.1 Implement React.lazy cho code splitting _(App.tsx)_
- [ ] 16.1.2 Implement React.memo cho components nặng
- [ ] 16.1.3 Implement useMemo và useCallback cho optimization
- [x] 16.1.4 Cache danh sách dịch vụ với TTL 5 phút _(React Query staleTime)_
- [ ] 16.1.5 Implement lazy loading cho hình ảnh
- [ ] 16.1.6 Implement phân trang cho danh sách dài

### 16.2 Build Optimization

- [ ] 16.2.1 Minify CSS và JavaScript
- [ ] 16.2.2 Compress assets với gzip
- [ ] 16.2.3 Optimize images (WebP format)
- [ ] 16.2.4 Implement service worker cho offline support
- [ ] 16.2.5 Analyze bundle size và optimize

## Giai Đoạn 17: Responsive Design và Mobile

### 17.1 Responsive Layout

- [x] 17.1.1 Implement responsive grid với CSS Grid/Flexbox _(MUI Grid)_
- [x] 17.1.2 Tạo breakpoints cho mobile, tablet, desktop _(MUI breakpoints)_
- [x] 17.1.3 Optimize màn hình POS cho tablet _(responsive layout)_
- [x] 17.1.4 Implement hamburger menu cho mobile _(MainLayout)_
- [ ] 17.1.5 Test trên các kích thước màn hình khác nhau

### 17.2 Touch Optimization

- [ ] 17.2.1 Tăng kích thước nút bấm cho touch (min 44x44px)
- [ ] 17.2.2 Implement swipe gestures cho mobile
- [ ] 17.2.3 Optimize numpad cho touch input
- [ ] 17.2.4 Test trên thiết bị thực (iOS, Android)

## Giai Đoạn 18: UI/UX Enhancements

### 18.1 Theme và Styling

- [x] 18.1.1 Thiết lập theme colors (primary, secondary, success, error) _(theme.ts)_
- [ ] 18.1.2 Implement dark mode và light mode
- [x] 18.1.3 Tạo component library (Button, Input, Card, Modal) _(MUI components)_
- [x] 18.1.4 Implement loading states và skeletons _(CircularProgress)_
- [x] 18.1.5 Implement error states và empty states _(toast + empty messages)_

### 18.2 User Experience

- [x] 18.2.1 Implement toast notifications (success, error, warning) _(react-hot-toast)_
- [ ] 18.2.2 Implement confirmation dialogs cho actions quan trọng
- [x] 18.2.3 Implement autocomplete cho tìm kiếm _(KhachHang phone search)_
- [ ] 18.2.4 Implement tooltips cho hướng dẫn
- [ ] 18.2.5 Implement breadcrumbs cho navigation

## Giai Đoạn 19: Testing

### 19.1 Unit Testing

- [ ] 19.1.1 Setup Jest và React Testing Library
- [ ] 19.1.2 Viết unit tests cho services (donHangService, khachHangService)
- [ ] 19.1.3 Viết unit tests cho utils (tính giá, validation)
- [ ] 19.1.4 Viết unit tests cho components (Button, Input, Card)
- [ ] 19.1.5 Đạt code coverage >= 80%

### 19.2 Integration Testing

- [ ] 19.2.1 Viết integration tests cho luồng tạo đơn hàng
- [ ] 19.2.2 Viết integration tests cho luồng thanh toán
- [ ] 19.2.3 Viết integration tests cho luồng cập nhật trạng thái
- [ ] 19.2.4 Test với Firebase Emulator

### 19.3 E2E Testing

- [ ] 19.3.1 Setup Cypress hoặc Playwright
- [ ] 19.3.2 Viết E2E tests cho user journey chính
- [ ] 19.3.3 Test trên nhiều browsers (Chrome, Firefox, Safari)
- [ ] 19.3.4 Test responsive trên mobile và desktop

### 19.4 Security Testing

- [ ] 19.4.1 Test Firebase Security Rules với Firebase Emulator
- [ ] 19.4.2 Test phân quyền user (SUPER_ADMIN, ADMIN, NHAN_VIEN)
- [ ] 19.4.3 Test data isolation giữa các cửa hàng
- [ ] 19.4.4 Test validation và sanitization
- [ ] 19.4.5 Penetration testing cơ bản

## Giai Đoạn 20: Deployment và DevOps

### 20.1 CI/CD Pipeline

- [ ] 20.1.1 Setup GitHub Actions hoặc GitLab CI
- [ ] 20.1.2 Tự động chạy tests khi push code
- [ ] 20.1.3 Tự động deploy lên Vercel khi merge vào main
- [ ] 20.1.4 Setup staging environment
- [ ] 20.1.5 Setup production environment

### 20.2 Monitoring và Logging

- [ ] 20.2.1 Setup Firebase Analytics
- [ ] 20.2.2 Setup Firebase Crashlytics
- [ ] 20.2.3 Setup Firebase Performance Monitoring
- [ ] 20.2.4 Setup error tracking (Sentry hoặc Bugsnag)
- [ ] 20.2.5 Setup uptime monitoring

### 20.3 Backup và Recovery

- [ ] 20.3.1 Setup automatic Firestore backup hàng ngày
- [ ] 20.3.2 Lưu backup trên Google Cloud Storage
- [ ] 20.3.3 Test khôi phục dữ liệu từ backup
- [ ] 20.3.4 Tạo disaster recovery plan

## Giai Đoạn 21: Documentation

### 21.1 Technical Documentation

- [ ] 21.1.1 Viết README.md với hướng dẫn setup
- [ ] 21.1.2 Viết API documentation cho services
- [ ] 21.1.3 Viết component documentation với Storybook
- [ ] 21.1.4 Viết deployment guide
- [ ] 21.1.5 Viết troubleshooting guide

### 21.2 User Documentation

- [ ] 21.2.1 Viết user manual cho SUPER_ADMIN
- [ ] 21.2.2 Viết user manual cho ADMIN
- [ ] 21.2.3 Viết user manual cho NHAN_VIEN_QUAY
- [ ] 21.2.4 Viết user manual cho KY_THUAT_VIEN
- [ ] 21.2.5 Tạo video hướng dẫn sử dụng

## Giai Đoạn 22: Tính Năng Tùy Chọn

### 22.1 Thanh Toán Online (Optional)

- [ ] 22.1.1\* Tích hợp VNPay hoặc MoMo SDK
- [ ] 22.1.2\* Tạo Cloud Function xử lý webhook
- [ ] 22.1.3\* Implement tạo link thanh toán
- [ ] 22.1.4\* Implement xác nhận thanh toán
- [ ] 22.1.5\* Test với sandbox environment

### 22.2 Đa Ngôn Ngữ (Optional)

- [ ] 22.2.1\* Setup i18n library (react-i18next)
- [ ] 22.2.2\* Tạo translation files (vi.json, en.json)
- [ ] 22.2.3\* Implement language switcher
- [ ] 22.2.4\* Dịch tất cả UI text
- [ ] 22.2.5\* Test với cả 2 ngôn ngữ

### 22.3 Firebase App Check (Optional)

- [ ] 22.3.1\* Bật Firebase App Check
- [ ] 22.3.2\* Cấu hình reCAPTCHA v3
- [ ] 22.3.3\* Test với App Check enabled
- [ ] 22.3.4\* Monitor abuse metrics

## Ghi Chú

### Ưu Tiên Thực Hiện

1. **Giai đoạn 1-2**: Thiết lập dự án và bảo mật (QUAN TRỌNG NHẤT)
2. **Giai đoạn 3-4**: Multi-tenant core và phân quyền
3. **Giai đoạn 5-7**: Quản lý dữ liệu cơ bản (dịch vụ, khách hàng, cấu hình)
4. **Giai đoạn 8-10**: Quản lý đơn hàng và màn hình POS (CORE FEATURES)
5. **Giai đoạn 11-14**: Thanh toán, báo cáo, in phiếu
6. **Giai đoạn 15-18**: Thông báo, tối ưu hóa, responsive
7. **Giai đoạn 19-21**: Testing, deployment, documentation
8. **Giai đoạn 22**: Tính năng tùy chọn

### Dependencies

- Giai đoạn 2 phải hoàn thành trước khi bắt đầu bất kỳ giai đoạn nào khác (Security Rules)
- Giai đoạn 3-4 phải hoàn thành trước giai đoạn 5-7 (Multi-tenant core)
- Giai đoạn 7 phải hoàn thành trước giai đoạn 8-9 (Cấu hình chế độ tạo đơn)
- Giai đoạn 8 phải hoàn thành trước giai đoạn 10 (POS dựa trên quản lý đơn hàng)
- Giai đoạn 8 phải hoàn thành trước giai đoạn 11 (Thanh toán dựa trên đơn hàng)

### Lưu Ý Quan Trọng

- **Bảo mật là ưu tiên số 1**: Phải deploy Firebase Security Rules ngay từ đầu
- **Multi-tenant**: Mọi query phải filter theo maCuaHang (trừ SUPER_ADMIN)
- **Custom Claims**: Phải setup Custom Claims cho phân quyền
- **Data Isolation**: Đảm bảo dữ liệu giữa các cửa hàng hoàn toàn tách biệt
- **Testing**: Test Security Rules và phân quyền kỹ lưỡng trước khi deploy production
- **Performance**: Tạo indexes cho tất cả query phức tạp
- **Audit Log**: Ghi log mọi thao tác quan trọng qua Cloud Functions

### Công Cụ và Thư Viện Đề Xuất

**Frontend**:

- React 18+ với TypeScript
- React Router v6 cho routing
- Material-UI hoặc Ant Design cho UI components
- React Hook Form cho form handling
- Zod hoặc Yup cho validation
- TanStack Query (React Query) cho data fetching
- Zustand hoặc Redux Toolkit cho state management

**Firebase**:

- Firebase SDK v9+ (modular)
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Cloud Functions
- Firebase Analytics

**Utilities**:

- date-fns cho date manipulation
- qrcode.react cho QR code
- react-qr-reader cho quét QR
- jsPDF hoặc pdfmake cho export PDF
- xlsx cho export Excel
- chart.js hoặc recharts cho biểu đồ

**Testing**:

- Jest cho unit testing
- React Testing Library cho component testing
- Cypress hoặc Playwright cho E2E testing
- Firebase Emulator Suite cho testing local

**DevOps**:

- Vercel cho hosting
- GitHub Actions hoặc GitLab CI cho CI/CD
- Sentry cho error tracking
- Firebase Performance Monitoring

### Ước Lượng Thời Gian

- **Giai đoạn 1-2**: 1-2 tuần (setup + security)
- **Giai đoạn 3-7**: 2-3 tuần (multi-tenant core + data management)
- **Giai đoạn 8-10**: 3-4 tuần (order management + POS)
- **Giai đoạn 11-14**: 2-3 tuần (payment + reporting + printing)
- **Giai đoạn 15-18**: 2-3 tuần (notifications + optimization + responsive)
- **Giai đoạn 19-21**: 2-3 tuần (testing + deployment + docs)
- **Giai đoạn 22**: 1-2 tuần (optional features)

**Tổng ước lượng**: 13-20 tuần (3-5 tháng) cho 1 developer full-time

### Tiêu Chí Hoàn Thành

Dự án được coi là hoàn thành khi:

1. ✅ Tất cả yêu cầu bắt buộc (không có dấu \*) đã được implement
2. ✅ Firebase Security Rules đã được deploy và test kỹ lưỡng
3. ✅ Multi-tenant architecture hoạt động đúng với data isolation
4. ✅ Tất cả 4 vai trò (SUPER_ADMIN, ADMIN, NHAN_VIEN_QUAY, KY_THUAT_VIEN) hoạt động đúng
5. ✅ Cả 2 chế độ tạo đơn hàng (chọn dịch vụ trước/sau) hoạt động đúng
6. ✅ Màn hình POS hoạt động mượt mà trên PC và tablet
7. ✅ Thanh toán và in phiếu hoạt động đúng
8. ✅ Báo cáo và audit log hoạt động đúng
9. ✅ Unit tests đạt >= 80% coverage
10. ✅ E2E tests cho các user journey chính pass
11. ✅ Security testing pass (không có lỗ hổng bảo mật)
12. ✅ Performance đạt yêu cầu (< 2s tạo đơn, < 1s tìm kiếm)
13. ✅ Responsive design hoạt động tốt trên mobile và desktop
14. ✅ Documentation đầy đủ (technical + user manual)
15. ✅ Deploy thành công lên production (Vercel + Firebase)

---

**Lưu ý**: Các task có dấu `*` là tùy chọn (optional) và có thể bỏ qua nếu không cần thiết.
$env:FIREBASE_PROJECT_ID  = "giaysayonline"
$env:FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@giaysayonline.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDqQ0mINWBQZJ97\n+gBReRQIz0i57uFhXeoiONKFYhMXrtcqsVi7gCdk0pu+8R2FqenK6RqeGzS23E1J\neo4To5PL+Ksx0/TgbryZ9ELZuw/e+SArdbuHjy+xPM2nJeXVLJTIA8yKjbjxmKpK\nZslNoxmQaeIB8M0+PfBLtmRf9leWgEsJZLmkez2LYhGSRzSPVS/a3ATnMm5Lh3ZU\n77Weib8kP+FNNihjCsTIM+tKbxLtA+GcqNH67jl5j5MBSKMmIEuk0vE19b1aRgpT\nThkEmn4tUMBHuPwsZ4W8WDflMmZshp34ELTQE8T8z37b5fNwEWhDUG1QbsulRncG\nup/friUfAgMBAAECggEAA99Jt3DN2p0xd2Rvy3tAKD2xeHubXBvxJ9CDxuTuQm6r\n2UDzxmI4n+ffTS34jIahwxwoJXpSgOK3Dgu713nVbgJoHE29m8L0QkV/MoeTwN40\neKNu16+ApeIP1wh2DIYojbVBOZCBSfUL6mjrrqAhsDAf3T7rTHEVXwi6Dykn+J9I\nvDahnz0/5NlPO55uzyfhSaYMVFVcA9ATY22leqptnCpYKab4YDbqvTt95n/qSnxz\nmHrj3IhqEAPAt9EVAzxr6TdUSQIszdbGMofqif+0g17DWasVrZWHtcPIesYzf7Qk\n+9Q/cQR0gDnjwjACb6XvD/KtPU9d1cM0wQAr+jpaQQKBgQD5VXx7LsW6ddIZxKlS\nut9seSJmzNccA4QmF68i2os041a7n/Kild2DtOpX0lHs1gNFbc/+P7oHjf1OG1aA\nswiIksmrbPVoYqN5+eIiG2jh5xi8q0aONNIP1bzROyBvPO5z07Db0Tqay5bfebKH\nxADzdwV5WAWp6H312xDuU2r8/wKBgQDwhqZq6w3uWXBZfKwg/YSL5A88yOaIHwHZ\nFVcLnoJXItdycn2MiyQdwtnVcA4bkDFw61BkDjAJcTPFdKljkH8IMdk/w32xOrbH\nAHAiWJOyTTWU+tZx/ssAYYtxRKn0cKqJSIKXCKm+tYjW3chSiNU+GffTdn68zJK0\nXnR+TrU34QKBgGutlo/gWDY5kd3dB78Zw0mmWswIpNGNVzHYQqOLvFi/4YIwBmpe\nzIaHyDjbNNRSbKE8VnoX7XA7yuxDdC0qpIHO2td0u9sz1iPkXdua+MWutwkr8tGR\nUDLUfLHjlhNUPiq5foTALE4TpHmopghqBnseqLeJ4xBIvrVBwWMblXXjAoGBAMIn\njxJjZz1tSPmTX8bJnkLl9z7T1PMwRGediERC0WfRIiSqMppOfvrfHMPjzh+Fx8Mk\n0CHUKgaVMHtFbq6GJ2TQCFQmU8HKaVw+CEZRRff5xzTZPl2KlQdbthnamW5Nu/tR\nYsjUH2FoXGtFX7zv42Jbx+cUkb2JTSr3zAVhN3tBAoGAYnGkaiYfhtP5p+aup1Hw\n8ZCDDYXn3DSuGikrSZAJzwCB8tLv/yjtTit9ll5Nc1W7pkzUMV0gvnWmP3SU2go6\nnU7RR3cvVKVzT8ri4lDNhzUa8bFBZK3tEloYd99fEzo3kyPR3iohjhwRZ8oB7EU8\nc9DjkhgLtvIc4oWktlMNjog=\n-----END PRIVATE KEY-----\n"
