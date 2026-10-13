import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,statSync,unlinkSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ApiError,checkSameOriginRequest,readJson,requireSession,rateLimit} from '../lib/security';
import {createAdminAccount,verifyAdminCredentials,createAdminSession,findAdminSession,deleteAdminSession,listRecords,listPublicMapRecords,insertPermit,insertReport,encrypt,decrypt} from '../lib/store';
process.env.TTXD_DATA_DIR=mkdtempSync(join(tmpdir(),'ttxd-unit-'));
const request=(headers:HeadersInit={},body?:string)=>new Request('http://127.0.0.1:3100/api/records',{method:body===undefined?'GET':'POST',headers:{host:'127.0.0.1:3100',...headers},body});
const errorStatus=(expected:number)=>(error:unknown)=>error instanceof ApiError&&error.status===expected;
test('local guard rejects remote Host, foreign Origin, cross-site and missing Origin mutations',()=>{
 assert.throws(()=>checkSameOriginRequest(request({host:'evil.example'})),errorStatus(403));
 assert.throws(()=>checkSameOriginRequest(request({origin:'https://evil.example'})),errorStatus(403));
 assert.throws(()=>checkSameOriginRequest(request({'sec-fetch-site':'cross-site'})),errorStatus(403));
 assert.throws(()=>checkSameOriginRequest(request(),true),errorStatus(403));
 checkSameOriginRequest(request({origin:'http://127.0.0.1:3100'}),true);
});
test('JSON reader rejects malformed, oversized and wrong content type',async()=>{
 await assert.rejects(()=>readJson(request({'content-type':'text/plain'},'{}')),errorStatus(415));
 await assert.rejects(()=>readJson(request({'content-type':'application/json'},'{')),errorStatus(400));
 await assert.rejects(()=>readJson(request({'content-type':'application/json'},JSON.stringify('x'.repeat(33000)))),errorStatus(413));
 assert.deepEqual(await readJson(request({'content-type':'application/json'},'{"ok":1}')),{ok:1});
});
test('admin account passwords are salted hashes and login sessions require CSRF; logout invalidates access',async()=>{
 await assert.rejects(()=>requireSession(request()),errorStatus(401));
 createAdminAccount('admin@qlxd','MauKhau-kiemthu-2026');
 assert.equal(verifyAdminCredentials('ADMIN@QLXD','MauKhau-kiemthu-2026'),true);
 assert.equal(verifyAdminCredentials('admin@qlxd','wrong-password'),false);
 assert.equal(verifyAdminCredentials('unknown@qlxd','MauKhau-kiemthu-2026'),false);
 assert.throws(()=>createAdminAccount('admin@qlxd','MauKhau-kiemthu-2026'),/đã tồn tại/);
 const s=createAdminSession();const headers={origin:'http://127.0.0.1:3100',cookie:`ttxd_admin_session=${s.token}`};
 await assert.rejects(()=>requireSession(request(headers),true),errorStatus(403));
 await assert.rejects(()=>requireSession(request({...headers,'x-csrf-token':'wrong'}),true),errorStatus(403));
 assert.ok(await requireSession(request({...headers,'x-csrf-token':s.csrf}),true));
 assert.ok(findAdminSession(s.token));deleteAdminSession(s.token);assert.equal(findAdminSession(s.token),undefined);await assert.rejects(()=>requireSession(request(headers)),errorStatus(401));
});
test('rate limiting blocks repeated key and permits other key',()=>{
 rateLimit('qa-limiter',1);assert.throws(()=>rateLimit('qa-limiter',1),errorStatus(429));rateLimit('qa-other',1);
});
test('store encrypts whole payloads, preserves records and rejects duplicate permit',()=>{
 const permit={permitNumber:'QA-001',issueDate:'2026-10-10',issuingAuthority:'QA Cơ quan',investorName:'QA Chủ đầu tư riêng',projectName:'QA Công trình',address:'QA Địa chỉ',communeCode:'00001',lat:21.3,lng:103.9,area:100,floors:2,constructionType:'new' as const,notes:''};
 const report={title:'QA phản ánh',content:'QA nội dung kiểm thử',category:'other' as const,reporterName:'QA Người riêng',reporterPhone:'0912345678',address:'QA địa chỉ',communeCode:'00001',lat:21.3,lng:103.9};
 const p=insertPermit(permit);const r=insertReport(report);
 assert.throws(()=>insertPermit({...permit,permitNumber:' qa-001 '}));
 const records=listRecords();assert.equal(records.permits.length,1);assert.equal(records.reports.length,1);
 assert.equal(records.permits[0].id,p.id);assert.equal(records.permits[0].investorName,permit.investorName);
 assert.equal(records.reports[0].id,r.id);assert.equal(records.reports[0].reporterPhone,report.reporterPhone);
 const publicRecords=listPublicMapRecords();assert.equal(publicRecords.length,2);assert.equal(publicRecords.find(item=>item.kind==='permit')?.subtitle,permit.permitNumber);assert.equal(publicRecords.find(item=>item.kind==='report')?.subtitle,r.publicCode);
 const publicPayload=JSON.stringify(publicRecords);for(const secret of [permit.investorName,permit.address,report.reporterName,report.reporterPhone,report.title,report.content,report.address])assert.equal(publicPayload.includes(secret),false);
 const raw=readFileSync(join(process.env.TTXD_DATA_DIR!,'ttxd.sqlite'));
 for(const secret of [permit.investorName,permit.permitNumber,permit.projectName,permit.address,report.reporterName,report.reporterPhone,report.title,report.content,report.address])assert.equal(raw.includes(Buffer.from(secret)),false);
 const encrypted=encrypt('QA secret');assert.equal(decrypt(encrypted),'QA secret');
 assert.throws(()=>decrypt(encrypted.slice(0,-2)+'xx'));
 assert.equal(statSync(join(process.env.TTXD_DATA_DIR!,'secret.key')).mode&0o777,0o600);
 assert.equal(statSync(process.env.TTXD_DATA_DIR!).mode&0o777,0o700);
});
test('persisted records survive fresh process and missing key fails closed',()=>{
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {listRecords} from './lib/store.ts';const r=listRecords();if(r.permits.length!==1||r.reports.length!==1)process.exit(2);"],{env:process.env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 unlinkSync(join(process.env.TTXD_DATA_DIR!,'secret.key'));
 const missing=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {listRecords} from './lib/store.ts';listRecords();"],{env:process.env,encoding:'utf8'});assert.notEqual(missing.status,0);assert.equal(existsSync(join(process.env.TTXD_DATA_DIR!,'secret.key')),false);
});
test.after(()=>rmSync(process.env.TTXD_DATA_DIR!,{recursive:true,force:true}));
