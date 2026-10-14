# TTXD tỉnh Sơn La — bản đầu chạy tại máy

Phạm vi: giao diện tỉnh, nhập GPXD, ghi phản ánh tại vị trí bản đồ, lưu thật tại máy. Không kết nối hoặc sửa dữ liệu dự án nguồn. Không có dữ liệu nghiệp vụ mẫu mặc định.

Nền giao diện tham khảo: `../QUAN LY TRAT TU XAY DUNG/ttxd-sonla` (sidebar xanh #1D3A6E, bảng, biểu mẫu và MapLibre). Khung mới tại thư mục này nhằm có bản đầu độc lập, không thừa kế auth demo hoặc khóa dự án cũ.

Stack hiện tại: Next.js 16.4.0/React 19.3.0, MapLibre 6.13.0, Node 24 SQLite. Thư viện nâng lên bản khắc phục cảnh báo audit trước nghiệm thu. Đọc tài liệu Next.js có sẵn hoặc tài liệu chính thức trước khi sửa API framework. Bản đầu có cổng bản đồ và gửi phản ánh công khai cùng không gian quản lý yêu cầu tài khoản; dữ liệu/khóa trong data/ (bỏ qua Git). Đây chưa phải hệ thống vận hành đa người dùng cấp tỉnh.

Phân công: root quản lý khung, types, geodata, bản đồ, tích hợp; agent UI sở hữu components/Workspace.tsx, components/RecordForm.tsx, app/globals.css; agent dữ liệu sở hữu lib/store.ts, lib/security.ts, lib/validation.ts, app/api/**; agent QA sở hữu tests/**, scripts/e2e.ts và docs/SECURITY_REVIEW.md. Trao đổi trước khi sửa file của nhau.

Không thay đổi types/API contract đơn phương. Dùng SQL tham số hóa, kiểm tra Origin/Host và phiên đăng nhập, không trả PII trên map hoặc API công khai. Không ghi plaintext PII vào log. Dữ liệu ranh giới tham khảo phải có nguồn và nhãn chưa xác nhận pháp lý. Không gán xã theo khoảng cách centroid.

Toàn bộ payload nghiệp vụ SQLite mã hóa AES-GCM version1; không có fallback plaintext. Khóa trùng GPXD là hash số/cơ quan/năm. Không tự sinh secret.key khi SQLite đã tồn tại mà thiếu khóa. `TTXD_DATA_DIR` cho kiểm thử riêng; cổng API bảo vệ cố định 3100. Nguồn geo bản gốc giữ ở geodata/, hình học đầy đủ đã chuẩn hóa dùng kiểm tra server, public/data bản đơn giản hóa dùng hiển thị/gợi ý. Phải giữ ghi chú sửa hình học xã Mường Bám và trạng thái tham khảo.

Kiểm tra: typecheck, lint, unit/API security, build, trình duyệt thao tác GPXD và phản ánh, tải lại còn dữ liệu; mobile và sơ đồ ranh giới. Sau sửa lỗi chạy lại các kiểm tra liên quan. Báo cáo đúng phạm vi local và giới hạn.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
