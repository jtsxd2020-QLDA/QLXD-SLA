import { listInspections, listRecords } from './persistence';
import { assertCommuneAccess, assertRecordAccess } from './authorization';
import type { InspectionInput, RecordKind, UserIdentity } from './types';
import { WorkflowError } from './workflow';

export async function requireRecordAccess(user: UserIdentity, kind: RecordKind, id: string, includeDeleted = false) {
  if (kind === 'inspection') {
    const record = (await listInspections(includeDeleted)).find(item => item.id === id);
    assertRecordAccess(user, record);
    return;
  }
  const records = await listRecords(includeDeleted);
  assertRecordAccess(user, (kind === 'permit' ? records.permits : records.reports).find(item => item.id === id));
}

export async function requireInspectionLinks(user: UserIdentity, input: InspectionInput) {
  assertCommuneAccess(user, input.communeCode);
  if (!input.permitId && !input.reportId) return;
  const records = await listRecords();
  for (const [kind, id] of [['permit', input.permitId], ['report', input.reportId]] as const) {
    if (!id) continue;
    const linked = (kind === 'permit' ? records.permits : records.reports).find(record => record.id === id);
    assertRecordAccess(user, linked);
    if (linked!.communeCode !== input.communeCode) throw new WorkflowError(422, 'Hồ sơ kiểm tra và hồ sơ liên kết phải cùng xã/phường.');
  }
}
