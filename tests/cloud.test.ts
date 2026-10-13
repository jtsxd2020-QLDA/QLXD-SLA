import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,randomBytes} from 'node:crypto';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {decodeEnvelope,encryptionKey} from '../lib/cloud-store';
import {cloudEnabled,listRecords} from '../lib/persistence';
import {checkSameOriginRequest} from '../lib/security';

test('Vercel requires persistent backend and missing secrets never create local database',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ttxd-cloud-'));process.env.TTXD_DATA_DIR=dir;process.env.VERCEL='1';
 delete process.env.TTXD_STORAGE_BACKEND;assert.throws(cloudEnabled,/Cloud storage required/);
 process.env.TTXD_STORAGE_BACKEND='supabase';delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 await assert.rejects(listRecords,/Missing cloud database configuration/);assert.equal(existsSync(join(dir,'ttxd.sqlite')),false);
 delete process.env.VERCEL;delete process.env.TTXD_STORAGE_BACKEND;rmSync(dir,{recursive:true,force:true});
});
test('cloud decrypts existing AES-GCM format and rejects wrong or absent key',()=>{
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const body=Buffer.concat([cipher.update(JSON.stringify({id:'preserved',content:'private'})),cipher.final()]);
 const payload=JSON.stringify({version:1,ciphertext:[iv,cipher.getAuthTag(),body].map(b=>b.toString('base64')).join('.')});
 delete process.env.TTXD_ENCRYPTION_KEY;assert.throws(encryptionKey,/Missing or invalid/);
 process.env.TTXD_ENCRYPTION_KEY=key.toString('base64');assert.deepEqual(decodeEnvelope(payload),{id:'preserved',content:'private'});
 process.env.TTXD_ENCRYPTION_KEY=randomBytes(32).toString('base64');assert.throws(()=>decodeEnvelope(payload));delete process.env.TTXD_ENCRYPTION_KEY;
});
test('production origin admits only canonical domain and exact deployment host',()=>{
 process.env.VERCEL='1';process.env.TTXD_PUBLIC_ORIGIN='https://qlxd-sla.vercel.app';process.env.VERCEL_URL='qlxd-sla-release.vercel.app';
 const req=(host:string,origin:string)=>new Request(`https://${host}/api/records`,{headers:{host,origin}});
 checkSameOriginRequest(req('qlxd-sla.vercel.app','https://qlxd-sla.vercel.app'),true);
 checkSameOriginRequest(req('qlxd-sla-release.vercel.app','https://qlxd-sla-release.vercel.app'),true);
 assert.throws(()=>checkSameOriginRequest(req('evil.vercel.app','https://evil.vercel.app'),true));
 assert.throws(()=>checkSameOriginRequest(req('qlxd-sla.vercel.app','https://evil.example'),true));
 delete process.env.VERCEL;delete process.env.TTXD_PUBLIC_ORIGIN;delete process.env.VERCEL_URL;
});
