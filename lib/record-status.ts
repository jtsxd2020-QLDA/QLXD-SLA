import type { ConstructionStatus, InspectionResult, MapRecord } from './types';
import { inspectionMapStatusLabel } from './inspection-status';

export const constructionStatusOptions: { value: ConstructionStatus; label: string }[] = [
  { value: 'uninspected', label: 'Chưa thi công' },
  { value: 'under_construction', label: 'Đang thi công' },
  { value: 'completed', label: 'Đã hoàn thành' },
];

export function getConstructionStatus(value?: string): ConstructionStatus {
  return value === 'under_construction' || value === 'completed' ? value : 'uninspected';
}

export function constructionStatusLabel(value?: string): string {
  return constructionStatusOptions.find(option => option.value === getConstructionStatus(value))!.label;
}

export function reportStatusLabel(value: string): string {
  return ({ received: 'Chưa xử lý', processing: 'Chưa xử lý · Đang giải quyết', resolved: 'Đã xử lý' } as Record<string, string>)[value] || 'Chưa xử lý';
}

export function reportStatusColor(value: string): 'unresolved' | 'resolved' {
  return value === 'resolved' ? 'resolved' : 'unresolved';
}

export type MapStatusFilter = 'all'|'licensed'|'uninspected'|'under_construction'|'completed'|'inspected'|'wrong_permit'|'unlicensed'|'no_permit_presented'|'needs_verification'|'corrected';

export const mapStatusOptions: {value:MapStatusFilter;label:string}[] = [
  {value:'all',label:'Tất cả tình trạng'},
  {value:'licensed',label:'Đã cấp phép'},
  {value:'uninspected',label:'Chưa thi công'},
  {value:'under_construction',label:'Đang thi công'},
  {value:'completed',label:'Đã hoàn thành'},
  {value:'inspected',label:'Đã kiểm tra'},
  {value:'wrong_permit',label:'Thi công sai giấy phép'},
  {value:'unlicensed',label:'Thi công không có GPXD'},
  {value:'no_permit_presented',label:'Chưa xuất trình GPXD · cần xác minh'},
  {value:'needs_verification',label:'Cần xác minh'},
  {value:'corrected',label:'Đã khắc phục vi phạm'},
];

export function matchesMapStatus(record:MapRecord, filter:MapStatusFilter):boolean {
  if(filter==='all')return true;
  if(filter==='licensed')return record.kind==='permit';
  if(filter==='uninspected'||filter==='under_construction'||filter==='completed')return record.kind==='permit'&&getConstructionStatus(record.constructionStatus)===filter;
  if(filter==='inspected')return record.kind==='inspection'||record.hasInspection===true;
  if(filter==='wrong_permit'||filter==='unlicensed')return record.latestVerifiedResult===filter;
  if(filter==='no_permit_presented')return record.latestInspectionResult==='no_permit_presented'||record.latestVerifiedResult==='no_permit_presented';
  if(filter==='corrected')return record.remediationStatus==='corrected';
  return record.hasInspection===true&&!record.hasVerifiedInspection;
}

const findingLabels: Partial<Record<InspectionResult, string>> = {
  compliant: 'Đã kiểm tra · phù hợp GPXD',
  wrong_permit: 'Thi công sai giấy phép',
  unlicensed: 'Thi công không có GPXD',
  no_permit_presented: 'Chưa xuất trình GPXD · cần xác minh',
  unverified: 'Cần xác minh',
};

/** Show the newest verified field conclusion ahead of the permit's progress label. */
export function mapRecordStatusLabel(record: MapRecord): string {
  if (record.kind === 'inspection' && record.inspection) return inspectionMapStatusLabel(record.inspection);
  if (record.remediationStatus === 'corrected') return 'Đã khắc phục vi phạm';
  if (record.latestVerifiedResult) return findingLabels[record.latestVerifiedResult] || 'Đã kiểm tra';
  if (record.latestInspectionResult) return findingLabels[record.latestInspectionResult] || 'Cần xác minh';
  if (record.kind === 'permit') return constructionStatusLabel(record.constructionStatus);
  if (record.kind === 'report') return reportStatusLabel(record.status);
  return inspectionMapStatusLabel(record.inspection);
}
