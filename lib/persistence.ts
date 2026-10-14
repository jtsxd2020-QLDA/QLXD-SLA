import * as cloud from './cloud-store';
import type {PermitInput,ReportInput,MapRecord,Idempotency,StatusInput,InspectionInput,AnalyticsSnapshot} from './types';
export function cloudEnabled(){const mode=process.env.TTXD_STORAGE_BACKEND;if(mode&&mode!=='sqlite'&&mode!=='supabase')throw new Error('Invalid storage backend');if(process.env.VERCEL==='1'&&mode!=='supabase')throw new Error('Cloud storage required on Vercel');return mode==='supabase';}
async function backend(){return cloudEnabled()?cloud:import('./store');}
export async function verifyAdminCredentials(email:string,password:string){return(await backend()).verifyAdminCredentials(email,password);}
export async function createAdminSession(){return(await backend()).createAdminSession();}
export async function findAdminSession(token:string){return(await backend()).findAdminSession(token);}
export async function deleteAdminSession(token:string){return(await backend()).deleteAdminSession(token);}
export async function listRecords(){return(await backend()).listRecords();}
export async function insertPermit(input:PermitInput,request?:Idempotency){return(await backend()).insertPermit(input,request);}
export async function insertReport(input:ReportInput,request?:Idempotency){return(await backend()).insertReport(input,request);}
export async function listPublicMapRecords():Promise<MapRecord[]>{const {permits,reports}=await listRecords();return[...permits.map(r=>({id:r.id,kind:'permit' as const,title:'Công trình có giấy phép',subtitle:r.permitNumber,communeCode:r.communeCode,lat:r.lat,lng:r.lng,status:r.status})),...reports.map(r=>({id:r.id,kind:'report' as const,title:'Phản ánh đã tiếp nhận',subtitle:r.publicCode,communeCode:r.communeCode,lat:r.lat,lng:r.lng,status:r.status}))];}
export const consumeCloudRateLimit=cloud.consumeRateLimit;

export async function listInspections(){return(await backend()).listInspections();}
export async function insertInspection(input:InspectionInput,request?:Idempotency){return(await backend()).insertInspection(input,request);}
export async function updateReportStatus(input:StatusInput){return(await backend()).updateReportStatus(input);}
export async function saveAnalyticsSnapshot(snapshot:AnalyticsSnapshot){return(await backend()).saveAnalyticsSnapshot(snapshot);}
export async function getAnalyticsSnapshot(id:string){return(await backend()).getAnalyticsSnapshot(id);}

export async function readAnalyticsData(){return(await backend()).readAnalyticsData();}
export async function updateRecordSource(kind:'permit'|'report'|'inspection',id:string,source:'real'|'demo'|'unknown',expectedVersion:number){return(await backend()).updateRecordSource(kind,id,source,expectedVersion);}
