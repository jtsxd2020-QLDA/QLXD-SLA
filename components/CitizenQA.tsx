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
    <div className="section-heading">
      <div>
        <span className="eyebrow">HỎI ĐÁP</span>
        <h2 id="citizen-qa-title">Hướng dẫn người dân</h2>
        <p className="muted">Tra cứu các bước xin GPXD xây mới, sửa chữa/cải tạo và giấy phép có thời hạn; mỗi mục kèm nguồn chính thức.</p>
      </div>
    </div>
    <label className="search-box citizen-qa-search">
      <Search size={17} aria-hidden="true"/>
      <input
        type="search"
        aria-label="Tìm trong hướng dẫn và câu hỏi thường gặp"
        placeholder="Tìm xây mới, cải tạo, giấy phép có thời hạn…"
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
    </label>
    {entries.length ? <div className="citizen-qa-list">
      {entries.map(entry => <details key={entry.id} className="citizen-qa-item">
        <summary>{entry.question}</summary>
        <p className="citizen-qa-answer">{renderAnswer(entry.answer)}</p>
        <p className="citizen-qa-source">
          <strong>Nguồn:</strong> {entry.source.title} · {entry.source.section}
          {entry.source.links?.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>)}
          {!entry.source.links?.length && <span> ({entry.source.reference})</span>}
        </p>
      </details>)}
    </div> : <p className="boundary-note" role="status">Chưa tìm thấy nội dung phù hợp. Hãy thử từ khóa “xây mới”, “cải tạo” hoặc “có thời hạn”, hoặc tra thủ tục đang công bố trên Cổng Dịch vụ công.</p>}
    <p className="muted citizen-qa-scope">Danh mục và thời hạn trong hướng dẫn được tổng hợp từ văn bản hiện hành. Thành phần hồ sơ, biểu mẫu và lệ phí có thể phụ thuộc loại công trình và thủ tục địa phương đang công bố; hãy kiểm tra nguồn chính thức trước khi nộp.</p>
  </section>;
}
