# Kiểm chứng độc lập nâng cấp

Phạm vi: mã nguồn local và dữ liệu QA riêng, chưa phải xác nhận bản production.

## Đã xác minh

- 8 ca kiểm thử độc lập `tests/upgrade-qa.test.ts` đạt: ngày cấp và ngày nhập riêng; sát đầu tháng giờ Việt Nam; nguồn real/demo/unknown; hoàn tất nhiều lần và số hồ sơ duy nhất; sự kiện hoàn tất hồ sơ nhận trước kỳ; chọn kết quả gần nhất trước khi lọc kết quả; tổng địa bàn khớp tỉnh; bộ dữ liệu rỗng; tệp Excel mở lại được, không có ô formula do nội dung =/+/-/@.
- Kiểu dữ liệu toàn dự án và lint các tệp QA đạt sau sửa kiểu Buffer dùng bởi ExcelJS.
- Kỳ vọng tính thủ công được lưu riêng tại `UPGRADE_EXPECTED_2026-10-14.md`.

## Lỗi phát hiện và được bên lập trình sửa

1. Form gửi cả `category` và `constructionType` vào schema strict; thiếu chuỗi trường tùy chọn mặc định: đã thay bằng whitelist theo loại hồ sơ và mặc định đầy đủ.
2. Nút danh sách chưa hoàn tất gửi `status=pending` chưa được backend chấp nhận: backend đã bổ sung filter received/processing.
3. Capture báo cáo ban đầu đọc hai nhóm riêng: backend đã thay bằng giao dịch SQLite/RPC Postgres statement snapshot trước khi lưu bản chụp.

## Kiểm thử thao tác đã chạy

- `scripts/e2e-upgrade.ts`: 13 nhóm PASS trên build cuối; runner ép SQLite tạm, không dùng dữ liệu production. Quyền ẩn danh/CSRF; ghi đồng thời và replay cùng mã gửi; xung đột phiên bản; điều kiện hoàn tất/mở lại; kiểm tra có căn cứ và liên kết GPXD; bộ lọc pending; snapshot + tải Excel/PDF qua API; PDF trích được tiếng Việt và không có liên hệ riêng.
- Điện thoại 360/390/430 px: PASS quyền định vị bị từ chối, timeout và cảnh báo sai số 250 m; Esc thoát toàn màn hình; chọn điểm phải xác nhận; giữ địa chỉ/nội dung khi chọn bản đồ/đổi bước; mạng lỗi vẫn giữ nháp và mã gửi lại không đổi; khôi phục sau tải lại khi chủ động bật lưu nháp; không cuộn ngang và không lỗi JavaScript.
- Kiểm tra đồng hồ giả trước tải trang: nháp đang mở có bật lưu và nháp đã đóng chỉ giữ trong bộ nhớ đều hết hạn sau 2 giờ + 1 ms; tên/số điện thoại/nội dung/tọa độ/địa bàn được xóa, bước trở về vị trí, không còn PII trong sessionStorage; chọn lại chính điểm cũ vẫn dùng được.
- `scripts/e2e.ts`: 12 nhóm regression PASS, gồm API công khai/riêng, Host/Origin, admin login/CSRF, GPXD mới và duplicate, 3 bước biểu mẫu, marker, logout, dữ liệu mã hóa.
- Ảnh điện thoại 360/430 được xem trực tiếp: bước kiểm tra, nút gửi/quay lại, nháp khôi phục và thông báo hiển thị rõ; không cắt ngang. Bằng chứng local: `test-results/upgrade`.

## Render PDF và báo cáo

Render PNG trang đầu phát hiện nhãn biểu đồ từ tháng thứ hai bị nhạt do kế thừa màu fill của thanh biểu đồ. Điều phối đã sửa reset màu trước mỗi nhãn. Đã tạo lại PDF rỗng có 12 tháng và xem PNG: toàn bộ nhãn đọc rõ. Trang phụ lục chi tiết đọc được tiếng Việt, không cắt cột và không chứa liên hệ riêng. Ảnh báo cáo điện thoại 390 px có bộ lọc, thẻ, bảng và danh sách chưa hoàn tất rõ; bảng chi tiết cuộn bên trong, không làm trang tràn ngang. Báo cáo 360/390/430 px và tải Excel từ giao diện đều PASS.

## Giới hạn

Không đọc khóa, mật khẩu hoặc dữ liệu thật; không sửa cloud và không triển khai. Xác nhận production/schema/RLS/migration và kiểm tra dữ liệu cũ thuộc bước nghiệm thu điều phối.
