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
  return {
    permits: [...records.permits],
    reports: records.reports.map(record => record.communeCode === user.communeCode ? record : { ...record, reporterName: '', reporterPhone: '' }),
  };
}

export function filterInspectionsForUser(inspections: Inspection[], user: UserIdentity): Inspection[] {
  assertValidIdentity(user);
  return inspections;
}

export function scopeAnalyticsFilters(filters: AnalyticsFilters, user: UserIdentity): AnalyticsFilters {
  assertValidIdentity(user);
  if (filters.communeCode && !communes.some(commune => commune.code === filters.communeCode)) throw new WorkflowError(422, 'Địa bàn báo cáo không hợp lệ.');
  return filters;
}

export function assertSnapshotAccess(user: UserIdentity, snapshot: AnalyticsSnapshot): void {
  assertValidIdentity(user);
  if (user.role === 'province') return;
  if (!snapshot.access || snapshot.access.role !== 'commune' || snapshot.access.communeCode !== user.communeCode || snapshot.access.email !== user.email) throw new WorkflowError(403, 'Báo cáo không thuộc tài khoản đang đăng nhập. Hãy tạo báo cáo mới để tiếp tục.');
}
