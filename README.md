# Quản lý trật tự xây dựng tỉnh Sơn La

Dự án cung cấp hai không gian trên cùng ứng dụng: người dân mở thẳng bản đồ công khai để tra cứu vị trí GPXD, trạng thái phản ánh và gửi phản ánh; cán bộ dùng tài khoản riêng để nhập GPXD và quản lý hồ sơ chi tiết.

Giao diện và quy trình được xây dựng theo cách sử dụng quen thuộc của phần mềm quản lý trật tự xây dựng phường Thảo Nguyên, mở rộng phạm vi tỉnh Sơn La và 75 xã, phường. Bản đầu độc lập, không sao chép tài khoản hoặc cơ sở dữ liệu cũ.

## Khởi động và tạo tài khoản quản lý

Yêu cầu Node.js 24 trở lên. Cài thư viện bằng `npm ci`; chạy `npm run build` rồi `npm start`, hoặc mở `MO_PHAN_MEM.command`. Trên máy này, truy cập `http://127.0.0.1:3100`. Trang bản đồ công dân không yêu cầu đăng nhập.

Để tạo tài khoản quản lý lần đầu, mở Terminal tại thư mục dự án và chạy:

```sh
npm run admin:create
```

Nhập mật khẩu ít nhất 12 ký tự hai lần. Khi dùng Terminal tương tác, ký tự mật khẩu không hiện trên màn hình. Tài khoản là `admin@qlxd`; phần mềm chỉ lưu bản băm scrypt, không lưu mật khẩu gốc. Lệnh này chỉ tạo tài khoản lần đầu và từ chối tạo trùng. Sau đó chọn **Đăng nhập quản lý** trên trang và nhập tài khoản/mật khẩu vừa đặt.

## Phạm vi bản đầu

- Bản đồ công khai hiển thị điểm GPXD và mã/trạng thái phản ánh. API công khai không trả tên/số điện thoại người gửi, nội dung chi tiết, tên chủ đầu tư hoặc địa chỉ đầy đủ.
- Người dân gửi phản ánh trực tiếp trên bản đồ, chọn điểm và xã/phường, nhận mã tiếp nhận. Cơ quan chuyên môn có thể xem nội dung và thông tin liên hệ trong không gian quản lý.
- Tài khoản quản lý nhập GPXD, xem hồ sơ chi tiết và theo dõi các phản ánh đã nhận.
- 75 ranh giới có nguồn và mã SHA-256 ở `geodata/provenance.json`; ranh giới tham khảo, chưa được xác nhận pháp lý. Nền mặc định là Google Hybrid, có lựa chọn Esri và OpenStreetMap.

## Dữ liệu và giới hạn triển khai

Hồ sơ lưu trong `data/ttxd.sqlite`, nội dung được mã hóa AES-256-GCM bằng `data/secret.key`; tài khoản và phiên lưu ở dạng băm/token băm. Hãy sao lưu cùng lúc SQLite và khóa mã hóa; mất khóa thì không đọc lại được hồ sơ. Thư mục `data/` đã được loại khỏi Git.

Phần mềm hỗ trợ hai kho lưu: SQLite cho máy cá nhân và Supabase cho Vercel. Trên Vercel bắt buộc chọn Supabase, thiếu cấu hình thì phần mềm từ chối truy cập dữ liệu, không tự chuyển sang ổ tạm. Các bảng Supabase chỉ cho máy chủ truy cập; API công khai chỉ trả trường đã lọc. Hướng dẫn triển khai và chuyển dữ liệu tại [docs/SUPABASE_DEPLOYMENT.md](./docs/SUPABASE_DEPLOYMENT.md). Việc hỗ trợ cloud trong mã nguồn chưa chứng minh đã chuyển dữ liệu hoặc triển khai online thành công.

`npm run verify` chạy typecheck, lint, unit test và build. `npm run test:e2e` kiểm thử trên cổng ngẫu nhiên và cơ sở dữ liệu tạm, không sửa dữ liệu thật. Xem hướng dẫn tại [HUONG_DAN_SU_DUNG.md](./HUONG_DAN_SU_DUNG.md), kế hoạch tại [KE_HOACH_TRIEN_KHAI.md](./KE_HOACH_TRIEN_KHAI.md), và rà soát tại [docs/SECURITY_REVIEW.md](./docs/SECURITY_REVIEW.md).
