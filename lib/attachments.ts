import { z } from 'zod';
import { ApiError } from './security';
import type { AttachmentKind } from './types';

export const ATTACHMENT_BUCKET = 'qlxd-private-attachments';
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const permitMime:Record<string,string[]>={
  'application/pdf':['pdf'],
  'image/png':['png'],
  'image/jpeg':['jpg','jpeg'],
  'application/msword':['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx'],
};
const imageMime:Record<string,string[]>={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp']};
const schema=z.object({recordKind:z.enum(['permit','inspection']),recordId:z.string().uuid(),fileName:z.string().trim().min(1).max(255),contentType:z.string().trim().toLowerCase().max(200),sizeBytes:z.number().int().positive().max(MAX_ATTACHMENT_BYTES),capturedAt:z.string().datetime().optional(),capturedLat:z.number().finite().min(-90).max(90).optional(),capturedLng:z.number().finite().min(-180).max(180).optional()}).strict().superRefine((value,ctx)=>{
  const extension=value.fileName.split('.').pop()?.toLowerCase()||'';
  const mime=value.contentType==='image/jpg'?'image/jpeg':value.contentType;
  const types=value.recordKind==='inspection'?imageMime:permitMime;
  if(!types[mime]?.includes(extension))ctx.addIssue({code:'custom',path:['contentType'],message:value.recordKind==='inspection'?'Ảnh kiểm tra chỉ nhận PNG, JPEG hoặc WebP.':'GPXD chỉ nhận PDF, PNG, JPEG hoặc Word.'});
  if((value.capturedLat===undefined)!==(value.capturedLng===undefined))ctx.addIssue({code:'custom',path:['capturedLat'],message:'Tọa độ chụp cần có đủ vĩ độ và kinh độ.'});
  if(value.recordKind==='permit'&&(value.capturedAt||value.capturedLat!==undefined||value.capturedLng!==undefined))ctx.addIssue({code:'custom',path:['capturedAt'],message:'Thông tin chụp chỉ áp dụng cho ảnh kiểm tra hiện trường.'});
});
export type AttachmentUploadInput=z.infer<typeof schema>;
export function validateAttachmentUpload(input:unknown):AttachmentUploadInput{
  const result=schema.safeParse(input);
  if(!result.success){const fields:Record<string,string>={};for(const issue of result.error.issues)fields[issue.path.join('.')||'form']=issue.message;throw new ApiError(422,'Thông tin tệp đính kèm không hợp lệ.',fields);}
  const name=result.data.fileName.replace(/[\\/\\x00-\\x1f]/g,'_').replace(/^\\.+/,'').trim();
  return{...result.data,fileName:name||'tep-dinh-kem'};
}
