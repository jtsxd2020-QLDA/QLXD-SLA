import assert from 'node:assert/strict';
import test from 'node:test';
import {isSyntheticRecord,updateRecordLifecycle} from '../lib/record-lifecycle';
import type {Permit} from '../lib/types';

const permit:Permit={
  id:'permit-1',version:1,createdAt:'2026-10-17T00:00:00.000Z',
  permitNumber:'GP-2026-001',issueDate:'2026-10-17',issuingAuthority:'Sở Xây dựng',
  investorName:'Nguyễn Văn A',investorPhone:'0900000000',projectName:'Nhà ở riêng lẻ',
  address:'Thảo Nguyên',communeCode:'03760',lat:20.875,lng:104.704,area:100,floors:2,
  constructionType:'new',constructionStatus:'uninspected',status:'active',notes:'',
};

test('bulk cleanup flags explicit sample and QA provenance only',()=>{
  assert.equal(isSyntheticRecord({...permit,projectName:'[MẪU] Nhà ở demo'}),true);
  assert.equal(isSyntheticRecord({...permit,permitNumber:'[KIỂM THỬ] GPXD-01'}),true);
  assert.equal(isSyntheticRecord({...permit,permitNumber:'QA-E2E-001'}),true);
  assert.equal(isSyntheticRecord({...permit,source:'demo'}),true);
  assert.equal(isSyntheticRecord(permit),false);
  assert.equal(isSyntheticRecord({...permit,projectName:'Mẫu nhà gỗ của bà Nguyễn'}),false);
});

test('trash and restore are versioned and recoverable',()=>{
  const trashed=updateRecordLifecycle(permit,{kind:'permit',id:permit.id,version:1,action:'trash'});
  assert.ok(trashed.deletedAt);
  assert.equal(trashed.version,2);
  assert.equal(trashed.deletedBy,'admin@qlxd');
  const restored=updateRecordLifecycle(trashed,{kind:'permit',id:permit.id,version:2,action:'restore'});
  assert.equal(restored.deletedAt,undefined);
  assert.equal(restored.deletedBy,undefined);
  assert.equal(restored.version,3);
  assert.throws(()=>updateRecordLifecycle(permit,{kind:'permit',id:permit.id,version:9,action:'trash'}),error=>Boolean(error&&typeof error==='object'&&'status'in error&&(error as {status:number}).status===409));
});
