import { checkSameOriginRequest,errorResponse,json } from '@/lib/security';
export const runtime='nodejs';
export async function GET(request:Request) {try{checkSameOriginRequest(request);return json({ok:true,mode:'public-citizen-admin'});}catch(e){return errorResponse(e);}}
