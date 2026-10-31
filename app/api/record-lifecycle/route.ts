import {errorResponse,json,readJson,requireSession} from '@/lib/security';
import {getRecordLifecycleData,updateRecordLifecycle} from '@/lib/persistence';
import {validateRecordLifecycle} from '@/lib/validation';
import {assertValidIdentity} from '@/lib/authorization';
import {requireRecordAccess} from '@/lib/scoped-records';
export const runtime='nodejs';
export async function GET(request:Request){try{const session=await requireSession(request);assertValidIdentity(session.user);return json(await getRecordLifecycleData());}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validateRecordLifecycle(await readJson(request));await requireRecordAccess(session.user,input.kind,input.id,true);return json(await updateRecordLifecycle(input,session.user.email));}catch(error){return errorResponse(error);}}
