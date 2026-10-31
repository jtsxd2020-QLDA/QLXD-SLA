import { accountIdentity, defaultCommuneAccounts, managedAccount, validateAccountInput, validateAccountUpdate, type AccountRow } from './account-validation';
import {WorkflowError,statusRecord,permitProgressRecord,metadata,inspectionSource} from './workflow';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID,createHash,createCipheriv,createDecipheriv,scryptSync,timingSafeEqual} from 'node:crypto';
import type {PermitInput,ReportInput,Permit,CitizenReport,Inspection,InspectionInput,StatusInput,PermitProgressInput,Idempotency,AnalyticsSnapshot,RecordLifecycleInput,RecordKind,AccountInput,AccountUpdateInput,AuthSession} from './types';
import {updateRecordLifecycle as applyLifecycleChange,type ManagedRecord} from './record-lifecycle';
if(typeof window!=='undefined')throw new Error('Server persistence cannot run in browser');
let client:SupabaseClient|undefined;
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
function db(){
 if(!client){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Missing cloud database configuration');encryptionKey();client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
 return client;
}
export function encryptionKey(){const encoded=process.env.TTXD_ENCRYPTION_KEY;if(!encoded||!/^[A-Za-z0-9+/]{43}=$/.test(encoded))throw new Error('Missing or invalid cloud encryption key');const key=Buffer.from(encoded,'base64');if(key.length!==32)throw new Error('Invalid encryption key');return key;}
function envelope(value:unknown){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return JSON.stringify({version:1,ciphertext:[iv,cipher.getAuthTag(),body].map(v=>v.toString('base64')).join('.')});}
export function decodeEnvelope<T>(payload:string):T{const value=JSON.parse(payload);if(value.version!==1||typeof value.ciphertext!=='string')throw new Error('Invalid encrypted envelope');const [iv,tag,body]=value.ciphertext.split('.').map((v:string)=>Buffer.from(v,'base64'));const cipher=createDecipheriv('aes-256-gcm',encryptionKey(),iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(body),cipher.final()]).toString('utf8'));}
function failed(error:unknown):never{throw new Error('Cloud database operation failed',{cause:error});}
export async function verifyAdminCredentials(email:string,password:string){
 const {data,error}=await db().from('ttxd_admin_users').select('email,salt,password_hash,role,commune_code,active,created_at').eq('email',email.trim().toLowerCase()).maybeSingle();
 if(error)failed(error);
 const actual=scryptSync(password.slice(0,128),data?.salt||'00'.repeat(16),64),expected=Buffer.from(data?.password_hash||'00'.repeat(64),'hex');
 return !!accountIdentity(data as AccountRow|null)&&password.length<=128&&expected.length===actual.length&&timingSafeEqual(actual,expected);
}
/** The RPC takes a row lock and rechecks the verified hash before insertion.
 * A concurrent password reset either precedes insertion or revokes this session. */
export async function authenticateAdminSession(email:string,password:string){
 const normalized=email.trim().toLowerCase();
 const {data,error}=await db().from('ttxd_admin_users').select('email,salt,password_hash,role,commune_code,active,created_at').eq('email',normalized).maybeSingle();
 if(error)failed(error);
 const actual=scryptSync(password.slice(0,128),data?.salt||'00'.repeat(16),64),expected=Buffer.from(data?.password_hash||'00'.repeat(64),'hex');
 if(!data||!accountIdentity(data as AccountRow)||password.length>128||expected.length!==actual.length||!timingSafeEqual(actual,expected))return undefined;
 const token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url'),expires=Date.now()+8*60*60*1000;
 const result=await db().rpc('ttxd_create_verified_session',{p_email:normalized,p_expected_hash:data.password_hash,p_hash:digest(token),p_csrf:csrf,p_expires:expires});
 if(result.error)failed(result.error);
 if(result.data!==true)return undefined;
 const session=await findAdminSession(token);
 return session?{token,csrf,user:session.user}:undefined;
}
export async function createAdminSession(email='admin@qlxd'){
 const {data,error:accountError}=await db().from('ttxd_admin_users').select('email,role,commune_code,active,created_at').eq('email',email.trim().toLowerCase()).maybeSingle();
 if(accountError)failed(accountError);
 const user=accountIdentity(data as AccountRow|null);
 if(!user)throw new WorkflowError(401,'Tài khoản chưa được phân quyền hoặc đã bị khóa.');
 const token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');
 const {error}=await db().from('ttxd_admin_sessions').insert({hash:digest(token),csrf,expires:Date.now()+8*60*60*1000,user_email:user.email});
 if(error?.message?.includes('TTXD_SESSION_ACCOUNT_UNAVAILABLE'))throw new WorkflowError(401,'Tài khoản chưa được phân quyền hoặc đã bị khóa.');
 if(error)failed(error);return{token,csrf,user};
}
export async function findAdminSession(token:string):Promise<AuthSession|undefined>{
 const {data,error}=await db().from('ttxd_admin_sessions').select('csrf,expires,user_email').eq('hash',digest(token)).gt('expires',Date.now()).maybeSingle();
 if(error)failed(error);if(!data||typeof data.user_email!=='string')return undefined;
 const {data:account,error:accountError}=await db().from('ttxd_admin_users').select('email,role,commune_code,active,created_at').eq('email',data.user_email).maybeSingle();
 if(accountError)failed(accountError);
 const user=accountIdentity(account as AccountRow|null);
 return user?{csrf:data.csrf as string,expires:Number(data.expires),user}:undefined;
}
export async function listManagedAccounts(){
 const accounts:AccountRow[]=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await db().from('ttxd_admin_users').select('email,role,commune_code,active,created_at').order('email').range(offset,offset+499);
  if(error)failed(error);
  accounts.push(...(data as AccountRow[]||[]));
  if(accounts.length>10000)throw new WorkflowError(413,'Danh sách tài khoản vượt giới hạn, cần tải theo lô.');
  if((data?.length||0)<500)break;
 }
 return accounts.map(managedAccount);
}
export async function createManagedAccount(input:AccountInput){
 const value=validateAccountInput(input),salt=randomBytes(16).toString('hex'),createdAt=new Date().toISOString();
 const passwordHash=scryptSync(value.password,salt,64).toString('hex');
 const {error}=await db().from('ttxd_admin_users').insert({email:value.email,salt,password_hash:passwordHash,role:value.role,commune_code:value.communeCode,active:true,created_at:createdAt});
 if(error?.code==='23505')throw new WorkflowError(409,'Tài khoản đã tồn tại.');if(error)failed(error);
 return{email:value.email,role:value.role,communeCode:value.communeCode,active:true,createdAt};
}
export async function createDefaultCommuneAccounts(){
 const desired=defaultCommuneAccounts(),accounts=await listManagedAccounts(),byEmail=new Map(accounts.map(account=>[account.email.toLowerCase(),account]));
 let created=0,skipped=0;const conflicts:string[]=[],rows=[];
 for(const account of desired){
  const existing=byEmail.get(account.email);
  if(existing){if(existing.role==='commune'&&existing.communeCode===account.communeCode)skipped++;else conflicts.push(account.email);continue;}
  const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(account.password,salt,64).toString('hex');
  rows.push({email:account.email,salt,password_hash:passwordHash,role:account.role,commune_code:account.communeCode,active:true,created_at:new Date().toISOString()});
 }
 if(rows.length){const {error}=await db().from('ttxd_admin_users').insert(rows);if(error)failed(error);created=rows.length;}
 return{created,skipped,conflicts};
}
export async function changeOwnPassword(email:string,currentPassword:string,newPassword:string){
 const normalized=email.trim().toLowerCase();
 const {data,error}=await db().from('ttxd_admin_users').select('email,salt,password_hash,role,commune_code,active,created_at').eq('email',normalized).maybeSingle();
 if(error)failed(error);
 const actual=scryptSync(currentPassword.slice(0,128),data?.salt||'00'.repeat(16),64),expected=Buffer.from(data?.password_hash||'00'.repeat(64),'hex');
 if(!data||!accountIdentity(data as AccountRow)||currentPassword.length>128||expected.length!==actual.length||!timingSafeEqual(actual,expected))throw new WorkflowError(401,'Mật khẩu hiện tại không đúng.');
 const salt=randomBytes(16).toString('hex'),passwordHash=scryptSync(newPassword,salt,64).toString('hex');
 const {data:updated,error:updateError}=await db().from('ttxd_admin_users').update({salt,password_hash:passwordHash}).eq('email',normalized).eq('password_hash',data.password_hash).select('email').maybeSingle();
 if(updateError)failed(updateError);if(!updated)throw new WorkflowError(404,'Không tìm thấy tài khoản.');
}
export async function updateManagedAccount(input:AccountUpdateInput){
 const value=validateAccountUpdate(input);
 const salt=value.password?randomBytes(16).toString('hex'):undefined;
 const passwordHash=value.password&&salt?scryptSync(value.password,salt,64).toString('hex'):undefined;
 const {data,error}=await db().from('ttxd_admin_users').update({role:value.role,commune_code:value.communeCode,active:value.active,...(salt&&passwordHash?{salt,password_hash:passwordHash}:{})}).eq('email',value.email).select('email,role,commune_code,active,created_at').maybeSingle();
 if(error?.message?.includes('TTXD_LAST_PROVINCE'))throw new WorkflowError(409,'Phải giữ ít nhất một tài khoản cấp tỉnh đang hoạt động.');
 if(error)failed(error);if(!data)throw new WorkflowError(404,'Không tìm thấy tài khoản.');
 return managedAccount(data as AccountRow);
}
export async function deleteAdminSession(token:string){const {error}=await db().from('ttxd_admin_sessions').delete().eq('hash',digest(token));if(error)failed(error);}
async function writeRecord<T extends Permit|CitizenReport|Inspection>(kind:string,record:T,request?:Idempotency,duplicate?:string,expected?:number):Promise<T>{const{data,error}=await db().rpc('ttxd_write_record',{p_kind:kind,p_id:record.id,p_payload:envelope(record),p_metadata:metadata(record),p_duplicate:duplicate||null,p_expected:expected||null,p_key:request?.key||null,p_digest:request?.digest||null});if(error){if(error.message?.includes('TTXD_IDEMPOTENCY_CONFLICT'))throw new WorkflowError(409,'Mã gửi đã dùng cho nội dung khác.');if(error.message?.includes('TTXD_VERSION_CONFLICT'))throw new WorkflowError(409,'Hồ sơ đã thay đổi. Hãy tải lại.');if(error.message?.includes('TTXD_NOT_FOUND'))throw new WorkflowError(404,'Không tìm thấy hồ sơ.');if(error.code==='23505'&&kind==='permit')throw new Error('TTXD_DUPLICATE_PERMIT');failed(error);}if(typeof data!=='string')throw new Error('Invalid RPC record response');return decodeEnvelope<T>(data);}
export async function insertPermit(input:PermitInput,request?:Idempotency):Promise<Permit>{const record:Permit={...input,constructionStatus:input.constructionStatus||'uninspected',id:randomUUID(),createdAt:new Date().toISOString(),status:'active',source:'real',version:1};const duplicate=[input.issuingAuthority.trim().toLocaleLowerCase('vi'),input.permitNumber.trim().toLocaleLowerCase('vi'),input.issueDate.slice(0,4)].join('|');return writeRecord('permit',record,request,digest(duplicate));}
export async function insertReport(input:ReportInput,request?:Idempotency):Promise<CitizenReport>{const now=new Date().toISOString();const record:CitizenReport={...input,id:randomUUID(),publicCode:'PA-'+randomBytes(6).toString('hex').toUpperCase(),createdAt:now,status:'received',source:'real',version:1,history:[],historyStartedAt:now};return writeRecord('report',record,request);}
export async function updateReportStatus(input:StatusInput,actor?:string){const{data,error}=await db().from('ttxd_reports').select('payload').eq('id',input.id).maybeSingle();if(error)failed(error);if(!data)throw new WorkflowError(404,'Không tìm thấy phản ánh.');return writeRecord('report',statusRecord(decodeEnvelope<CitizenReport>(data.payload),input,actor),undefined,undefined,input.version);}
export async function updatePermitProgress(input:PermitProgressInput,actor?:string){const{data,error}=await db().from('ttxd_permits').select('payload').eq('id',input.id).maybeSingle();if(error)failed(error);if(!data)throw new WorkflowError(404,'Không tìm thấy giấy phép.');return writeRecord('permit',permitProgressRecord(decodeEnvelope<Permit>(data.payload),input,actor),undefined,undefined,input.version);}
export async function insertInspection(input:InspectionInput,request?:Idempotency){const links:{source?:Permit['source']}[]=[];for(const[kind,id]of[['ttxd_permits',input.permitId],['ttxd_reports',input.reportId]]){if(id){const{data,error}=await db().from(kind!).select('payload').eq('id',id).maybeSingle();if(error)failed(error);if(!data)throw new WorkflowError(422,'Hồ sơ liên kết không tồn tại hoặc khác địa bàn.');const linked=decodeEnvelope<Permit|CitizenReport>(data.payload);if(linked.deletedAt||linked.communeCode!==input.communeCode)throw new WorkflowError(422,'Hồ sơ liên kết không tồn tại hoặc khác địa bàn.');links.push(linked);}}const record:Inspection={...input,siteKey:input.permitId||input.siteKey,id:randomUUID(),createdAt:new Date().toISOString(),source:inspectionSource(links),version:1};return writeRecord('inspection',record,request);}
export async function listInspections(includeDeleted=false){return readRecords<Inspection>('ttxd_inspections',includeDeleted);}
export async function saveAnalyticsSnapshot(snapshot:AnalyticsSnapshot){const cleanup=await db().from('ttxd_analytics_snapshots').delete().lt('expires',Date.now());if(cleanup.error)failed(cleanup.error);const{error}=await db().from('ttxd_analytics_snapshots').insert({id:snapshot.id,payload:envelope(snapshot),expires:Date.now()+30*60_000});if(error)failed(error);}
export async function getAnalyticsSnapshot(id:string){const{data,error}=await db().from('ttxd_analytics_snapshots').select('payload').eq('id',id).gt('expires',Date.now()).maybeSingle();if(error)failed(error);return data?decodeEnvelope<AnalyticsSnapshot>(data.payload):undefined;}
async function readRecords<T extends {createdAt:string;deletedAt?:string}>(table:string,includeDeleted=false){const records:T[]=[];for(let offset=0;;offset+=500){const {data,error}=await db().from(table).select('payload').order('id').range(offset,offset+499);if(error)failed(error);if(records.length+(data?.length||0)>10000)throw new WorkflowError(413,'Báo cáo vượt giới hạn 10000 hồ sơ; cần xuất theo lô.');for(const row of data||[]){const record=decodeEnvelope<T>(row.payload);if(includeDeleted||!record.deletedAt)records.push(record);}if((data?.length||0)<500)break;}return records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function listRecords(includeDeleted=false){const [permits,reports]=await Promise.all([readRecords<Permit>('ttxd_permits',includeDeleted),readRecords<CitizenReport>('ttxd_reports',includeDeleted)]);return{permits,reports};}
export async function updateRecordLifecycle(input:RecordLifecycleInput,actor?:string){const table:Record<RecordKind,string>={permit:'ttxd_permits',report:'ttxd_reports',inspection:'ttxd_inspections'};const {data,error}=await db().from(table[input.kind]).select('payload').eq('id',input.id).maybeSingle();if(error)failed(error);if(!data)throw new WorkflowError(404,'Không tìm thấy hồ sơ.');const record=decodeEnvelope<ManagedRecord>(data.payload);const updated=applyLifecycleChange(record,input,actor);const cleanup=await db().from('ttxd_analytics_snapshots').delete().gt('expires',0);if(cleanup.error)failed(cleanup.error);return writeRecord(input.kind,updated,undefined,undefined,input.version);}
export async function consumeRateLimit(key:string,max:number,windowMs:number){const {data,error}=await db().rpc('ttxd_consume_rate_limit',{p_key_hash:digest(key),p_max:max,p_window_ms:windowMs});if(error)failed(error);return data===true;}

export async function readAnalyticsData(){const{data,error}=await db().rpc('ttxd_analytics_read');if(error?.message?.includes('TTXD_ANALYTICS_LIMIT'))throw new WorkflowError(413,'Báo cáo vượt giới hạn 10000 hồ sơ.');if(error)failed(error);if(!data||!Array.isArray(data.permits)||!Array.isArray(data.reports)||!Array.isArray(data.inspections))throw new Error('Invalid analytics data');return{records:{permits:data.permits.map((p:string)=>decodeEnvelope<Permit>(p)).filter((r:Permit)=>!r.deletedAt),reports:data.reports.map((p:string)=>decodeEnvelope<CitizenReport>(p)).filter((r:CitizenReport)=>!r.deletedAt)},inspections:data.inspections.map((p:string)=>decodeEnvelope<Inspection>(p)).filter((r:Inspection)=>!r.deletedAt)};}
export async function updateRecordSource(kind:'permit'|'report'|'inspection',id:string,source:'real'|'demo'|'unknown',expectedVersion:number){const table=kind==='permit'?'ttxd_permits':kind==='report'?'ttxd_reports':'ttxd_inspections';const{data,error}=await db().from(table).select('payload').eq('id',id).maybeSingle();if(error)failed(error);if(!data)throw new WorkflowError(404,'Không tìm thấy hồ sơ.');const record=decodeEnvelope<Permit|CitizenReport|Inspection>(data.payload);if((record.version||1)!==expectedVersion)throw new WorkflowError(409,'Phiên bản đã thay đổi.');return writeRecord(kind,{...record,source,version:expectedVersion+1},undefined,undefined,expectedVersion);}
