# Bộ đối soát độc lập nâng cấp

Phạm vi: chỉ dữ liệu tổng hợp QA, không dùng hồ sơ production. Các giá trị mong đợi dưới đây được tính thủ công trước khi chạy code báo cáo.

## Mốc thời gian Việt Nam

Tháng 09/2026 bắt đầu `2026-08-31T17:00:00.000Z`, kết thúc trước `2026-09-30T17:00:00.000Z`. Hồ sơ lúc `2026-09-30T16:59:59.999Z` thuộc tháng 09; hồ sơ lúc `2026-09-30T17:00:00.000Z` thuộc tháng 10. Ngày cấp và ngày kiểm tra `2026-09-30` giữ nguyên ngày, không đổi thành 01/10 theo giờ địa phương.

## Hồ sơ QA

GPXD A: địa bàn A, real, cấp 31/08, nhập 01/09 VN.
GPXD B: địa bàn B, demo, cấp 30/09, nhập cuối tháng 09 VN.
GPXD C: địa bàn A, thiếu dấu nguồn (unknown), cấp 01/09, nhập đúng đầu tháng 10 VN.
GPXD D: địa bàn B, real, cấp 01/10, nhập đầu tháng 10 VN.

Phản ánh R1: A, real, unlicensed, tiếp nhận đầu tháng 09; hiện processing; hoàn tất 10/09, mở lại 11/09, hoàn tất 12/09, mở lại 01/10.
R2: B, demo, wrong_permit, tiếp nhận cuối tháng 09; hiện resolved; hoàn tất đầu tháng 10 VN.
R3: A, thiếu dấu nguồn, safety, tiếp nhận đúng đầu tháng 10; hiện received.
R4: B, real, other, tiếp nhận tháng 08; hiện received.
R5: A, real, wrong_permit, tiếp nhận tháng 09; hiện resolved nhưng không có lịch sử đầy đủ (legacy).

Kiểm tra I1: A, real, công trình P1, 05/09, sai nội dung GPXD, verified.
I2: A, real, cùng P1, 20/09, phù hợp GPXD, verified.
I3: B, demo, P2, 30/09, sai nội dung GPXD, verified.
I4: A, real, công trình P3, 30/09, chưa xuất trình GPXD, unverified.
I5: A, real, P1, 01/10, sai nội dung GPXD, verified.

## Kết quả mong đợi tháng 09, tất cả nguồn

- GPXD cấp: 2 (B, C); GPXD nhập: 2 (A, B).
- Phản ánh tiếp nhận: 3 (R1, R2, R5).
- Sự kiện hoàn tất: 2; hồ sơ hoàn tất duy nhất: 1 (R1). R5 legacy không được bịa sự kiện hoàn tất.
- Chưa hoàn tất hiện tại trong tập tiếp nhận kỳ: 1 (R1).
- Chưa hoàn tất hiện tại không lọc kỳ: 3 (R1, R3, R4); phải có nhãn phạm vi riêng.
- Lượt kiểm tra: 4; công trình riêng biệt: 3; kết luận xác minh sai phép: 2; chưa xác minh: 1.
- Gần nhất đến hết kỳ: 3 công trình (I2, I3, I4), sai phép verified: 1. Không được lấy I5 tương lai.
- Tồn cuối kỳ lịch sử: chưa đủ dữ liệu vì R5 thiếu lịch sử.

## Bộ lọc

Real tháng 09: GPXD cấp 0, GPXD nhập 1, phản ánh nhận 2, sự kiện hoàn tất 2, hồ sơ hoàn tất 1, lượt kiểm tra 3, công trình 2.
Demo tháng 09: GPXD cấp 1, nhập 1, phản ánh nhận 1, hoàn tất 0, lượt kiểm tra 1.
Unknown tháng 09: GPXD cấp 1, nhập 0, phản ánh nhận 0, kiểm tra 0.
Địa bàn A tháng 09/all: GPXD cấp 1, nhập 1, phản ánh nhận 2, lượt kiểm tra 3.
Địa bàn B tháng 09/all: GPXD cấp 1, nhập 1, phản ánh nhận 1, lượt kiểm tra 1.
Tổng A+B phải bằng tổng tỉnh cùng bộ lọc và cùng snapshot.

Loại wrong_permit chỉ tác động nhóm phản ánh/kiểm tra liên kết; không âm thầm loại GPXD. Các giá trị nguồn thiếu mặc định unknown, không suy ra real từ tên hoặc ghi chú.

## Gates bảo mật và tệp

Ẩn danh không đọc report/export/update/inspection. Phiên có cookie thiếu CSRF không ghi được. Version cũ báo xung đột, không ghi đè. Hai submit đồng thời cùng request key tạo đúng một hồ sơ; key dùng lại với payload khác báo xung đột. JSON công khai và tệp mặc định không chứa tên, số điện thoại, nội dung liên hệ riêng. Excel text bắt đầu =/+/-/@ không có ô formula; PDF đọc được tiếng Việt, đối soát số liệu, có báo cáo rỗng.

Trạng thái: đây là bảng kỳ vọng trước thực thi, chưa phải kết quả PASS.
