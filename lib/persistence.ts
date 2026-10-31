import {publicMeasurement} from './record-measurement';
import * as cloud from './cloud-store';
import type {PermitInput,ReportInput,MapRecord,Idempotency,StatusInput,PermitProgressInput,InspectionInput,AnalyticsSnapshot,RecordLifecycleInput,RecordKind,AccountInput,AccountUpdateInput,AttachmentKind,RecordAttachment} from './types';
import {WorkflowError} from './workflow';
import {isSyntheticRecord,recordKind,type ManagedRecord} from './record-lifecycle';
export function cloudEnabled(){const mode=process.env.TTXD_STORAGE_BACKEND;if(mode&&mode!=='sqlite'&&mode!=='supabase')throw new Error('Invalid storage backend');if(process.env.VERCEL==='1'&&mode!=='supabase')throw new Error('Cloud storage required on Vercel');return mode==='supabase';}
async function backend(){return cloudEnabled()?cloud:import('./store');}
export async function verifyAdminCredentials(email:string,password:string){return(await backend()).verifyAdminCredentials(email,password);}
export async function authenticateAdminSession(email:string,password:string){return(await backend()).authenticateAdminSession(email,password);}
export async function createAdminSession(email='admin@qlxd'){return(await backend()).createAdminSession(email);}
export async function findAdminSession(token:string){return(await backend()).findAdminSession(token);}
export async function deleteAdminSession(token:string){return(await backend()).deleteAdminSession(token);}
export async function listRecords(includeDeleted=false){return(await backend()).listRecords(includeDeleted);}
export async function insertPermit(input:PermitInput,request?:Idempotency){return(await backend()).insertPermit(input,request);}
export async function insertReport(input:ReportInput,request?:Idempotency){return(await backend()).insertReport(input,request);}
export async function listPublicMapRecords():Promise<MapRecord[]>{const {permits,reports}=await listRecords();return[...permits.map(r=>({...publicMeasurement(r),id:r.id,kind:'permit' as const,title:'Công trình có giấy phép',subtitle:r.permitNumber,communeCode:r.communeCode,lat:r.lat,lng:r.lng,status:r.status,constructionStatus:r.constructionStatus||'uninspected',issueDate:r.issueDate,area:r.area,floors:r.floors,buildingHeight:r.buildingHeight,redLineBoundary:r.redLineBoundary,buildingLine:r.buildingLine})),...reports.map(r=>({...publicMeasurement(r),id:r.id,kind:'report' as const,title:'Phản ánh đã tiếp nhận',subtitle:r.publicCode,communeCode:r.communeCode,lat:r.lat,lng:r.lng,status:r.status}))];}
export const consumeCloudRateLimit=cloud.consumeRateLimit;

export async function listInspections(includeDeleted=false){return(await backend()).listInspections(includeDeleted);}
export async function updateRecordLifecycle(input:RecordLifecycleInput,actor?:string){const store=await backend();if(input.action==='trash'&&input.kind!=='inspection'){const inspections=await store.listInspections();if(inspections.some(item=>input.kind==='permit'?item.permitId===input.id:item.reportId===input.id))throw new WorkflowError(409,'Hãy chuyển các kết quả kiểm tra liên kết vào thùng rác trước.');}return store.updateRecordLifecycle(input,actor);}
export async function trashMarkedSamples(){const store=await backend();const [{permits,reports},inspections]=await Promise.all([store.listRecords(true),store.listInspections(true)]);const fakePermits=permits.filter(record=>!record.deletedAt&&isSyntheticRecord(record)),fakeReports=reports.filter(record=>!record.deletedAt&&isSyntheticRecord(record));const permitIds=new Set(fakePermits.map(record=>record.id)),reportIds=new Set(fakeReports.map(record=>record.id));const fakeInspections=inspections.filter(record=>!record.deletedAt&&(isSyntheticRecord(record)||(record.permitId&&permitIds.has(record.permitId))||(record.reportId&&reportIds.has(record.reportId))));const candidates:[RecordKind,ManagedRecord][]=[...fakeInspections.map(record=>['inspection',record] as [RecordKind,ManagedRecord]),...fakeReports.map(record=>['report',record] as [RecordKind,ManagedRecord]),...fakePermits.map(record=>['permit',record] as [RecordKind,ManagedRecord])];const counts:Record<RecordKind,number>={permit:0,report:0,inspection:0};let failed=0;for(const[kind,record]of candidates){try{await store.updateRecordLifecycle({kind,id:record.id,version:record.version||1,action:'trash'});counts[kind]++;}catch{failed++;}}return{trashed:counts,total:Object.values(counts).reduce((sum,count)=>sum+count,0),failed};}
export async function getRecordLifecycleData(){const store=await backend();const [{permits,reports},inspections]=await Promise.all([store.listRecords(true),store.listInspections(true)]);const fakePermitIds=new Set(permits.filter(isSyntheticRecord).map(record=>record.id)),fakeReportIds=new Set(reports.filter(isSyntheticRecord).map(record=>record.id));const managed:ManagedRecord[]=[...permits,...reports,...inspections];const active=managed.filter(record=>!record.deletedAt).map(record=>lifecycleSummary(record,isSyntheticRecord(record)||(recordKind(record)==='inspection'&&((record as import('./types').Inspection).permitId?fakePermitIds.has((record as import('./types').Inspection).permitId!):(record as import('./types').Inspection).reportId?fakeReportIds.has((record as import('./types').Inspection).reportId!):false))));const trash=managed.filter(record=>record.deletedAt).map(record=>lifecycleSummary(record,false));return{active,trash,syntheticCount:active.filter(record=>record.synthetic).length};}
function lifecycleSummary(record:ManagedRecord,synthetic:boolean){const kind=recordKind(record);const identifier=kind==='permit'?(record as import('./types').Permit).permitNumber:kind==='report'?(record as import('./types').CitizenReport).publicCode:(record as import('./types').Inspection).siteKey;const title=kind==='permit'?(record as import('./types').Permit).projectName:kind==='report'?(record as import('./types').CitizenReport).title:`Kiểm tra ngày ${(record as import('./types').Inspection).inspectionDate}`;return{id:record.id,kind,identifier,title,communeCode:record.communeCode,createdAt:record.createdAt,deletedAt:record.deletedAt,version:record.version||1,synthetic};}
export async function insertInspection(input:InspectionInput,request?:Idempotency){return(await backend()).insertInspection(input,request);}
function attachmentBackend(){if(!cloudEnabled())throw new WorkflowError(501,'Tệp đính kèm yêu cầu kho lưu trữ đám mây của hệ thống.');return cloud;}
export async function createAttachmentUpload(input:Parameters<typeof cloud.createAttachmentUpload>[0]){return attachmentBackend().createAttachmentUpload(input);}
export async function listRecordAttachments(kind:AttachmentKind,id:string):Promise<RecordAttachment[]>{return attachmentBackend().listRecordAttachments(kind,id);}
export async function getAttachment(id:string){return attachmentBackend().getAttachment(id);}
export async function completeAttachmentUpload(id:string){return attachmentBackend().completeAttachmentUpload(id);}
export async function abortAttachmentUpload(id:string){return attachmentBackend().abortAttachmentUpload(id);}
export async function createAttachmentDownloadUrl(id:string){return attachmentBackend().createAttachmentDownloadUrl(id);}
export async function updateReportStatus(input:StatusInput,actor?:string){return(await backend()).updateReportStatus(input,actor);}
export async function updatePermitProgress(input:PermitProgressInput,actor?:string){return(await backend()).updatePermitProgress(input,actor);}
export async function saveAnalyticsSnapshot(snapshot:AnalyticsSnapshot){return(await backend()).saveAnalyticsSnapshot(snapshot);}
export async function getAnalyticsSnapshot(id:string){return(await backend()).getAnalyticsSnapshot(id);}

export async function readAnalyticsData(){return(await backend()).readAnalyticsData();}
export async function updateRecordSource(kind:'permit'|'report'|'inspection',id:string,source:'real'|'demo'|'unknown',expectedVersion:number){return(await backend()).updateRecordSource(kind,id,source,expectedVersion);}

export async function listManagedAccounts(){return(await backend()).listManagedAccounts();}
export async function createManagedAccount(input:AccountInput){return(await backend()).createManagedAccount(input);}
export async function updateManagedAccount(input:AccountUpdateInput){return(await backend()).updateManagedAccount(input);}
export async function createDefaultCommuneAccounts(){return(await backend()).createDefaultCommuneAccounts();}
export async function changeOwnPassword(email:string,currentPassword:string,newPassword:string){return(await backend()).changeOwnPassword(email,currentPassword,newPassword);}
