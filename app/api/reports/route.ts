import { requireSession,errorResponse,json,readJson } from '@/lib/security';
import { insertReport } from '@/lib/persistence';
import { validateReport } from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request) {try{await requireSession(request,true);return json(await insertReport(validateReport(await readJson(request))),201);}catch(e){return errorResponse(e);}}
