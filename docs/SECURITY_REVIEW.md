# Rà soát bảo mật — cổng công dân và tài khoản quản lý

Cập nhật: 13/10/2026. Phạm vi: cổng bản đồ công dân, API gửi phản ánh, tài khoản quản trị `admin@qlxd`, API nghiệp vụ và SQLite mã hóa. Đây là bản đầu chạy trên một máy, chưa xác nhận để vận hành công khai trên Internet.

> **Tình trạng mã nguồn ngày 30/10/2026:** các mục kiểm tra cũ bên dưới là ghi nhận lịch sử của bản trước. Nhánh `feat/provincial-readonly-routing` hiện bổ sung tài khoản tỉnh/xã, quyền xem toàn tỉnh ở chế độ chỉ đọc, ẩn thông tin liên hệ phản ánh ngoài địa bàn, và kiểm tra quyền trên API ghi. Kiểm thử hồi quy và trình duyệt cho nhánh mới đang được hoàn tất; chưa áp dụng migration lên Supabase hoặc triển khai Vercel trong lần cập nhật này.

## Kiểm tra đã xác nhận

- Người dân được đọc API bản đồ và gửi phản ánh mà không đăng nhập. Dữ liệu công khai chỉ gồm loại hồ sơ, số GPXD/mã phản ánh, mã xã/phường, vị trí và trạng thái. API không trả tên/số điện thoại người gửi, nội dung phản ánh, địa chỉ đầy đủ hoặc thông tin chủ đầu tư.
- Nội dung phản ánh công khai vẫn được kiểm tra Zod, giới hạn kích thước, xác minh tọa độ bằng đa giác đầy đủ của xã/phường, kiểm tra Origin/Host và giới hạn tần suất cơ bản. Phản hồi gửi thành công chỉ trả mã tra cứu và thời điểm nhận.
- Tài khoản quản lý được tạo trên máy bằng `npm run admin:create`. Mật khẩu tối thiểu 12 ký tự, nhập ẩn trong Terminal, băm scrypt với salt ngẫu nhiên; lệnh từ chối tạo trùng. Không có mật khẩu mặc định trong mã nguồn.
- API GPXD, dữ liệu đầy đủ và phản ánh chi tiết yêu cầu phiên quản trị. Cookie phiên HttpOnly, SameSite=Strict, thêm Secure khi dùng HTTPS; phiên 8 giờ, token phiên được băm trong SQLite và thao tác thay đổi cần CSRF.
- Toàn bộ nội dung GPXD/phản ánh được mã hóa AES-256-GCM. Kiểm thử xác nhận bản ghi và mật khẩu quản trị mẫu không xuất hiện dạng rõ trong SQLite. Mất khóa mã hóa khiến dữ liệu không đọc được; ứng dụng từ chối tự tạo khóa thay thế nếu cơ sở dữ liệu đã có.
- Thư mục dữ liệu có quyền 0700, khóa và SQLite 0600. Git bỏ qua `data/`, `.env*` và bằng chứng kiểm thử.

## Kiểm thử

`npm run verify` đạt: TypeScript, ESLint, 22/22 unit/security tests và production build. `npm run test:e2e` đạt 12 nhóm trên cơ sở dữ liệu tạm: phân biệt quyền công khai/quản lý, kiểm tra Host/Origin/CSRF, đăng nhập, tạo GPXD từ giao diện, gửi phản ánh công khai bằng cách chọn điểm trên bản đồ, mã hóa dữ liệu, đăng xuất và tải marker trên bản đồ. Kết quả hiện hành ở `docs/TEST_REPORT.md` và `test-results/e2e-result.json`.

## Giới hạn còn lại

- Chỉ có một tài khoản quản trị `admin@qlxd`; chưa có tài khoản cán bộ riêng, phân quyền tỉnh/xã, MFA, nhật ký chống sửa hoặc tự đặt lại mật khẩu.
- `npm start` mặc định lắng nghe tại `127.0.0.1`. Nếu cần tên miền khác, phải cấu hình `TTXD_PUBLIC_ORIGIN`; SQLite và giới hạn tần suất trong bộ nhớ hiện không phù hợp triển khai nhiều máy chủ/Internet. Header IP chỉ đáng tin khi được proxy biên cấu hình và ghi đè đúng.
- Giới hạn phản ánh công khai hiện chạy trong bộ nhớ từng tiến trình (5 lượt/15 phút theo header IP và 50 lượt/giờ toàn tiến trình), không thay thế CAPTCHA/WAF hoặc hệ thống chống spam. Chưa có kiểm thử tải/xâm nhập độc lập.
- Công khai mã GPXD, mã phản ánh, trạng thái và tọa độ công trình theo phạm vi bản đầu; cần cơ quan vận hành duyệt danh mục trường và vị trí trước khi mở Internet. Nội dung và thông tin liên hệ phản ánh chỉ thuộc không gian quản lý.
- Trước khi mở Internet cần kho dữ liệu bền vững dùng chung, HTTPS, giới hạn tần suất theo IP đáng tin, giám sát, sao lưu/khôi phục, kiểm thử đa người dùng và rà soát quy định xử lý dữ liệu cá nhân.
- Chính sách CSP hiện còn `'unsafe-inline'` do khung Next.js. Chưa thực hiện hardening nonce, khôi phục dữ liệu hoặc phê duyệt pháp lý ranh giới 75 xã/phường; ranh giới là dữ liệu tham khảo.

## Mã hóa và bản đồ nền

Khóa AES nằm cạnh cơ sở dữ liệu trong thư mục riêng của máy. Người có quyền hệ điều hành đọc cả khóa và SQLite có thể giải mã; hãy giới hạn quyền máy và sao lưu cả hai. Bản đồ gửi yêu cầu tile, IP và vùng bản đồ đang xem tới nhà cung cấp; không gửi nội dung hồ sơ cho nhà cung cấp bản đồ. Google Hybrid, Esri và OSM còn phụ thuộc kết nối/mức zoom và điều khoản của nguồn.

## Backend Supabase — rà soát 13/10/2026

Giữ ciphertext AES-GCM và hash scrypt hiện có. Các API đã await xác thực và thao tác dữ liệu; cloud thiếu khóa/cấu hình không dùng SQLite thay thế. Migration bật RLS và thu hồi quyền anon/authenticated cho sáu bảng, RPC rate limit chỉ cho service_role. Giới hạn đăng nhập, gửi phản ánh và đọc bản đồ dùng bộ đếm SQL nguyên tử theo IP khi chạy cloud. Tên miền canonical/deployment kiểm tra chính xác. Khóa máy chủ không được đưa vào biến NEXT_PUBLIC.

Agent rà soát mã không phát hiện đường bỏ qua xác thực/CSRF trong phạm vi đã đọc. Quyền anon thực tế, bộ đếm đồng thời, phiên qua nhiều tiến trình và API production vẫn phải kiểm chứng sau khi tạo dự án, chuyển dữ liệu và triển khai. Giới hạn phiên quản lý còn ở bộ nhớ mỗi máy chủ; API bản đồ đọc toàn bộ ciphertext; chưa có phân quyền cán bộ theo xã/phường.

## Xác minh live — 13/10/2026

Supabase riêng và Vercel production đã qua kiểm tra anon SELECT/INSERT/RPC bị từ chối; bộ đếm SQL nguyên tử; phiên qua tiến trình mới; private API 401; CSRF 403; logout hủy phiên; công khai chỉ trả tám trường map; giữ nguyên ciphertext và hash/salt gốc. Kiểm thử tạo hồ sơ qua giao diện online dùng dữ liệu QA tạm và đã dọn. Các giới hạn phân quyền địa bàn, quy trình sao lưu/khôi phục và tải lớn nêu trên vẫn còn.
