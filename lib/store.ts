import {WorkflowError,statusRecord,metadata,inspectionSource} from './workflow';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash, timingSafeEqual, scryptSync } from 'node:crypto';
import type { PermitInput, ReportInput, Permit, CitizenReport, Inspection, InspectionInput, StatusInput, Idempotency, AnalyticsSnapshot } from './types';
let database: DatabaseSync | undefined;
export const dataDirectory = () => process.env.TTXD_DATA_DIR || join(process.cwd(), 'data');
function privateFile(name: string, make: () => Buffer): Buffer {
  const dir = dataDirectory(); mkdirSync(dir, { recursive: true, mode: 0o700 }); chmodSync(dir, 0o700);
  const path = join(dir, name);
  if (!existsSync(path)) {
    if (name === 'secret.key' && existsSync(join(dir,'ttxd.sqlite')) && statSync(join(dir,'ttxd.sqlite')).size > 0) throw new Error('Missing encryption key for existing database. Restore matching key.');
    try { writeFileSync(path, make(), { mode: 0o600, flag: 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  }
  chmodSync(path, 0o600); return readFileSync(path);
}
function db() {
  if (!database) {
    privateFile('secret.key', () => randomBytes(32));
    const path = join(dataDirectory(), 'ttxd.sqlite');
    privateFile('ttxd.sqlite', () => Buffer.alloc(0));
    database = new DatabaseSync(path);
    database.exec(`PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS permits(id TEXT PRIMARY KEY, duplicate_key TEXT NOT NULL UNIQUE, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_users(email TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_sessions(hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS inspections(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS record_metadata(kind TEXT NOT NULL,id TEXT NOT NULL,metadata TEXT NOT NULL,version INTEGER NOT NULL,PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS idempotency(key TEXT PRIMARY KEY,digest TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS analytics_snapshots(id TEXT PRIMARY KEY,payload TEXT NOT NULL,expires INTEGER NOT NULL);`);
  } return database;
}
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', privateFile('secret.key', () => randomBytes(32)), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
}
export function decrypt(value: string) {
  const [iv, tag, body] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', privateFile('secret.key', () => randomBytes(32)), iv); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(body), cipher.final()]).toString('utf8');
}
export function createAdminAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase('en-US');
  if (normalizedEmail !== 'admin@qlxd') throw new Error('Tài khoản khởi tạo phải là admin@qlxd.');
  if (password.length < 12 || password.length > 128) throw new Error('Mật khẩu phải dài từ 12 đến 128 ký tự.');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, salt, 64).toString('hex');
  try {
    db().prepare('INSERT INTO admin_users(email,salt,password_hash,created_at) VALUES(?,?,?,?)')
      .run(normalizedEmail, salt, passwordHash, new Date().toISOString());
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: admin_users.email')) throw new Error('Tài khoản admin@qlxd đã tồn tại.',{cause:error});
    throw error;
  }
}
export function verifyAdminCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase('en-US');
  const user = db().prepare('SELECT salt,password_hash FROM admin_users WHERE email=?').get(normalizedEmail) as {salt:string;password_hash:string}|undefined;
  // Perform a scrypt operation for unknown accounts too, reducing timing differences.
  const salt = user?.salt || '00'.repeat(16);
  const actual = scryptSync(password.slice(0, 128), salt, 64);
  const expected = Buffer.from(user?.password_hash || '00'.repeat(64), 'hex');
  return !!user && password.length <= 128 && expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function createAdminSession() {
  const token = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
  db().prepare('DELETE FROM admin_sessions WHERE expires < ?').run(Date.now());
  db().prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(digest(token), csrf, Date.now()+8*60*60*1000);
  return { token, csrf };
}
export function findAdminSession(token: string) {
  return db().prepare('SELECT csrf, expires FROM admin_sessions WHERE hash=? AND expires>?').get(digest(token), Date.now()) as {csrf:string;expires:number}|undefined;
}
export function deleteAdminSession(token: string) { db().prepare('DELETE FROM admin_sessions WHERE hash=?').run(digest(token)); }
export function insertPermit(input: PermitInput, request?:Idempotency): Permit {
  const record: Permit = {...input,id:randomUUID(),createdAt:new Date().toISOString(),status:'active',source:'real',version:1};
  const duplicate = [input.issuingAuthority.trim().toLocaleLowerCase('vi'),input.permitNumber.trim().toLocaleLowerCase('vi'),input.issueDate.slice(0,4)].join('|');
  return insertAtomic('permit',record,request,()=>db().prepare('INSERT INTO permits VALUES(?,?,?)').run(record.id,digest(duplicate),encode(record)));
}
export function insertReport(input: ReportInput, request?:Idempotency): CitizenReport {
  const record: CitizenReport = {...input,id:randomUUID(),publicCode:'PA-'+randomBytes(6).toString('hex').toUpperCase(),createdAt:new Date().toISOString(),status:'received',source:'real',version:1,history:[],historyStartedAt:new Date().toISOString()};
  return insertAtomic('report',record,request,()=>db().prepare('INSERT INTO reports VALUES(?,?)').run(record.id,encode(record)));
}
function decodePayload<T>(payload:string):T {
  const envelope=JSON.parse(payload);
  if(envelope.version !== 1 || typeof envelope.ciphertext !== 'string') throw new Error('Unsupported encrypted payload format.');
  return JSON.parse(decrypt(envelope.ciphertext)) as T;
}
export function listRecords() {
  const permits = db().prepare('SELECT payload FROM permits ORDER BY rowid DESC').all().map(row => {return decodePayload<Permit>(row.payload as string);});
  const reports = db().prepare('SELECT payload FROM reports ORDER BY rowid DESC').all().map(row => {return decodePayload<CitizenReport>(row.payload as string);});
  return {permits,reports};
}
export function listPublicMapRecords() {
  const {permits,reports}=listRecords();
  return [
    ...permits.map(record=>({id:record.id,kind:'permit' as const,title:'Công trình có giấy phép',subtitle:record.permitNumber,communeCode:record.communeCode,lat:record.lat,lng:record.lng,status:'active',source:'real',version:1})),
    ...reports.map(record=>({id:record.id,kind:'report' as const,title:'Phản ánh đã tiếp nhận',subtitle:record.publicCode,communeCode:record.communeCode,lat:record.lat,lng:record.lng,status:record.status}))
  ];
}

function encode(value:unknown){return JSON.stringify({version:1,ciphertext:encrypt(JSON.stringify(value))});}
function transaction<T>(fn:()=>T):T{db().exec('BEGIN IMMEDIATE');try{const value=fn();db().exec('COMMIT');return value;}catch(error){db().exec('ROLLBACK');throw error;}}
function insertAtomic<T extends Permit|CitizenReport|Inspection>(kind:string,record:T,request:Idempotency|undefined,write:()=>unknown):T{return transaction(()=>{if(request){const existing=db().prepare('SELECT digest,kind,id FROM idempotency WHERE key=?').get(request.key);if(existing){if(existing.digest!==request.digest||existing.kind!==kind)throw new WorkflowError(409,'Mã gửi đã dùng cho nội dung khác.');const table=kind==='permit'?'permits':kind==='report'?'reports':'inspections';const row=db().prepare(`SELECT payload FROM ${table} WHERE id=?`).get(existing.id as string);if(!row)throw new Error('Missing idempotency record');return decodePayload<T>(row.payload as string);}}write();db().prepare('INSERT INTO record_metadata VALUES(?,?,?,?)').run(kind,record.id,JSON.stringify(metadata(record)),record.version||1);if(request)db().prepare('INSERT INTO idempotency VALUES(?,?,?,?)').run(request.key,request.digest,kind,record.id);return record;});}
export function updateReportStatus(input:StatusInput){return transaction(()=>{const row=db().prepare('SELECT payload FROM reports WHERE id=?').get(input.id);if(!row)throw new WorkflowError(404,'Không tìm thấy phản ánh.');const record=statusRecord(decodePayload<CitizenReport>(row.payload as string),input);db().prepare('UPDATE reports SET payload=? WHERE id=?').run(encode(record),record.id);db().prepare('INSERT INTO record_metadata VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET metadata=excluded.metadata,version=excluded.version').run('report',record.id,JSON.stringify(metadata(record)),record.version!);return record;});}
export function listInspections(){return db().prepare('SELECT payload FROM inspections ORDER BY rowid DESC').all().map(row=>decodePayload<Inspection>(row.payload as string));}
export function insertInspection(input:InspectionInput,request?:Idempotency){const records=listRecords();if(input.permitId&&!records.permits.some(r=>r.id===input.permitId&&r.communeCode===input.communeCode))throw new WorkflowError(422,'GPXD liên kết không tồn tại.');if(input.reportId&&!records.reports.some(r=>r.id===input.reportId&&r.communeCode===input.communeCode))throw new WorkflowError(422,'Phản ánh liên kết không tồn tại.');const links=[...records.permits.filter(r=>r.id===input.permitId),...records.reports.filter(r=>r.id===input.reportId)];const record:Inspection={...input,siteKey:input.permitId||input.siteKey,id:randomUUID(),createdAt:new Date().toISOString(),source:inspectionSource(links),version:1};return insertAtomic('inspection',record,request,()=>db().prepare('INSERT INTO inspections VALUES(?,?,?)').run(record.id,encode(record),1));}
export function saveAnalyticsSnapshot(snapshot:AnalyticsSnapshot){db().prepare('DELETE FROM analytics_snapshots WHERE expires<?').run(Date.now());db().prepare('INSERT INTO analytics_snapshots VALUES(?,?,?)').run(snapshot.id,encode(snapshot),Date.now()+30*60_000);}
export function getAnalyticsSnapshot(id:string){const row=db().prepare('SELECT payload FROM analytics_snapshots WHERE id=? AND expires>?').get(id,Date.now());return row?decodePayload<AnalyticsSnapshot>(row.payload as string):undefined;}

export function readAnalyticsData(){return transaction(()=>{const counts=db().prepare('SELECT (SELECT count(*) FROM permits)+(SELECT count(*) FROM reports)+(SELECT count(*) FROM inspections) AS count').get();if(Number(counts?.count)>10000)throw new WorkflowError(413,'Báo cáo vượt giới hạn 10000 hồ sơ.');return{records:listRecords(),inspections:listInspections()};});}
export function updateRecordSource(kind:'permit'|'report'|'inspection',id:string,source:'real'|'demo'|'unknown',expectedVersion:number){return transaction(()=>{const table=kind==='permit'?'permits':kind==='report'?'reports':'inspections';const row=db().prepare(`SELECT payload FROM ${table} WHERE id=?`).get(id);if(!row)throw new WorkflowError(404,'Không tìm thấy hồ sơ.');const record=decodePayload<Permit|CitizenReport|Inspection>(row.payload as string);if((record.version||1)!==expectedVersion)throw new WorkflowError(409,'Phiên bản hồ sơ đã thay đổi.');const updated={...record,source,version:expectedVersion+1};db().prepare(`UPDATE ${table} SET payload=? WHERE id=?`).run(encode(updated),id);db().prepare('INSERT INTO record_metadata VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET metadata=excluded.metadata,version=excluded.version').run(kind,id,JSON.stringify(metadata(updated)),updated.version);return updated;});}
