import type {CitizenReport,Inspection,Permit,RecordKind,RecordLifecycleInput} from './types';
import {WorkflowError} from './workflow';

export type ManagedRecord=Permit|CitizenReport|Inspection;

const syntheticMarker=/\[\s*(?:MẪU|KIỂM THỬ|TEST)(?:\s+\d+)?\s*\]|DỮ LIỆU MINH HỌA|\bQA-(?:ONLINE|E2E)-/i;

/** Only explicit demo/test provenance or labels qualify for bulk sample cleanup. */
export function isSyntheticRecord(record:ManagedRecord):boolean{
  if(record.source==='demo')return true;
  const fields='permitNumber'in record
    ?[record.permitNumber,record.issuingAuthority,record.investorName,record.projectName,record.address,record.notes]
    :'publicCode'in record
      ?[record.publicCode,record.title,record.content,record.reporterName,record.address]
      :[record.siteKey,record.address,record.inspector,record.basis,record.notes];
  return syntheticMarker.test(fields.filter(Boolean).join(' '));
}

export function updateRecordLifecycle<T extends ManagedRecord>(record:T,input:RecordLifecycleInput,actor='admin@qlxd'):T{
  if(record.id!==input.id||(record.version||1)!==input.version)throw new WorkflowError(409,'Hồ sơ đã thay đổi. Hãy tải lại trước khi cập nhật.');
  if(input.action==='trash'){
    if(record.deletedAt)throw new WorkflowError(409,'Hồ sơ đã nằm trong thùng rác.');
    return{...record,deletedAt:new Date().toISOString(),deletedBy:actor,version:input.version+1};
  }
  if(!record.deletedAt)throw new WorkflowError(409,'Hồ sơ không nằm trong thùng rác.');
  const restored={...record,version:input.version+1};
  delete restored.deletedAt;
  delete restored.deletedBy;
  return restored;
}

export function recordKind(record:ManagedRecord):RecordKind{
  return 'permitNumber'in record?'permit':'publicCode'in record?'report':'inspection';
}
