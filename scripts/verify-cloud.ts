import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {consumeRateLimit,createAdminSession,deleteAdminSession,findAdminSession,listRecords} from '../lib/cloud-store';

async function main(){
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
assert.ok(url&&key,'Anon key and URL required for direct access tests');
const anon=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
for(const table of ['ttxd_permits','ttxd_reports','ttxd_admin_users','ttxd_admin_sessions','ttxd_rate_limits','ttxd_communes']){
 const read=await anon.from(table).select('*');assert.ok(read.error,`Anon must not select ${table}`);
 const write=await anon.from(table).insert({});assert.ok(write.error,`Anon must not insert ${table}`);
}
const rpc=await anon.rpc('ttxd_consume_rate_limit',{p_key_hash:'a'.repeat(64),p_max:3,p_window_ms:60000});assert.ok(rpc.error,'Anon RPC forbidden');
console.log('PASS anonymous database reads, writes and rate-limit RPC denied');
const limitKey='cloud-qa:'+randomUUID();
const concurrent=await Promise.all(Array.from({length:20},()=>consumeRateLimit(limitKey,3,60000)));
assert.equal(concurrent.filter(Boolean).length,3);assert.equal(await consumeRateLimit(limitKey,3,60000),false);
console.log('PASS concurrent rate limit admits exactly 3 of 20; subsequent request denied');
const session=await createAdminSession();
try{
 assert.ok(await findAdminSession(session.token));
 const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {findAdminSession} from './lib/cloud-store.ts';if(!await findAdminSession(process.env.TTXD_QA_SESSION))process.exit(2);"],{encoding:'utf8',env:{...process.env,TTXD_QA_SESSION:session.token}});
 assert.equal(child.status,0,'Session must survive another server process');
 const origin=process.env.TTXD_PUBLIC_ORIGIN;
 if(origin){
  const cookie=`ttxd_admin_session=${session.token}`;
  assert.equal((await fetch(origin+'/api/records')).status,401);
  const privateResponse=await fetch(origin+'/api/records',{headers:{cookie}});assert.equal(privateResponse.status,200);
  const privateData=(await privateResponse.json()).data;assert.ok(privateData.permits.length>=15&&privateData.reports.length>=10);
  const forbidden=await fetch(origin+'/api/permits',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:'{}'});assert.equal(forbidden.status,403);
  const publicResponse=await fetch(origin+'/api/public/records');assert.equal(publicResponse.status,200);
  const publicData=(await publicResponse.json()).data.records;assert.ok(publicData.length>=25);
  for(const record of publicData)assert.deepEqual(Object.keys(record).sort(),['communeCode','id','kind','lat','lng','status','subtitle','title']);
  const logout=await fetch(origin+'/api/logout',{method:'POST',headers:{origin,cookie,'x-csrf-token':session.csrf,'content-type':'application/json'},body:'{}'});assert.equal(logout.status,200);
  assert.equal((await fetch(origin+'/api/records',{headers:{cookie}})).status,401);
  console.log('PASS production public/private API, CSRF and logout with disposable QA session');
 }
}finally{await deleteAdminSession(session.token);}
assert.equal(await findAdminSession(session.token),undefined);
const transfer=JSON.parse(readFileSync('data/cloud-transfer.json','utf8'));const records=await listRecords();
for(const row of transfer.permits)assert.ok(records.permits.some(r=>r.id===row.id));
for(const row of transfer.reports)assert.ok(records.reports.some(r=>r.id===row.id));
console.log('PASS original migrated records retained and decryptable');

}
main().catch(()=>{console.error("Cloud operation failed; check target, schema and private configuration.");process.exitCode=1;});
