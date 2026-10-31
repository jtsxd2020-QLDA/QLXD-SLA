import { requireRecordAccess } from '@/lib/scoped-records';
import { abortAttachmentUpload, getAttachment } from '@/lib/persistence';
import { ApiError, errorResponse, json, readJson, requireSession } from '@/lib/security';
export const runtime='nodejs';
export async function POST(request:Request){try{const session=await requireSession(request,true);const body=await readJson(request);const id=body&&typeof body==='object'&&!Array.isArray(body)?(body as Record<string,unknown>).id:undefined;if(typeof id!=='string'||!/^[-0-9a-f]{36}$/i.test(id))throw new ApiError(400,'Mã tệp đính kèm không hợp lệ.');const item=await getAttachment(id);await requireRecordAccess(session.user,item.record_kind,item.record_id);return json(await abortAttachmentUpload(id));}catch(error){return errorResponse(error);}}
