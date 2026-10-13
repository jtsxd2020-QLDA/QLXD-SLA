import { checkSameOriginRequest,errorResponse,json,readJson,persistentRateLimit,clientIP,ApiError,COOKIE_NAME,secureCookie } from '@/lib/security';
import { verifyAdminCredentials,createAdminSession } from '@/lib/persistence';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkSameOriginRequest(request,true);await persistentRateLimit('admin-login:'+clientIP(request),10,15*60_000);
    const input=await readJson(request) as {email?:unknown;password?:unknown};
    if(!input||typeof input.email!=='string'||typeof input.password!=='string'||input.email.length>200||input.password.length>128||!(await verifyAdminCredentials(input.email,input.password))) throw new ApiError(401,'Email hoặc mật khẩu không đúng.');
    const session=await createAdminSession();
    return json({authenticated:true,mode:'admin',email:input.email.trim().toLowerCase(),csrfToken:session.csrf},200,{'Set-Cookie':`${COOKIE_NAME}=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookie(request)?'; Secure':''}`});
  }catch(e){return errorResponse(e);}
}
