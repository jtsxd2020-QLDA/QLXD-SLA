import {requireSession,json,errorResponse,readJson} from '@/lib/security';
import {validateInspection} from '@/lib/validation';
import {listInspections,insertInspection} from '@/lib/persistence';
import {idempotency} from '@/lib/workflow';
import {filterInspectionsForUser} from '@/lib/authorization';
import {requireInspectionLinks} from '@/lib/scoped-records';
export const runtime='nodejs';
export async function GET(request:Request){try{const session=await requireSession(request);return json(filterInspectionsForUser(await listInspections(),session.user));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const session=await requireSession(request,true);const input=validateInspection(await readJson(request));await requireInspectionLinks(session.user,input);return json(await insertInspection(input,idempotency(request,input,`admin-inspection:${session.user.email}`)),201);}catch(error){return errorResponse(error);}}
