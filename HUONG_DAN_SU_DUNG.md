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

Nhập mật khẩu ít nhất 12 ký tự hai lần; Terminal không hiện ký tự khi nhập. Lệnh tạo tài khoản một lần và lưu mật khẩu dưới dạng băm scrypt. Nếu báo tài khoản đã tồn tại, hãy dùng mật khẩu quản trị đã đặt. Quản trị cấp tỉnh có thể đặt lại mật khẩu cho tài khoản cán bộ trong mục **Tài khoản cán bộ**. Việc khôi phục tài khoản `admin@qlxd` khi mất mật khẩu cần thực hiện theo quy trình quản trị máy chủ an toàn.

Sau khi tạo xong, tải lại trang, bấm **Đăng nhập quản lý**, nhập `admin@qlxd` cùng mật khẩu. Khu vực quản lý cho phép nhập GPXD và xem thông tin đầy đủ của phản ánh. Bấm **Đăng xuất** khi kết thúc; phiên tối đa 8 giờ.

## Cấp tỉnh tạo tài khoản và giao địa bàn

1. Đăng nhập tài khoản cấp tỉnh, chọn **Tài khoản và phân quyền**.
2. Bấm **Tạo tài khoản**, nhập tên tài khoản dạng email và mật khẩu ban đầu ít nhất 12 ký tự.
3. Chọn **Phòng Kinh tế xã/phường**, chọn đúng xã/phường được giao, rồi lưu. Chỉ chọn **Cấp tỉnh** cho người có nhiệm vụ quản lý toàn tỉnh.
4. Bàn giao mật khẩu riêng qua kênh bảo mật. Không dùng chung `admin@qlxd` cho các xã.
5. Dùng **Phân quyền / Khóa / Đặt lại mật khẩu** để thay địa bàn, khóa/mở tài khoản hoặc đặt mật khẩu mới. Đặt lại mật khẩu sẽ thu hồi các phiên đăng nhập cũ. Không thể tự hạ quyền/khóa chính tài khoản đang dùng hoặc khóa tài khoản khởi tạo cấp tỉnh.

Cán bộ xã/phường mặc định mở địa bàn được giao. Có thể chuyển sang xem bản ghi, bản đồ, báo cáo và tệp xuất của địa bàn khác/toàn tỉnh ở chế độ chỉ đọc; tên và số điện thoại người phản ánh ngoài địa bàn được ẩn. Chỉ được nhập GPXD, ghi phản ánh nội bộ, ghi kiểm tra, cập nhật trạng thái, xóa mềm hoặc khôi phục hồ sơ thuộc địa bàn được giao. Máy chủ kiểm tra địa bàn cho từng thao tác ghi, kể cả khi sửa mã hồ sơ hoặc mã xã/phường trong yêu cầu.

Tổng quan của cán bộ xã/phường có số phản ánh chưa hoàn tất tại địa bàn được giao và liên kết gửi người dân dạng `/?phan-anh=1&xa=<mã xã/phường>`. Khi phản ánh được gửi qua liên kết, màn hình xác nhận hiển thị xã/phường tiếp nhận theo vị trí công trình.

Bản đồ người dân vẫn công khai thông tin rút gọn toàn tỉnh theo cấu hình đã thống nhất. Tên, số điện thoại và nội dung hồ sơ nội bộ không công khai. Phân quyền xã áp dụng cho hồ sơ nội bộ, không biến thông tin vốn công khai thành bí mật.

Khi nâng cấp, cần đăng nhập lại do các phiên cũ chưa gắn tài khoản không được chấp nhận. Không đổi mật khẩu quản trị hiện có. Không tự tạo tài khoản hoặc mật khẩu chung cho 75 địa bàn.

## Nhập GPXD

1. Trong không gian quản lý, bấm **Nhập GPXD**.
2. Điền số giấy phép, ngày cấp, cơ quan cấp, chủ đầu tư, tên công trình, diện tích, số tầng và địa chỉ.
3. Bấm **Chọn vị trí trên bản đồ**, chạm vị trí công trình và kiểm tra xã/phường.
4. Bấm **Lưu hồ sơ**. Hồ sơ được lưu mã hóa và xuất hiện trên bản đồ quản lý; bản đồ người dân chỉ hiển thị thông tin rút gọn.

Ngày cấp không được ở tương lai; diện tích và số tầng phải hợp lệ. Số GPXD trùng năm và cơ quan cấp bị từ chối. Vị trí ngoài tỉnh hoặc không khớp địa bàn đã chọn sẽ không được lưu.

## Theo dõi việc kiểm tra thực địa

Trong tài khoản quản lý, mở **Giấy phép xây dựng** hoặc **Phản ánh người dân**. Cột **Kiểm tra thực địa** cho biết hồ sơ đã có bản ghi kiểm tra liên kết hay chưa, số lượt và ngày gần nhất. Bộ lọc **Kiểm tra thực địa** áp dụng cùng từ khóa tìm kiếm và địa bàn, giúp tìm hồ sơ đã ghi nhận hoặc chưa có bản ghi.

Trên **Bản đồ quản lý**, bộ lọc **Tình trạng** lọc giấy phép, tiến độ thi công, kết luận kiểm tra và tình trạng khắc phục. Dấu **✓ màu xanh** cạnh ghim cho biết đã ghi nhận kiểm tra. Dấu **?** cho biết chưa có bản ghi liên kết. Ghim kiểm tra chưa liên kết với GPXD/phản ánh hiện riêng trên bản đồ. Khi có nhiều lần kiểm tra, kết luận đã xác minh gần nhất được hiển thị ưu tiên; lần mới hơn chưa xác minh vẫn nằm trong lịch sử. Khi dữ liệu đang tải hoặc tải lỗi, trạng thái hiển thị là chưa xác minh, không suy ra chưa kiểm tra.

1. Chọn ghim hoặc bấm **Xem vị trí** trong danh sách.
2. Trong bảng chi tiết, mở **Xem lịch sử kiểm tra** để xem ngày, cán bộ, kết quả, căn cứ pháp lý, tài liệu đối chiếu, tình trạng khắc phục, ghi chú và nguồn dữ liệu của từng lần. Lần mới nhất xếp trước. Lịch sử dài có thể cuộn và thu gọn.
3. Bấm **Ghi kiểm tra**, nhập ngày, cán bộ và kết quả. Chỉ đánh dấu **Đã xác minh có căn cứ** khi đã có tài liệu đối chiếu phù hợp.
4. Bấm **Lưu kết quả kiểm tra**. Số lượt, ngày gần nhất và dấu trên ghim được tải lại tự động. Đóng bảng bằng nút **×** hoặc phím **Esc**.

Tình trạng **Chưa thi công / Đang thi công / Đã hoàn thành** tách riêng với việc kiểm tra. Bản ghi chưa đủ cơ sở xác minh vẫn được tính là một lượt đã ghi nhận, nhưng không hiển thị thành kết luận sai phép. **Chưa có bản ghi** không chứng minh chưa từng kiểm tra thực địa. Phần mềm lưu thông tin do cán bộ nhập, chưa tự xác thực việc cán bộ đã đến hiện trường. Thông tin cán bộ và căn cứ chỉ hiển thị trong tài khoản quản lý.

Lịch sử chỉ nối bằng mã liên kết rõ ràng. Công trình khác cùng tọa độ không nhận lịch sử của nhau. Kiểm tra ghi độc lập tại điểm bản đồ chưa liên kết GPXD/phản ánh sẽ không tự gắn vào hồ sơ gần đó.

## Dữ liệu và giới hạn

- Hồ sơ trong `data/ttxd.sqlite` được mã hóa bằng khóa `data/secret.key`. Không xóa khóa. Khi sao lưu, dừng phần mềm rồi giữ cả SQLite và khóa trong nơi an toàn.
- Lệnh `npm start` hiện chỉ mở trên máy đang chạy tại `127.0.0.1`; người dân ở thiết bị khác chưa thể truy cập qua Internet. Muốn triển khai thật cần kho dữ liệu dùng chung bền vững và kiểm soát chống spam, sao lưu/khôi phục cùng cấu hình HTTPS.
- Ranh giới 75 xã/phường là dữ liệu tham khảo, chưa xác nhận pháp lý. Nền bản đồ cần Internet.
- Bản đầu tiếp nhận và hiển thị mã/trạng thái; chưa có quy trình phân công, thời hạn xử lý, xác minh và công bố kết quả đầy đủ.
