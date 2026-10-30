import {idempotency} from '@/lib/workflow';
import {requireSession,errorResponse,json,readJson} from '@/lib/security';
import {insertPermit} from '@/lib/persistence';
import {validatePermit} from '@/lib/validation';
import {assertCommuneAccess} from '@/lib/authorization';
export const runtime='nodejs';
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validatePermit(await readJson(request));assertCommuneAccess(session.user,input.communeCode);return json(await insertPermit(input,idempotency(request,input,`admin-permit:${session.user.email}`)),201);}catch(error){return errorResponse(error);}}
