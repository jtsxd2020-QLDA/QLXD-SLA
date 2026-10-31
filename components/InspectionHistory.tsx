'use client';

import { ClipboardCheck, Plus, RotateCw } from 'lucide-react';
import InspectionBadge from './InspectionBadge';
import { formatInspectionDate, getLatestVerifiedInspection, getRemediationStatus, inspectionMapStatusLabel, inspectionResultLabel } from '@/lib/inspection-status';
import type { Inspection } from '@/lib/types';

type InspectionHistoryProps = {
  inspections: Inspection[];
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  onInspect?: () => void;
};

const sourceLabels = { real: 'Dữ liệu thực tế', demo: 'Dữ liệu minh họa', unknown: 'Nguồn chưa xác định' };

export default function InspectionHistory({ inspections, state, onRetry, onInspect }: InspectionHistoryProps) {
  const latest = state === 'ready' ? inspections[0] : undefined;
  const latestVerified = state === 'ready' ? getLatestVerifiedInspection(inspections) : undefined;
  return <section className="inspection-history" aria-label="Kiểm tra thực địa của hồ sơ">
    <h4><ClipboardCheck size={17} aria-hidden="true" />Kiểm tra thực địa</h4>
    <InspectionBadge state={state} count={inspections.length} />
    {state === 'loading' ? <p className="inspection-help">Đang đối chiếu các bản ghi liên kết với hồ sơ.</p> : state === 'error' ? <div className="inspection-load-error"><p>Chưa tải được dữ liệu kiểm tra. Không thể kết luận hồ sơ đã có bản ghi hay chưa.</p><button type="button" className="text-button" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />Thử tải lại</button></div> : latest ? <>
      <p className="inspection-latest">Lần kiểm tra gần nhất: <strong>{formatInspectionDate(latest.inspectionDate)}</strong> · {inspectionResultLabel(latest)}</p>
      {latestVerified ? <p className="inspection-confirmed">Kết luận đã xác minh được ưu tiên: <strong>{inspectionMapStatusLabel(latestVerified)}</strong> · {formatInspectionDate(latestVerified.inspectionDate)}</p> : <p className="inspection-help">Chưa có kết luận kiểm tra nào được xác minh.</p>}
      {latestVerified&&latest!==latestVerified?<p className="inspection-help">Lần kiểm tra mới hơn chưa xác minh; kết luận xác minh gần nhất vẫn được giữ riêng và không bị ghi đè.</p>:null}
      <details className="inspection-history-details">
        <summary>Xem lịch sử kiểm tra <span>({inspections.length} lượt)</span></summary>
        <ol className="inspection-history-list" aria-label="Các lần kiểm tra, mới nhất trước">
          {inspections.map(inspection => <li key={inspection.id}>
            <header><strong>{formatInspectionDate(inspection.inspectionDate)}</strong><span className="inspection-source">{sourceLabels[inspection.source] || sourceLabels.unknown}</span></header>
            <dl>
              <div><dt>Cán bộ kiểm tra</dt><dd>{inspection.inspector || 'Chưa có thông tin'}</dd></div>
              <div><dt>Kết quả</dt><dd>{inspectionResultLabel(inspection)}</dd></div>
              {inspection.legalBasis?<div><dt>Căn cứ pháp lý</dt><dd>{inspection.legalBasis}</dd></div>:null}
              {inspection.comparisonMaterials?<div><dt>Tài liệu/hồ sơ đối chiếu</dt><dd>{inspection.comparisonMaterials}</dd></div>:inspection.basis?<div><dt>Căn cứ cũ</dt><dd>{inspection.basis}</dd></div>:null}
              {inspection.verified&&['wrong_permit','unlicensed'].includes(inspection.result)?<div><dt>Khắc phục</dt><dd>{getRemediationStatus(inspection)==='corrected'?'Đã khắc phục':getRemediationStatus(inspection)==='pending'?'Cần khắc phục':'Chưa áp dụng'}</dd></div>:null}
              {inspection.notes ? <div><dt>Ghi chú</dt><dd>{inspection.notes}</dd></div> : null}
            </dl>
          </li>)}
        </ol>
      </details>
      <p className="inspection-help">Thông tin theo bản ghi đã nhập. Đối chiếu căn cứ để xác nhận việc kiểm tra thực địa.</p>
    </> : <p className="inspection-help">Chưa có bản ghi liên kết trong hệ thống. Thông tin này chưa đủ để kết luận công trình chưa từng được kiểm tra thực địa.</p>}
    {onInspect?<button type="button" className="button secondary small inspection-add" onClick={onInspect}><Plus size={15} aria-hidden="true" />Ghi kiểm tra</button>:null}
  </section>;
}
