import {idempotency} from '@/lib/workflow';
import {requireSession,errorResponse,json,readJson} from '@/lib/security';
import {insertReport} from '@/lib/persistence';
import {validateReport} from '@/lib/validation';
import {assertCommuneAccess} from '@/lib/authorization';
export const runtime='nodejs';
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validateReport(await readJson(request));assertCommuneAccess(session.user,input.communeCode);return json(await insertReport(input,idempotency(request,input,`admin-report:${session.user.email}`)),201);}catch(error){return errorResponse(error);}}
