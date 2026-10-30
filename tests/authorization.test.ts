import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCommuneAccess,assertRecordAccess,filterRecordsForUser,filterInspectionsForUser,scopeAnalyticsFilters} from '../lib/authorization';
import {WorkflowError} from '../lib/workflow';
import type {UserIdentity,Permit,CitizenReport,Inspection,AnalyticsFilters} from '../lib/types';

const province:UserIdentity={email:'admin@qlxd',role:'province',communeCode:null};
const user:UserIdentity={email:'canbo-a@qlxd.test',role:'commune',communeCode:'03664'};
const permit=(id:string,communeCode:string):Permit=>({id,communeCode,permitNumber:id,issueDate:'2026-10-30',issuingAuthority:'Cơ quan kiểm thử',investorName:'Tên kiểm thử',projectName:id,address:'Địa chỉ kiểm thử',lat:21,lng:104,area:100,floors:2,constructionType:'new',notes:'',createdAt:'2026-10-30T00:00:00Z',status:'active',source:'real',version:1});
const report=(id:string,communeCode:string):CitizenReport=>({id,communeCode,publicCode:id,title:id,content:'Nội dung kiểm thử riêng',category:'other',reporterName:'',reporterPhone:'',address:'Địa chỉ kiểm thử',lat:21,lng:104,createdAt:'2026-10-30T00:00:00Z',status:'received',source:'real',version:1});
const inspection=(id:string,communeCode:string):Inspection=>({id,communeCode,siteKey:id,address:'Địa chỉ kiểm thử',lat:21,lng:104,inspectionDate:'2026-10-30',inspector:'Cán bộ kiểm thử',result:'unverified',verified:false,basis:'',notes:'',createdAt:'2026-10-30T00:00:00Z',source:'real',version:1});
const denied=(error:unknown)=>error instanceof WorkflowError&&error.status===403;
const filters:AnalyticsFilters={group:'permits',dateFrom:'2026-01-01',dateTo:'2026-12-31',communeCode:'',category:'',status:'',result:'',source:'all',dateBasis:'created',inspectionMode:'all',search:''};

test('commune authorization allows own scope and denies cross-commune guessed record IDs',()=>{
  assert.doesNotThrow(()=>assertCommuneAccess(user,'03664'));
  assert.doesNotThrow(()=>assertRecordAccess(user,permit('A','03664')));
  assert.throws(()=>assertCommuneAccess(user,'03982'),denied);
  assert.throws(()=>assertRecordAccess(user,permit('B','03982')),denied);
  assert.doesNotThrow(()=>assertCommuneAccess(province,'03982'));
});

test('management reads show province-wide records and mask reporter name and phone outside the assigned commune',()=>{
  const records={permits:[permit('A','03664'),permit('B','03982')],reports:[report('RA','03664'),report('RB','03982')]};
  records.reports[0].reporterName='Người gửi xã A';records.reports[0].reporterPhone='0900000001';
  records.reports[1].reporterName='Người gửi xã B';records.reports[1].reporterPhone='0900000002';
  const before=structuredClone(records);
  const scoped=filterRecordsForUser(records,user);
  assert.deepEqual(scoped.permits.map(row=>row.id),['A','B']);
  assert.deepEqual(scoped.reports.map(row=>row.id),['RA','RB']);
  assert.equal(scoped.reports[0].reporterName,'Người gửi xã A');assert.equal(scoped.reports[0].reporterPhone,'0900000001');
  assert.equal(scoped.reports[1].reporterName,'');assert.equal(scoped.reports[1].reporterPhone,'');
  assert.deepEqual(filterInspectionsForUser([inspection('IA','03664'),inspection('IB','03982')],user).map(row=>row.id),['IA','IB']);
  assert.equal(filterRecordsForUser(records,province).permits.length,2);
  assert.deepEqual(records,before);
});

test('commune analytics can read any locality or province-wide totals; writes remain controlled by record access',()=>{
  const before=structuredClone(filters);
  assert.equal(scopeAnalyticsFilters(filters,user).communeCode,'');
  assert.equal(scopeAnalyticsFilters({...filters,communeCode:'03664'},user).communeCode,'03664');
  assert.equal(scopeAnalyticsFilters({...filters,communeCode:'03982'},user).communeCode,'03982');
  assert.throws(()=>scopeAnalyticsFilters({...filters,communeCode:'99999'},user),error=>error instanceof WorkflowError&&error.status===422);
  assert.equal(scopeAnalyticsFilters(filters,province).communeCode,'');
  assert.deepEqual(filters,before);
});

test('unassigned or invalid roles fail closed instead of inheriting province access',()=>{
  const invalid=[{...user,communeCode:null},{...user,communeCode:'99999'},{...user,role:'superadmin'}] as UserIdentity[];
  for(const actor of invalid){
    assert.throws(()=>assertCommuneAccess(actor,'03664'),denied);
    assert.throws(()=>filterRecordsForUser({permits:[],reports:[]},actor),denied);
    assert.throws(()=>scopeAnalyticsFilters(filters,actor),denied);
  }
});
