import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {decodeEnvelope} from '../lib/cloud-store';

// An explicit target prevents accidentally importing into another connected project.
async function main(){
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const expected=process.env.TTXD_MIGRATION_PROJECT_REF;
if(!url||!key||!expected||new URL(url).hostname!==`${expected}.supabase.co`)throw new Error('Explicit migration target required');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const transfer=JSON.parse(readFileSync('data/cloud-transfer.json','utf8'));
for(const row of [...transfer.permits,...transfer.reports])decodeEnvelope(row.payload);
async function copy(table:string,primary:string,rows:Record<string,unknown>[]){
 for(const row of rows){
  const fields=Object.keys(row).join(',');
  let result=await client.from(table).select(fields).eq(primary,row[primary]).maybeSingle();
  if(result.error)throw new Error(`Read failed: ${table}`);
  if(!result.data){const insert=await client.from(table).insert(row);if(insert.error)throw new Error(`Insert failed: ${table}`);}
  result=await client.from(table).select(fields).eq(primary,row[primary]).single();
  if(result.error)throw new Error(`Verify failed: ${table}`);
  const verified=result.data as unknown as Record<string,unknown>;
  // Existing differing records are never overwritten by a repeat import.
  for(const field of Object.keys(row)){
   if(field==='created_at')assert.equal(new Date(String(verified[field])).getTime(),new Date(String(row[field])).getTime());
   else assert.deepEqual(verified[field],row[field],`Migration mismatch: ${table}.${field}`);
  }
 }
 console.log(`${table}: ${rows.length} verified`);
}
await copy('ttxd_permits','id',transfer.permits);
await copy('ttxd_reports','id',transfer.reports);
await copy('ttxd_admin_users','email',transfer.admins);
const geo=JSON.parse(readFileSync('geodata/sonla.full.geojson','utf8'));
const provenance=JSON.parse(readFileSync('geodata/provenance.json','utf8'));
await copy('ttxd_communes','commune_code',geo.features.map((f:{properties:{communeCode:string,name:string,type:string},geometry:unknown})=>({commune_code:f.properties.communeCode,name:f.properties.name,kind:f.properties.type,geometry:f.geometry,provenance})));
console.log('Migration verified. Local data and passwords retained; local sessions were not copied.');

}
main().catch(()=>{console.error("Cloud operation failed; check target, schema and private configuration.");process.exitCode=1;});
