import { listInspections, listRecords } from './persistence';
import { assertCommuneAccess, assertRecordAccess } from './authorization';
import type { Inspection, InspectionInput, RecordKind, UserIdentity } from './types';
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
  if (input.priorInspectionId) {
    const prior = (await listInspections()).find(item => item.id === input.priorInspectionId);
    assertRemediationLink(user, input, prior);
  }
  if (!input.permitId && !input.reportId) return;
  const records = await listRecords();
  for (const [kind, id] of [['permit', input.permitId], ['report', input.reportId]] as const) {
    if (!id) continue;
    const linked = (kind === 'permit' ? records.permits : records.reports).find(record => record.id === id);
    assertRecordAccess(user, linked);
    if (linked!.communeCode !== input.communeCode) throw new WorkflowError(422, 'Hồ sơ kiểm tra và hồ sơ liên kết phải cùng xã/phường.');
  }
}

/** A correction is an explicit later inspection of the same recorded violation. */
export function assertRemediationLink(user: UserIdentity, input: InspectionInput, prior?: Inspection) {
  assertRecordAccess(user, prior);
  if (!prior || prior.deletedAt || !prior.verified || !['wrong_permit', 'unlicensed'].includes(prior.result) || prior.remediationStatus === 'corrected')
    throw new WorkflowError(422, 'Lần kiểm tra trước phải là vi phạm đã xác minh và chưa ghi đã khắc phục.');
  if (prior.communeCode !== input.communeCode || prior.inspectionDate > input.inspectionDate || prior.permitId !== input.permitId || prior.reportId !== input.reportId || prior.siteKey !== input.siteKey || Math.abs(prior.lat-input.lat)>0.000001 || Math.abs(prior.lng-input.lng)>0.000001)
    throw new WorkflowError(422, 'Lần kiểm tra khắc phục phải cùng địa bàn, vị trí, hồ sơ và không trước lần kiểm tra vi phạm.');
  if (!input.permitId && !input.reportId && prior.source !== 'real')
    throw new WorkflowError(422, 'Chưa thể ghi nhận khắc phục độc lập cho dữ liệu mẫu hoặc chưa xác định nguồn.');
}
