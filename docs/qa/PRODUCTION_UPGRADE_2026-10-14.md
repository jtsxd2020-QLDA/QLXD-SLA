# Nghiệm thu trực tuyến bản nâng cấp QLXD-SLA

Kiểm tra ngày 14/10/2026 trên https://qlxd-sla.vercel.app, nhánh main của jtsxd2020-QLDA/QLXD-SLA. Bản mã ứng dụng được kiểm chứng: `32a58ab80c955bb2e6c320e5bb34043e7298e53d`; Vercel production Ready `dpl_CzDc8QinyyVriCQXKsEo6fCEUxSv`.

- Typecheck, lint, build, 43 kiểm thử đơn vị đạt. 13 nhóm nâng cấp và 12 nhóm hồi quy đạt. Hai kiểm tra đăng xuất thực tế ở 360/640 px đạt: nút 44 px, phiên bị thu hồi, nháp quản lý được xóa.
- Cloud backend: quyền ẩn danh vào bảng/RPC mới bị chặn; ghi đồng thời cùng mã gửi tạo đúng một hồ sơ; xung đột phiên bản không ghi đè; lịch sử trạng thái và nguồn kiểm tra được giữ. Kiểm tra dùng hồ sơ QA riêng, đã dọn đúng các ID QA.
- Production: ba nhóm báo cáo GPXD/phản ánh/kiểm tra theo kỳ và nguồn có hàng/chỉ tiêu khớp dữ liệu Supabase; tải cả sáu tệp Excel/PDF từ bản chụp thành công. API báo cáo và xuất tệp ẩn danh trả 401, cập nhật thiếu CSRF trả 403; đăng xuất thu hồi đúng phiên QA.
- Sáu tệp mở lại được. Excel không có ô công thức từ dữ liệu đầu vào. PDF hiển thị rõ; toàn bộ ô văn bản trong chi tiết Excel khớp chữ trích từ PDF. Phông Liberation Sans giữ chính xác dấu tiếng Việt và mã UUID; font/license đã có trong trace. Bộ fixture riêng 18 hàng/4 trang đạt với Poppler, PDF.js và kiểm tra ảnh trang đầu/cuối.
- Giao diện trực tuyến: báo cáo nguồn Minh họa có 10 phản ánh, phân loại 6 không phép/4 sai phép (đây là nội dung khai báo mẫu). Tìm nhanh phường Tô Hiệu cập nhật phạm vi và 7 hồ sơ. Biểu mẫu GPXD ba bước và đóng Esc hoạt động. Nút đăng xuất điện thoại đã thấy và dùng thành công.
- Bản đồ công khai trả đúng tám trường được cho phép. HTML và chín tệp JavaScript được kiểm tra không chứa các khóa máy chủ, khóa mã hóa hay hash/salt tài khoản quản lý.
- Supabase `ghyurzhocmvxuyqyerfv`: giữ 16 GPXD, 10 phản ánh, 0 kiểm tra có cấu trúc và tài khoản quản lý ban đầu. Đối chiếu bản sao lưu mã hóa xác nhận mọi trường nghiệp vụ cũ và hash/mật khẩu của tài khoản ban đầu giữ nguyên; chỉ bổ sung nguồn/phiên bản cho hồ sơ mẫu. Tài khoản QA đã xóa, phiên QA đã đăng xuất.

15 GPXD và 10 phản ánh mẫu được đánh dấu Minh họa; một GPXD cũ chưa rõ nguồn giữ Chưa xác định. Mặc định báo cáo là nguồn Thực tế. Bộ lọc GPXD theo ngày cấp trong năm 2026 có 15 hàng, khác tổng 16 hồ sơ đã lưu; dùng ngày nhập hoặc kỳ phù hợp để đối soát. Năm ghi chú sai phép trong mẫu cũ không tự trở thành kết luận kiểm tra đã xác minh.

Bằng chứng riêng (không đưa vào Git): `test-results/production-upgrade-result.json`, `production-file-validation.json`, `production-preservation.json`, `production-client-privacy.json`, sáu tệp xuất; `test-results/upgrade` chứa ảnh giao diện, fixture Unicode, đăng xuất và các kết quả QA. Sao lưu trước nâng cấp ở `data/backups/before-upgrade-2026-10-14` với quyền riêng tư.

Giới hạn: chưa nghiệm thu ranh giới pháp lý, phân quyền từng cán bộ/địa bàn, tải đồng thời cấp tỉnh hoặc chính sách lưu/khôi phục dài hạn. Đây là phạm vi bản nâng cấp được yêu cầu, không phải chứng nhận sẵn sàng mọi nghiệp vụ cấp tỉnh.
