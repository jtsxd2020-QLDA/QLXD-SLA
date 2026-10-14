import {requireSession,json,errorResponse} from '@/lib/security';
import {validateAnalyticsFilters,createAnalyticsSnapshot} from '@/lib/analytics';
export const runtime='nodejs';
export async function GET(request:Request){try{await requireSession(request);const filters=validateAnalyticsFilters(Object.fromEntries(new URL(request.url).searchParams));return json(await createAnalyticsSnapshot(filters));}catch(e){return errorResponse(e);}}
