# Kế hoạch xây dựng phần mềm quản lý trật tự xây dựng tỉnh Sơn La

Ngày lập: 10/10/2026.
Thư mục dự án: `Quan ly TTXD-tinh`.
Trạng thái cập nhật: đã triển khai khung bản đầu tại máy cho giao diện tỉnh, nhập GPXD và ghi phản ánh trên bản đồ; kết quả thực hiện và kiểm thử nằm trong `docs/TEST_REPORT.md`. Các giai đoạn vận hành đa người dùng bên dưới vẫn là kế hoạch.

## Mốc triển khai được giao ngày 10/10/2026

Theo yêu cầu tiếp theo, triển khai ngay tới mức có giao diện thao tác được nhập GPXD và ghi phản ánh trên bản đồ. Phân công ba agent riêng phụ trách UI, lưu trữ/bảo mật, kiểm thử; agent chính ghép ứng dụng, ranh giới và bản đồ, kiểm chứng kết quả.

Bản đầu lấy cách tổ chức màn hình và quy trình từ `ttxd-sonla`, dựng khung Next.js riêng để không kế thừa cấu hình Supabase cũ và chế độ giả lập dữ liệu. Dữ liệu lưu thực tại máy bằng SQLite mã hóa. Lựa chọn này giúp chạy và kiểm chứng độc lập trong phạm vi hiện tại; triển khai Auth/RLS/Supabase và phân quyền đa đơn vị cần một mốc riêng, không được coi là đã hoàn thành qua bản tại máy.

Điều kiện hoàn thành mốc: người dùng mở phiên riêng, nhập GPXD hoặc phản ánh, chọn tọa độ bản đồ và địa bàn, lưu thật, thấy điểm tương ứng, tải lại còn hồ sơ; máy chủ từ chối vị trí sai, hồ sơ trùng hoặc truy cập thiếu phiên/CSRF; giao diện điện thoại sử dụng được. Kiểm thử dùng dữ liệu tổng hợp và thư mục tạm để không để hồ sơ mẫu vào bản sử dụng.

## 1. Mục tiêu và phạm vi

Xây dựng một hệ thống dùng chung cho cấp tỉnh và 75 xã, phường theo yêu cầu của chủ dự án. Cấp tỉnh theo dõi toàn bộ địa bàn, giao việc và tổng hợp báo cáo; mỗi xã/phường quản lý hồ sơ trong phạm vi được giao. Giao diện và thao tác kế thừa dự án hiện có để cán bộ không phải học lại toàn bộ.

Phạm vi bản đầu gồm: bản đồ toàn tỉnh; danh mục địa bàn; hồ sơ công trình; giấy phép xây dựng; phản ánh người dân; kiểm tra hiện trường; theo dõi vi phạm, khắc phục; phân công; báo cáo và nhật ký xử lý. Thiết kế vận hành trực tiếp tỉnh → xã/phường, không bắt buộc qua một tầng huyện. Trường địa chỉ huyện cũ, nếu có, chỉ phục vụ tra cứu hồ sơ lịch sử.

“Tạo lập giấy phép” ở bản đầu được hiểu là tạo hồ sơ quản lý giấy phép đã cấp, nhập thông tin và tài liệu, kiểm tra rồi xác nhận vào sổ. Nếu cần tiếp nhận hồ sơ xin cấp phép, thẩm định, phê duyệt và phát hành giấy phép thì phải bổ sung một quy trình riêng sau khi xác định thẩm quyền, biểu mẫu và hệ thống dịch vụ công liên quan. Nút xác nhận dữ liệu không mang ý nghĩa cấp phép hành chính.

## 2. Căn cứ khảo sát và lựa chọn nền

Khảo sát mã nguồn và tài liệu tại máy ngày 10/10/2026; chưa chạy ứng dụng hoặc xác minh cơ sở dữ liệu đang hoạt động.

| Nguồn | Đã thấy trong mã nguồn | Cách sử dụng |
|---|---|---|
| `PHAN MEM QUAN LY TRAT TU XAY DUNG` | Next.js/React, FastAPI, Leaflet, schema PostGIS; trang công trình, kiểm tra, dashboard và người dùng | Tham khảo giao diện, trường dữ liệu và thao tác hiện trường |
| Cùng nguồn trên | Đăng nhập phát triển bằng localStorage trong `frontend/app/login/page.tsx`; ảnh mẫu trong trang kiểm tra; `complaint` là loại kiểm tra | Cần hoàn thiện nếu kế thừa; chưa đủ căn cứ coi đây là phân hệ phản ánh độc lập |
| `QUAN LY TRAT TU XAY DUNG/ttxd-sonla` | Trang bản đồ, giấy phép mới/chi tiết, phản ánh công khai và tra cứu, quản trị phản ánh, kiểm tra, vi phạm, báo cáo; Supabase SSR, MapLibre và các migration phân quyền | Đề xuất làm nền chính vì gần phạm vi yêu cầu hơn |
| Cùng nguồn trên | Có vai trò cấp tỉnh, huyện, xã; có logic tạo dữ liệu demo và ánh xạ địa bàn theo tên ở một số chỗ | Phải rà soát và sửa trước khi mở rộng; mã nguồn tồn tại chưa chứng minh luồng chạy đúng |

Không ghép nguyên hai ứng dụng thành hai backend. Ưu tiên giữ kiến trúc Next.js + Supabase của `ttxd-sonla`, chỉ chuyển những thành phần tham khảo cần thiết. Chốt nền sau khi chạy và đối chiếu giao diện thực tế của hai bản ở giai đoạn 0. Các kết quả kiểm thử ở dự án/đường dẫn khác không được dùng làm kết quả nghiệm thu cho dự án mới.

## 3. Thiết kế giao diện cấp tỉnh

Giữ hệ thống màu, thanh điều hướng, bảng, biểu mẫu và bố cục chi tiết của nền được chọn. Bổ sung bộ chọn phạm vi “Toàn tỉnh / xã, phường”; lựa chọn luôn chịu giới hạn quyền tài khoản. Bộ lọc phạm vi, thời gian và trạng thái thống nhất giữa bản đồ, danh sách và báo cáo.

Các màn hình chính:

1. **Tổng quan tỉnh:** công trình, giấy phép, phản ánh, kiểm tra và vi phạm; công việc quá hạn; so sánh theo xã/phường. Mỗi chỉ số có định nghĩa, kỳ thống kê, thời điểm cập nhật và đường dẫn đến danh sách gốc.
2. **Bản đồ tỉnh:** ranh giới 75 xã/phường, công trình, phản ánh, kiểm tra và vi phạm; chọn xã để phóng tới địa bàn và mở thống kê. Có chú giải, bật/tắt lớp, tìm số giấy phép hoặc địa chỉ; gom điểm khi thu nhỏ.
3. **Giấy phép/công trình:** danh sách toàn tỉnh theo quyền, tạo hồ sơ, nhập tài liệu và chọn vị trí; chi tiết có lịch sử giấy phép, kiểm tra, phản ánh và vi phạm liên quan.
4. **Phản ánh:** hộp việc mới, chờ xác minh địa bàn, đã giao, đang xử lý, chờ duyệt kết quả, đã kết thúc và quá hạn. Có đơn vị/cán bộ phụ trách, hạn xử lý và lịch sử chuyển giao.
5. **Kiểm tra và vi phạm:** lịch công tác, nhập biên bản/ảnh/GPS, giao khắc phục, tái kiểm tra và kết quả.
6. **Báo cáo:** tổng hợp tỉnh, từng xã/phường, so sánh địa bàn; xuất Excel/PDF theo bộ lọc và quyền.
7. **Quản trị:** đơn vị, người dùng, phân công địa bàn, phiên bản ranh giới, cấu hình biểu mẫu và thời hạn, nhật ký.
8. **Cổng người dân:** gửi phản ánh, nhận mã tra cứu và xem tiến độ được phép công khai.

Trên điện thoại ưu tiên tìm hồ sơ → mở vị trí → ghi nhận kiểm tra → chụp ảnh → gửi. Mọi màn hình phải phân biệt dữ liệu trống, đang tải và lỗi; không thay dữ liệu lỗi bằng số 0 hoặc dữ liệu demo.

## 4. Vai trò và phạm vi dữ liệu

| Vai trò đề xuất | Phạm vi | Quyền chính |
|---|---|---|
| Quản trị hệ thống | Cấu hình toàn hệ thống | Tài khoản, đơn vị, phân quyền, cấu hình; quyền đọc dữ liệu nhạy cảm cấp riêng |
| Lãnh đạo cấp tỉnh | Toàn tỉnh | Xem, báo cáo, theo dõi điều hành; phê duyệt theo nhiệm vụ được giao |
| Cán bộ nghiệp vụ cấp tỉnh | Toàn tỉnh hoặc nhóm địa bàn | Kiểm tra hồ sơ, điều phối, giao việc, duyệt kết quả theo quyền |
| Lãnh đạo/quản lý xã, phường | Địa bàn được giao | Quản lý hồ sơ địa bàn, phân công cán bộ, xác nhận kết quả |
| Cán bộ xã/phường, kiểm tra | Địa bàn và nhiệm vụ được giao | Tạo/cập nhật hồ sơ, kiểm tra và xử lý công việc phù hợp chức năng |
| Người xem nội bộ | Phạm vi được cấp | Tra cứu, báo cáo theo quyền |
| Người dân | Phản ánh của mình qua cơ chế tra cứu | Gửi và xem phần tiến độ được công khai |

Một người có thể được giao nhiều xã/phường và nhiều nhiệm vụ. Phạm vi xem, sửa, duyệt, xuất dữ liệu và xem thông tin người phản ánh phải tách riêng. Quyền được kiểm tra tại máy chủ, cơ sở dữ liệu và tệp đính kèm, kể cả khi truy cập trực tiếp bằng ID. Báo cáo, tìm kiếm và dashboard cũng phải áp dụng cùng phạm vi.

Đề xuất dùng Supabase Auth cho xác thực và RLS cho từng bản ghi, kết hợp quyền API và Storage. Không dùng giá trị vai trò do người dùng tự sửa làm căn cứ phân quyền. Cơ sở: [tài liệu RLS chính thức](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 5. Quy trình nghiệp vụ

### 5.1. Hồ sơ giấy phép và công trình

Tạo nháp → nhập thông tin/đính kèm giấy phép → chọn xã/phường và tọa độ → kiểm tra dữ liệu → người có quyền xác nhận vào sổ → theo dõi thi công và kiểm tra → hoàn thành/lưu trữ.

- Tách công trình khỏi giấy phép: một công trình có thể có nhiều giấy phép, điều chỉnh hoặc gia hạn; công trình chưa có giấy phép vẫn được ghi nhận để kiểm tra.
- Giữ các thao tác tạo, nhập tệp, sửa, tra cứu và xuất từ nền; kiểm chứng bằng hồ sơ mẫu trước khi mở rộng.
- Nếu kế thừa trích xuất nội dung từ tệp, cán bộ phải kiểm tra và xác nhận trước khi lưu; không tự coi nội dung nhận dạng là dữ liệu chính thức.
- Kiểm tra ngày cấp, các trường bắt buộc theo loại giấy phép và nguy cơ trùng số theo cơ quan cấp/năm; không mặc định số giấy phép duy nhất toàn tỉnh.
- Tọa độ được gợi ý xã/phường theo ranh giới. Thiếu tọa độ cho phép lưu nháp và đưa vào danh sách cần bổ sung; địa bàn chưa xác minh không tự giao xử lý.
- Khi điều chỉnh giữ bản gốc và lịch sử thay đổi, không ghi đè mất tài liệu cũ. Trạng thái giấy phép, công trình và hồ sơ quản lý tách riêng.

### 5.2. Phản ánh người dân

Gửi nội dung, ảnh và vị trí → nhận mã tra cứu → tiếp nhận → xác minh địa bàn/phân loại → giao đơn vị và cán bộ, đặt hạn → kiểm tra hiện trường → cập nhật kết quả, liên kết vi phạm nếu có → duyệt kết quả → kết thúc và công khai phần được phép.

- Phản ánh độc lập với giấy phép; chỉ liên kết công trình sau khi xác minh.
- Điểm ngoài tỉnh, thiếu vị trí hoặc nằm sát ranh giới vào hàng chờ xác minh; không bỏ mất phản ánh.
- Chuyển địa bàn phải có lý do, người chuyển, người nhận và lịch sử; chỉ quyền phù hợp được chuyển.
- Phản ánh trùng liên kết hồ sơ gốc và giữ dấu vết. Từ chối phải có lý do.
- Mốc xử lý và hạn do đơn vị cấu hình sau khi chốt nghiệp vụ; đây chưa phải thời hạn pháp luật đã xác minh.
- Tra cứu công khai chỉ trả tiến độ và kết quả được phép; bảo vệ thông tin người gửi, chống dò mã và giới hạn tần suất gửi/tra cứu.

### 5.3. Kiểm tra, vi phạm và khắc phục

Giao kiểm tra → cán bộ ghi nhận nội dung, thời điểm, GPS và độ chính xác, ảnh thật → lưu biên bản → người có quyền xem xét → mở hồ sơ vi phạm nếu có căn cứ → giao khắc phục → tái kiểm tra → xác nhận kết quả và lưu lịch sử.

Thông tin vi phạm ban đầu là ghi nhận nghiệp vụ, không tự chuyển thành quyết định xử phạt. Biểu mẫu, quyền ký và quy trình ban hành quyết định cần xác minh riêng. Bản đầu có thể dùng bản nháp trên thiết bị; đồng bộ ngoại tuyến đầy đủ đưa vào giai đoạn sau nếu có nhu cầu và phải xử lý trùng/xung đột.

## 6. Bản đồ và 75 xã, phường

Số 75 là phạm vi yêu cầu, chưa phải kết quả kiểm chứng bộ dữ liệu trong dự án mới. Cần danh mục tên/mã đơn vị và ranh giới có nguồn, ngày hiệu lực, hệ tọa độ và quyền sử dụng. Có thể khảo sát bộ dữ liệu bản đồ Sơn La đã làm trước đây, nhưng phải đối chiếu lại trước khi nhập.

Quy trình nhập: nhận dữ liệu → lập biên bản nguồn → chuyển hệ tọa độ về WGS84 khi cần → đối chiếu mã đơn vị → kiểm tra hình học → xem thử trên bản đồ → duyệt phiên bản → phát hành.

Tiêu chí dữ liệu:

- Đủ 75 mã xã/phường duy nhất, khớp danh mục được xác nhận; không ghép dữ liệu theo tên đơn vị.
- Hình học Polygon/MultiPolygon hợp lệ, có kiểm tra chồng lấn, khoảng trống và đối chiếu ranh giới tỉnh nếu có nguồn chuẩn. Sai lệch phải có báo cáo, không tự sửa rồi coi là chính thức.
- Bản gốc giữ độ chính xác; bản đơn giản hóa dùng hiển thị và không dùng để quyết định địa bàn khi cần độ chính xác cao.
- Điểm trên ranh, ngoài tỉnh hoặc có GPS sai số lớn cần cán bộ xác minh; kết quả gợi ý không thay quyết định nghiệp vụ.
- Lưu phiên bản và ngày hiệu lực; cập nhật ranh giới không âm thầm chuyển địa bàn của hồ sơ lịch sử.
- Khi thiếu bộ dữ liệu, có thể phát triển giao diện và nghiệp vụ bằng dữ liệu thử có nhãn; chưa nghiệm thu đủ địa bàn tỉnh.

## 7. Kiến trúc và dữ liệu đề xuất

Một ứng dụng dùng chung, một cơ sở dữ liệu nghiệp vụ tập trung; môi trường phát triển, thử nghiệm và chính thức tách biệt. Kế thừa Next.js, TypeScript, MapLibre, Supabase PostgreSQL/PostGIS và Storage của nền. Chốt phiên bản thư viện sau khi kiểm tra khả năng chạy và tương thích, tránh nâng cấp lớn đồng thời với thay đổi nghiệp vụ.

Các nhóm dữ liệu dự kiến, cần đối chiếu schema hiện hữu trước khi viết migration:

| Nhóm | Nội dung |
|---|---|
| Địa bàn và đơn vị | Mã tỉnh/xã, tên, loại, ngày hiệu lực; phiên bản ranh giới; đơn vị quản lý |
| Người dùng và phân công | Hồ sơ tài khoản, chức năng, đơn vị, phạm vi và thời hạn phân công |
| Công trình | Chủ đầu tư, địa chỉ, điểm vị trí, địa bàn phụ trách, trạng thái thi công |
| Giấy phép | Công trình, số/năm/cơ quan cấp, nội dung, tài liệu, phiên bản điều chỉnh |
| Phản ánh và giao việc | Nội dung, người gửi được bảo vệ, vị trí, đơn vị nhận, cán bộ, hạn, trạng thái, lịch sử |
| Kiểm tra và vi phạm | Nhiệm vụ, biên bản, ảnh, kết quả, khắc phục và tái kiểm tra |
| Tệp và nhật ký | Chủ sở hữu, liên kết hồ sơ, quyền truy cập, người/thời điểm/hành động thay đổi |

Hồ sơ gắn mã địa bàn, đơn vị phụ trách và người tạo. Giữ riêng vị trí thực tế, địa bàn suy ra và địa bàn được cán bộ xác nhận để xử lý trường hợp sát ranh. Có chỉ mục không gian và chỉ mục lọc địa bàn/thời gian; tải điểm theo vùng bản đồ và phân trang danh sách.

Tệp nghiệp vụ và ảnh dùng vùng lưu trữ riêng, quyền theo hồ sơ; không công khai toàn bộ ảnh hoặc thông tin chủ đầu tư. Không đưa khóa bí mật, tệp môi trường, tài khoản mặc định hoặc dữ liệu thật vào bản sao mã nguồn. Bản tỉnh dùng cấu hình dự án riêng, không tự kết nối cơ sở dữ liệu của bản cũ.

## 8. Các giai đoạn và đầu ra

Thời lượng dưới đây là ước lượng ngày làm việc, cần điều chỉnh sau khảo sát; không phải cam kết ngày hoàn thành.

| Giai đoạn | Ước lượng | Công việc và đầu ra | Điều kiện hoàn thành |
|---|---:|---|---|
| 0. Chốt nền, nghiệp vụ | 2–3 ngày | Chạy hai bản; ghi lại màn hình và luồng giấy phép/phản ánh; chọn nền; chốt vai trò và trường hồ sơ | Có bảng kế thừa/sửa mới, phạm vi và bộ hồ sơ mẫu |
| 1. Khởi tạo bản tỉnh | 2–4 ngày | Sao chép chọn lọc mã nguồn vào thư mục mới; loại cấu hình bí mật/demo; thiết lập cấu hình và môi trường riêng | Cài đặt, kiểm tra mã và build thành công; không truy cập dữ liệu cũ |
| 2. Địa bàn và phân quyền | 4–6 ngày | Danh mục tỉnh/xã, đơn vị, phân công đa địa bàn, Auth/RLS/API/Storage, nhật ký | Kiểm tra cả quyền cho phép và từ chối, kể cả ID và tệp trực tiếp |
| 3. Bản đồ toàn tỉnh | 4–6 ngày | Nhập ranh giới, kiểm tra nguồn/hình học, bộ chọn phạm vi, lớp và bộ lọc | Đủ 75 địa bàn đã xác minh; xác định điểm đúng và xử lý ngoại lệ |
| 4. Giấy phép/công trình | 4–6 ngày | Giữ quy trình quen thuộc; mở rộng địa bàn, tài liệu, điều chỉnh, nhập/xuất | Hồ sơ tạo/sửa/tra cứu đúng quyền, không mất lịch sử, cảnh báo trùng |
| 5. Phản ánh và kiểm tra | 5–8 ngày | Tiếp nhận, giao việc, chuyển địa bàn, hạn, kiểm tra, kết quả và tra cứu | Luồng công khai → cán bộ → duyệt → tra cứu chạy bằng dữ liệu thật trong môi trường thử |
| 6. Vi phạm, báo cáo tỉnh | 3–5 ngày | Theo dõi khắc phục, tái kiểm tra, dashboard và xuất báo cáo | Số tổng tỉnh khớp tổng theo xã cùng kỳ; báo cáo không vượt quyền |
| 7. Thí điểm và hoàn thiện | 5–7 ngày | Thử tại 2–3 xã/phường do chủ dự án chọn; kiểm thử, hiệu năng, khôi phục, hướng dẫn | Có biên bản lỗi đã xử lý, kiểm chứng khôi phục và kết quả người dùng |
| 8. Mở rộng 75 địa bàn | Theo kế hoạch vận hành | Cấp tài khoản theo đợt, nhập hồ sơ, đào tạo, theo dõi chất lượng dữ liệu | Mỗi địa bàn có người phụ trách và xác nhận sẵn sàng |

Tổng giai đoạn 0–7 khoảng 29–45 ngày làm việc cho một người triển khai tập trung, chưa tính thời gian chờ dữ liệu, xác nhận nghiệp vụ hoặc tích hợp bên ngoài. Giai đoạn 2 phải có trước khi dùng dữ liệu nghiệp vụ; giai đoạn 3 phụ thuộc nguồn ranh giới. Giấy phép/phản ánh có thể phát triển trước khi đủ ranh giới, nhưng nghiệm thu tỉnh cần hoàn thành cả hai.

## 9. Kiểm chứng và nghiệm thu

1. Kiểm thử tỉnh xem toàn bộ phạm vi được cấp; xã A không đọc/sửa/xuất hồ sơ hoặc ảnh xã B; cán bộ nhiều địa bàn chỉ thao tác đúng quyền; thay đổi phân công có hiệu lực theo thiết kế đã kiểm chứng.
2. Tạo giấy phép → chọn vị trí → xác nhận hồ sơ → hiển thị bản đồ → kiểm tra với ảnh thật → mở lại hồ sơ và xuất báo cáo. Kiểm thử công trình chưa có giấy phép và giấy phép điều chỉnh.
3. Gửi phản ánh → xác minh/giao xã → cán bộ kiểm tra → duyệt kết quả → người dân tra cứu; thử địa bàn sai, sát ranh, phản ánh trùng, chuyển đơn vị và quá hạn.
4. Kiểm chứng 75 mã/hình học và tính nhất quán bộ lọc. Không tính dữ liệu demo vào thống kê chính thức.
5. Kiểm thử dữ liệu thiếu, tải lỗi, nhập trùng, hai người sửa, thao tác gửi lại và mất mạng; không tạo hồ sơ/ảnh trùng hoặc báo thành công giả.
6. Thử bằng dữ liệu tổng hợp: đề xuất 10.000 công trình, 20.000 kiểm tra, 5.000 phản ánh và 50 người dùng đồng thời; chốt lại theo quy mô dự kiến. Mục tiêu tạm: phản hồi API danh sách/thống kê p95 ≤ 2 giây, bản đồ dùng được ≤ 5 giây trong điều kiện thử ghi rõ. Không tải toàn bộ hồ sơ để lọc tại trình duyệt.
7. Sao lưu và khôi phục trên môi trường riêng, đối chiếu hồ sơ và tệp; chốt mục tiêu mất dữ liệu/thời gian phục hồi trước vận hành. Build thành công không thay cho thử khôi phục.
8. Thử giao diện máy tính và điện thoại, biểu mẫu/ảnh/tọa độ, báo cáo có dấu tiếng Việt, dữ liệu nhạy cảm và đường dẫn tệp. Kiểm thử lại trên địa chỉ triển khai trước bàn giao.

Hồ sơ nghiệm thu gồm kết quả từng luồng, môi trường/phiên bản được thử, lỗi còn mở, báo cáo ranh giới, ma trận quyền, biên bản thí điểm và hướng dẫn vận hành. Chỉ ghi “đã hoàn thành” khi có bằng chứng tương ứng.

## 10. Dữ liệu và quyết định cần bổ sung

- Danh mục chính thức 75 xã/phường và ranh giới, nguồn, ngày hiệu lực/hệ tọa độ. Đây là đầu vào để nghiệm thu bản đồ tỉnh.
- Đơn vị đầu mối cấp tỉnh, đầu mối từng địa bàn và ma trận quyền xem/sửa/duyệt/xem thông tin người phản ánh.
- Mẫu giấy phép, biên bản, báo cáo và bộ hồ sơ thử đã loại thông tin nhạy cảm; thời hạn xử lý do đơn vị xác nhận.
- Làm rõ có cần quy trình cấp phép hành chính đầy đủ, ký số, cổng dịch vụ công hay chỉ quản lý giấy phép đã cấp.
- Quy mô hồ sơ/ảnh, yêu cầu lưu trữ, sao lưu, tên miền, nơi vận hành và ngân sách dịch vụ.

Các đầu vào chưa có được ghi “chưa xác minh”; không tự bịa mã xã, ranh giới hoặc thời hạn. Có thể bắt đầu khảo sát và dựng bản thử trước khi nhận đủ dữ liệu.

## 11. Thứ tự triển khai đề nghị

Bắt đầu bằng chạy và kiểm chứng `ttxd-sonla`, chốt giao diện kế thừa, khởi tạo bản riêng trong thư mục này rồi thiết kế địa bàn/phân quyền. Sau đó triển khai một luồng hoàn chỉnh ở 2–3 xã/phường: giấy phép → bản đồ → phản ánh → kiểm tra → báo cáo. Khi luồng và quyền đạt yêu cầu, nhập đủ ranh giới và mở rộng toàn tỉnh.

Những phần nâng cao như cấp phép hành chính, ký số, tích hợp dịch vụ công, lớp quy hoạch và đồng bộ ngoại tuyến đầy đủ lập thành giai đoạn bổ sung sau bản đầu.

## Kế hoạch nâng cấp được thống nhất ngày 14/10/2026

Chi tiết đợt cải thiện chọn vị trí, biểu mẫu điện thoại, trạng thái/số liệu và báo cáo điều hành, xuất Excel/PDF tại [kế hoạch nâng cấp trải nghiệm và báo cáo](./docs/KE_HOACH_NANG_CAP_TRAI_NGHIEM_BAO_CAO_2026-10-14.md).
