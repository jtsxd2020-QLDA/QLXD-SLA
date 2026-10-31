'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ATTACHMENT_BUCKET } from './attachments';
import type { AttachmentKind, RecordAttachment } from './types';
type CaptureData={capturedAt?:string;capturedLat?:number;capturedLng?:number};
let client:SupabaseClient|undefined;
function browserClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Thiếu cấu hình tải tệp an toàn.');if(!client)client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});return client;}
async function responseError(response:Response){const body=await response.json().catch(()=>({}));return typeof body.error==='string'?body.error:'Không thể xử lý tệp đính kèm.';}
function inferMime(file:File){if(file.type)return file.type;const ext=file.name.split('.').pop()?.toLowerCase();return({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',webp:'image/webp'} as Record<string,string>)[ext||'']||'application/octet-stream';}
export async function uploadAttachment(file:File,recordKind:AttachmentKind,recordId:string,csrfToken:string,capture:CaptureData={}):Promise<RecordAttachment>{
 const contentType=inferMime(file),response=await fetch('/api/attachments',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({recordKind,recordId,fileName:file.name,contentType,sizeBytes:file.size,...capture})});
 if(!response.ok)throw new Error(await responseError(response));
 const body=await response.json(),id=body.data?.attachment?.id,path=body.data?.path,token=body.data?.token;
 if(!id||!path||!token)throw new Error('Máy chủ không cấp được quyền tải tệp.');
 try{
   const{error}=await browserClient().storage.from(ATTACHMENT_BUCKET).uploadToSignedUrl(path,token,file,{contentType,upsert:false});
   if(error)throw new Error(error.message||'Tải tệp lên kho riêng tư thất bại.');
   const complete=await fetch('/api/attachments/complete',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({id})});
   if(!complete.ok)throw new Error(await responseError(complete));
   const result=await complete.json();if(!result.data?.id)throw new Error('Máy chủ chưa xác nhận tệp đã tải đầy đủ.');
   return result.data as RecordAttachment;
 }catch(error){await fetch('/api/attachments/abort',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({id})}).catch(()=>{});throw error;}
}
