# Kế hoạch nâng cấp trải nghiệm và báo cáo điều hành QLXD-SLA

Ngày lập: 14/10/2026. Phạm vi: ứng dụng quản lý trật tự xây dựng tỉnh Sơn La trong thư mục `Quan ly TTXD-tinh`, sử dụng hệ thống hiện có. Trạng thái tài liệu: kế hoạch triển khai; các tính năng mới chưa được nghiệm thu.

## 1. Mục tiêu và phạm vi

Nâng cấp hai nhóm đã được thống nhất:

1. Chọn vị trí thuận tiện, biểu mẫu phù hợp điện thoại, hiển thị trạng thái và số liệu rõ ràng.
2. Báo cáo theo tháng, địa bàn, loại phản ánh, kết quả kiểm tra; danh sách việc chưa xử lý và xuất Excel/PDF theo đúng bộ lọc.

Giữ giao diện và quy trình quen thuộc, một kho dữ liệu dùng chung, định danh địa bàn bằng `communeCode`. Tiếp tục quản lý GPXD đã được cấp; không mở rộng thành quy trình cấp phép hành chính trong đợt này.

Các phụ thuộc nghiệp vụ tối thiểu được đưa vào phạm vi: cập nhật trạng thái phản ánh và ghi lịch sử; nhập kết quả kiểm tra có cấu trúc. Chưa triển khai giao việc nhiều cán bộ, thời hạn pháp định, ảnh/tài liệu đính kèm, tài khoản theo địa bàn hoặc thông báo SMS/Zalo trong đợt này. Không gọi việc chưa hoàn tất là quá hạn khi chưa có hạn xử lý được xác lập.

## 2. Căn cứ từ mã hiện tại

Đã đối chiếu `MapCanvas`, `CitizenPortal`, `PublicReportForm`, `RecordForm`, `Workspace`, các API hồ sơ và `lib/types.ts` ngày 14/10/2026:

- Bản đồ chọn điểm và gợi ý địa bàn; máy chủ kiểm tra điểm bằng hình học đầy đủ.
- Biểu mẫu giữ nội dung khi chuyển sang chọn điểm, nhưng chưa có quy trình nhiều bước hoặc nháp phục hồi sau tải lại.
- Chưa có nút định vị thiết bị, tìm địa chỉ bằng dịch vụ địa lý, gom điểm hoặc chế độ bản đồ toàn màn hình.
- GPXD chỉ có trạng thái `active`; nhãn công khai “Đang hiệu lực” chưa được hỗ trợ bằng quy trình kiểm chứng hiệu lực.
- Phản ánh có ba trạng thái trong kiểu dữ liệu, nhưng API hiện chỉ tạo hồ sơ, chưa có cập nhật trạng thái/kết quả xử lý.
- Chưa có dữ liệu kiểm tra riêng, báo cáo tổng hợp, hoặc API xuất báo cáo.
- Theo hồ sơ dữ liệu minh họa, 5 kết quả sai phép nằm trong tên/ghi chú mẫu. Không dùng chúng làm kết luận vi phạm thực tế.
- Cổng người dân hiển thị tổng GPXD/phản ánh toàn tỉnh cùng số vị trí theo bộ lọc; cần phân biệt rõ hai phạm vi.

Tình trạng dữ liệu online phải kiểm tra lại trước khi thực hiện migration. Các số lượng mẫu trong hồ sơ bàn giao không được coi là số lượng hồ sơ thực tế tại thời điểm triển khai mới.

## 3. Bốn mốc triển khai

| Mốc | Công việc | Sản phẩm bàn giao | Điều kiện chuyển mốc |
|---|---|---|---|
| M1 — Chọn vị trí và số liệu | Định vị thiết bị có xác nhận, tìm địa bàn/tọa độ, chọn điểm rõ ràng; thu gọn công cụ bản đồ; nhãn GPXD và bộ đếm đúng phạm vi | Bản thử giao diện công dân/quản lý trên điện thoại và máy tính | Điểm trong/ngoài tỉnh/sát ranh được xử lý đúng; bộ đếm và nhãn khớp dữ liệu |
| M2 — Biểu mẫu điện thoại | Ba bước, giữ nháp trong phiên, xác nhận trước gửi, chống gửi trùng; lỗi theo từng trường và điều khiển dễ chạm | Luồng gửi phản ánh và nhập GPXD dùng được trên màn hình nhỏ | Chọn bản đồ/đổi bước/lỗi mạng không mất nội dung; gửi thành công đúng một hồ sơ |
| M3 — Dữ liệu và báo cáo | Trạng thái phản ánh có lịch sử, kết quả kiểm tra riêng, dấu dữ liệu mẫu; bộ lọc chung; bảng, biểu đồ, danh sách chưa xử lý | Trang “Báo cáo điều hành” có dữ liệu đối soát | Công thức tháng và tồn việc rõ ràng; không suy diễn mẫu/ghi chú thành số liệu thật |
| M4 — Xuất và nghiệm thu | Excel, PDF, kiểm thử quyền/dữ liệu/nhiều thiết bị, sao lưu và triển khai Vercel | Bản cập nhật online, tệp xuất mẫu và biên bản kiểm chứng | Tệp khớp giao diện, không lộ dữ liệu riêng, dữ liệu cũ còn nguyên sau triển khai |

M1 và thiết kế M3 có thể thực hiện song song. Chốt hợp đồng dữ liệu/bộ lọc trước khi lập API báo cáo. Hoàn tất M3 trước khi nghiệm thu M4. Đây là thứ tự thực hiện, không phải cam kết ngày hoàn thành.

## 4. Thiết kế thao tác người dùng

### 4.1. Chọn vị trí

- Nút “Vị trí của tôi” chỉ xin quyền khi được bấm, hiển thị vị trí thiết bị và độ chính xác. Người dùng phải xác nhận hoặc di chuyển ghim; không tự coi vị trí thiết bị là công trình.
- Trường hợp từ chối định vị, chờ quá lâu, sai số lớn hoặc ở ngoài tỉnh: giải thích ngắn và cho chọn điểm bằng tay.
- Chọn xã/phường đang lọc sẽ đưa bản đồ về địa bàn. Khi mở phản ánh, gợi ý địa bàn này; điểm xác nhận mới là căn cứ kiểm tra địa bàn.
- Tìm xã/phường bằng tên/mã, chọn hồ sơ đã có theo quyền và nhập/dán tọa độ. Truy vấn tìm địa chỉ thực tế là bước mở rộng có phụ thuộc nhà cung cấp, quyền sử dụng và hạn mức; không hứa tìm được đầy đủ thôn/bản/địa chỉ từ lớp ảnh nền Google.
- Có bản đồ toàn màn hình, nút xác nhận điểm và hủy rõ ràng; đóng lớp phủ bằng nút hoặc Esc; giữ nháp khi quay lại biểu mẫu.
- Điểm sát ranh hoặc nhiều hình học giao nhau cần người dùng kiểm tra, không chọn xã theo khoảng cách tâm. Ranh giới tiếp tục ghi “tham khảo”.

### 4.2. Biểu mẫu điện thoại

Luồng phản ánh: **Vị trí → Nội dung và liên hệ → Kiểm tra, gửi**. Liên hệ tiếp tục là tùy chọn. Luồng GPXD áp dụng cùng cách chuyển bước, với thông tin giấy phép ở bước nội dung.

Ẩn tọa độ khỏi phần nhập chính, đưa vào mục “Tọa độ chi tiết” có thể mở. Ưu tiên chọn bản đồ, kiểm tra trước gửi có bản đồ nhỏ/địa bàn/vị trí mô tả. Cán bộ vẫn được nhập tọa độ khi cần.

Nút chính cố định ở vị trí dễ thao tác, bàn phím phù hợp số/ngày/điện thoại, tự đưa tới trường lỗi đầu tiên. Không có cuộn ngang ở màn hình rộng 360–430 px. Có thông báo đang gửi, thành công, lỗi mạng và thử lại. Chống gửi lặp phải được kiểm tra phía máy chủ bằng mã yêu cầu, không chỉ khóa nút.

Giữ nháp trong phiên mặc định. Chức năng phục hồi sau tải lại phải có lựa chọn “Lưu nháp trên thiết bị này”, thời hạn ngắn và nút xóa; cảnh báo ngắn khi dùng thiết bị chung. Không tự lưu tên/số điện thoại vào bộ nhớ lâu dài. Xóa nháp sau khi gửi thành công. Không tự gửi nháp khi mạng trở lại.

### 4.3. Trạng thái và bộ đếm

- GPXD cũ `active` hiển thị “Đã ghi nhận giấy phép”; không suy ra hiệu lực hoặc kết quả kiểm tra.
- Phản ánh: “Đã tiếp nhận” (`received`), “Đang xử lý” (`processing`), “Đã giải quyết” (`resolved`). Chuyển sang đã giải quyết cần kết quả xử lý và ngày hoàn tất; ghi người cập nhật và lịch sử. Mở lại cần lý do, giữ kết quả/lịch sử cũ.
- Bộ đếm theo bộ lọc có nhãn rõ, ví dụ “Thảo Nguyên: 4 GPXD, 2 phản ánh”. Tổng tỉnh nếu hiển thị phải có nhãn riêng.
- Tải dữ liệu lỗi hiển thị “Chưa xác minh được”, không thay bằng 0.
- Phản ánh “không phép/sai phép” là loại người gửi khai báo; chỉ kết quả kiểm tra được xác minh mới dùng cho chỉ tiêu kết quả kiểm tra.

## 5. Báo cáo điều hành

Chỉ cán bộ đăng nhập được mở báo cáo chi tiết và xuất tệp. Thêm mục điều hướng “Báo cáo điều hành”.

### 5.1. Bộ lọc

Bộ lọc chung gồm tháng hoặc khoảng ngày, toàn tỉnh/xã/phường, nhóm báo cáo (GPXD, phản ánh, kiểm tra), trạng thái phản ánh, loại phản ánh, kết quả kiểm tra, nguồn dữ liệu (thực tế/minh họa/tất cả). Nút “Áp dụng” và “Đặt lại”, kèm tóm tắt bộ lọc đang dùng.

Trường lọc theo loại phản ánh chỉ áp dụng báo cáo phản ánh và kiểm tra có liên kết phản ánh, không âm thầm lọc sai bảng GPXD. Chuyển nhóm báo cáo phải xử lý rõ bộ lọc không áp dụng. Giao diện, biểu đồ, bảng và tệp xuất dùng chung điều kiện lọc đã kiểm tra ở máy chủ.

### 5.2. Chỉ tiêu và cách tính

| Chỉ tiêu | Quy tắc |
|---|---|
| GPXD được cấp trong kỳ | Theo ngày cấp `issueDate`; tách khỏi số hồ sơ được nhập vào hệ thống |
| GPXD nhập trong kỳ | Theo thời điểm tạo `createdAt` |
| Phản ánh tiếp nhận trong kỳ | Theo thời điểm tiếp nhận `createdAt` |
| Phản ánh giải quyết trong kỳ | Theo sự kiện hoàn tất; ghi riêng số sự kiện và số hồ sơ duy nhất nếu có mở lại |
| Chưa bắt đầu xử lý | Trạng thái hiện tại `received` |
| Chưa hoàn tất | Trạng thái hiện tại `received` hoặc `processing`; hiển thị rõ đang xét hiện tại và có lọc kỳ tiếp nhận hay không |
| Kiểm tra trong kỳ | Theo ngày kiểm tra; ghi rõ “lượt kiểm tra” và “công trình được kiểm tra” để không đếm lặp |
| Kết quả kiểm tra | Chưa đủ cơ sở xác minh / phù hợp nội dung GPXD / sai nội dung GPXD / chưa xuất trình GPXD cần xác minh; chỉ bản ghi xác minh được mới vào nhóm kết luận |
| Tồn cuối kỳ lịch sử | Chỉ tính khi có lịch sử trạng thái đầy đủ từ mốc bắt đầu theo dõi; dữ liệu trước mốc đó ghi chưa đủ dữ liệu, không lấy trạng thái hiện tại làm trạng thái quá khứ |

Tháng theo múi giờ Việt Nam `Asia/Ho_Chi_Minh`; khoảng thời gian từ đầu kỳ đến trước đầu kỳ kế tiếp. Ngày cấp/ngày kiểm tra dạng ngày không bị dịch một ngày khi đổi UTC. Không đồng nhất “không có kết quả kiểm tra” với “đúng phép”.

### 5.3. Bố cục

- Thẻ chỉ tiêu theo nhóm báo cáo và bộ lọc.
- Biểu đồ theo tháng; bảng tổng hợp theo 75 địa bàn; biểu đồ loại phản ánh và kết quả kiểm tra.
- Danh sách chưa hoàn tất: mã, ngày tiếp nhận, địa bàn, loại, trạng thái, số ngày từ tiếp nhận, nút mở vị trí/chi tiết. Số ngày tồn không phải số ngày quá hạn.
- Khi bấm một chỉ tiêu hoặc hàng địa bàn, mở danh sách nguồn tương ứng để đối soát.
- Một công trình có nhiều lần kiểm tra: bảng có lựa chọn “tất cả lượt” hoặc “kết quả gần nhất đến cuối kỳ”, nhãn và cách tính không trộn lẫn.

## 6. Dữ liệu cần bổ sung

Thiết kế trước khi sửa Supabase và SQLite, giữ nguyên định dạng mã hóa hồ sơ hiện có:

1. Dấu nguồn dữ liệu `real/demo/unknown`. Chỉ đánh dấu bộ mẫu có định danh được đối chiếu; không đoán từ tên chứa chữ “MẪU”. Hồ sơ chưa xác định nguồn phải có nhóm riêng, không tự tính là thực tế.
2. Kết quả xử lý phản ánh, ngày hoàn tất và lịch sử thay đổi trạng thái. Lịch sử có trạng thái cũ/mới, thời điểm, người ghi, lý do; ghi nhận mốc bắt đầu theo dõi lịch sử của dữ liệu cũ.
3. Bản ghi kiểm tra riêng: mã, GPXD/phản ánh liên quan nếu có, vị trí và địa bàn, ngày kiểm tra, người ghi, kết quả, trạng thái xác minh, căn cứ/ghi chú. Cho phép kiểm tra công trình chưa có GPXD. Không tự động chuyển ghi chú mẫu thành kết quả thật.
4. Chỉ mục phân tích tối thiểu: ngày, mã địa bàn, loại, trạng thái, nguồn dữ liệu, kết quả kiểm tra; không chứa tên/số điện thoại/nội dung riêng. Cập nhật cùng giao dịch với payload mã hóa và lịch sử để tránh lệch thống kê.
5. Kiểm soát cập nhật đồng thời bằng phiên bản hồ sơ; tránh ghi đè kết quả của người khác. Khi mở rộng nhiều người dùng phải bổ sung định danh cá nhân, không coi tài khoản chung là đủ để xác định trách nhiệm cán bộ.

Backend tiếp tục lọc dữ liệu công khai, kiểm tra phiên/CSRF cho thao tác ghi. Bảng bổ sung có RLS và không cấp quyền đọc/ghi cho người dân. Không giải mã và trả toàn bộ hồ sơ xuống trình duyệt để làm báo cáo; tổng hợp/phân trang tại máy chủ. Adapter local và cloud phải có cùng ý nghĩa số liệu.

## 7. Xuất Excel và PDF

Tệp xuất phản ánh đúng nhóm báo cáo, bộ lọc và tập dữ liệu tại thời điểm xuất. Mỗi lần xuất có mã báo cáo/thời điểm và snapshot nhất quán; không tự lấy lại một bộ dữ liệu khác giữa bảng tổng hợp và danh sách.

**Excel:** sheet Tổng hợp, Chi tiết và Giải thích chỉ tiêu; ghi bộ lọc, nguồn dữ liệu, thời điểm xuất. Giữ mã GPXD/địa bàn dạng văn bản, ngày/số đúng kiểu, tiêu đề cố định và bộ lọc bảng. Nội dung người dùng nhập bắt đầu bằng `=`, `+`, `-`, `@` phải được ghi an toàn như văn bản. Thông tin liên hệ không nằm trong mẫu báo cáo mặc định.

**PDF:** bản báo cáo tổng hợp có biểu đồ/bảng, bộ lọc, thời điểm, ghi chú dữ liệu tham khảo/mẫu. Phụ lục chi tiết tùy chọn, nhiều trang có tiêu đề lặp/số trang và font tiếng Việt. Có lựa chọn bản ngang cho bảng rộng. Tệp là báo cáo trích xuất, không tự mang hình thức biên bản xử phạt hoặc văn bản ký số.

Xuất cả khi không có dữ liệu: số 0 đúng nghĩa và ghi “Không có hồ sơ theo bộ lọc”; lỗi truy vấn thì từ chối xuất và báo lỗi. Tệp dữ liệu chi tiết không có đường dẫn tải công khai lâu dài. Quy mô vượt ngưỡng phải chuyển sang xử lý theo lô hoặc thông báo rõ giới hạn, không âm thầm cắt hàng.

## 8. Phân công và thứ tự tích hợp

| Vai trò | Phần việc |
|---|---|
| Điều phối/root | Chốt hợp đồng dữ liệu, định nghĩa báo cáo, tích hợp bản đồ/bộ lọc và kiểm chứng bản online |
| Agent UI | Biểu mẫu điện thoại, bộ chọn vị trí, trạng thái/bộ đếm, trang báo cáo và trợ năng |
| Agent dữ liệu/API | Migration, adapter SQLite/Supabase, trạng thái/lịch sử, kiểm tra, thống kê và chống gửi trùng |
| Agent xuất báo cáo | Excel/PDF, snapshot/bộ lọc chung, kiểm tra tiếng Việt, bảng và kiểu dữ liệu |
| Agent QA/bảo mật | Đối soát số liệu độc lập, kiểm thử thiết bị/quyền/đồng thời/khôi phục, kiểm tra dữ liệu riêng và tệp xuất |

Tối đa ba agent cùng điều phối hoạt động một lúc theo số slot hiện có. Luân phiên agent xuất báo cáo sau khi hợp đồng/API thống kê ổn định. Các agent không đồng thời sửa cùng file; root tích hợp sau khi thống nhất kiểu dữ liệu và API. Agent QA đã rà soát phụ thuộc của kế hoạch; chưa coi đó là nghiệm thu phần mềm mới.

## 9. Nghiệm thu

| Nhóm | Bằng chứng bắt buộc |
|---|---|
| Vị trí | Điểm trong tỉnh/ngoài tỉnh/sát ranh, định vị bị từ chối/timeout/sai số lớn, ghim có xác nhận và địa bàn khớp máy chủ |
| Điện thoại | Màn hình 360/390/430 px, bàn phím mở, đổi bước/chọn bản đồ/Esc/lỗi mạng/nháp, bấm gửi lặp không tạo trùng |
| Trạng thái | Chuyển trạng thái có kết quả và lịch sử, mở lại có lý do, không suy diễn hiệu lực GPXD hay kết luận từ phản ánh |
| Thống kê | Bộ dữ liệu riêng nhiều tháng/địa bàn, sát đầu tháng giờ Việt Nam, nhiều lần kiểm tra, hồ sơ mở lại và dữ liệu mẫu/unknown; có bảng kết quả mong đợi tính độc lập |
| Đối soát | Tổng tỉnh bằng tổng địa bàn trong cùng kỳ; thẻ/biểu đồ/bảng/danh sách và Excel/PDF khớp cùng snapshot, không có hồ sơ ngoài bộ lọc |
| Xuất tệp | Excel mở được, không lỗi công thức hoặc thực thi dữ liệu nhập; PDF đọc được tiếng Việt, không cắt hàng/cột, thử dữ liệu rỗng và nhiều trang |
| Bảo mật | Ẩn danh không đọc/xuất báo cáo quản lý; thiếu CSRF bị chặn; không lộ khóa/mật khẩu/liên hệ trong API công khai, tệp mặc định hoặc log |
| Dữ liệu cũ | Khóa/hồ sơ/tài khoản được giữ; migration thử trên bản sao và khôi phục được; thống kê cũ không bị gán lịch sử không có thật |
| Triển khai | Typecheck/lint/unit/build, luồng trình duyệt, commit GitHub khớp deployment; kiểm tra URL thật và dữ liệu còn sau triển khai tiếp theo |

## 10. Triển khai và bàn giao

Sao lưu nhất quán dữ liệu/khóa trước migration; thử trên bản sao hoặc môi trường thử riêng. Không thử thêm nghiệp vụ hoặc đổi trạng thái trên hồ sơ thật để nghiệm thu. Bộ mẫu QA được đánh dấu và có cách dọn theo định danh chính xác.

Migration bổ sung theo hướng tương thích bản cũ; không xóa cột/dữ liệu đang dùng. Bản chạy chính thức chỉ cập nhật sau khi schema cần thiết đã sẵn sàng và bản thử đạt kiểm tra. Kế hoạch quay lại phiên bản trước phải giữ dữ liệu phát sinh mới, không phục hồi bản sao cũ đè toàn bộ hồ sơ.

Bàn giao mỗi mốc gồm mã nguồn, thay đổi dữ liệu/API, ảnh giao diện, kết quả kiểm thử và phần chưa hoàn tất. Riêng M4 có Excel/PDF mẫu đã kiểm tra, tài liệu công thức thống kê, URL deployment và hướng dẫn sử dụng ngắn. Chỉ đánh dấu hoàn thành những mục có bằng chứng thực tế.
