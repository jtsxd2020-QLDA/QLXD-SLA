import { CheckCircle2, CircleHelp, Clock3 } from 'lucide-react';

type InspectionBadgeProps = {
  state: 'loading' | 'error' | 'ready';
  count: number;
  onClick?: () => void;
};

export default function InspectionBadge({ state, count, onClick }: InspectionBadgeProps) {
  const inspected = state === 'ready' && count > 0;
  const className = `inspection-badge inspection-badge-${state === 'ready' ? inspected ? 'recorded' : 'empty' : state}`;
  const label = state === 'loading' ? 'Đang tải kiểm tra…' : state === 'error' ? 'Chưa xác minh được' : inspected ? `Đã ghi nhận kiểm tra · ${count} lượt` : 'Chưa có bản ghi kiểm tra';
  const icon = state === 'loading' ? <Clock3 size={14} aria-hidden="true" /> : inspected ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleHelp size={14} aria-hidden="true" />;
  return onClick ? <button type="button" className={className} onClick={onClick} aria-label={`${label}. Xem thông tin kiểm tra thực địa`}>{icon}<span>{label}</span></button> : <span className={className} role="status">{icon}<span>{label}</span></span>;
}
