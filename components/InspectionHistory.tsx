'use client';

import { ClipboardCheck, Plus, RotateCw } from 'lucide-react';
import InspectionBadge from './InspectionBadge';
import { formatInspectionDate, inspectionResultLabel } from '@/lib/inspection-status';
import type { Inspection } from '@/lib/types';

type InspectionHistoryProps = {
  inspections: Inspection[];
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  onInspect: () => void;
};

const sourceLabels = { real: 'Dữ liệu thực tế', demo: 'Dữ liệu minh họa', unknown: 'Nguồn chưa xác định' };

export default function InspectionHistory({ inspections, state, onRetry, onInspect }: InspectionHistoryProps) {
  const latest = state === 'ready' ? inspections[0] : undefined;
  return <section className="inspection-history" aria-label="Kiểm tra thực địa của hồ sơ">
    <h4><ClipboardCheck size={17} aria-hidden="true" />Kiểm tra thực địa</h4>
    <InspectionBadge state={state} count={inspections.length} />
    {state === 'loading' ? <p className="inspection-help">Đang đối chiếu các bản ghi liên kết với hồ sơ.</p> : state === 'error' ? <div className="inspection-load-error"><p>Chưa tải được dữ liệu kiểm tra. Không thể kết luận hồ sơ đã có bản ghi hay chưa.</p><button type="button" className="text-button" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />Thử tải lại</button></div> : latest ? <>
      <p className="inspection-latest">Lần gần nhất: <strong>{formatInspectionDate(latest.inspectionDate)}</strong></p>
      <p className="inspection-help">{inspectionResultLabel(latest)}</p>
      <details className="inspection-history-details">
        <summary>Xem lịch sử kiểm tra <span>({inspections.length} lượt)</span></summary>
        <ol className="inspection-history-list" aria-label="Các lần kiểm tra, mới nhất trước">
          {inspections.map(inspection => <li key={inspection.id}>
            <header><strong>{formatInspectionDate(inspection.inspectionDate)}</strong><span className="inspection-source">{sourceLabels[inspection.source] || sourceLabels.unknown}</span></header>
            <dl>
              <div><dt>Cán bộ kiểm tra</dt><dd>{inspection.inspector || 'Chưa có thông tin'}</dd></div>
              <div><dt>Kết quả</dt><dd>{inspectionResultLabel(inspection)}</dd></div>
              <div><dt>Căn cứ đối chiếu</dt><dd>{inspection.basis || 'Chưa ghi căn cứ đối chiếu'}</dd></div>
              {inspection.notes ? <div><dt>Ghi chú</dt><dd>{inspection.notes}</dd></div> : null}
            </dl>
          </li>)}
        </ol>
      </details>
      <p className="inspection-help">Thông tin theo bản ghi đã nhập. Đối chiếu căn cứ để xác nhận việc kiểm tra thực địa.</p>
    </> : <p className="inspection-help">Chưa có bản ghi liên kết trong hệ thống. Thông tin này chưa đủ để kết luận công trình chưa từng được kiểm tra thực địa.</p>}
    <button type="button" className="button secondary small inspection-add" onClick={onInspect}><Plus size={15} aria-hidden="true" />Ghi kiểm tra</button>
  </section>;
}
