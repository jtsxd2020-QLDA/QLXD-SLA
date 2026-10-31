export type QAEntry = {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  source: { title: string; section: string; reference: string };
};

const guide = (section: string) => ({
  title: 'Hướng dẫn sử dụng',
  section,
  reference: 'HUONG_DAN_SU_DUNG.md',
});

/** Answers are copied from the cited guide. Add licensing guidance only from approved official documents. */
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
];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
}

export function searchQAKnowledge(query: string): QAEntry[] {
  const needle = normalize(query);
  if (!needle) return QA_KNOWLEDGE;
  return QA_KNOWLEDGE.filter(entry => normalize(`${entry.question} ${entry.keywords.join(' ')} ${entry.answer}`).includes(needle));
}
