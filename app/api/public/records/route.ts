import {checkSameOriginRequest,errorResponse,json,persistentRateLimit,clientIP,sessionToken} from '@/lib/security';
import {listPublicMapRecords,findAdminSession} from '@/lib/persistence';
export const runtime='nodejs';
export async function GET(request:Request){try{checkSameOriginRequest(request);await persistentRateLimit('public-map:'+clientIP(request),300);const token=sessionToken(request),session=token?await findAdminSession(token):undefined;const records=await listPublicMapRecords();return json({records:session?.user.role==='commune'?records.filter(record=>record.communeCode===session.user.communeCode):records});}catch(error){return errorResponse(error);}}
