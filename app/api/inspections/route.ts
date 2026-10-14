import {requireSession,json,errorResponse,readJson} from '@/lib/security';
import {validateInspection} from '@/lib/validation';
import {listInspections,insertInspection} from '@/lib/persistence';
import {idempotency} from '@/lib/workflow';
export const runtime='nodejs';
export async function GET(request:Request){try{await requireSession(request);return json(await listInspections());}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{await requireSession(request,true);const input=validateInspection(await readJson(request));return json(await insertInspection(input,idempotency(request,input,'admin-inspection')),201);}catch(e){return errorResponse(e);}}
