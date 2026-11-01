import {checkSameOriginRequest,errorResponse,json,persistentRateLimit,clientIP} from '@/lib/security';
import {listPublicMapRecords} from '@/lib/persistence';
export const runtime='nodejs';
export async function GET(request:Request){try{checkSameOriginRequest(request);await persistentRateLimit('public-map:'+clientIP(request),300);const query=new URL(request.url).searchParams.get('q')?.trim().slice(0,120)||'';return json({records:await listPublicMapRecords(query)});}catch(error){return errorResponse(error);}}
