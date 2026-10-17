import {requireSession,json,errorResponse,readJson} from '@/lib/security';
import {validateAnalyticsFilters,createAnalyticsSnapshot} from '@/lib/analytics';
export const runtime='nodejs';
export async function POST(request:Request){try{await requireSession(request,true);const filters=validateAnalyticsFilters(await readJson(request));return json(await createAnalyticsSnapshot(filters));}catch(e){return errorResponse(e);}}
