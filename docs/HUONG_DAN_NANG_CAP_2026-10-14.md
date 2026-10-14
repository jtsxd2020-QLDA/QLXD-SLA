# Sử dụng chức năng nâng cấp QLXD-SLA

## Người dân: chọn vị trí và gửi phản ánh

1. Mở bản đồ và chọn xã/phường, hoặc bấm **Tìm vị trí** để tìm địa bàn/nhập tọa độ.
2. Khi đang ở hiện trường, có thể bấm **Vị trí của tôi**. Chỉ cho phép định vị nếu muốn dùng; kiểm tra sai số và điều chỉnh ghim nếu cần.
3. Bấm vào bản đồ hoặc kéo ghim, kiểm tra tên địa bàn, rồi chọn **Dùng điểm này**. Vị trí thiết bị không tự được coi là vị trí công trình.
4. Bấm **Gửi phản ánh**. Biểu mẫu gồm Vị trí → Nội dung → Kiểm tra và gửi. Thông tin liên hệ không bắt buộc.
5. Sau khi gửi, giữ mã tiếp nhận. Nếu lỗi mạng, dùng **Gửi lại** với nội dung đang giữ; không cần nhập lại.

Có thể chọn lưu nháp trong phiên thiết bị. Nháp hết hạn sau hai giờ không sửa nội dung; có nút xóa và tự xóa sau gửi thành công. Không bật lưu nháp khi dùng thiết bị chung. Chọn bản đồ toàn màn hình để đặt điểm dễ hơn; Esc đóng công cụ/chế độ chọn.

## Cán bộ: nhập giấy phép, xử lý và kiểm tra

- Chọn **Đăng nhập quản lý**, dùng tài khoản và mật khẩu đã được thiết lập.
- **Nhập GPXD** dùng biểu mẫu ba bước tương tự; tọa độ chi tiết nằm trong phần có thể mở rộng.
- Mở phản ánh từ danh sách hoặc bản đồ, chọn **Cập nhật trạng thái**. Đã giải quyết phải có kết quả; mở lại phải có lý do. Lịch sử cũ được giữ.
- Chọn hồ sơ GPXD để **Ghi kết quả kiểm tra** và so sánh với giấy phép. Chỉ đánh dấu đã xác minh khi có căn cứ. Công trình chưa có hồ sơ có thể ghi kiểm tra độc lập với mã công trình/vị trí.
- “Chưa xuất trình GPXD” chưa phải kết luận xây dựng không phép. Không có kết quả kiểm tra không có nghĩa công trình đúng phép.
- Kiểm tra gắn hồ sơ mẫu/chưa xác định nguồn kế thừa nguồn đó, không tự trở thành số liệu thực tế.

## Báo cáo điều hành và xuất tệp

1. Mở **Báo cáo điều hành**.
2. Chọn nhóm GPXD, Phản ánh hoặc Kiểm tra hiện trường; chọn kỳ ngày/tháng, địa bàn và nguồn dữ liệu. Các bộ lọc loại/trạng thái/kết quả xuất hiện theo nhóm phù hợp.
3. Bấm **Áp dụng**. Thẻ, biểu đồ, bảng địa bàn và danh sách nguồn cùng sử dụng bộ lọc này.
4. Bấm tháng/địa bàn/phân nhóm hoặc chỉ tiêu trạng thái để mở số liệu nguồn. **Danh sách chưa hoàn tất** gồm đã tiếp nhận và đang xử lý, theo kỳ tiếp nhận đang chọn.
5. Chọn **Xuất Excel** hoặc **Xuất PDF**. Tệp lấy đúng bản chụp số liệu đang xem; đổi bộ lọc cần Áp dụng lại trước khi xuất. Bản chụp hết hạn sau 30 phút: tạo lại báo cáo nếu được yêu cầu.

GPXD theo ngày cấp và GPXD theo ngày nhập là hai cách tính khác nhau. Phản ánh tiếp nhận tính theo ngày nhận; lượt hoàn tất tính theo ngày thay đổi trạng thái, có thể thuộc hồ sơ nhận trước kỳ. Tháng tính theo giờ Việt Nam.

**Nguồn dữ liệu:** mặc định báo cáo chỉ tính Thực tế. 25 hồ sơ minh họa được đối chiếu với bộ mẫu ban đầu và đánh dấu Minh họa. Hồ sơ cũ chưa xác định nguồn nằm ở Chưa xác định; chọn nguồn này hoặc Tất cả để đối soát. Không tự gán hồ sơ không rõ nguồn là số liệu thực tế. Hồ sơ tạo mới sau nâng cấp là Thực tế; các kết luận kiểm tra mẫu không được đưa vào báo cáo thực tế.

Không gọi số ngày từ tiếp nhận là số ngày quá hạn. Chưa đủ lịch sử thì không suy ra tồn cuối kỳ trong quá khứ. Báo cáo mặc định không xuất tên/số điện thoại người phản ánh hoặc nội dung riêng; ranh giới tiếp tục là tham khảo.

Mỗi báo cáo tối đa 10.000 hồ sơ nguồn; xuất tệp tối đa 5.000 dòng. Nếu vượt, hệ thống báo rõ, cần thu hẹp kỳ/địa bàn; không âm thầm cắt dữ liệu.
