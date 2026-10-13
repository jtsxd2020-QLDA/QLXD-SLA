import { requireSession,errorResponse,json } from '@/lib/security';
import { listRecords } from '@/lib/persistence';
export const runtime='nodejs';
export async function GET(request:Request) {try{await requireSession(request);return json(await listRecords());}catch(e){return errorResponse(e);}}
