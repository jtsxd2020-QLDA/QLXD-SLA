import { requireRecordAccess } from '@/lib/scoped-records';
import { createAttachmentUpload, listRecordAttachments } from '@/lib/persistence';
import { ApiError, errorResponse, json, readJson, requireSession } from '@/lib/security';
import { validateAttachmentUpload } from '@/lib/attachments';
import type { AttachmentKind } from '@/lib/types';
export const runtime='nodejs';
export async function GET(request:Request){try{const session=await requireSession(request);const url=new URL(request.url),kind=url.searchParams.get('recordKind'),id=url.searchParams.get('recordId');if((kind!=='permit'&&kind!=='inspection')||!id||!/^[-0-9a-f]{36}$/i.test(id))throw new ApiError(400,'Hồ sơ đính kèm không hợp lệ.');await requireRecordAccess(session.user,kind as AttachmentKind,id);return json(await listRecordAttachments(kind as AttachmentKind,id));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validateAttachmentUpload(await readJson(request));await requireRecordAccess(session.user,input.recordKind,input.recordId);const result=await createAttachmentUpload({...input,uploadedBy:session.user.email});return json(result,201);}catch(error){return errorResponse(error);}}
