# Phân quyền quản lý theo xã/phường

## Phạm vi

| Nghiệp vụ | Cấp tỉnh | Cán bộ xã/phường | Người chưa đăng nhập |
|---|---|---|---|
| Bản đồ công khai rút gọn | Toàn tỉnh | Địa bàn được giao trong phiên cán bộ | Toàn tỉnh, không có thông tin nội bộ |
| Hồ sơ GPXD, phản ánh và thông tin liên hệ nội bộ | Toàn tỉnh | Đúng một địa bàn được giao | Không |
| Nhập GPXD, ghi kiểm tra, cập nhật trạng thái | Toàn tỉnh | Địa bàn được giao | Chỉ gửi phản ánh công khai |
| Thùng rác và khôi phục hồ sơ | Toàn tỉnh | Hồ sơ của địa bàn được giao | Không |
| Báo cáo và xuất Excel/PDF | Toàn tỉnh | Theo địa bàn được giao và báo cáo của chính tài khoản | Không |
| Tạo, phân quyền, khóa tài khoản | Có | Không | Không |
| Dọn dữ liệu minh họa hàng loạt | Có | Không | Không |

Thông tin công khai rút gọn vẫn giữ nguyên theo lựa chọn của chủ ứng dụng. Người có thông tin xác thực xã vẫn có thể xem thông tin công khai như một người dân khi đăng xuất; điều này không cấp quyền xem hồ sơ nội bộ.

## Cơ chế thực thi

- `admin_users` lưu vai trò `province` hoặc `commune`, một mã địa bàn và trạng thái hoạt động. Phiên lưu liên kết tài khoản. Máy chủ tra quyền hiện tại khi xử lý mỗi yêu cầu.
- Chỉ tài khoản khởi tạo `admin@qlxd` kế thừa quyền tỉnh khi chuyển đổi. Các tài khoản cũ chưa có vai trò không được tự nâng quyền. Phiên cũ không có liên kết tài khoản bị từ chối.
- Danh sách, tìm kiếm, lịch sử kiểm tra, thùng rác được lọc trên máy chủ trước khi trả về. Không dựa riêng vào việc ẩn nút hoặc bộ lọc ở trình duyệt.
- Khi ghi, mã xã trong nội dung phải thuộc phạm vi tài khoản. Kiểm tra vị trí với ranh giới ở máy chủ vẫn giữ nguyên. Liên kết GPXD/phản ánh của kiểm tra được kiểm tra độc lập theo ID để chống ghép hồ sơ xã khác.
- Thay đổi trạng thái, xóa và khôi phục kiểm tra địa bàn của bản ghi đã lưu trước khi ghi. Nhật ký trạng thái và người xóa nhận email tài khoản thực hiện.
- Khóa tài khoản chặn phiên đang có. Đổi địa bàn áp dụng cho yêu cầu tiếp theo. Tệp báo cáo chụp trước đó phải có danh tính và địa bàn phù hợp mới được tải bởi tài khoản xã.
- Các bảng Supabase vẫn dành cho máy chủ, có RLS và không cấp truy cập trực tiếp cho `anon`/`authenticated`. Khóa máy chủ không được gửi cho trình duyệt. Đây là xác thực tài khoản ứng dụng riêng, không dùng JWT Supabase của cán bộ để tự động phân quyền bảng.

## Nâng cấp dữ liệu

SQLite thêm các cột phân quyền khi mở dữ liệu hiện có. Supabase cần áp dụng `supabase/migrations/20261030080804_account_commune_rbac.sql` trên đúng dự án QLXD-SLA trước khi triển khai mã mới. Không áp dụng trên dự án khác có tên tương tự. Migration giữ các hồ sơ nghiệp vụ và băm mật khẩu hiện có, không xuất hoặc thay khóa mã hóa.

Trình tự phát hành: sao lưu theo quy trình hiện có; kiểm tra đúng dự án; áp dụng migration; xác minh tài khoản khởi tạo và quyền bảng; triển khai mã đã kiểm thử; đăng nhập lại; thử bằng tài khoản tỉnh và các tài khoản xã riêng. Chỉ kết luận đã áp dụng lên trang thật khi có đủ bằng chứng của dữ liệu và bản triển khai.

## Kiểm chứng

`npm test` kiểm tra quy tắc quyền, chuyển đổi tài khoản cũ và phiên gắn tài khoản. Sau `npm run build`, chạy `node --import tsx scripts/e2e-rbac.ts` để kiểm thử HTTP và trình duyệt với hai địa bàn và cơ sở dữ liệu tạm độc lập. Không sử dụng tài khoản hoặc hồ sơ thật để kiểm thử xâm nhập chéo địa bàn.
