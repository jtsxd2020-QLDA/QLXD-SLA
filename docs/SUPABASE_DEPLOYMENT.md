# Chuyển dữ liệu và triển khai QLXD-SLA

## Thiết kế

Supabase dùng các bảng riêng `ttxd_permits`, `ttxd_reports`, `ttxd_admin_users`, `ttxd_admin_sessions`, `ttxd_rate_limits`, `ttxd_communes`. Mọi bảng bật RLS, không cấp quyền cho `anon` hoặc `authenticated`; chỉ backend dùng khóa máy chủ. Người dân truy cập qua API ứng dụng đã lọc dữ liệu. Đây là tài khoản quản lý của ứng dụng với hash scrypt, không phải tài khoản Supabase Auth.

Hồ sơ giữ định dạng AES-256-GCM hiện có. Chuyển nguyên ciphertext và hash mật khẩu, giữ khóa mã hóa hiện tại. Không chuyển phiên đăng nhập cũ. Dữ liệu ranh giới giữ nguồn và nhãn tham khảo, không được coi là địa giới pháp lý đã duyệt.

## Chuẩn bị và chuyển

1. Tạo dự án Supabase riêng trong tài khoản đúng; người dùng tự nhập mật khẩu cơ sở dữ liệu.
2. Áp dụng lần lượt các migration trong `supabase/migrations/` theo thứ tự thời gian trên đúng dự án riêng. Bản đã vận hành cần bổ sung migration `20261030080804_account_commune_rbac.sql` trước khi triển khai mã phân quyền mới; không chạy lại việc chuyển dữ liệu ban đầu nếu đã hoàn thành.
3. Sao lưu nhất quán SQLite và `secret.key`; xuất các hàng mã hóa vào `data/cloud-transfer.json` (đã loại khỏi Git).
4. Tạo `.env.cloud.local` riêng, quyền đọc 600, gồm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `TTXD_ENCRYPTION_KEY`, `TTXD_STORAGE_BACKEND=supabase`, `TTXD_MIGRATION_PROJECT_REF` và `TTXD_PUBLIC_ORIGIN`. Không đưa tệp này lên GitHub. Khóa mã hóa là base64 của đúng `data/secret.key` đang dùng, không tạo khóa thay thế.
5. Chạy `npm run data:migrate`. Công cụ kiểm tra đúng project ref, xác minh từng hàng và từ chối ghi đè hàng khác nội dung. Sau khi chuyển vẫn giữ bản sao tại máy.

## Vercel

Thiết lập các biến máy chủ `TTXD_STORAGE_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TTXD_ENCRYPTION_KEY`, `TTXD_PUBLIC_ORIGIN=https://qlxd-sla.vercel.app`. Không đặt tiền tố `NEXT_PUBLIC_` cho bất kỳ khóa bí mật nào. Biến anon chỉ dùng kiểm thử cục bộ, không cần đưa lên Vercel.

Chỉ cập nhật nhánh main khi schema, dữ liệu và cấu hình hosting đã sẵn sàng. Xác nhận commit GitHub, deployment Vercel tương ứng và thử URL thực tế. `npm run cloud:verify` kiểm tra trực tiếp quyền anon, giới hạn đồng thời, phiên qua nhiều tiến trình, API công khai/quản lý, CSRF, logout và dữ liệu sau deploy. Bộ kiểm tra dùng phiên QA tạm, không thay mật khẩu quản lý hoặc thêm hồ sơ nghiệp vụ.

## Giới hạn

Ứng dụng có tài khoản cấp tỉnh và tài khoản cán bộ xã/phường được giao đúng một địa bàn; cấp tỉnh tạo và phân quyền tại màn hình quản lý tài khoản. Phải áp dụng migration phân quyền trước khi phát hành. Lưu trữ cloud và mã hóa không thay thế kiểm thử tải, quy trình sao lưu/khôi phục, giám sát và xác minh ranh giới. Bản đồ công khai hiện giải mã toàn bộ danh sách ở backend mỗi lần tải, cần phân trang/truy vấn theo phạm vi khi tăng dữ liệu.
