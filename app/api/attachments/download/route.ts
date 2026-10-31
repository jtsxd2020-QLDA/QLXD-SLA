import { requireRecordAccess } from '@/lib/scoped-records';
import { createAttachmentDownloadUrl, getAttachment } from '@/lib/persistence';
import { ApiError, errorResponse, requireSession } from '@/lib/security';
export const runtime='nodejs';
export async function GET(request:Request){try{const session=await requireSession(request);const id=new URL(request.url).searchParams.get('id');if(!id||!/^[-0-9a-f]{36}$/i.test(id))throw new ApiError(400,'Mã tệp đính kèm không hợp lệ.');const item=await getAttachment(id);await requireRecordAccess(session.user,item.record_kind,item.record_id);return Response.redirect(await createAttachmentDownloadUrl(id),302);}catch(error){return errorResponse(error);}}
