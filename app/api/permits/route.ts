import {idempotency} from '@/lib/workflow';
import { requireSession,errorResponse,json,readJson } from '@/lib/security';
import { insertPermit } from '@/lib/persistence';
import { validatePermit } from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request) {try{await requireSession(request,true);const input=validatePermit(await readJson(request));return json(await insertPermit(input,idempotency(request,input,'admin-permit')),201);}catch(e){return errorResponse(e);}}
