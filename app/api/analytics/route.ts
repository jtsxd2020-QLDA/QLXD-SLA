import {requireSession,json,errorResponse,readJson} from '@/lib/security';
import {validateAnalyticsFilters,createAnalyticsSnapshot} from '@/lib/analytics';
export const runtime='nodejs';
export async function GET(request:Request){try{const session=await requireSession(request);const filters=validateAnalyticsFilters(Object.fromEntries(new URL(request.url).searchParams));return json(await createAnalyticsSnapshot(filters,session.user));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const session=await requireSession(request,true);const filters=validateAnalyticsFilters(await readJson(request));return json(await createAnalyticsSnapshot(filters,session.user));}catch(error){return errorResponse(error);}}
