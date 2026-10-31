import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRemediationLink} from '../lib/scoped-records';
import {inspectionSchema} from '../lib/validation';
import {inspectionResultLabel,inspectionMapStatusLabel} from '../lib/inspection-status';
import type {Inspection, InspectionInput, UserIdentity} from '../lib/types';
const user:UserIdentity={email:'province@example.org',role:'province',communeCode:null};
const prior:Inspection={id:'11111111-1111-4111-8111-111111111111',siteKey:'site-a',address:'Điểm kiểm tra',communeCode:'03664',lat:21,lng:104,inspectionDate:'2026-10-01',inspector:'Cán bộ',result:'unlicensed',verified:true,basis:'',legalBasis:'Biên bản xác minh',comparisonMaterials:'Hồ sơ đối chiếu',remediationStatus:'pending',notes:'',source:'real',version:1,createdAt:'2026-10-01T00:00:00Z'};
const next:InspectionInput={priorInspectionId:prior.id,siteKey:prior.siteKey,address:prior.address,communeCode:prior.communeCode,lat:prior.lat,lng:prior.lng,inspectionDate:'2026-10-10',inspector:'Cán bộ',result:'remediated',verified:true,basis:'',legalBasis:'Biên bản kiểm tra',comparisonMaterials:'Hồ sơ xác nhận đã khắc phục',remediationStatus:'corrected',notes:''};
test('remediation has a distinct result and requires a specific previous inspection and evidence',()=>{
 assert.equal(inspectionSchema.safeParse(next).success,true);
 for(const patch of [{priorInspectionId:undefined},{verified:false},{legalBasis:''},{comparisonMaterials:''},{remediationStatus:'pending'}])assert.equal(inspectionSchema.safeParse({...next,...patch}).success,false);
 assert.equal(inspectionResultLabel({...prior,...next}),'Đã khắc phục vi phạm');
 assert.equal(inspectionMapStatusLabel({...prior,...next}),'Đã khắc phục vi phạm');
});
test('remediation must refer to a verified violation at the same actual place and in the same locality',()=>{
 assert.doesNotThrow(()=>assertRemediationLink(user,next,prior));
 for(const bad of [{...prior,verified:false},{...prior,result:'unverified' as const},{...prior,deletedAt:'2026-10-02'}, {...prior,source:'unknown' as const}])assert.throws(()=>assertRemediationLink(user,next,bad));
 for(const bad of [{...next,communeCode:'03982'},{...next,lat:22},{...next,siteKey:'another-site'},{...next,inspectionDate:'2026-09-30'},{...next,reportId:'22222222-2222-4222-8222-222222222222'}])assert.throws(()=>assertRemediationLink(user,bad,prior));
 const otherUser:UserIdentity={email:'staff@example.org',role:'commune',communeCode:'03982'};
 assert.throws(()=>assertRemediationLink(otherUser,next,prior));
});

test('latest inspection report uses explicit predecessor and separates remediated results from violations', async()=>{
 const {buildAnalyticsSnapshot}=await import('../lib/analytics');
 const corrected:Inspection={...prior,...next,id:'22222222-2222-4222-8222-222222222222',createdAt:'2026-10-10T00:00:00Z'};
 const filters={group:'inspections' as const,dateFrom:'2026-01-01',dateTo:'2026-12-31',communeCode:'',category:'',status:'',result:'',source:'real' as const,dateBasis:'issue' as const,inspectionMode:'latest' as const,search:''};
 const snapshot=buildAnalyticsSnapshot({permits:[],reports:[]},[prior,corrected],filters);
 assert.equal(snapshot.total,1);assert.equal(snapshot.rows[0].result,'Đã khắc phục vi phạm');
 const violations=buildAnalyticsSnapshot({permits:[],reports:[]},[prior,corrected],{...filters,result:'unlicensed'});
 assert.equal(violations.total,0);
});
