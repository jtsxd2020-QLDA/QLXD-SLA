'use client';
import { useMemo } from 'react';
import communes from '@/lib/communes.json';
import { rankCommunes } from '@/lib/search';
import type { CitizenReport, Permit } from '@/lib/types';

type Props = {
  permits: Permit[];
  reports: CitizenReport[];
  onSelectCommune: (code: string) => void;
};

function Ranking({ title, description, rows, onSelect }: {
  title: string;
  description: string;
  rows: ReturnType<typeof rankCommunes>;
  onSelect: (code: string) => void;
}) {
  const max = rows[0]?.count ?? 1;
  const renderRows = (items: typeof rows, start = 1) => <ol className="commune-ranking-list" start={start}>
    {items.map(item => <li key={item.code}>
      <button type="button" className="commune-ranking-row" onClick={() => onSelect(item.code)} aria-label={`${item.name}: ${item.count} hồ sơ; lọc địa bàn`}>
        <span className="commune-ranking-name">{item.name}</span>
        <span className="commune-ranking-track" aria-hidden="true"><i style={{ width: `${Math.max(4, item.count / max * 100)}%` }}/></span>
        <strong>{item.count.toLocaleString('vi-VN')}</strong>
      </button>
    </li>)}
  </ol>;
  const visible = rows.slice(0, 8);
  const remaining = rows.slice(8);

  return <section className="commune-ranking-card" aria-label={title}>
    <div className="section-heading"><div><h3>{title}</h3><p className="muted">{description}</p></div></div>
    {visible.length ? <>
      {renderRows(visible)}
      {remaining.length ? <details className="commune-ranking-more"><summary>Xem thêm {remaining.length} địa bàn có hồ sơ</summary>{renderRows(remaining, 9)}</details> : null}
    </> : <p className="muted commune-ranking-empty">Chưa có hồ sơ theo bộ lọc hiện tại.</p>}
  </section>;
}

export default function CommuneRankings({ permits, reports, onSelectCommune }: Props) {
  const permitRows = useMemo(() => rankCommunes(permits, communes), [permits]);
  const reportRows = useMemo(() => rankCommunes(reports, communes), [reports]);

  return <section className="panel commune-rankings">
    <div className="section-heading">
      <div><h2>Xếp hạng địa phương</h2><p className="muted">Địa bàn có nhiều hồ sơ đứng trước; chọn một dòng để lọc theo xã/phường.</p></div>
    </div>
    <div className="commune-ranking-grid">
      <Ranking title="Giấy phép xây dựng" description="Số GPXD đang hiển thị" rows={permitRows} onSelect={onSelectCommune}/>
      <Ranking title="Phản ánh người dân" description="Số phản ánh đang hiển thị" rows={reportRows} onSelect={onSelectCommune}/>
    </div>
  </section>;
}
