import communes from './communes.json';
import { WorkflowError } from './workflow';
import type { AnalyticsFilters, AnalyticsSnapshot, Inspection, RecordsResponse, UserIdentity } from './types';

export function assertValidIdentity(user: UserIdentity): void {
  if (!user || typeof user.email !== 'string' || !user.email || (user.role !== 'province' && user.role !== 'commune')) throw new WorkflowError(403, 'Tài khoản chưa được phân quyền hợp lệ.');
  if (user.role === 'province' && user.communeCode !== null) throw new WorkflowError(403, 'Phạm vi tài khoản cấp tỉnh không hợp lệ.');
  if (user.role === 'commune' && !communes.some(commune => commune.code === user.communeCode)) throw new WorkflowError(403, 'Tài khoản chưa được giao xã/phường hợp lệ.');
}

export function assertProvinceAccess(user: UserIdentity): void {
  assertValidIdentity(user);
  if (user.role !== 'province') throw new WorkflowError(403, 'Chỉ tài khoản cấp tỉnh được thực hiện thao tác này.');
}

export function assertCommuneAccess(user: UserIdentity, communeCode: string): void {
  assertValidIdentity(user);
  if (user.role === 'commune' && user.communeCode !== communeCode) throw new WorkflowError(403, 'Bạn chỉ được quản lý hồ sơ thuộc xã/phường được giao.');
}

export function assertRecordAccess(user: UserIdentity, record: {communeCode: string} | undefined): void {
  assertValidIdentity(user);
  if (!record) throw new WorkflowError(404, 'Không tìm thấy hồ sơ trong phạm vi được quản lý.');
  assertCommuneAccess(user, record.communeCode);
}

export function filterRecordsForUser(records: RecordsResponse, user: UserIdentity): RecordsResponse {
  assertValidIdentity(user);
  if (user.role === 'province') return records;
  return { permits: records.permits.filter(record => record.communeCode === user.communeCode), reports: records.reports.filter(record => record.communeCode === user.communeCode) };
}

export function filterInspectionsForUser(inspections: Inspection[], user: UserIdentity): Inspection[] {
  assertValidIdentity(user);
  return user.role === 'province' ? inspections : inspections.filter(record => record.communeCode === user.communeCode);
}

export function scopeAnalyticsFilters(filters: AnalyticsFilters, user: UserIdentity): AnalyticsFilters {
  assertValidIdentity(user);
  if (user.role === 'province') return filters;
  if (filters.communeCode) assertCommuneAccess(user, filters.communeCode);
  return { ...filters, communeCode: user.communeCode! };
}

export function assertSnapshotAccess(user: UserIdentity, snapshot: AnalyticsSnapshot): void {
  assertValidIdentity(user);
  if (user.role === 'province') return;
  if (!snapshot.access || snapshot.access.role !== 'commune' || snapshot.access.communeCode !== user.communeCode || snapshot.access.email !== user.email || snapshot.filters.communeCode !== user.communeCode) throw new WorkflowError(403, 'Báo cáo không thuộc phạm vi của tài khoản. Hãy tạo báo cáo mới cho xã/phường được giao.');
}
