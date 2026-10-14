/** Run after next build; invokes the actual traced route from a relocated deployment folder. */
import {mkdtempSync,readFileSync,copyFileSync,mkdirSync,existsSync,rmSync} from 'node:fs';
import {join,dirname,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import type {AnalyticsSnapshot} from '../lib/types';
async function main(){
 const root=process.cwd(),sandbox=mkdtempSync(join(tmpdir(),'ttxd-export-bundle-')),testData=mkdtempSync(join(tmpdir(),'ttxd-export-fixture-'));
 process.env.TTXD_DATA_DIR=testData;process.env.TTXD_STORAGE_BACKEND='sqlite';process.env.TTXD_PUBLIC_ORIGIN='http://localhost:3100';delete process.env.VERCEL;
 try{
  const route=join(root,'.next/server/app/api/analytics/export/route.js');const trace=JSON.parse(readFileSync(route+'.nft.json','utf8')) as {files:string[]};
  for(const entry of [route,join(root,'package.json'),...trace.files.map(file=>resolve(dirname(route),file))]){const rel=relative(root,entry);assert(!rel.startsWith('..'),'Build trace unexpectedly escapes repository');const target=join(sandbox,rel);mkdirSync(dirname(target),{recursive:true});copyFileSync(entry,target);}
  assert(existsSync(join(sandbox,'assets/fonts/LiberationSans-Regular.ttf')),'Vietnamese font missing from deployment trace');
  assert(existsSync(join(sandbox,'node_modules/pdfkit/js/standard-fonts/Helvetica.cjs')),'PDFKit lazy standard font missing from deployment trace');
  assert(!readFileSync(route,'utf8').includes('pdfkit.node.mjs'),'PDFKit build-machine import URL must not be bundled');
  const require=createRequire(join(root,'package.json'));const store=require('./lib/store.ts') as typeof import('../lib/store');
  const session=store.createAdminSession(),id='11111111-1111-4111-a111-111111111111';
  const snapshot:AnalyticsSnapshot={id,generatedAt:new Date().toISOString(),filters:{group:'permits',dateFrom:'2026-01-01',dateTo:'2026-12-31',communeCode:'',category:'',status:'',result:'',source:'demo',dateBasis:'issue',inspectionMode:'all'},metrics:[{key:'total',label:'GPXD cấp trong kỳ',value:2}],monthly:[{month:'2026-10',count:2}],communes:[{code:'03664',name:'Phường Tô Hiệu',count:2}],breakdown:[],columns:[{key:'id',label:'Mã hồ sơ'},{key:'permitNumber',label:'Số GPXD'},{key:'commune',label:'Địa bàn'}],rows:[{id:'QA-PDF-1',permitNumber:'001-office-ff-fi',commune:'Phường Tô Hiệu'},{id:'QA-PDF-2',permitNumber:'002-affinity',commune:'Phường Chiềng Cơi'}],total:2,notes:['office efficient affinity ffi ff fi fl — tiếng Việt: Sơn La, Tô Hiệu, Chiềng Cơi, Thảo Nguyên, giấy phép xây dựng.']};store.saveAnalyticsSnapshot(snapshot);
  const compiled=require(join(sandbox,relative(root,route))) as {routeModule:{_lazyUserland?:{waitUntilLoaded:()=>Promise<void>};userland:{GET:(request:Request)=>Promise<Response>}}};
  if(compiled.routeModule._lazyUserland)await compiled.routeModule._lazyUserland.waitUntilLoaded();
  for(const format of ['xlsx','pdf']){const response=await compiled.routeModule.userland.GET(new Request(`http://localhost:3100/api/analytics/export?id=${id}&format=${format}`,{headers:{host:'localhost:3100',cookie:`ttxd_admin_session=${session.token}`}}));const buffer=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,`Relocated ${format} export failed`);assert(buffer.length>1000);assert.equal(buffer.subarray(0,format==='pdf'?5:2).toString(),format==='pdf'?'%PDF-':'PK');if(format==='pdf'){const extracted=execFileSync('pdftotext',['-layout','-','-'],{input:buffer,encoding:'utf8',maxBuffer:5*1024*1024}).replace(/\s+/g,' ');for(const expected of ['BÁO CÁO ĐIỀU HÀNH TTXD SƠN LA',id,'GPXD cấp trong kỳ','Địa bàn','001-office-ff-fi','002-affinity','Phường Tô Hiệu','Phường Chiềng Cơi','office efficient affinity ffi ff fi fl','Thảo Nguyên, giấy phép xây dựng.'])assert(extracted.includes(expected),`PDF text mapping failed: ${expected}`);console.log('PASS exact PDF Unicode text: Vietnamese, UUID, office/ff/fi and every fixture row');}console.log(`PASS relocated ${format}: HTTP 200, ${buffer.length} bytes`);}
 }finally{rmSync(sandbox,{recursive:true,force:true});rmSync(testData,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Bundle export verification failed');process.exitCode=1;});
