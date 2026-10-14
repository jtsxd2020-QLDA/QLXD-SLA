import {idempotency} from '@/lib/workflow';
import { requireSession,errorResponse,json,readJson } from '@/lib/security';
import { insertReport } from '@/lib/persistence';
import { validateReport } from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request) {try{await requireSession(request,true);const input=validateReport(await readJson(request));return json(await insertReport(input,idempotency(request,input,'admin-report')),201);}catch(e){return errorResponse(e);}}
