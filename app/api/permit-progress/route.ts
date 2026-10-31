import {requireSession,errorResponse,json,readJson} from '@/lib/security';
import {validatePermitProgress} from '@/lib/validation';
import {updatePermitProgress} from '@/lib/persistence';
import {requireRecordAccess} from '@/lib/scoped-records';
export const runtime='nodejs';
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validatePermitProgress(await readJson(request));await requireRecordAccess(session.user,'permit',input.id);return json(await updatePermitProgress(input,session.user.email));}catch(error){return errorResponse(error);}}
