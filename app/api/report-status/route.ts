import {requireSession,json,errorResponse,readJson} from '@/lib/security';
import {validateStatus} from '@/lib/validation';
import {updateReportStatus} from '@/lib/persistence';
import {requireRecordAccess} from '@/lib/scoped-records';
export const runtime='nodejs';
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validateStatus(await readJson(request));await requireRecordAccess(session.user,'report',input.id);return json(await updateReportStatus(input,session.user.email));}catch(error){return errorResponse(error);}}
