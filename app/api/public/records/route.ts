import {checkSameOriginRequest,errorResponse,json,persistentRateLimit,clientIP} from '@/lib/security';
import {listPublicMapRecords} from '@/lib/persistence';
export const runtime='nodejs';
export async function GET(request:Request){try{checkSameOriginRequest(request);await persistentRateLimit('public-map:'+clientIP(request),300);return json({records:await listPublicMapRecords()});}catch(error){return errorResponse(error);}}
