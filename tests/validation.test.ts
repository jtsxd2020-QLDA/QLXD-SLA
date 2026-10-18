import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePermit,validateReport,validatePermitProgress} from '../lib/validation';
import {resolveCommune} from '../lib/geo-server';
import {geometryBounds,type BoundaryCollection} from '../lib/geometry';
import {ApiError} from '../lib/security';
const dataset=JSON.parse(readFileSync(new URL('../geodata/sonla.full.geojson',import.meta.url),'utf8')) as BoundaryCollection;
const feature=dataset.features.find(f=>f.properties.name.includes('Thảo Nguyên'))!;
assert.ok(feature);
const [[west,south],[east,north]]=geometryBounds(feature.geometry);
let location:{lat:number;lng:number;communeCode:string}|undefined;
for(let x=1;x<10&&!location;x++)for(let y=1;y<10&&!location;y++){
 const position={lng:west+(east-west)*x/10,lat:south+(north-south)*y/10};
 if(resolveCommune(position)?.code===feature.properties.communeCode)location={...position,communeCode:feature.properties.communeCode};
}
assert.ok(location);
const permit={...location,permitNumber:'QA-VALID',issueDate:'2026-10-10',issuingAuthority:'QA Cơ quan',investorName:'QA Chủ đầu tư',investorPhone:'0912345678',projectName:'QA Công trình',address:'QA địa chỉ',area:100,floors:2,constructionType:'new',notes:''};
const report={...location,title:'QA phản ánh',content:'QA nội dung phản ánh kiểm thử',category:'safety',reporterName:'',reporterPhone:'',address:'QA địa chỉ'};
const invalid=(value:unknown,kind:'permit'|'report'='permit')=>assert.throws(()=>kind==='permit'?validatePermit(value):validateReport(value),(error:unknown)=>error instanceof ApiError&&error.status===422);
test('valid records accept exact polygon location, legacy permits default to uninspected, and progress updates validate',()=>{assert.equal(validatePermit(permit).communeCode,location?.communeCode);assert.equal(validatePermit(permit).constructionStatus,'uninspected');const legacyPermit:Record<string,unknown>={...permit};delete legacyPermit.investorPhone;delete legacyPermit.constructionStatus;assert.equal(validatePermit(legacyPermit).investorPhone,'');assert.equal(validatePermit(legacyPermit).constructionStatus,'uninspected');assert.equal(validatePermit({...permit,constructionStatus:'completed'}).constructionStatus,'completed');assert.equal(validateReport(report).reporterName,'');assert.throws(()=>validatePermitProgress({id:'bad',version:1,constructionStatus:'completed'}));});
test('reject permit invalid dates including impossible leap date and future',()=>{for(const issueDate of ['2026-02-30','2025-02-29','2099-01-01','10/10/2026'])invalid({...permit,issueDate});});
test('reject invalid numerical and missing enum fields',()=>{for(const patch of [{area:0},{area:-1},{floors:1.5},{floors:201},{lat:NaN},{lng:Infinity},{constructionType:'bad'}])invalid({...permit,...patch});});
test('reject wrong commune and outside province',()=>{
 invalid({...permit,communeCode:'invalid'});invalid({...permit,lat:0,lng:0});
 assert.equal(resolveCommune({lat:0,lng:0}),null);
});
test('strict fields and control characters cannot enter payloads',()=>{invalid({...permit,unknown:'value'});invalid({...permit,projectName:'QA\u0000BAD'});invalid({...permit,investorPhone:'not-a-phone'});invalid({...report,category:'bad'},'report');invalid({...report,reporterPhone:'not-a-phone'},'report');invalid({...report,content:'short'},'report');});
test('boundary provenance preserves original and discloses repair and reference-only status',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../geodata/provenance.json',import.meta.url),'utf8'));
 assert.equal(provenance.count,75);assert.equal(provenance.invalidSourceGeometryCount,1);assert.equal(provenance.normalizationRepairs[0].code,'03760');assert.match(provenance.status,/chưa xác nhận/);
 const source=JSON.parse(readFileSync(new URL('../geodata/source-original.geojson',import.meta.url),'utf8'));assert.equal(source.features.length,75);
});

test('user-drawn geometry is optional, bounded, strict and confined to province',()=>{
 const anchor={lat:location!.lat,lng:location!.lng};
 const nearby={lat:anchor.lat+0.000001,lng:anchor.lng+0.000001};
 const third={lat:anchor.lat,lng:anchor.lng+0.000002};
 const line={type:'line',points:[anchor,nearby]};
 const area={type:'area',points:[anchor,nearby,third]};
 assert.deepEqual(validatePermit({...permit,measurement:line}).measurement,line);
 assert.deepEqual(validateReport({...report,measurement:area}).measurement,area);
 assert.equal(validatePermit(permit).measurement,undefined);
 for(const measurement of [null,{type:'line',points:[anchor]},{type:'area',points:[anchor,nearby]}, {type:'line',points:Array.from({length:201},()=>anchor)}, {type:'line',points:[anchor,{lat:NaN,lng:104}]}, {type:'line',points:[anchor,{lat:0,lng:0}]}, {type:'line',points:[anchor,anchor]}, {...line,area:123}, {type:'line',points:[anchor,{...nearby,secret:'private'}]}]) invalid({...permit,measurement});
});

test('saved geometry must start at record location, allowing only tiny rounding tolerance',()=>{
 const anchor={lat:location!.lat,lng:location!.lng};
 const nearby={lat:anchor.lat+0.000001,lng:anchor.lng+0.000001};
 const measurement={type:'line',points:[anchor,nearby]};
 assert.deepEqual(validatePermit({...permit,lat:anchor.lat+0.00000005,measurement}).measurement,measurement);
 invalid({...permit,measurement:{type:'line',points:[nearby,anchor]}});
 invalid({...report,measurement:{type:'line',points:[nearby,anchor]}},'report');
});
