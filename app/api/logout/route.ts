import { requireSession,errorResponse,json,sessionToken,COOKIE_NAME,secureCookie } from '@/lib/security';
import { deleteAdminSession } from '@/lib/persistence';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    await requireSession(request,true);await deleteAdminSession(sessionToken(request));
    return json({authenticated:false,mode:'citizen'},200,{'Set-Cookie':`${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie(request)?'; Secure':''}`});
  }catch(e){return errorResponse(e);}
}
