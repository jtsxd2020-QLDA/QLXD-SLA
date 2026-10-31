'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { searchQAKnowledge } from '@/lib/qa-knowledge';

function renderAnswer(answer: string) {
  return answer.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

export default function CitizenQA() {
  const [query, setQuery] = useState('');
  const entries = useMemo(() => searchQAKnowledge(query), [query]);

  return <section className="panel citizen-qa" aria-labelledby="citizen-qa-title">
    <div className="section-heading"><div><span className="eyebrow">HỎI ĐÁP</span><h2 id="citizen-qa-title">Hướng dẫn người dân</h2><p className="muted">Câu trả lời được trích từ tài liệu hướng dẫn, kèm nguồn.</p></div></div>
    <label className="search-box citizen-qa-search"><Search size={17} aria-hidden="true"/><input type="search" aria-label="Tìm trong câu hỏi thường gặp" placeholder="Tìm gửi phản ánh, vị trí, mã tiếp nhận…" value={query} onChange={event => setQuery(event.target.value)}/></label>
    {entries.length ? <div className="citizen-qa-list">{entries.map(entry => <details key={entry.id} className="citizen-qa-item"><summary>{entry.question}</summary><p className="citizen-qa-answer">{renderAnswer(entry.answer)}</p><p className="citizen-qa-source"><strong>Nguồn:</strong> {entry.source.title} · {entry.source.section} <span>({entry.source.reference})</span></p></details>)}</div> : <p className="boundary-note" role="status">Chưa tìm thấy câu trả lời trong tài liệu hướng dẫn hiện có. Nội dung về giấy phép xây dựng sẽ được bổ sung khi có tài liệu chính thức được duyệt.</p>}
    <p className="muted citizen-qa-scope">Phần hỏi đáp hiện hướng dẫn cách sử dụng phần mềm. Nội dung pháp lý về cấp phép chưa được đưa vào khi chưa có nguồn chính thức.</p>
  </section>;
}
