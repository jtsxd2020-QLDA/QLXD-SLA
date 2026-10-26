# Hướng dẫn sử dụng

## Người dân: xem bản đồ và gửi phản ánh

Mở `http://127.0.0.1:3100` khi phần mềm đang chạy. Trang mở thẳng bản đồ, không cần mã truy cập. Chọn xã/phường, tìm mã GPXD hoặc mã phản ánh, rồi bấm điểm trên bản đồ để xem trạng thái công khai.

Để phản ánh:

1. Bấm **Gửi phản ánh**.
2. Chọn nhóm, mô tả nội dung và địa chỉ. Tên, số điện thoại có thể để trống.
3. Bấm **Chọn trên bản đồ**, chạm đúng vị trí công trình; kiểm tra xã/phường được nhận diện.
4. Bấm **Gửi phản ánh** và lưu lại mã tiếp nhận hiện trên màn hình.

Thông tin liên hệ và nội dung đầy đủ được mã hóa trong hồ sơ quản lý. Bản đồ công khai chỉ hiện mã và trạng thái, không hiện thông tin cá nhân hay mô tả chi tiết.

## Cán bộ quản lý: tạo tài khoản

Tài khoản đầu tiên có tên `admin@qlxd`. Mở Terminal tại thư mục `Quan ly TTXD-tinh`, chạy:

```sh
npm run admin:create
```

Nhập mật khẩu ít nhất 12 ký tự hai lần; Terminal không hiện ký tự khi nhập. Lệnh tạo tài khoản một lần và lưu mật khẩu dưới dạng băm scrypt. Nếu báo tài khoản đã tồn tại, hãy dùng mật khẩu quản trị đã đặt. Mất mật khẩu hiện cần khôi phục thủ công trên máy lưu dữ liệu; chưa có chức năng tự đặt lại.

Sau khi tạo xong, tải lại trang, bấm **Đăng nhập quản lý**, nhập `admin@qlxd` cùng mật khẩu. Khu vực quản lý cho phép nhập GPXD và xem thông tin đầy đủ của phản ánh. Bấm **Đăng xuất** khi kết thúc; phiên tối đa 8 giờ.

## Nhập GPXD

1. Trong không gian quản lý, bấm **Nhập GPXD**.
2. Điền số giấy phép, ngày cấp, cơ quan cấp, chủ đầu tư, tên công trình, diện tích, số tầng và địa chỉ.
3. Bấm **Chọn vị trí trên bản đồ**, chạm vị trí công trình và kiểm tra xã/phường.
4. Bấm **Lưu hồ sơ**. Hồ sơ được lưu mã hóa và xuất hiện trên bản đồ quản lý; bản đồ người dân chỉ hiển thị thông tin rút gọn.

Ngày cấp không được ở tương lai; diện tích và số tầng phải hợp lệ. Số GPXD trùng năm và cơ quan cấp bị từ chối. Vị trí ngoài tỉnh hoặc không khớp địa bàn đã chọn sẽ không được lưu.

## Theo dõi việc kiểm tra thực địa

Trong tài khoản quản lý, mở **Giấy phép xây dựng** hoặc **Phản ánh người dân**. Cột **Kiểm tra thực địa** cho biết hồ sơ đã có bản ghi kiểm tra liên kết hay chưa, số lượt và ngày gần nhất. Bộ lọc **Kiểm tra thực địa** áp dụng cùng từ khóa tìm kiếm và địa bàn, giúp tìm hồ sơ đã ghi nhận hoặc chưa có bản ghi.

Trên **Bản đồ quản lý**, dấu **✓ màu xanh** cạnh ghim cho biết đã ghi nhận kiểm tra. Dấu **?** cho biết chưa có bản ghi liên kết. Màu chính của ghim vẫn thể hiện tình trạng thi công hoặc xử lý phản ánh. Khi dữ liệu đang tải hoặc tải lỗi, dấu hiệu và nhãn thể hiện trạng thái chưa xác minh, không suy ra chưa kiểm tra.

1. Chọn ghim hoặc bấm **Xem vị trí** trong danh sách.
2. Trong bảng chi tiết, mở **Xem lịch sử kiểm tra** để xem ngày, cán bộ, kết quả, căn cứ đối chiếu, ghi chú và nguồn dữ liệu của từng lần. Lần mới nhất xếp trước. Lịch sử dài có thể cuộn và thu gọn.
3. Bấm **Ghi kiểm tra**, nhập ngày, cán bộ và kết quả. Chỉ đánh dấu **Đã xác minh có căn cứ** khi đã có tài liệu đối chiếu phù hợp.
4. Bấm **Lưu kết quả kiểm tra**. Số lượt, ngày gần nhất và dấu trên ghim được tải lại tự động. Đóng bảng bằng nút **×** hoặc phím **Esc**.

Tình trạng **Chưa thi công / Đang thi công / Đã hoàn thành** tách riêng với việc kiểm tra. Bản ghi chưa đủ cơ sở xác minh vẫn được tính là một lượt đã ghi nhận, nhưng không hiển thị thành kết luận sai phép. **Chưa có bản ghi** không chứng minh chưa từng kiểm tra thực địa. Phần mềm lưu thông tin do cán bộ nhập, chưa tự xác thực việc cán bộ đã đến hiện trường. Thông tin cán bộ và căn cứ chỉ hiển thị trong tài khoản quản lý.

Lịch sử chỉ nối bằng mã liên kết rõ ràng. Công trình khác cùng tọa độ không nhận lịch sử của nhau. Kiểm tra ghi độc lập tại điểm bản đồ chưa liên kết GPXD/phản ánh sẽ không tự gắn vào hồ sơ gần đó.

## Dữ liệu và giới hạn

- Hồ sơ trong `data/ttxd.sqlite` được mã hóa bằng khóa `data/secret.key`. Không xóa khóa. Khi sao lưu, dừng phần mềm rồi giữ cả SQLite và khóa trong nơi an toàn.
- Lệnh `npm start` hiện chỉ mở trên máy đang chạy tại `127.0.0.1`; người dân ở thiết bị khác chưa thể truy cập qua Internet. Muốn triển khai thật cần kho dữ liệu dùng chung bền vững và kiểm soát chống spam, sao lưu/khôi phục cùng cấu hình HTTPS.
- Ranh giới 75 xã/phường là dữ liệu tham khảo, chưa xác nhận pháp lý. Nền bản đồ cần Internet.
- Bản đầu tiếp nhận và hiển thị mã/trạng thái; chưa có quy trình phân công, thời hạn xử lý, xác minh và công bố kết quả đầy đủ.
