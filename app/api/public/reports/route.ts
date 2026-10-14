import {idempotency} from '@/lib/workflow';
import { checkSameOriginRequest,errorResponse,json,readJson,persistentRateLimit,clientIP,ApiError } from '@/lib/security';
import { insertReport } from '@/lib/persistence';
import { validateReport } from '@/lib/validation';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkSameOriginRequest(request,true);
    const ip=clientIP(request);
    await persistentRateLimit('public-report-ip:'+ip,5,15*60_000);
    await persistentRateLimit('public-report-total',50,60*60_000);
    const body=await readJson(request);
    if(!body||typeof body!=='object'||Array.isArray(body)) throw new ApiError(400,'Nội dung không hợp lệ.');
    const {honeypot,...payload}=body as Record<string,unknown>;
    if(typeof honeypot==='string'&&honeypot.trim()) throw new ApiError(400,'Không thể tiếp nhận phản ánh.');
    const input=validateReport(payload);const record=await insertReport(input,idempotency(request,input,'public-report'));
    return json({publicCode:record.publicCode,receivedAt:record.createdAt},201);
  }catch(error){return errorResponse(error);}
}
