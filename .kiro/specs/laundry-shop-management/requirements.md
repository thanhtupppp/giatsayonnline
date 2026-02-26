# Tài Liệu Yêu Cầu: Hệ Thống Quản Lý Cửa Hàng Giặt Sấy

## Giới Thiệu

Tài liệu này mô tả các yêu cầu chức năng cho hệ thống quản lý cửa hàng giặt sấy. Hệ thống giúp chủ cửa hàng và nhân viên quản lý toàn bộ quy trình kinh doanh từ tiếp nhận đơn hàng, theo dõi tiến độ, quản lý khách hàng, nhân viên, đến thanh toán và báo cáo doanh thu.

Hệ thống được xây dựng trên nền tảng React webapp (hỗ trợ PC và mobile), sử dụng Firebase Firestore làm cơ sở dữ liệu, và triển khai trên Vercel.

## Bảng Thuật Ngữ

- **Hệ_Thống**: Hệ thống quản lý cửa hàng giặt sấy
- **Cửa_Hàng**: Một chi nhánh/cửa hàng giặt sấy độc lập
- **Super_Admin**: Quản trị viên cấp cao nhất, quản lý toàn hệ thống và tất cả cửa hàng
- **Admin**: Quản lý của một cửa hàng cụ thể, có quyền quản lý đầy đủ cửa hàng của mình
- **Đơn_Hàng**: Đơn đặt dịch vụ giặt sấy của khách hàng
- **Khách_Hàng**: Người sử dụng dịch vụ giặt sấy (thuộc về một cửa hàng)
- **Nhân_Viên**: Người làm việc tại cửa hàng (bao gồm admin, nhân viên quầy, kỹ thuật viên)
- **Quản_Lý**: Nhân viên có vai trò ADMIN (quản lý cửa hàng)
- **Nhân_Viên_Quầy**: Nhân viên có vai trò NHAN_VIEN_QUAY
- **Kỹ_Thuật_Viên**: Nhân viên có vai trò KY_THUAT_VIEN
- **Dịch_Vụ**: Loại dịch vụ giặt sấy (giặt thường, giặt khô, ủi, giặt hấp...)
- **Giao_Dịch**: Giao dịch thanh toán của đơn hàng
- **Firestore**: Cơ sở dữ liệu Firebase Firestore
- **Security_Rules**: Quy tắc bảo mật Firebase
- **Mã_Đơn_Hàng**: Mã định danh duy nhất của đơn hàng (định dạng: DH + YYYYMMDD + 4 chữ số)
- **Mã_Cửa_Hàng**: Mã định danh duy nhất của cửa hàng (định dạng: CH + 4 chữ số)
- **Trạng*Thái*Đơn_Hàng**: Trạng thái hiện tại của đơn hàng (CHO_XU_LY, DANG_GIAT, DANG_SAY, DANG_UI, HOAN_THANH, DA_GIAO, DA_HUY)
- **Điểm_Tích_Lũy**: Điểm thưởng khách hàng nhận được từ giao dịch
- **Audit_Log**: Nhật ký kiểm toán ghi lại mọi thao tác trong hệ thống
- **Tenant**: Thuật ngữ kỹ thuật chỉ một cửa hàng trong kiến trúc multi-tenant

## Yêu Cầu

### Yêu Cầu 0: Quản Lý Multi-Tenant (Nhiều Cửa Hàng) - QUAN TRỌNG

**User Story:** Là super admin, tôi muốn quản lý nhiều cửa hàng giặt sấy độc lập, để có thể mở rộng hệ thống cho nhiều chi nhánh hoặc franchise.

#### Tiêu Chí Chấp Nhận

1. THE Hệ_Thống SHALL hỗ trợ kiến trúc multi-tenant với dữ liệu cách ly giữa các Cửa_Hàng
2. WHEN Super_Admin tạo Cửa_Hàng mới THEN Hệ_Thống SHALL tạo Mã_Cửa_Hàng duy nhất
3. WHEN tạo Cửa_Hàng THEN Hệ_Thống SHALL yêu cầu thông tin: tên cửa hàng, địa chỉ, số điện thoại, email
4. WHEN tạo Cửa_Hàng THEN Hệ_Thống SHALL tự động tạo tài khoản Admin đầu tiên cho cửa hàng đó
5. WHEN Super_Admin xem danh sách cửa hàng THEN Hệ_Thống SHALL hiển thị tất cả Cửa_Hàng với thống kê cơ bản
6. WHEN Super_Admin vô hiệu hóa Cửa_Hàng THEN Hệ_Thống SHALL không cho phép nhân viên của cửa hàng đó đăng nhập
7. WHEN Admin đăng nhập THEN Hệ_Thống SHALL chỉ hiển thị dữ liệu của Cửa_Hàng mà họ quản lý
8. WHEN Nhân_Viên đăng nhập THEN Hệ_Thống SHALL chỉ cho phép truy cập dữ liệu của Cửa_Hàng mà họ thuộc về
9. THE mọi collection trong Firestore SHALL có trường maCuaHang để phân biệt dữ liệu
10. THE Security_Rules SHALL enforce data isolation giữa các Cửa_Hàng
11. WHEN tạo Đơn_Hàng, Khách_Hàng, Giao_Dịch THEN Hệ_Thống SHALL tự động gán maCuaHang của người tạo
12. WHEN Super_Admin xem báo cáo THEN Hệ_Thống SHALL hiển thị báo cáo tổng hợp của tất cả Cửa_Hàng
13. WHEN Admin xem báo cáo THEN Hệ_Thống SHALL chỉ hiển thị báo cáo của Cửa_Hàng mà họ quản lý

### Yêu Cầu 1: Quản Lý Phân Cấp Người Dùng - QUAN TRỌNG

**User Story:** Là super admin, tôi muốn quản lý phân cấp người dùng với quyền hạn rõ ràng, để đảm bảo mỗi cấp chỉ có quyền truy cập phù hợp với vai trò của mình.

#### Tiêu Chí Chấp Nhận

1. THE Hệ_Thống SHALL hỗ trợ 4 cấp người dùng: SUPER_ADMIN, ADMIN, NHAN_VIEN_QUAY, KY_THUAT_VIEN
2. WHEN Super_Admin tạo Admin mới THEN Hệ_Thống SHALL yêu cầu chọn Cửa_Hàng mà Admin sẽ quản lý
3. WHEN Super_Admin tạo Admin THEN Hệ_Thống SHALL thiết lập Custom Claims với vaiTro=ADMIN và maCuaHang
4. WHEN Admin tạo Nhân_Viên mới THEN Hệ_Thống SHALL tự động gán maCuaHang của Admin cho Nhân_Viên
5. WHEN Admin tạo Nhân_Viên THEN Hệ_Thống SHALL chỉ cho phép tạo vai trò NHAN_VIEN_QUAY hoặc KY_THUAT_VIEN
6. WHEN Admin cố gắng tạo Admin khác THEN Hệ_Thống SHALL từ chối với thông báo "Chỉ Super Admin mới có quyền tạo Admin"
7. WHEN Super_Admin xem danh sách người dùng THEN Hệ_Thống SHALL hiển thị tất cả người dùng của tất cả Cửa_Hàng
8. WHEN Admin xem danh sách nhân viên THEN Hệ_Thống SHALL chỉ hiển thị nhân viên của Cửa_Hàng mà họ quản lý
9. WHEN Super_Admin thay đổi vai trò người dùng THEN Hệ_Thống SHALL cập nhật Custom Claims và Firestore
10. WHEN Admin cố gắng xóa hoặc sửa nhân viên của cửa hàng khác THEN Hệ_Thống SHALL từ chối
11. THE Security_Rules SHALL kiểm tra cả vaiTro và maCuaHang trước khi cho phép thao tác
12. WHEN người dùng đăng nhập THEN Hệ_Thống SHALL lưu maCuaHang vào session để filter dữ liệu

### Yêu Cầu 2: Quản Lý Đơn Hàng

**User Story:** Là nhân viên quầy, tôi muốn tạo và quản lý đơn hàng giặt sấy theo quy trình linh hoạt, để có thể phục vụ khách hàng một cách hiệu quả và phù hợp với cách vận hành của cửa hàng.

#### Tiêu Chí Chấp Nhận

**Cấu hình chế độ tạo đơn hàng**:

1. WHEN Admin vào Settings THEN Hệ_Thống SHALL hiển thị tùy chọn "Chế độ tạo đơn hàng"
2. THE Hệ_Thống SHALL hỗ trợ 2 chế độ: "Chọn dịch vụ trước" và "Chọn dịch vụ sau"
3. WHEN Admin chọn chế độ THEN Hệ_Thống SHALL lưu cấu hình vào Firestore collection `cauHinhCuaHang`
4. WHEN Nhân_Viên_Quầy mở màn hình POS THEN Hệ_Thống SHALL áp dụng chế độ đã cấu hình

**Chế độ 1: Chọn dịch vụ trước (Mặc định)**:

5. WHEN Nhân\*Viên_Quầy nhập số điện thoại khách hàng THEN Hệ_Thống SHALL tự động tìm kiếm và hiển thị thông tin Khách_Hàng
6. IF Khách_Hàng chưa tồn tại THEN Hệ_Thống SHALL cho phép tạo nhanh Khách_Hàng mới (tên + SĐT)
7. WHEN chọn khách hàng xong THEN Hệ_Thống SHALL hiển thị danh sách Dịch_Vụ để chọn
8. WHEN chọn Dịch_Vụ THEN Hệ_Thống SHALL yêu cầu nhập trọng lượng hoặc số lượng
9. WHEN thêm dịch vụ vào giỏ hàng THEN Hệ_Thống SHALL tự động tính giá và hiển thị tổng tiền realtime
10. WHEN xác nhận tạo đơn hàng THEN Hệ_Thống SHALL lưu Đơn_Hàng với trạng thái CHO_XU_LY và tổng tiền đã tính
11. WHEN lưu đơn hàng thành công THEN Hệ_Thống SHALL in bill tạm với bardcode, thông tin dịch vụ, và tổng tiền
12. WHEN in bill THEN Hệ_Thống SHALL hiển thị màn hình thanh toán (có thể thanh toán ngay hoặc để nợ)

**Chế độ 2: Chọn dịch vụ sau (Cân ký sau khi giặt)**:

13. WHEN Nhân_Viên_Quầy nhập số điện thoại khách hàng THEN Hệ_Thống SHALL tự động tìm kiếm và hiển thị thông tin Khách_Hàng
14. IF Khách_Hàng chưa tồn tại THEN Hệ_Thống SHALL cho phép tạo nhanh Khách_Hàng mới (tên + SĐT)
15. WHEN chọn khách hàng xong THEN Hệ_Thống SHALL KHÔNG hiển thị danh sách dịch vụ
16. WHEN xác nhận tạo đơn hàng THEN Hệ_Thống SHALL lưu Đơn_Hàng với trạng thái CHO_XU_LY, danhSachDichVu = [], tongTien = 0
17. WHEN lưu đơn hàng thành công THEN Hệ_Thống SHALL in phiếu hẹn với QR code, thông tin khách hàng, ghi chú "Chưa xác định dịch vụ"
18. WHEN Kỹ_Thuật_Viên giặt xong THEN Kỹ_Thuật_Viên SHALL quét Bard code trên phiếu hẹn
19. WHEN quét QR code THEN Hệ_Thống SHALL mở màn hình "Cập nhật dịch vụ" với thông tin đơn hàng
20. WHEN Kỹ_Thuật_Viên cân ký THEN Kỹ_Thuật_Viên SHALL nhập trọng lượng và chọn dịch vụ đã thực hiện
21. WHEN thêm dịch vụ THEN Hệ_Thống SHALL tự động tính giá và cập nhật tổng tiền
22. WHEN xác nhận cập nhật dịch vụ THEN Hệ_Thống SHALL lưu danhSachDichVu và tongTien vào Đơn_Hàng
23. WHEN cập nhật thành công THEN Hệ_Thống SHALL cập nhật trạng thái sang HOAN_THANH và in bill chính thức
24. WHEN khách hàng đến lấy THEN Nhân_Viên_Quầy SHALL quét Bard code và xử lý thanh toán

**Chung cho cả 2 chế độ**:

25. WHEN Nhân_Viên tìm kiếm đơn hàng theo số điện thoại THEN Hệ_Thống SHALL trả về danh sách tất cả Đơn_Hàng của Khách_Hàng đó
26. WHEN Nhân_Viên tìm kiếm đơn hàng theo trạng thái THEN Hệ_Thống SHALL trả về danh sách Đơn_Hàng có trạng thái tương ứng
27. WHEN Nhân_Viên tìm kiếm đơn hàng theo khoảng thời gian THEN Hệ_Thống SHALL trả về danh sách Đơn_Hàng được tạo trong khoảng thời gian đó
28. IF số điện thoại không hợp lệ (không phải 10-11 chữ số) THEN Hệ_Thống SHALL từ chối tạo Đơn_Hàng và hiển thị thông báo lỗi
29. WHEN xem đơn hàng chế độ 2 chưa có dịch vụ THEN Hệ_Thống SHALL hiển thị badge "Chưa xác định dịch vụ"
30. WHEN in bill cho đơn hàng chế độ 2 chưa có dịch vụ THEN Hệ_Thống SHALL in phiếu hẹn với ghi chú "Dịch vụ và giá sẽ được xác định sau khi giặt"

### Yêu Cầu 3: Cập Nhật Trạng Thái Đơn Hàng

**User Story:** Là nhân viên, tôi muốn cập nhật trạng thái đơn hàng theo tiến độ xử lý, để khách hàng có thể theo dõi tình trạng đơn hàng của mình.

#### Tiêu Chí Chấp Nhận

1. WHEN Nhân_Viên cập nhật trạng thái Đơn_Hàng THEN Hệ_Thống SHALL kiểm tra quyền của Nhân_Viên trước khi cho phép cập nhật
2. WHEN Kỹ_Thuật_Viên cập nhật trạng thái THEN Hệ_Thống SHALL chỉ cho phép chuyển sang DANG_GIAT, DANG_SAY, DANG_UI, hoặc HOAN_THANH
3. WHEN Nhân_Viên_Quầy cập nhật trạng thái THEN Hệ_Thống SHALL cho phép cập nhật tất cả trạng thái và thông tin thanh toán
4. WHEN Quản_Lý cập nhật trạng thái THEN Hệ_Thống SHALL cho phép cập nhật tất cả trường thông tin
5. WHEN trạng thái được cập nhật THEN Hệ_Thống SHALL kiểm tra tính hợp lệ của chuyển trạng thái theo quy trình
6. WHEN chuyển trạng thái hợp lệ THEN Hệ_Thống SHALL lưu trạng thái mới và ghi lại lịch sử chuyển trạng thái
7. WHEN chuyển trạng thái không hợp lệ THEN Hệ_Thống SHALL từ chối và hiển thị thông báo lỗi với các trạng thái hợp lệ
8. WHEN Đơn_Hàng chuyển sang HOAN_THANH hoặc DA_GIAO THEN Hệ_Thống SHALL gửi thông báo cho Khách_Hàng
9. WHEN trạng thái được cập nhật THEN Hệ_Thống SHALL ghi log với thông tin người cập nhật và thời gian

### Yêu Cầu 4: Quản Lý Khách Hàng

**User Story:** Là nhân viên quầy, tôi muốn quản lý thông tin khách hàng và lịch sử giao dịch, để có thể phục vụ khách hàng tốt hơn và áp dụng chương trình khách hàng thân thiết.

#### Tiêu Chí Chấp Nhận

1. WHEN Nhân_Viên_Quầy hoặc Quản_Lý nhập thông tin khách hàng mới THEN Hệ_Thống SHALL tạo Khách_Hàng với điểm tích lũy ban đầu là 0
2. WHEN tạo Khách_Hàng mới THEN Hệ_Thống SHALL kiểm tra số điện thoại chưa tồn tại trong hệ thống
3. IF số điện thoại đã tồn tại THEN Hệ_Thống SHALL hiển thị thông tin Khách_Hàng hiện có và hỏi có muốn sử dụng không
4. WHEN Nhân_Viên tìm kiếm khách hàng theo số điện thoại THEN Hệ_Thống SHALL trả về thông tin Khách_Hàng tương ứng
5. WHEN Nhân_Viên xem lịch sử giao dịch của khách hàng THEN Hệ_Thống SHALL hiển thị danh sách tất cả Đơn_Hàng đã hoàn thành
6. WHEN Khách_Hàng hoàn thành thanh toán đơn hàng THEN Hệ_Thống SHALL cập nhật điểm tích lũy (1 điểm cho mỗi 1,000 VNĐ)
7. WHEN Khách_Hàng hoàn thành thanh toán THEN Hệ_Thống SHALL cập nhật tổng chi tiêu và số lần giao dịch
8. WHEN tổng chi tiêu đạt 10,000,000 VNĐ THEN Hệ_Thống SHALL tự động nâng cấp Khách_Hàng lên VIP
9. WHEN tổng chi tiêu đạt 5,000,000 VNĐ THEN Hệ_Thống SHALL tự động nâng cấp Khách_Hàng lên THAN_THIET
10. WHEN Nhân_Viên cập nhật thông tin khách hàng THEN Hệ_Thống SHALL không cho phép thay đổi điểm tích lũy, tổng chi tiêu thủ công

### Yêu Cầu 5: Quản Lý Dịch Vụ

**User Story:** Là quản lý, tôi muốn quản lý danh mục dịch vụ và bảng giá, để có thể điều chỉnh linh hoạt theo nhu cầu kinh doanh.

#### Tiêu Chí Chấp Nhận

1. WHEN Quản_Lý tạo Dịch_Vụ mới THEN Hệ_Thống SHALL lưu thông tin dịch vụ với giá theo kg, giá theo số lượng, và thời gian xử lý
2. WHEN Quản_Lý cập nhật giá dịch vụ THEN Hệ_Thống SHALL lưu giá mới và áp dụng cho các Đơn_Hàng mới
3. WHEN Quản_Lý vô hiệu hóa Dịch_Vụ THEN Hệ_Thống SHALL không cho phép chọn dịch vụ đó khi tạo Đơn_Hàng mới
4. WHEN Nhân_Viên xem danh sách dịch vụ THEN Hệ_Thống SHALL hiển thị tất cả Dịch_Vụ đang hoạt động
5. WHEN tính giá cho Dịch_Vụ có loại tính giá THEO_TRONG_LUONG THEN Hệ_Thống SHALL tính giá = trọng lượng × giá theo kg
6. WHEN tính giá cho Dịch_Vụ có loại tính giá THEO_SO_LUONG THEN Hệ_Thống SHALL tính giá = số lượng × giá theo số lượng
7. WHEN tính giá cho Dịch_Vụ có loại tính giá CO_DINH THEN Hệ_Thống SHALL trả về giá cố định
8. WHEN tính giá dịch vụ THEN Hệ_Thống SHALL làm tròn kết quả đến đơn vị nguyên
9. IF Dịch_Vụ không còn hoạt động THEN Hệ_Thống SHALL từ chối tính giá và hiển thị thông báo lỗi

### Yêu Cầu 6: Xử Lý Thanh Toán

**User Story:** Là nhân viên quầy, tôi muốn xử lý thanh toán cho đơn hàng, để ghi nhận các giao dịch và theo dõi công nợ khách hàng.

#### Tiêu Chí Chấp Nhận

1. WHEN Nhân_Viên_Quầy hoặc Quản_Lý xử lý thanh toán THEN Hệ_Thống SHALL tạo Giao_Dịch mới với số tiền, phương thức thanh toán, và thời gian
2. WHEN Giao_Dịch được tạo THEN Hệ_Thống SHALL kiểm tra số tiền không vượt quá số tiền còn lại của Đơn_Hàng
3. IF số tiền thanh toán vượt quá số tiền còn lại THEN Hệ_Thống SHALL từ chối giao dịch và hiển thị thông báo lỗi
4. WHEN Giao_Dịch hợp lệ THEN Hệ_Thống SHALL cập nhật tiền đã trả và tiền còn lại của Đơn_Hàng
5. WHEN cập nhật thanh toán THEN Hệ_Thống SHALL đảm bảo tiền đã trả + tiền còn lại = tổng tiền
6. WHEN Đơn_Hàng được thanh toán đủ (tiền còn lại = 0) THEN Hệ_Thống SHALL cập nhật điểm tích lũy cho Khách_Hàng
7. WHEN Nhân_Viên xem lịch sử thanh toán THEN Hệ_Thống SHALL hiển thị danh sách tất cả Giao_Dịch của Đơn_Hàng
8. WHEN Quản_Lý xử lý hoàn tiền THEN Hệ_Thống SHALL tạo Giao_Dịch với số tiền âm và cập nhật Đơn_Hàng
9. WHEN xử lý thanh toán THEN Hệ_Thống SHALL sử dụng transaction để đảm bảo tính nhất quán dữ liệu
10. IF lưu Giao_Dịch hoặc cập nhật Đơn_Hàng thất bại THEN Hệ_Thống SHALL rollback toàn bộ transaction

### Yêu Cầu 7: Quản Lý Nhân Viên và Phân Quyền

**User Story:** Là quản lý, tôi muốn quản lý thông tin nhân viên và phân quyền truy cập, để đảm bảo bảo mật và kiểm soát hoạt động của hệ thống.

#### Tiêu Chí Chấp Nhận

1. WHEN Quản_Lý tạo Nhân_Viên mới THEN Hệ_Thống SHALL tạo tài khoản với vai trò QUAN_LY, NHAN_VIEN_QUAY, hoặc KY_THUAT_VIEN
2. WHEN tạo Nhân_Viên THEN Hệ_Thống SHALL thiết lập Custom Claims trong Firebase Authentication với vai trò tương ứng
3. WHEN Nhân_Viên đăng nhập THEN Hệ_Thống SHALL xác thực qua Firebase Authentication và lấy vai trò từ Custom Claims
4. WHEN Nhân_Viên thực hiện thao tác THEN Hệ_Thống SHALL kiểm tra quyền dựa trên vai trò trước khi cho phép
5. WHEN Quản_Lý cập nhật vai trò Nhân_Viên THEN Hệ_Thống SHALL cập nhật Custom Claims và thông tin trong Firestore
6. WHEN Nhân_Viên xem thông tin cá nhân THEN Hệ_Thống SHALL cho phép xem và cập nhật thông tin (trừ vai trò và quyền)
7. WHEN Quản_Lý xem danh sách nhân viên THEN Hệ_Thống SHALL hiển thị tất cả Nhân_Viên với thông tin vai trò và trạng thái
8. WHEN Quản_Lý vô hiệu hóa Nhân_Viên THEN Hệ_Thống SHALL cập nhật trạng thái và không cho phép đăng nhập

### Yêu Cầu 8: Báo Cáo và Thống Kê

**User Story:** Là quản lý, tôi muốn xem báo cáo doanh thu và thống kê kinh doanh, để có thể đánh giá hiệu quả và đưa ra quyết định kinh doanh.

#### Tiêu Chí Chấp Nhận

1. WHEN Quản_Lý tạo báo cáo doanh thu theo khoảng thời gian THEN Hệ_Thống SHALL tính tổng doanh thu từ các Đơn_Hàng đã hoàn thành
2. WHEN tạo báo cáo doanh thu THEN Hệ_Thống SHALL hiển thị tổng đơn hàng, tổng doanh thu, đơn hàng hoàn thành, và đơn hàng hủy
3. WHEN Quản_Lý xem thống kê đơn hàng theo trạng thái THEN Hệ_Thống SHALL hiển thị số lượng và tỷ lệ phần trăm của từng trạng thái
4. WHEN Quản_Lý xem thống kê dịch vụ THEN Hệ_Thống SHALL hiển thị số lượng sử dụng và doanh thu của từng Dịch_Vụ
5. WHEN Quản_Lý xem thống kê khách hàng THEN Hệ_Thống SHALL hiển thị số lượng khách hàng mới, khách hàng thân thiết, và khách hàng VIP
6. WHEN Quản_Lý xuất báo cáo THEN Hệ_Thống SHALL hỗ trợ xuất ra định dạng PDF hoặc Excel
7. WHEN tạo báo cáo THEN Hệ_Thống SHALL lưu báo cáo vào Firestore để có thể xem lại sau
8. WHEN báo cáo được lưu THEN Hệ_Thống SHALL không cho phép cập nhật hoặc xóa báo cáo (immutable)

### Yêu Cầu 9: Bảo Mật và Kiểm Soát Truy Cập (ƯU TIÊN CAO)

**User Story:** Là quản lý hệ thống, tôi muốn đảm bảo dữ liệu được bảo vệ an toàn và quyền truy cập được kiểm soát chặt chẽ, để ngăn chặn truy cập trái phép và bảo vệ thông tin khách hàng.

#### Tiêu Chí Chấp Nhận

1. THE Security_Rules SHALL mặc định từ chối tất cả truy cập và chỉ cho phép những gì được định nghĩa rõ ràng
2. WHEN Nhân_Viên truy cập Firestore THEN Security_Rules SHALL kiểm tra xác thực qua Firebase Authentication
3. WHEN Nhân_Viên thực hiện thao tác THEN Security_Rules SHALL kiểm tra cả vaiTro và maCuaHang từ Custom Claims
4. WHEN Super_Admin truy cập THEN Security_Rules SHALL cho phép truy cập tất cả Cửa_Hàng
5. WHEN Admin hoặc Nhân_Viên truy cập THEN Security_Rules SHALL chỉ cho phép truy cập dữ liệu của Cửa_Hàng mà họ thuộc về
6. WHEN tạo Đơn_Hàng, Khách_Hàng, Giao_Dịch THEN Security_Rules SHALL kiểm tra maCuaHang khớp với maCuaHang của người tạo
7. WHEN Admin tạo Nhân_Viên mới THEN Security_Rules SHALL kiểm tra maCuaHang của Nhân_Viên khớp với maCuaHang của Admin
8. WHEN Admin cố gắng truy cập dữ liệu của cửa hàng khác THEN Security_Rules SHALL từ chối hoàn toàn
9. WHEN Nhân_Viên_Quầy tạo Đơn_Hàng THEN Security_Rules SHALL kiểm tra mã nhân viên khớp với người đăng nhập
10. WHEN Nhân_Viên_Quầy cập nhật Đơn_Hàng THEN Security_Rules SHALL chỉ cho phép cập nhật trạng thái và thanh toán
11. WHEN Kỹ_Thuật_Viên cập nhật Đơn_Hàng THEN Security_Rules SHALL chỉ cho phép cập nhật trạng thái xử lý
12. WHEN Admin cập nhật Dịch_Vụ THEN Security_Rules SHALL chỉ cho phép Admin thực hiện
13. WHEN tạo Giao_Dịch THEN Security_Rules SHALL kiểm tra số tiền > 0 và thời gian = thời gian server
14. WHEN cập nhật Khách_Hàng THEN Security_Rules SHALL không cho phép thay đổi điểm tích lũy, tổng chi tiêu thủ công
15. WHEN tạo Audit_Log THEN Security_Rules SHALL chỉ cho phép Cloud Functions tạo (không cho phép từ client)
16. WHEN Admin xem Audit_Log THEN Security_Rules SHALL chỉ cho phép xem log của Cửa_Hàng mà họ quản lý
17. WHEN Super_Admin xem Audit_Log THEN Security_Rules SHALL cho phép xem tất cả log
18. WHEN truy cập collection không được định nghĩa THEN Security_Rules SHALL từ chối hoàn toàn
19. THE Hệ_Thống SHALL validate số điện thoại có 10-11 chữ số trong Security_Rules
20. THE Hệ_Thống SHALL validate email đúng định dạng trong Security_Rules
21. THE Hệ_Thống SHALL sử dụng HTTPS cho tất cả kết nối
22. THE Hệ_Thống SHALL tự động timeout session sau 1 giờ không hoạt động
23. THE Hệ_Thống SHALL ghi log tất cả thao tác quan trọng vào Audit_Log qua Cloud Functions
24. THE mọi query Firestore SHALL tự động filter theo maCuaHang (trừ Super_Admin)

### Yêu Cầu 10: Xử Lý Lỗi và Khôi Phục

**User Story:** Là người dùng hệ thống, tôi muốn hệ thống xử lý lỗi một cách rõ ràng và có khả năng khôi phục, để tôi biết cách xử lý khi gặp sự cố.

#### Tiêu Chí Chấp Nhận

1. IF Đơn_Hàng không tồn tại THEN Hệ_Thống SHALL hiển thị thông báo "Không tìm thấy đơn hàng" và đề xuất tìm kiếm theo số điện thoại
2. IF chuyển trạng thái không hợp lệ THEN Hệ_Thống SHALL hiển thị thông báo lỗi và danh sách trạng thái hợp lệ
3. IF số tiền thanh toán vượt quá số tiền còn lại THEN Hệ_Thống SHALL hiển thị thông báo lỗi với thông tin chi tiết
4. IF mất kết nối Firestore THEN Hệ_Thống SHALL hiển thị thông báo và tự động thử kết nối lại sau 5 giây (tối đa 3 lần)
5. IF mất kết nối Firestore THEN Hệ_Thống SHALL lưu dữ liệu tạm vào cache cục bộ
6. WHEN kết nối Firestore phục hồi THEN Hệ_Thống SHALL tự động đồng bộ dữ liệu từ cache
7. IF số điện thoại đã tồn tại khi tạo Khách_Hàng THEN Hệ_Thống SHALL hiển thị thông tin khách hàng hiện có
8. IF Dịch_Vụ không còn hoạt động THEN Hệ_Thống SHALL hiển thị thông báo và đề xuất dịch vụ tương tự
9. WHEN xảy ra lỗi THEN Hệ_Thống SHALL ghi log chi tiết để quản trị viên kiểm tra
10. WHEN xảy ra lỗi nghiêm trọng THEN Hệ_Thống SHALL hiển thị thông báo thân thiện và không để lộ thông tin kỹ thuật

### Yêu Cầu 11: Hiệu Năng và Khả Năng Mở Rộng

**User Story:** Là người dùng hệ thống, tôi muốn hệ thống phản hồi nhanh chóng và hoạt động ổn định, để có thể phục vụ khách hàng hiệu quả trong giờ cao điểm.

#### Tiêu Chí Chấp Nhận

1. WHEN tạo Đơn_Hàng mới THEN Hệ_Thống SHALL hoàn thành trong vòng 2 giây
2. WHEN tìm kiếm Đơn_Hàng THEN Hệ_Thống SHALL trả về kết quả trong vòng 1 giây
3. WHEN cập nhật trạng thái Đơn_Hàng THEN Hệ_Thống SHALL hoàn thành trong vòng 1 giây
4. WHEN tạo báo cáo tháng THEN Hệ_Thống SHALL hoàn thành trong vòng 5 giây
5. THE Hệ_Thống SHALL hỗ trợ ít nhất 10 Nhân_Viên làm việc đồng thời
6. THE Hệ_Thống SHALL xử lý ít nhất 50 giao dịch mỗi phút trong giờ cao điểm
7. THE Hệ_Thống SHALL hỗ trợ lưu trữ ít nhất 100,000 Đơn_Hàng
8. THE Hệ_Thống SHALL hỗ trợ ít nhất 50,000 Khách_Hàng
9. THE Hệ_Thống SHALL lưu trữ dữ liệu lịch sử ít nhất 3 năm
10. WHEN hiển thị danh sách dài THEN Hệ_Thống SHALL sử dụng phân trang với tối đa 50 kết quả mỗi trang

### Yêu Cầu 12: Tối Ưu Hóa Truy Vấn và Cache

**User Story:** Là quản trị viên hệ thống, tôi muốn hệ thống được tối ưu hóa về mặt hiệu năng, để giảm chi phí và cải thiện trải nghiệm người dùng.

#### Tiêu Chí Chấp Nhận

1. THE Hệ_Thống SHALL tạo index cho maDonHang, maKhachHang, trangThai, và ngayTao trong Firestore
2. THE Hệ_Thống SHALL tạo composite index cho (maKhachHang, ngayTao) và (trangThai, ngayTao)
3. THE Hệ_Thống SHALL tạo unique index cho soDienThoai trong collection khachHang
4. WHEN truy vấn danh sách Dịch_Vụ THEN Hệ_Thống SHALL cache kết quả với TTL 5 phút
5. WHEN truy vấn thông tin Khách_Hàng thường xuyên THEN Hệ_Thống SHALL cache kết quả
6. WHEN tạo báo cáo đã tồn tại THEN Hệ_Thống SHALL trả về kết quả từ cache
7. WHEN tải danh sách dài THEN Hệ_Thống SHALL sử dụng lazy loading cho hình ảnh và dữ liệu không quan trọng
8. THE Hệ_Thống SHALL minify và compress CSS/JavaScript khi deploy

### Yêu Cầu 13: Màn Hình POS (Point of Sale) - QUAN TRỌNG

**User Story:** Là nhân viên quầy, tôi muốn có màn hình POS tối ưu để tiếp nhận và xử lý đơn hàng nhanh chóng, để phục vụ khách hàng hiệu quả trong giờ cao điểm.

#### Tiêu Chí Chấp Nhận

1. THE Hệ_Thống SHALL cung cấp màn hình POS chuyên dụng cho Nhân_Viên_Quầy
2. WHEN mở màn hình POS THEN Hệ_Thống SHALL hiển thị giao diện tối ưu với các chức năng chính dễ tiếp cận
3. WHEN Nhân_Viên_Quầy nhập số điện thoại khách hàng THEN Hệ_Thống SHALL tự động tìm kiếm và hiển thị thông tin Khách_Hàng
4. IF Khách_Hàng chưa tồn tại THEN Hệ_Thống SHALL cho phép tạo nhanh Khách_Hàng mới ngay trên màn hình POS
5. WHEN chọn dịch vụ THEN Hệ_Thống SHALL hiển thị danh sách Dịch_Vụ dạng grid với hình ảnh và giá
6. WHEN chọn Dịch_Vụ THEN Hệ_Thống SHALL cho phép nhập nhanh trọng lượng hoặc số lượng bằng numpad
7. WHEN thêm dịch vụ vào đơn hàng THEN Hệ_Thống SHALL tự động tính giá và hiển thị tổng tiền realtime
8. WHEN xem giỏ hàng THEN Hệ_Thống SHALL hiển thị danh sách dịch vụ đã chọn với khả năng chỉnh sửa số lượng/trọng lượng
9. WHEN xóa dịch vụ khỏi giỏ hàng THEN Hệ_Thống SHALL cập nhật lại tổng tiền ngay lập tức
10. WHEN hoàn tất chọn dịch vụ THEN Hệ_Thống SHALL hiển thị tóm tắt đơn hàng với tổng tiền, ngày hẹn trả
11. WHEN xác nhận tạo đơn hàng THEN Hệ_Thống SHALL lưu Đơn_Hàng và hiển thị màn hình thanh toán
12. WHEN thanh toán THEN Hệ_Thống SHALL hiển thị numpad để nhập số tiền khách đưa
13. WHEN nhập số tiền khách đưa THEN Hệ_Thống SHALL tự động tính và hiển thị số tiền thối lại
14. WHEN chọn phương thức thanh toán THEN Hệ_Thống SHALL hiển thị các nút lớn: Tiền Mặt, Chuyển Khoản, Thẻ ATM, Ví Điện Tử
15. WHEN hoàn tất thanh toán THEN Hệ_Thống SHALL tự động in phiếu tiếp nhận với QR code
16. WHEN in phiếu THEN Hệ_Thống SHALL hiển thị preview trước khi in
17. WHEN hoàn tất đơn hàng THEN Hệ_Thống SHALL tự động reset màn hình POS về trạng thái ban đầu
18. WHEN quét QR code trên phiếu THEN Hệ_Thống SHALL mở nhanh thông tin Đơn_Hàng để cập nhật trạng thái hoặc thanh toán tiếp
19. THE màn hình POS SHALL hỗ trợ phím tắt (keyboard shortcuts) cho các thao tác thường xuyên
20. THE màn hình POS SHALL hiển thị danh sách Đơn_Hàng gần đây ở sidebar để tra cứu nhanh
21. THE màn hình POS SHALL hiển thị thống kê nhanh: số đơn hôm nay, doanh thu hôm nay
22. WHEN có lỗi THEN màn hình POS SHALL hiển thị thông báo rõ ràng và cho phép thử lại ngay
23. THE màn hình POS SHALL tối ưu cho màn hình cảm ứng (touch-friendly)
24. THE màn hình POS SHALL hoạt động mượt mà trên tablet và PC
25. WHEN Nhân_Viên_Quầy cần hủy đơn hàng đang tạo THEN Hệ_Thống SHALL hiển thị nút "Hủy" rõ ràng và xác nhận trước khi hủy
26. WHEN có nhiều Nhân_Viên_Quầy làm việc THEN mỗi người SHALL có màn hình POS riêng không bị xung đột

### Yêu Cầu 14: Giao Diện Người Dùng

**User Story:** Là người dùng, tôi muốn giao diện thân thiện và dễ sử dụng trên cả PC và mobile, để có thể làm việc hiệu quả trên mọi thiết bị.

#### Tiêu Chí Chấp Nhận

1. THE Hệ_Thống SHALL cung cấp giao diện responsive hoạt động tốt trên PC và mobile
2. WHEN Nhân_Viên tạo Đơn_Hàng THEN Hệ_Thống SHALL hiển thị form nhập liệu rõ ràng với validation
3. WHEN Nhân_Viên tìm kiếm THEN Hệ_Thống SHALL cung cấp gợi ý tự động (autocomplete)
4. WHEN có thông báo THEN Hệ_Thống SHALL hiển thị toast notification không làm gián đoạn công việc
5. WHEN xử lý thao tác THEN Hệ_Thống SHALL hiển thị loading indicator
6. WHEN hiển thị danh sách Đơn_Hàng THEN Hệ_Thống SHALL sử dụng màu sắc phân biệt trạng thái
7. WHEN in phiếu tiếp nhận THEN Hệ*Thống SHALL tạo phiếu với QR code chứa Mã*Đơn_Hàng
8. WHEN Nhân_Viên quét QR code THEN Hệ_Thống SHALL tự động mở thông tin Đơn_Hàng
9. THE Hệ_Thống SHALL hỗ trợ dark mode và light mode
10. THE Hệ_Thống SHALL sử dụng font chữ dễ đọc và kích thước phù hợp

### Yêu Cầu 15: Backup và Khôi Phục Dữ Liệu

**User Story:** Là quản trị viên, tôi muốn dữ liệu được backup định kỳ và có thể khôi phục, để đảm bảo an toàn dữ liệu kinh doanh.

#### Tiêu Chí Chấp Nhận

1. THE Hệ_Thống SHALL tự động backup dữ liệu Firestore hàng ngày
2. THE Hệ_Thống SHALL lưu trữ backup trên Google Cloud Storage
3. THE Hệ_Thống SHALL giữ backup ít nhất 30 ngày
4. WHEN Quản_Lý yêu cầu export dữ liệu THEN Hệ_Thống SHALL xuất toàn bộ dữ liệu ra file JSON
5. WHEN cần khôi phục dữ liệu THEN Hệ_Thống SHALL hỗ trợ point-in-time recovery
6. THE Hệ_Thống SHALL test khôi phục backup định kỳ mỗi tháng
7. WHEN backup thất bại THEN Hệ_Thống SHALL gửi cảnh báo cho quản trị viên

### Yêu Cầu 16: Thông Báo và Giao Tiếp

**User Story:** Là khách hàng, tôi muốn nhận thông báo về tình trạng đơn hàng, để biết khi nào có thể đến lấy quần áo.

#### Tiêu Chí Chấp Nhận

1. WHEN Đơn_Hàng chuyển sang HOAN_THANH THEN Hệ_Thống SHALL gửi thông báo SMS cho Khách_Hàng
2. WHEN Đơn_Hàng chuyển sang DA_GIAO THEN Hệ_Thống SHALL gửi thông báo SMS cho Khách_Hàng
3. WHERE Khách_Hàng có email THEN Hệ_Thống SHALL gửi hóa đơn qua email sau khi thanh toán
4. WHEN gửi thông báo THEN Hệ_Thống SHALL sử dụng Cloud Functions để xử lý bất đồng bộ
5. IF gửi thông báo thất bại THEN Hệ_Thống SHALL ghi log và thử lại sau 5 phút (tối đa 3 lần)
6. WHEN Nhân_Viên cập nhật trạng thái THEN Hệ_Thống SHALL hiển thị thông báo realtime cho các Nhân_Viên khác đang xem cùng Đơn_Hàng

### Yêu Cầu 17: Tích Hợp Thanh Toán Online (Tùy Chọn)

**User Story:** Là khách hàng, tôi muốn có thể thanh toán online, để tiện lợi hơn khi không có tiền mặt.

#### Tiêu Chí Chấp Nhận

1. WHERE hỗ trợ thanh toán online THEN Hệ_Thống SHALL tích hợp VNPay hoặc MoMo
2. WHEN Khách_Hàng chọn thanh toán online THEN Hệ_Thống SHALL tạo link thanh toán và hiển thị QR code
3. WHEN thanh toán online thành công THEN Hệ_Thống SHALL tự động cập nhật trạng thái Giao_Dịch
4. WHEN thanh toán online thất bại THEN Hệ_Thống SHALL hiển thị thông báo lỗi và cho phép thử lại
5. WHERE thanh toán online THEN Hệ_Thống SHALL lưu mã giao dịch từ payment gateway
6. WHEN Quản_Lý xem báo cáo THEN Hệ_Thống SHALL phân biệt doanh thu từ tiền mặt và online

### Yêu Cầu 18: Audit Log và Giám Sát

**User Story:** Là quản lý, tôi muốn theo dõi mọi thao tác trong hệ thống, để có thể kiểm tra và phát hiện hành vi bất thường.

#### Tiêu Chí Chấp Nhận

1. WHEN Nhân_Viên tạo Đơn_Hàng THEN Hệ_Thống SHALL ghi log với userId, action, timestamp, và dữ liệu đơn hàng
2. WHEN Nhân_Viên cập nhật Đơn_Hàng THEN Hệ_Thống SHALL ghi log với dữ liệu trước và sau khi cập nhật
3. WHEN Nhân_Viên xóa dữ liệu THEN Hệ_Thống SHALL ghi log với dữ liệu đã xóa
4. WHEN Quản_Lý thay đổi vai trò Nhân_Viên THEN Hệ_Thống SHALL ghi log với vai trò cũ và mới
5. WHEN Nhân_Viên đăng nhập THEN Hệ_Thống SHALL ghi log với thời gian và địa chỉ IP
6. WHEN Quản_Lý xem Audit_Log THEN Hệ_Thống SHALL hỗ trợ lọc theo userId, action, và khoảng thời gian
7. THE Audit_Log SHALL không thể sửa hoặc xóa từ client
8. THE Hệ_Thống SHALL giữ Audit_Log ít nhất 1 năm

### Yêu Cầu 19: Cấu Hình Cửa Hàng (Settings)

**User Story:** Là admin cửa hàng, tôi muốn cấu hình các tùy chọn vận hành của cửa hàng, để hệ thống hoạt động phù hợp với quy trình kinh doanh của tôi.

#### Tiêu Chí Chấp Nhận

1. WHEN Admin vào màn hình Settings THEN Hệ_Thống SHALL hiển thị các tùy chọn cấu hình
2. THE Hệ_Thống SHALL lưu cấu hình vào Firestore collection `cauHinhCuaHang/{maCuaHang}`
3. WHEN Admin thay đổi cấu hình THEN Hệ_Thống SHALL lưu ngay lập tức và áp dụng cho tất cả nhân viên
4. WHEN Nhân_Viên đăng nhập THEN Hệ_Thống SHALL load cấu hình của cửa hàng và áp dụng

**Cấu hình chế độ tạo đơn hàng**:

5. THE Settings SHALL có mục "Chế độ tạo đơn hàng" với 2 lựa chọn:
   - "Chọn dịch vụ trước" (Mặc định)
   - "Chọn dịch vụ sau (Cân ký sau khi giặt)"
6. WHEN Admin chọn "Chọn dịch vụ trước" THEN Hệ_Thống SHALL yêu cầu chọn dịch vụ khi tạo đơn hàng
7. WHEN Admin chọn "Chọn dịch vụ sau" THEN Hệ_Thống SHALL cho phép tạo đơn hàng không cần chọn dịch vụ
8. WHEN thay đổi chế độ THEN Hệ_Thống SHALL hiển thị thông báo xác nhận và giải thích sự khác biệt

**Các cấu hình khác**:

9. THE Settings SHALL có mục "Giờ mở cửa / đóng cửa"
10. THE Settings SHALL có mục "Ngày nghỉ trong tuần"
11. THE Settings SHALL có mục "Thông tin thanh toán" (tên ngân hàng, số tài khoản)
12. THE Settings SHALL có mục "Mẫu in phiếu" (logo, thông tin liên hệ, footer)
13. WHEN Admin cập nhật Settings THEN Hệ_Thống SHALL ghi log vào Audit_Log
14. WHEN có lỗi khi lưu Settings THEN Hệ_Thống SHALL rollback và hiển thị thông báo lỗi

### Yêu Cầu 20: Hỗ Trợ Đa Ngôn Ngữ (Tùy Chọn)

**User Story:** Là người dùng, tôi muốn sử dụng hệ thống bằng ngôn ngữ mà tôi quen thuộc, để dễ dàng thao tác hơn.

#### Tiêu Chí Chấp Nhận

1. WHERE hỗ trợ đa ngôn ngữ THEN Hệ_Thống SHALL hỗ trợ tiếng Việt và tiếng Anh
2. WHEN Nhân_Viên chọn ngôn ngữ THEN Hệ_Thống SHALL hiển thị toàn bộ giao diện bằng ngôn ngữ đó
3. WHEN chuyển ngôn ngữ THEN Hệ_Thống SHALL lưu lựa chọn vào localStorage
4. THE Hệ_Thống SHALL sử dụng i18n library để quản lý bản dịch
5. THE Hệ_Thống SHALL dịch tất cả label, button, message, và validation error

## Quy Tắc Chuyển Trạng Thái Đơn Hàng

Các chuyển trạng thái hợp lệ:

- CHO_XU_LY → DANG_GIAT
- DANG_GIAT → DANG_SAY
- DANG_SAY → DANG_UI (tùy chọn)
- DANG_SAY → HOAN_THANH
- DANG_UI → HOAN_THANH
- HOAN_THANH → DA_GIAO
- Bất kỳ trạng thái nào (trừ DA_GIAO) → DA_HUY

## Ma Trận Phân Quyền

| Chức Năng                   | SUPER_ADMIN | ADMIN | NHAN_VIEN_QUAY | KY_THUAT_VIEN |
| --------------------------- | ----------- | ----- | -------------- | ------------- |
| Quản lý cửa hàng            | ✓           | ✗     | ✗              | ✗             |
| Tạo Admin                   | ✓           | ✗     | ✗              | ✗             |
| Xem tất cả cửa hàng         | ✓           | ✗     | ✗              | ✗             |
| Tạo nhân viên               | ✓           | ✓     | ✗              | ✗             |
| Quản lý nhân viên           | ✓           | ✓     | ✗              | ✗             |
| Tạo đơn hàng                | ✓           | ✓     | ✓              | ✗             |
| Xem đơn hàng                | ✓           | ✓     | ✓              | ✓             |
| Cập nhật trạng thái xử lý   | ✓           | ✓     | ✓              | ✓             |
| Cập nhật thanh toán         | ✓           | ✓     | ✓              | ✗             |
| Xóa đơn hàng                | ✓           | ✓     | ✗              | ✗             |
| Tạo khách hàng              | ✓           | ✓     | ✓              | ✗             |
| Cập nhật khách hàng         | ✓           | ✓     | ✓              | ✗             |
| Xóa khách hàng              | ✓           | ✓     | ✗              | ✗             |
| Quản lý dịch vụ             | ✓           | ✓     | ✗              | ✗             |
| Xem dịch vụ                 | ✓           | ✓     | ✓              | ✓             |
| Tạo giao dịch               | ✓           | ✓     | ✓              | ✗             |
| Xem giao dịch               | ✓           | ✓     | ✓              | ✗             |
| Xem báo cáo cửa hàng        | ✓           | ✓     | ✗              | ✗             |
| Xem báo cáo tổng hợp        | ✓           | ✗     | ✗              | ✗             |
| Xem audit log cửa hàng      | ✓           | ✓     | ✗              | ✗             |
| Xem audit log toàn hệ thống | ✓           | ✗     | ✗              | ✗             |

**Lưu ý về phạm vi dữ liệu**:

- **SUPER_ADMIN**: Truy cập tất cả dữ liệu của tất cả cửa hàng
- **ADMIN**: Chỉ truy cập dữ liệu của cửa hàng mà họ quản lý
- **NHAN_VIEN_QUAY, KY_THUAT_VIEN**: Chỉ truy cập dữ liệu của cửa hàng mà họ làm việc

## Ràng Buộc Dữ Liệu

### Đơn Hàng

- maDonHang: Duy nhất, không rỗng, định dạng "DH" + YYYYMMDD + 4 chữ số
- ngayHenTra > ngayTao
- tongTrongLuong > 0
- tongTien = SUM(dichVu.thanhTien)
- tienDaTra + tienConLai = tongTien
- tienDaTra >= 0 và tienConLai >= 0

### Khách Hàng

- maKhachHang: Duy nhất, không rỗng
- soDienThoai: Duy nhất, 10-11 chữ số
- email: Đúng định dạng (nếu có)
- diemTichLuy >= 0
- tongChiTieu >= 0
- soLanGiaoDich >= 0

### Dịch Vụ

- maDichVu: Duy nhất, không rỗng
- tenDichVu: Không rỗng
- giaTheoKg >= 0
- giaTheoSoLuong >= 0
- thoiGianXuLy > 0

### Giao Dịch

- maGiaoDich: Duy nhất, không rỗng
- soTien > 0 (hoặc < 0 cho hoàn tiền)
- ngayGiaoDich >= ngayTao của Đơn_Hàng
- SUM(giaoDich.soTien WHERE trangThai = THANH_CONG) = donHang.tienDaTra

## Công Thức Tính Toán

### Tính Điểm Tích Lũy

```
diemTichLuy = FLOOR(soTienThanhToan / 1000)
```

### Tính Loại Khách Hàng

```
IF tongChiTieu >= 10,000,000 THEN loaiKhachHang = VIP
ELSE IF tongChiTieu >= 5,000,000 THEN loaiKhachHang = THAN_THIET
ELSE loaiKhachHang = THUONG
```

### Tính Giá Dịch Vụ

```
IF loaiTinhGia = THEO_TRONG_LUONG THEN
  giaTien = trongLuong × giaTheoKg
ELSE IF loaiTinhGia = THEO_SO_LUONG THEN
  giaTien = soLuong × giaTheoSoLuong
ELSE IF loaiTinhGia = CO_DINH THEN
  giaTien = giaTheoKg
END IF

giaTien = ROUND(giaTien, 0)
```

### Tính Thời Gian Xử Lý

```
thoiGianXuLy = MAX(dichVu.thoiGianXuLy FOR dichVu IN danhSachDichVu)
ngayHenTra = ngayTao + thoiGianXuLy (phút)
```

## Kết Luận

Tài liệu yêu cầu này định nghĩa đầy đủ các chức năng của hệ thống quản lý cửa hàng giặt sấy. Tất cả yêu cầu được viết theo chuẩn EARS và tuân thủ các quy tắc chất lượng INCOSE. Hệ thống ưu tiên cao về bảo mật với Firebase Security Rules chi tiết, đảm bảo chống hack và phân quyền chính xác.

Các yêu cầu được tổ chức theo module chức năng, dễ dàng theo dõi và triển khai. Mỗi yêu cầu đều có tiêu chí chấp nhận rõ ràng, có thể kiểm thử và xác minh.
