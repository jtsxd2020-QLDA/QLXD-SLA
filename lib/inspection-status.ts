import type { Inspection } from './types';

export type InspectionLoadState = 'loading' | 'error' | 'ready';
export type InspectionFilter = 'all' | 'recorded' | 'unrecorded';
export type InspectionIndex = Map<string, Inspection[]>;

const emptyInspections: Inspection[] = [];

/** Only explicit record links establish inspection history; a site name is not an ID. */
export function buildInspectionIndex(inspections: Inspection[]): InspectionIndex {
  const index: InspectionIndex = new Map();
  for (const inspection of inspections) {
    if (inspection.deletedAt) continue;
    const keys = [inspection.permitId ? `permit:${inspection.permitId}` : '', inspection.reportId ? `report:${inspection.reportId}` : ''];
    for (const key of keys) {
      if (!key) continue;
      const history = index.get(key);
      if (history) history.push(inspection);
      else index.set(key, [inspection]);
    }
  }
  for (const history of index.values()) history.sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  return index;
}

export function getRecordInspections(index: InspectionIndex, kind: 'permit' | 'report', id: string): Inspection[] {
  return index.get(`${kind}:${id}`) ?? emptyInspections;
}

export function isVerifiedInspection(inspection: Inspection): boolean {
  return inspection.verified && inspection.result !== 'unverified';
}

/** Histories are sorted newest first, so this preserves the newest confirmed conclusion. */
export function getLatestVerifiedInspection(inspections: Inspection[]): Inspection | undefined {
  return inspections.find(isVerifiedInspection);
}

export function getPreferredInspection(inspections: Inspection[]): Inspection | undefined {
  return getLatestVerifiedInspection(inspections) || inspections[0];
}

export function getRemediationStatus(inspection?: Inspection): 'not_applicable' | 'pending' | 'corrected' {
  if (!inspection) return 'not_applicable';
  if (inspection.result === 'no_permit_presented') return 'not_applicable';
  if (inspection.remediationStatus) return inspection.remediationStatus;
  return isVerifiedInspection(inspection) && ['wrong_permit', 'unlicensed'].includes(inspection.result) ? 'pending' : 'not_applicable';
}

export function inspectionMapStatus(inspection?: Inspection): string | undefined {
  if (!inspection) return undefined;
  if (getRemediationStatus(inspection) === 'corrected') return 'corrected';
  if (!isVerifiedInspection(inspection)) return 'needs_verification';
  if (inspection.result === 'wrong_permit') return 'wrong_permit';
  if (inspection.result === 'unlicensed') return 'unlicensed';
  if (inspection.result === 'no_permit_presented') return 'no_permit_presented';
  return 'inspected';
}

export function matchesInspectionFilter(index: InspectionIndex, kind: 'permit' | 'report', id: string, filter: InspectionFilter, state: InspectionLoadState): boolean {
  if (filter === 'all') return true;
  if (state !== 'ready') return false;
  const recorded = getRecordInspections(index, kind, id).length > 0;
  return filter === 'recorded' ? recorded : !recorded;
}

export function inspectionResultLabel(inspection: Inspection): string {
  if (!inspection.verified || inspection.result === 'unverified') return 'Chưa đủ cơ sở xác minh';
  return ({ compliant: 'Phù hợp nội dung GPXD', wrong_permit: 'Sai nội dung GPXD', unlicensed: 'Thi công không có GPXD', no_permit_presented: 'Chưa xuất trình GPXD · cần xác minh', remediated: 'Đã khắc phục vi phạm' })[inspection.result] || 'Chưa đủ cơ sở xác minh';
}

export function inspectionMapStatusLabel(inspection?: Inspection): string {
  if (!inspection) return 'Chưa có kết luận kiểm tra';
  const status = inspectionMapStatus(inspection);
  return ({
    corrected: 'Đã khắc phục vi phạm',
    needs_verification: 'Cần xác minh',
    wrong_permit: 'Thi công sai giấy phép',
    unlicensed: 'Thi công không có GPXD',
    no_permit_presented: 'Chưa xuất trình GPXD · cần xác minh',
    inspected: 'Đã kiểm tra · phù hợp GPXD',
  } as Record<string, string>)[status || ''] || 'Chưa có kết luận kiểm tra';
}

export function formatInspectionDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Chưa xác định';
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Chưa xác định';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}
