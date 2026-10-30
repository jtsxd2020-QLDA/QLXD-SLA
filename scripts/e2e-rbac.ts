import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {chromium} from 'playwright';
import {createAdminAccount} from '../lib/store';
import {resolveCommune} from '../lib/geo-server';
import {geometryBounds,type BoundaryCollection} from '../lib/geometry';
import type {AnalyticsSnapshot,CitizenReport,Inspection,Permit} from '../lib/types';

type Credentials={cookie:string;'x-csrf-token':string};
function locations(){
  const collection=JSON.parse(readFileSync('geodata/sonla.full.geojson','utf8')) as BoundaryCollection;
  return ['Chiềng An','Thảo Nguyên'].map(name=>{
    const feature=collection.features.find(f=>f.properties.name.includes(name));assert.ok(feature,name);
    const [[west,south],[east,north]]=geometryBounds(feature.geometry);
    for(let x=1;x<20;x++)for(let y=1;y<20;y++){
      const point={lng:west+(east-west)*x/20,lat:south+(north-south)*y/20};
      if(resolveCommune(point)?.code===feature.properties.communeCode)return{...point,communeCode:feature.properties.communeCode,address:`Địa chỉ kiểm thử ${name}`};
    }
    throw new Error('No fixture location for '+name);
  });
}

async function main(){
  const listener=createServer();await new Promise<void>(r=>listener.listen(0,'127.0.0.1',r));
  const address=listener.address();assert.ok(address&&typeof address!=='string');const port=address.port;
  await new Promise<void>(r=>listener.close(()=>r()));
  const base=`http://127.0.0.1:${port}`,directory=mkdtempSync(join(tmpdir(),'ttxd-rbac-qa-'));
  const evidence=join(process.cwd(),'test-results/rbac');mkdirSync(evidence,{recursive:true});
  process.env.TTXD_DATA_DIR=directory;process.env.TTXD_STORAGE_BACKEND='sqlite';delete process.env.VERCEL;delete process.env.TTXD_PUBLIC_ORIGIN;
  const password='QA-isolated-rbac-password!';createAdminAccount('admin@qlxd',password);
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env},stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  const checks:string[]=[];const pass=(text:string)=>{checks.push(text);console.log('PASS '+text);};
  const send=(path:string,body?:unknown,auth?:Credentials,method=body===undefined?'GET':'POST')=>fetch(base+path,{method,headers:{...(auth||{}),...(body===undefined?{}:{origin:base,'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
  async function data<T>(response:Response,expected=200):Promise<T>{assert.equal(response.status,expected,await response.clone().text());assert.equal(response.headers.get('cache-control'),'no-store');return(await response.json()).data as T;}
  async function login(email:string):Promise<Credentials>{const r=await send('/api/login',{email,password});const value=await data<{csrfToken:string;role:string;communeCode:string|null;email:string}>(r);assert.equal(value.email,email);return{cookie:r.headers.get('set-cookie')!.split(';')[0],'x-csrf-token':value.csrfToken};}
  async function blocked(response:Response){assert.ok([403,404].includes(response.status),`Expected access denied, got ${response.status}: ${await response.text()}`);}
  try{
    let ready=false;for(let i=0;i<100;i++){assert.equal(server.exitCode,null,log);try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{/* waiting for startup */}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,'server ready');
    const province=await login('admin@qlxd'),[a,b]=locations();
    const emails=['canbo-a@qlxd.test','canbo-b@qlxd.test'];
    for(const[index,location]of[a,b].entries())await data(await send('/api/accounts',{email:emails[index],password,role:'commune',communeCode:location.communeCode},province),201);
    const authA=await login(emails[0]),authB=await login(emails[1]);
    const sessionA=await data<{role:string;communeCode:string}>((await send('/api/session',undefined,authA)));
    assert.equal(sessionA.role,'commune');assert.equal(sessionA.communeCode,a.communeCode);
    await blocked(await send('/api/accounts',undefined,authA));
    await blocked(await send('/api/accounts',{email:'escalation@qlxd.test',password,role:'province',communeCode:null},authA));
    await blocked(await send('/api/accounts',{email:emails[0],role:'province',communeCode:null,active:true},authA,'PATCH'));
    const accountList=await data<unknown>(await send('/api/accounts',undefined,province));for(const forbidden of ['password_hash','passwordHash','salt',password])assert.equal(JSON.stringify(accountList).includes(forbidden),false);
    pass('province creates assigned accounts; commune sessions expose their identity and cannot manage or escalate accounts');
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),year=today.slice(0,4);
    const permitInput=(location:typeof a,number:string)=>({...location,permitNumber:number,issueDate:today,issuingAuthority:'Cơ quan kiểm thử riêng',investorName:'Chủ đầu tư kiểm thử riêng',projectName:`Công trình bí mật ${number}`,area:100,floors:2,constructionType:'new',constructionStatus:'under_construction',notes:''});
    const reportInput=(location:typeof a,title:string)=>({...location,title,content:'Nội dung phản ánh kiểm thử riêng không có dữ liệu thật',category:'unlicensed',reporterName:'Người gửi kiểm thử',reporterPhone:'0987654321'});
    const permits:Permit[]=[],reports:CitizenReport[]=[],inspections:Inspection[]=[];
    for(const [index,location]of[a,b].entries()){
      permits.push(await data<Permit>(await send('/api/permits',permitInput(location,'RBAC-'+index),province),201));
      reports.push(await data<CitizenReport>(await send('/api/reports',reportInput(location,'Phản ánh bí mật '+index),province),201));
      inspections.push(await data<Inspection>(await send('/api/inspections',{...location,permitId:permits[index].id,siteKey:permits[index].id,inspectionDate:today,inspector:'Cán bộ kiểm thử '+index,result:'unverified',verified:false,basis:'',notes:'Nội dung kiểm tra riêng'},province),201));
    }
    const own=await data<{permits:Permit[];reports:CitizenReport[]}>(await send('/api/records',undefined,authA));
    assert.deepEqual(own.permits.map(r=>r.id),[permits[0].id]);assert.deepEqual(own.reports.map(r=>r.id),[reports[0].id]);
    const ownInspections=await data<Inspection[]>(await send('/api/inspections',undefined,authA));assert.deepEqual(ownInspections.map(r=>r.id),[inspections[0].id]);
    const provincial=await data<{permits:Permit[]}>(await send('/api/records',undefined,province));assert.equal(provincial.permits.length,2);
    pass('server record and inspection lists contain only assigned-commune private data, while province sees both communes');
    await blocked(await send('/api/permits',permitInput(b,'FOREIGN-BY-A'),authA));
    await blocked(await send('/api/reports',reportInput(b,'FOREIGN-BY-A'),authA));
    await blocked(await send('/api/public/reports',reportInput(b,'FOREIGN-PUBLIC-BY-A'),authA));
    await blocked(await send('/api/inspections',{...b,permitId:permits[1].id,siteKey:permits[1].id,inspectionDate:today,inspector:'Cán bộ A',result:'unverified',verified:false,basis:'',notes:''},authA));
    const disguised=await send('/api/permits',{...permitInput(b,'B-COORDS-A-CODE'),communeCode:a.communeCode},authA);assert.ok([403,422].includes(disguised.status));
    await blocked(await send('/api/inspections',{...a,permitId:permits[1].id,siteKey:permits[1].id,inspectionDate:today,inspector:'Cán bộ A',result:'unverified',verified:false,basis:'',notes:''},authA));
    await data(await send('/api/permits',permitInput(a,'OWN-BY-A'),authA),201);
    pass('commune cannot insert foreign permits/reports/inspections or disguise foreign coordinates/linked IDs as its own scope');
    await blocked(await send('/api/permit-progress',{id:permits[1].id,version:1,constructionStatus:'completed'},authA));
    await blocked(await send('/api/report-status',{id:reports[1].id,version:1,status:'processing',reason:'Thử vượt quyền',result:''},authA));
    for(const[kind,record]of[['permit',permits[1]],['report',reports[1]],['inspection',inspections[1]]] as const)await blocked(await send('/api/record-lifecycle',{kind,id:record.id,version:record.version||1,action:'trash'},authA));
    await data(await send('/api/permit-progress',{id:permits[0].id,version:1,constructionStatus:'completed'},authA));
    await data(await send('/api/report-status',{id:reports[0].id,version:1,status:'processing',reason:'Theo dõi đúng địa bàn',result:''},authA));
    const history=await data<{active:{communeCode:string}[];trash:{communeCode:string}[]}>(await send('/api/record-lifecycle',undefined,authA));assert.ok(history.active.length);assert.ok([...history.active,...history.trash].every(r=>r.communeCode===a.communeCode));
    await blocked(await send('/api/record-lifecycle/samples',{confirm:true},authA));
    pass('guessed foreign IDs cannot update progress/report status or delete records; own updates and scoped lifecycle listing work');
    const query=`group=permits&source=real&dateFrom=${year}-01-01&dateTo=${year}-12-31`;
    await blocked(await send('/api/analytics?'+query+'&communeCode='+b.communeCode,undefined,authA));
    const snapshot=await data<AnalyticsSnapshot>(await send('/api/analytics?'+query,undefined,authA));assert.equal(snapshot.filters.communeCode,a.communeCode);assert.equal(snapshot.total,2);assert.deepEqual(snapshot.communes.map(c=>c.code),[a.communeCode]);
    await blocked(await send('/api/analytics',{...snapshot.filters,communeCode:b.communeCode},authA));
    const postedSnapshot=await data<AnalyticsSnapshot>(await send('/api/analytics',{...snapshot.filters,communeCode:''},authA));assert.equal(postedSnapshot.filters.communeCode,a.communeCode);assert.equal(postedSnapshot.total,2);
    const foreignSnapshot=await data<AnalyticsSnapshot>(await send('/api/analytics?'+query+'&communeCode='+b.communeCode,undefined,province));
    for(const format of ['xlsx','pdf']){
      await blocked(await send(`/api/analytics/export?id=${foreignSnapshot.id}&format=${format}`,undefined,authA));
      assert.equal((await send(`/api/analytics/export?id=${snapshot.id}&format=${format}`,undefined,authA)).status,200);
    }
    pass('analytics forcibly scope commune totals and locality metadata; guessed foreign snapshot IDs cannot export Excel or PDF');
    const anonymousMap=await data<{records:{communeCode:string}[]}>(await send('/api/public/records'));
    assert.ok(anonymousMap.records.some(r=>r.communeCode===a.communeCode));assert.ok(anonymousMap.records.some(r=>r.communeCode===b.communeCode));
    const ownMap=await data<{records:{communeCode:string}[]}>(await send('/api/public/records',undefined,authA));assert.ok(ownMap.records.every(r=>r.communeCode===a.communeCode));
    assert.equal(JSON.stringify(anonymousMap).includes('0987654321'),false);assert.equal(JSON.stringify(anonymousMap).includes('Người gửi kiểm thử'),false);
    pass('anonymous users retain only redacted public records; logged-in commune public endpoint respects its assignment');
    const trash=await data<{version:number}>(await send('/api/record-lifecycle',{kind:'inspection',id:inspections[1].id,version:1,action:'trash'},province));
    await blocked(await send('/api/record-lifecycle',{kind:'inspection',id:inspections[1].id,version:trash.version,action:'restore'},authA));
    await data(await send('/api/record-lifecycle',{kind:'inspection',id:inspections[1].id,version:trash.version,action:'restore'},province));
    pass('commune cannot restore foreign records hidden in the trash');
    browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:960}});
    const split=authA.cookie.indexOf('=');await context.addCookies([{name:authA.cookie.slice(0,split),value:authA.cookie.slice(split+1),url:base,httpOnly:true,sameSite:'Strict'}]);
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    await page.getByRole('button',{name:'Giấy phép xây dựng',exact:true}).click();await page.locator('tbody').waitFor();
    assert.equal(await page.getByRole('button',{name:'Tài khoản và phân quyền',exact:true}).count(),0);
    assert.equal(await page.locator('tbody').innerText().then(text=>text.includes(permits[1].projectName)),false);
    const scope=page.getByLabel('Địa bàn quản lý',{exact:true});assert.equal(await scope.inputValue(),a.communeCode);
    assert.equal(await scope.locator('option').count(),1);
    await page.getByRole('button',{name:'Nhập GPXD',exact:true}).click();const form=page.locator('dialog[open]');await form.waitFor();
    assert.equal(await form.locator('select[name=communeCode]').inputValue(),a.communeCode);
    assert.equal(await form.locator('select[name=communeCode] option').count(),1);
    await page.keyboard.press('Escape');await form.waitFor({state:'hidden'});
    await page.screenshot({path:join(evidence,'commune-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:850});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:join(evidence,'commune-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
    pass('commune browser UI locks scope and form to one commune, omits province account management and never renders foreign private names');
    const provinceContext=await browser.newContext({viewport:{width:1440,height:960}});
    const provinceSplit=province.cookie.indexOf('=');await provinceContext.addCookies([{name:province.cookie.slice(0,provinceSplit),value:province.cookie.slice(provinceSplit+1),url:base,httpOnly:true,sameSite:'Strict'}]);
    const provincePage=await provinceContext.newPage();await provincePage.goto(base);
    await provincePage.getByRole('button',{name:'Tài khoản và phân quyền',exact:true}).click();
    await provincePage.locator('.account-management tbody').waitFor();
    await provincePage.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
    const accountForm=provincePage.locator('dialog[open]');await accountForm.locator('[name=accountEmail]').fill('browser-created@qlxd.test');await accountForm.locator('[name=accountPassword]').fill(password);await accountForm.locator('[name=accountCommune]').selectOption(a.communeCode);
    const accountCreated=provincePage.waitForResponse(response=>response.url().endsWith('/api/accounts')&&response.request().method()==='POST');
    await accountForm.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();assert.equal((await accountCreated).status(),201);await accountForm.waitFor({state:'hidden'});
    await provincePage.locator('.account-management tbody tr').filter({hasText:'browser-created@qlxd.test'}).waitFor();
    await provincePage.getByRole('button',{name:'Phân quyền browser-created@qlxd.test',exact:true}).click();
    await accountForm.locator('[name=accountCommune]').selectOption(b.communeCode);await accountForm.getByLabel('Cho phép tài khoản hoạt động',{exact:true}).uncheck();
    const accountChanged=provincePage.waitForResponse(response=>response.url().endsWith('/api/accounts')&&response.request().method()==='PATCH');
    await accountForm.getByRole('button',{name:'Lưu phân quyền',exact:true}).click();assert.equal((await accountChanged).status(),200);await accountForm.waitFor({state:'hidden'});
    await provincePage.locator('.account-management tbody tr').filter({hasText:'browser-created@qlxd.test'}).getByText('Đã khóa',{exact:true}).waitFor();
    await provincePage.screenshot({path:join(evidence,'province-account-management.png'),fullPage:true});
    pass('province browser creates a commune account and changes its assigned locality and active status through the management dialog');
    await data(await send('/api/accounts',{email:emails[0],role:'commune',communeCode:b.communeCode,active:true},province,'PATCH'));
    const moved=await data<{permits:Permit[]}>(await send('/api/records',undefined,authA));assert.ok(moved.permits.every(r=>r.communeCode===b.communeCode));const oldSnapshotResponse=await send(`/api/analytics/export?id=${snapshot.id}&format=xlsx`,undefined,authA);assert.ok([403,404,410].includes(oldSnapshotResponse.status),'old-scope snapshot must remain inaccessible after reassignment');
    await data(await send('/api/accounts',{email:emails[1],role:'commune',communeCode:b.communeCode,active:false},province,'PATCH'));
    assert.equal((await send('/api/records',undefined,authB)).status,401);
    await data(await send('/api/accounts',{email:emails[1],role:'commune',communeCode:b.communeCode,active:true},province,'PATCH'));
    assert.equal((await send('/api/records',undefined,authB)).status,401,'old token must remain expired after re-enabling');
    const freshB=await login(emails[1]);assert.equal((await send('/api/records',undefined,freshB)).status,200);
    pass('role/commune changes and account disabling apply immediately to existing sessions');
    writeFileSync(join(evidence,'result.json'),JSON.stringify({passed:true,scope:'isolated temporary SQLite and local browser only; no production changes',checks,timestamp:new Date().toISOString()},null,2));
  }catch(error){writeFileSync(join(evidence,'result.json'),JSON.stringify({passed:false,checks,error:String(error),serverOutput:log},null,2));throw error;}
  finally{await browser?.close();server.kill('SIGTERM');await new Promise(r=>setTimeout(r,350));rmSync(directory,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
