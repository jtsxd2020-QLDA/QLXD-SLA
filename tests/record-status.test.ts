import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionStatusLabel,constructionStatusOptions,getConstructionStatus,mapRecordStatusLabel,matchesMapStatus} from '../lib/record-status';
import type {MapRecord} from '../lib/types';
test('three visible construction states label uninspected as not started and normalize compatibility alias',()=>{
 assert.equal(getConstructionStatus('not_started'),'uninspected');
 assert.equal(constructionStatusLabel('not_started'),'Chưa thi công');
 assert.equal(constructionStatusLabel('uninspected'),'Chưa thi công');
 assert.equal(getConstructionStatus(), 'uninspected');
 assert.equal(getConstructionStatus('unknown'),'uninspected');
 assert.deepEqual(new Set(constructionStatusOptions.map(option=>option.value)),new Set(['uninspected','under_construction','completed']));
});

test('map filters distinguish progress, verified findings, unresolved checks and standalone inspection points',()=>{
 const permit:MapRecord={id:'p1',kind:'permit',title:'Công trình A',subtitle:'GP-1',communeCode:'03664',lat:21,lng:104,status:'active',constructionStatus:'under_construction',hasInspection:true,hasVerifiedInspection:true,latestInspectionResult:'unverified',latestVerifiedResult:'wrong_permit',remediationStatus:'pending'};
 const orphan:MapRecord={id:'i1',kind:'inspection',title:'Kiểm tra hiện trường',subtitle:'site-1',communeCode:'03664',lat:21.1,lng:104.1,status:'unverified',hasInspection:true,latestInspectionResult:'unverified'};
 assert.equal(matchesMapStatus(permit,'under_construction'),true);
 assert.equal(matchesMapStatus(permit,'wrong_permit'),true);
 assert.equal(matchesMapStatus(permit,'needs_verification'),false);
 assert.equal(matchesMapStatus(orphan,'inspected'),true);
 assert.equal(matchesMapStatus(orphan,'needs_verification'),true);
 assert.equal(mapRecordStatusLabel(permit),'Thi công sai giấy phép');
 assert.equal(mapRecordStatusLabel(orphan),'Cần xác minh');
});

test('map status prioritizes the latest verified conclusion and confirmed remediation',()=>{
 const record:MapRecord={id:'p1',kind:'permit',title:'Công trình A',subtitle:'GP-1',communeCode:'03664',lat:21,lng:104,status:'active',constructionStatus:'under_construction',hasInspection:true,hasVerifiedInspection:true,latestInspectionResult:'unverified',latestVerifiedResult:'wrong_permit',remediationStatus:'pending'};
 assert.equal(mapRecordStatusLabel(record),'Thi công sai giấy phép');
 assert.equal(mapRecordStatusLabel({...record,remediationStatus:'corrected'}),'Đã khắc phục vi phạm');
 assert.equal(mapRecordStatusLabel({...record,latestVerifiedResult:undefined,latestInspectionResult:'no_permit_presented'}),'Chưa xuất trình GPXD · cần xác minh');
});
