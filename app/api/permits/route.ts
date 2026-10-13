import { requireSession,errorResponse,json,readJson } from '@/lib/security';
import { insertPermit } from '@/lib/persistence';
import { validatePermit } from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request) {try{await requireSession(request,true);return json(await insertPermit(validatePermit(await readJson(request))),201);}catch(e){return errorResponse(e);}}
