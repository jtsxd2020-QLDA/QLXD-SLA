export type QAEntry = {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  source: {
    title: string;
    section: string;
    reference: string;
    links?: { label: string; url: string }[];
  };
};

const guide = (section: string) => ({
  title: 'Hướng dẫn sử dụng',
  section,
  reference: 'HUONG_DAN_SU_DUNG.md',
});

/** Nội dung thủ tục được đối chiếu với văn bản chính thức đang có hiệu lực. */
const constructionLawSource = {
  title: 'Luật Xây dựng 2025 · Nghị định 217/2026/NĐ-CP',
  section: 'Điều kiện, hồ sơ và trình tự cấp giấy phép xây dựng',
  reference: 'Văn bản chính thức',
  links: [
    {
      label: 'Nghị định 217/2026/NĐ-CP',
      url: 'https://vanban.chinhphu.vn/?docid=218509&orggroupid=2&pageid=27160',
    },
    {
      label: 'Bộ Xây dựng: quy định mới về cấp phép',
      url: 'https://moc.gov.vn/vn/Pages/chitiettin.aspx?ChuyenmucID=1196&IDNews=94915',
    },
  ],
};

export const QA_KNOWLEDGE: QAEntry[] = [
  {
    id: 'view-map',
    question: 'Tôi xem bản đồ và tra cứu công trình thế nào?',
    keywords: ['bản đồ', 'tra cứu', 'tìm kiếm', 'mã hồ sơ', 'giấy phép'],
    answer: 'Chọn xã/phường, tìm mã GPXD hoặc mã phản ánh, rồi bấm điểm trên bản đồ để xem trạng thái công khai.',
    source: guide('Người dân: xem bản đồ và gửi phản ánh'),
  },
  {
    id: 'send-report',
    question: 'Tôi gửi phản ánh xây dựng ở đâu?',
    keywords: ['gửi phản ánh', 'địa chỉ', 'vị trí', 'tọa độ'],
    answer: '1. Bấm **Gửi phản ánh**.\n2. Chọn nhóm, mô tả nội dung và địa chỉ. Tên, số điện thoại có thể để trống.\n3. Bấm **Chọn trên bản đồ**, chạm đúng vị trí công trình; kiểm tra xã/phường được nhận diện.\n4. Bấm **Gửi phản ánh** và lưu lại mã tiếp nhận hiện trên màn hình.',
    source: guide('Người dân: xem bản đồ và gửi phản ánh'),
  },
  {
    id: 'receipt-code',
    question: 'Gửi phản ánh xong, tôi cần giữ thông tin gì?',
    keywords: ['mã tiếp nhận', 'mã tra cứu', 'theo dõi', 'đã gửi'],
    answer: 'Bấm **Gửi phản ánh** và lưu lại mã tiếp nhận hiện trên màn hình.',
    source: guide('Người dân: xem bản đồ và gửi phản ánh'),
  },
  {
    id: 'contact-optional',
    question: 'Tôi có bắt buộc ghi tên và số điện thoại không?',
    keywords: ['tên', 'số điện thoại', 'liên hệ', 'ẩn danh'],
    answer: 'Tên, số điện thoại có thể để trống.',
    source: guide('Người dân: xem bản đồ và gửi phản ánh'),
  },
  {
    id: 'public-privacy',
    question: 'Thông tin nào của tôi xuất hiện trên bản đồ công khai?',
    keywords: ['công khai', 'riêng tư', 'bảo mật', 'thông tin cá nhân', 'nội dung'],
    answer: 'Thông tin liên hệ và nội dung đầy đủ được mã hóa trong hồ sơ quản lý. Bản đồ công khai chỉ hiện mã và trạng thái, không hiện thông tin cá nhân hay mô tả chi tiết.',
    source: guide('Người dân: xem bản đồ và gửi phản ánh'),
  },
  {
    id: 'permit-new-home',
    question: 'Xin giấy phép xây nhà mới: cần chuẩn bị gì và nộp ở đâu?',
    keywords: ['xây mới', 'xin phép xây nhà', 'GPXD mới', 'giấy phép xây dựng', 'hồ sơ xây mới', 'đơn xin phép', 'nộp hồ sơ GPXD'],
    answer: 'Trước hết, hỏi UBND xã/phường nơi có đất để xác định công trình có phải xin phép hay thuộc diện miễn. Một số nhà ở riêng lẻ dưới 7 tầng, tổng diện tích sàn dưới 500 m² chỉ được miễn khi đồng thời không nằm trong các khu vực quy hoạch hoặc khu vực có quy chế quản lý kiến trúc mà luật liệt kê; không nên tự kết luận được miễn chỉ từ số tầng, diện tích.\n\nHồ sơ nhà ở riêng lẻ thường gồm:\n1. Đơn đề nghị theo mẫu hiện hành trên Cổng Dịch vụ công.\n2. Một giấy tờ hợp pháp về quyền sử dụng đất theo quy định.\n3. Hồ sơ thiết kế phù hợp: sơ đồ vị trí và mặt bằng công trình trên lô đất, mặt bằng các tầng, mặt đứng/mặt cắt, bản vẽ móng và sơ đồ đấu nối hạ tầng; giấy tờ về an toàn công trình liền kề hoặc tài liệu chuyên ngành nếu trường hợp của bạn yêu cầu.\n\nTrình tự nộp:\n1. Chuẩn bị hồ sơ và chọn thủ tục cấp phép xây dựng mới cho nhà ở riêng lẻ.\n2. Nộp tại Trung tâm Phục vụ hành chính công/điểm tiếp nhận của UBND cấp xã nơi có đất, hoặc nộp trực tuyến nếu thủ tục trên Cổng Dịch vụ công hỗ trợ; lưu mã biên nhận. Với nhà ở riêng lẻ của hộ gia đình, cá nhân, UBND cấp xã thường là cơ quan cấp phép; công trình thuộc khu công nghiệp, khu chế xuất, khu công nghệ cao hoặc khu kinh tế có thể theo thẩm quyền khác.\n3. Theo dõi hồ sơ, bổ sung đúng nội dung được yêu cầu và nộp lệ phí theo mức đang công bố tại địa phương.\n4. Nhận giấy phép cùng bản vẽ được duyệt; chỉ khởi công theo nội dung giấy phép.\n\nThời hạn xử lý đối với nhà ở riêng lẻ là 07 ngày làm việc kể từ khi nhận đủ hồ sơ hợp lệ theo Nghị định 217/2026/NĐ-CP; xem thủ tục đang công bố để biết mốc hẹn áp dụng cho hồ sơ cụ thể.',
    source: {
      ...constructionLawSource,
      section: 'Miễn phép, thẩm quyền, hồ sơ và thời hạn giải quyết nhà ở riêng lẻ',
    },
  },
  {
    id: 'permit-renovation',
    question: 'Sửa chữa hoặc cải tạo nhà: trường hợp nào cần phép, hồ sơ ra sao?',
    keywords: ['cải tạo', 'sửa chữa', 'sửa nhà', 'nâng tầng', 'cơi nới', 'đổi mặt tiền', 'điều chỉnh GPXD'],
    answer: 'Một số việc bảo trì, sửa chữa nhỏ có thể được miễn giấy phép; việc có thay đổi kết cấu chịu lực, quy mô, công năng hoặc mặt ngoài thuộc khu vực có yêu cầu quản lý có thể phải xin phép. Hãy mô tả phạm vi sửa chữa và hỏi UBND xã/phường nơi có nhà trước khi thi công nếu chưa rõ.\n\nHồ sơ thường cần:\n1. Đơn đề nghị cấp giấy phép sửa chữa, cải tạo theo mẫu hiện hành.\n2. Giấy tờ hợp pháp về quyền sở hữu/quản lý/sử dụng nhà, công trình hoặc giấy phép xây dựng đã cấp.\n3. Bản vẽ hiện trạng phần công trình dự kiến sửa và bản vẽ thiết kế phần sửa chữa, cải tạo.\n4. Ảnh hiện trạng công trình và công trình lân cận; cam kết bảo đảm an toàn công trình liền kề hoặc giấy tờ chuyên ngành nếu thuộc trường hợp phải có.\n\nTrình tự: chọn thủ tục sửa chữa, cải tạo trên Cổng Dịch vụ công; nộp hồ sơ tại điểm tiếp nhận của UBND cấp xã nơi có công trình hoặc trực tuyến nếu thủ tục hỗ trợ; lưu mã biên nhận; theo dõi yêu cầu bổ sung, nộp lệ phí theo công bố địa phương, rồi nhận giấy phép và bản vẽ được duyệt. Đối với nhà ở riêng lẻ, thời hạn theo Nghị định 217/2026/NĐ-CP là 07 ngày làm việc kể từ khi nhận đủ hồ sơ hợp lệ. Chỉ thi công trong phạm vi được cấp phép.',
    source: {
      ...constructionLawSource,
      section: 'Hồ sơ sửa chữa, cải tạo và thời hạn giải quyết',
    },
  },
  {
    id: 'permit-time-limited',
    question: '“Giấy phép xây dựng tạm” là gì, điều kiện và cách nộp thế nào?',
    keywords: ['giấy phép tạm', 'giấy phép xây dựng tạm', 'có thời hạn', 'GPXD tạm', 'công trình tạm', 'xây dựng trong quy hoạch', 'giấy phép có thời hạn Sơn La'],
    answer: 'Trong thủ tục cấp phép, “giấy phép tạm” thường được hiểu là **giấy phép xây dựng có thời hạn**. Loại giấy phép này áp dụng trong điều kiện luật định, điển hình là khu vực đã có quy hoạch được công bố nhưng chưa thực hiện và chưa có quyết định thu hồi đất. Công trình còn phải phù hợp mục đích sử dụng đất và quy mô, chiều cao, thời gian tồn tại do tỉnh quy định. Vì vậy, cần hỏi UBND xã/phường nơi có đất để kiểm tra quy hoạch và giới hạn áp dụng tại vị trí cụ thể.\n\nHồ sơ cơ bản theo loại công trình như hồ sơ xin phép xây mới hoặc sửa chữa, cải tạo; dùng mẫu đơn có tiêu đề **Đơn đề nghị cấp giấy phép xây dựng có thời hạn**. Nộp tại điểm tiếp nhận/Trung tâm Phục vụ hành chính công cấp xã hoặc trực tuyến theo thủ tục đang công bố, nhận mã biên nhận, bổ sung hồ sơ nếu được yêu cầu, theo dõi kết quả và lệ phí. Giấy phép sẽ ghi thời hạn tồn tại. Khi Nhà nước thực hiện quy hoạch và có quyết định thu hồi đất, chủ đầu tư có trách nhiệm tự phá dỡ phần công trình theo quy định.\n\nLưu ý: giấy phép xây dựng có thời hạn khác với thủ tục xây dựng công trình tạm phục vụ sự kiện. Sơn La có quy định riêng về cả hai nội dung tại Quyết định 71/2026/QĐ-UBND; hãy mở văn bản và hỏi cơ quan tiếp nhận để xác định đúng thủ tục trước khi chuẩn bị hồ sơ.',
    source: {
      title: 'Nghị định 217/2026/NĐ-CP · Quyết định 71/2026/QĐ-UBND tỉnh Sơn La',
      section: 'Điều kiện và hồ sơ cấp phép có thời hạn; quy định địa phương về công trình tạm',
      reference: 'Văn bản chính thức',
      links: [
        {
          label: 'Nghị định 217/2026/NĐ-CP',
          url: 'https://vanban.chinhphu.vn/?docid=218509&orggroupid=2&pageid=27160',
        },
        {
          label: 'Quyết định 71/2026/QĐ-UBND Sơn La',
          url: 'https://congbao.sonla.gov.vn/van-ban/13027',
        },
      ],
    },
  },
];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
}

export function searchQAKnowledge(query: string): QAEntry[] {
  const needle = normalize(query);
  if (!needle) return QA_KNOWLEDGE;
  return QA_KNOWLEDGE.filter(entry => normalize(`${entry.question} ${entry.keywords.join(' ')} ${entry.answer}`).includes(needle));
}
