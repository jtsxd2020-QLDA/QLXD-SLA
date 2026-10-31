import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInspectionIndex,formatInspectionDate,getRecordInspections,getRemediationStatus,inspectionResultLabel,matchesInspectionFilter} from '../lib/inspection-status';
import type {Inspection} from '../lib/types';

function inspection(patch:Partial<Inspection>={}):Inspection {
  return {id:'check-1',permitId:'permit-1',siteKey:'site-1',address:'Địa chỉ kiểm thử',communeCode:'001',lat:20.875,lng:104.704,inspectionDate:'2026-10-25',inspector:'Cán bộ kiểm thử',result:'unverified',verified:false,basis:'',notes:'',createdAt:'2026-10-25T08:00:00.000Z',source:'real',version:1,...patch};
}

test('inspection history links explicit permit/report IDs and never guesses from siteKey or matching coordinates',()=>{
  const linked=inspection();
  const unlinked=inspection({id:'orphan',permitId:undefined,siteKey:'permit-2'});
  const report=inspection({id:'report-check',permitId:undefined,reportId:'permit-1'});
  const both=inspection({id:'both',permitId:'permit-3',reportId:'report-3'});
  const index=buildInspectionIndex([linked,unlinked,report,both]);
  assert.deepEqual(getRecordInspections(index,'permit','permit-1').map(x=>x.id),['check-1']);
  assert.deepEqual(getRecordInspections(index,'permit','permit-2'),[]);
  assert.deepEqual(getRecordInspections(index,'report','permit-1').map(x=>x.id),['report-check']);
  assert.deepEqual(getRecordInspections(index,'report','missing'),[]);
  assert.deepEqual(getRecordInspections(index,'permit','permit-3').map(x=>x.id),['both']);
  assert.deepEqual(getRecordInspections(index,'report','report-3').map(x=>x.id),['both']);
});

test('deleted inspections do not count and an unverified visit still appears in recorded inspection history',()=>{
  const active=inspection({result:'wrong_permit',verified:false});
  const deleted=inspection({id:'deleted',deletedAt:'2026-10-26T01:00:00Z'});
  const history=getRecordInspections(buildInspectionIndex([active,deleted]),'permit','permit-1');
  assert.equal(history.length,1);
  assert.equal(history[0].id,'check-1');
  assert.equal(inspectionResultLabel(history[0]),'Chưa đủ cơ sở xác minh');
});

test('history uses inspection date first, then recorded time and ID for stable ordering without changing input',()=>{
  const input=[
    inspection({id:'z',inspectionDate:'2026-10-24',createdAt:'2026-10-26T12:00:00Z'}),
    inspection({id:'a',inspectionDate:'2026-10-25',createdAt:'2026-10-25T08:00:00Z'}),
    inspection({id:'b',inspectionDate:'2026-10-25',createdAt:'2026-10-25T08:00:00Z'}),
    inspection({id:'c',inspectionDate:'2026-10-25',createdAt:'2026-10-25T09:00:00Z'}),
  ];
  const before=structuredClone(input);
  const expected=['c','b','a','z'];
  assert.deepEqual(getRecordInspections(buildInspectionIndex(input),'permit','permit-1').map(x=>x.id),expected);
  assert.deepEqual(getRecordInspections(buildInspectionIndex([...input].reverse()),'permit','permit-1').map(x=>x.id),expected);
  assert.deepEqual(input,before);
});

test('result text distinguishes verified findings from records that still need verification',()=>{
  assert.equal(inspectionResultLabel(inspection({result:'compliant',verified:true})),'Phù hợp nội dung GPXD');
  assert.equal(inspectionResultLabel(inspection({result:'wrong_permit',verified:true})),'Sai nội dung GPXD');
  assert.equal(inspectionResultLabel(inspection({result:'no_permit_presented',verified:true})),'Chưa xuất trình GPXD · cần xác minh');
  assert.equal(inspectionResultLabel(inspection({result:'unverified',verified:true})),'Chưa đủ cơ sở xác minh');
  assert.equal(inspectionResultLabel(inspection({result:'compliant',verified:false})),'Chưa đủ cơ sở xác minh');
});

test('inspection dates display as Vietnamese calendar dates without timezone shifting',()=>{
  assert.equal(formatInspectionDate('2026-10-25'),'25/10/2026');
  assert.equal(formatInspectionDate('2024-02-29'),'29/02/2024');
  for(const invalid of ['', 'not-a-date','2026-02-29','2026-13-01','2026-04-31'])assert.equal(formatInspectionDate(invalid),'Chưa xác định');
});

test('recorded/unrecorded filters never turn failed or loading inspection data into a zero-inspection conclusion',()=>{
  const index=buildInspectionIndex([inspection()]);
  assert.equal(matchesInspectionFilter(index,'permit','permit-1','recorded','ready'),true);
  assert.equal(matchesInspectionFilter(index,'permit','permit-1','unrecorded','ready'),false);
  assert.equal(matchesInspectionFilter(index,'permit','missing','unrecorded','ready'),true);
  assert.equal(matchesInspectionFilter(index,'permit','missing','recorded','ready'),false);
  for(const state of ['loading','error'] as const){
    assert.equal(matchesInspectionFilter(index,'permit','missing','unrecorded',state),false);
    assert.equal(matchesInspectionFilter(index,'permit','permit-1','recorded',state),false);
    assert.equal(matchesInspectionFilter(index,'permit','permit-1','all',state),true);
  }
});

test('missing documents do not imply a violation or remediation, including legacy records',()=>{
 assert.equal(getRemediationStatus(inspection({result:'no_permit_presented',verified:true})), 'not_applicable');
 assert.equal(getRemediationStatus(inspection({result:'no_permit_presented',verified:true,remediationStatus:'pending'})), 'not_applicable');
 assert.equal(getRemediationStatus(inspection({result:'unlicensed',verified:true})), 'pending');
});
