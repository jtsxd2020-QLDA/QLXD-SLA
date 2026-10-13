# Báo cáo kiểm thử — 10/10/2026

Phạm vi kiểm tra: trình duyệt → API → SQLite → trả dữ liệu → bảng/bản đồ. Dùng dữ liệu tổng hợp và thư mục SQLite tạm, không thêm hồ sơ vào vùng lưu dữ liệu sử dụng thật.

## Đã chạy

- `npm run typecheck`, `npm run lint`: đạt sau tích hợp và sửa tương thích MapLibre 6.
- `npm run test`: 16/16 đạt. Bao gồm đa giác có lỗ và biên, MultiPolygon, 75 mã duy nhất khớp GeoJSON, kiểm tra ngày/số/địa bàn, Host/Origin/CSRF, JSON lỗi/quá lớn, phiên/đăng xuất, trùng GPXD, mã hóa toàn bộ hồ sơ, đọc lại ở tiến trình mới, mất khóa từ chối và không tạo khóa thay thế.
- Bản build production được tạo thành công bởi agent tích hợp.
- Kiểm thử HTTP thực tế xác nhận: chưa đăng nhập 401, Host/Origin/cross-site 403, thiếu/sai CSRF 403, JSON lỗi 400, sai Content-Type 415, quá lớn 413, lỗi dữ liệu 422, trùng giấy phép 409; yêu cầu bị từ chối không tăng số hồ sơ. Các URL /data/access-code.txt, /data/secret.key, /data/ttxd.sqlite trả 404, không phục vụ mã truy cập/khóa/SQLite qua web.
- Trình duyệt đã thao tác nhập GPXD và phản ánh bằng bấm bản đồ, giữ dữ liệu biểu mẫu khi chọn vị trí, lưu thành công 201, tải lại và thấy cả hai hồ sơ, màn hình 390px không tràn ngang, đọc file SQLite không thấy nội dung rõ, đăng xuất làm phiên hết hiệu lực.

## Lỗi đã sửa và xác nhận lại

Đã phát hiện MapLibre 6 không tải worker mặc định qua Next.js. Đã sửa bằng worker ESM tại máy và thử lại trên bản build mới; chờ `data-boundaries-rendered=true` chỉ được bật khi `queryRenderedFeatures` có ranh giới. Đã sửa thêm lỗi canvas chỉ cao 360px trong khung lớn bằng bố cục và ResizeObserver. Kiểm tra kích thước DOM xác nhận canvas, vỏ và khung bản đồ khớp nhau trong sai số 1px: desktop 530px, mobile 500px. Đã kiểm tra ảnh thực tế thấy đủ hình tỉnh và đường chia địa bàn, hai marker GPXD/phản ánh có màu riêng, bấm marker mở thông tin hồ sơ.

Chạy cuối `npm run test:e2e`: **13/13 nhóm kiểm tra đạt**, bao gồm xác nhận renderer ranh giới và hai marker trong vùng bản đồ. Không có `pageerror`, lỗi worker hoặc CSP. Sau sửa đã xem trực tiếp ảnh desktop bản đồ toàn tỉnh, desktop chi tiết hồ sơ và mobile, cùng biểu mẫu mobile.

Dịch vụ tile OpenStreetMap trả lỗi kết nối trong môi trường kiểm thử. Ứng dụng hiển thị “Chưa tải được bản đồ nền. Ranh giới và hồ sơ tại máy vẫn sử dụng được.” Ranh giới, thao tác bấm điểm, lưu và xem hồ sơ vẫn hoạt động. Chưa xác nhận tải nền bản đồ bên ngoài thành công; không đánh đồng lỗi tile mạng với dữ liệu ranh giới tại máy.

## Bằng chứng

`scripts/e2e.ts` tự mở máy chủ production tại 127.0.0.1:3100, dùng thư mục dữ liệu tạm và đóng máy chủ sau thử nghiệm. Ảnh nằm tại `test-results/`; đây là ảnh dữ liệu tổng hợp, được loại khỏi Git. `e2e-result.json` ghi kết quả từng nhóm kiểm tra. Chạy lại cần bản build mới và Chromium tương thích (`npx playwright install chromium`).

Giới hạn: chưa triển khai production, thử nghiệm đa người dùng cấp tỉnh, phân quyền xã/phường, khôi phục bản sao lưu hoặc kiểm thử xâm nhập độc lập.

## Cập nhật bản đồ nền — 11/10/2026

TypeScript, lint và build đạt. Unit/API/security tests **22/22 đạt**; E2E trên bản build sau chỉnh giao diện **15/15 nhóm đạt**, dùng SQLite tạm riêng. Đã nhập GPXD/ghi phản ánh qua bấm bản đồ, lưu 201, tải lại thấy đủ hồ sơ; chuyển đường phố/vệ tinh giữ tọa độ chọn và cả hai marker, bật/tắt ranh giới giữ trạng thái qua đổi nền, mobile 390px không tràn ngang. Không có pageerror hoặc lỗi CSP/worker. Đã xem ảnh desktop toàn tỉnh, vệ tinh với điểm chọn và mobile.

Esri World Imagery trả HTTP 200, ảnh vệ tinh tải được thực tế và đã nhìn thấy trên ảnh trình duyệt; nền vệ tinh được đặt mặc định. OpenStreetMap vẫn báo ERR_NAME_NOT_RESOLVED trong môi trường kiểm thử. Google chưa có khóa API nên các nút Google chưa bật; phiên, tile URL và viewport attribution Google chỉ được kiểm thử với phản hồi giả/khóa giả, chưa xác minh tải Google thật. Hai vấn đề rà soát (listener bản quyền khi đổi nền lỗi và khoảng trống logo) đã được sửa trước khi build cuối.

Bằng chứng mới: test-results/01-map-empty-desktop.png, 05-map-satellite-desktop.png, 03-map-mobile.png và e2e-result.json. Hướng dẫn cấu hình Google và giới hạn sử dụng: docs/BAN_DO_NEN.md. Đây vẫn là bản local, chưa phải triển khai đa người dùng cấp tỉnh.

## Điều khiển gọn, tên đường/địa danh và Escape — 11/10/2026

Build, TypeScript và lint đạt; unit/API/security 22/22 đạt, E2E bản build cuối 21/21 nhóm đạt với dữ liệu SQLite tạm. Bộ chọn nền mặc định thu gọn, đóng bằng X/Esc/bấm ngoài; hai nguồn tham chiếu đường và địa danh tải tile thực tế trên nền vệ tinh, bật/tắt không làm mất điểm chọn hoặc marker hồ sơ. Ảnh khu vực Sơn La: test-results/06-map-place-roads.png. Nhãn theo nguồn Esri, phục vụ tham chiếu và có thể dùng địa danh hành chính cũ; trạng thái tải xác nhận mỗi nguồn đã tải ít nhất một tile, không xác nhận toàn bộ tile trong khung nhìn.

Đã sửa và kiểm tra lại lỗi Escape khi chọn vị trí đóng luôn biểu mẫu vừa mở lại: nay Escape quay lại biểu mẫu và giữ nội dung GPXD chưa lưu. Escape đóng bảng lớp trước, giữ điểm chọn; X hoặc Escape tiếp theo bỏ chọn điểm. Escape đóng chi tiết không xóa hồ sơ. Đã sửa chồng lớp để bảng chi tiết không chặn bộ chọn nền trên mobile 390px. Kiểm thử nhập GPXD/phản ánh lưu 201, tải lại đủ hai hồ sơ, không tràn ngang, không pageerror, dữ liệu SQLite mã hóa và đăng xuất vô hiệu phiên đều đạt.

## Google Hybrid giống bản phường Thảo Nguyên — 11/10/2026

Nền mặc định đổi sang Google Hybrid, cùng nguồn `lyrs=y` với bản tham khảo và ngôn ngữ tiếng Việt. Build/TypeScript, lint, unit/API/security 22/22 và E2E 22/22 nhóm đạt. Kiểm tra tile Google thực tế trả thành công và ảnh test-results/07-google-hybrid-thao-nguyen.png thấy tên/biểu tượng vườn mận, vườn hồng, La Ann MocChau, đường 104. POI phụ thuộc dữ liệu/mức zoom Google, không xác nhận mọi địa điểm đều có tên. Hai lựa chọn Google API chưa được xác minh với khóa thật.

Đổi Google Hybrid/Esri/đường phố giữ vị trí chọn, marker GPXD/phản ánh và ranh giới; nhập/lưu 201/tải lại đủ hồ sơ, X/Escape, mobile390, không pageerror và mã hóa SQLite đều đạt trên dữ liệu thử riêng. Nền này là endpoint tile tương thích bản cũ, không phải Map Tiles API chính thức.

## Hai chế độ người dân và quản lý — 13/10/2026

Trang chính mở trực tiếp cổng bản đồ công dân; khu vực GPXD và hồ sơ đầy đủ yêu cầu tài khoản quản lý `admin@qlxd`. Lệnh `npm run admin:create` tạo tài khoản đầu tiên, nhập mật khẩu ẩn và lưu hash scrypt. Phản ánh công khai trả mã nhận hồ sơ nhưng không trả nội dung hoặc thông tin liên hệ. Bản nháp phản ánh được giữ khi đóng biểu mẫu để chọn điểm trên bản đồ.

`npm run verify` đạt: typecheck, lint, 22/22 unit/security tests và production build. `npm run test:e2e` đạt 12 nhóm trên SQLite tạm và cổng ngẫu nhiên: phân biệt quyền công khai/quản lý, kiểm tra Host/Origin/CSRF, đăng nhập, tạo GPXD qua giao diện, gửi phản ánh công khai sau khi chọn điểm trên bản đồ, kiểm tra marker, mã hóa dữ liệu và đăng xuất. Lệnh `npm run admin:create` cũng chạy thành công qua Terminal tương tác với thư mục tạm; mật khẩu nhập ẩn và thư mục kiểm thử đã được xóa.

Đây vẫn là bản cục bộ một máy: `npm start` chỉ lắng nghe tại `127.0.0.1`, chưa có URL Internet cho người dân, cơ sở dữ liệu dùng chung, CAPTCHA/WAF, nhiều tài khoản quản lý hoặc khôi phục mật khẩu. Xem giới hạn tại `docs/SECURITY_REVIEW.md`.

## Backend cloud — 13/10/2026

Typecheck, lint, 25 unit tests, build và 12 nhóm E2E local đã đạt sau khi chuyển API sang lớp lưu trữ bất đồng bộ. Kiểm thử bổ sung: Vercel bắt buộc kho Supabase, thiếu cấu hình không tạo SQLite, đọc đúng định dạng mã hóa cũ và từ chối sai khóa, kiểm tra chính xác tên miền production/deployment.

Chưa thực hiện migration hoặc kiểm thử quyền trên Supabase thật; đang chờ người dùng hoàn tất tạo dự án riêng. Script `cloud:verify` được chuẩn bị nhưng chưa chạy live. Không suy diễn kiểm thử local thành triển khai online thành công.

## Supabase thật — 13/10/2026

Dự án riêng `ghyurzhocmvxuyqyerfv`: đối chiếu từng ciphertext, salt/hash tài khoản và 75 geometry/provenance thành công. Cả sáu bảng từ chối anon SELECT/INSERT; RPC bị từ chối. 20 yêu cầu đồng thời với ngưỡng 3 chỉ nhận đúng 3, yêu cầu kế tiếp tiếp tục bị từ chối. Phiên cloud đọc được qua tiến trình khác và bị vô hiệu sau xóa phiên QA. Giữ nguyên dữ liệu local và bản sao lưu. API production vẫn chờ triển khai mới để kiểm tra.
