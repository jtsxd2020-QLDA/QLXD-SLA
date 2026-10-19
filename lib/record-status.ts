import type { ConstructionStatus } from './types';

export const constructionStatusOptions: { value: ConstructionStatus; label: string }[] = [
  { value: 'uninspected', label: 'Chưa kiểm tra' },
  { value: 'not_started', label: 'Chưa thi công' },
  { value: 'under_construction', label: 'Đang thi công' },
  { value: 'completed', label: 'Đã hoàn thành' },
];

export function getConstructionStatus(value?: string): ConstructionStatus {
  return value === 'not_started' || value === 'under_construction' || value === 'completed' ? value : 'uninspected';
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
