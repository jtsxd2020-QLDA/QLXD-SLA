import { checkSameOriginRequest,errorResponse,json,sessionToken } from '@/lib/security';
import { findAdminSession } from '@/lib/persistence';
export const runtime='nodejs';
export async function GET(request:Request) {
  try {
    checkSameOriginRequest(request);
    const token=sessionToken(request),session=token?await findAdminSession(token):undefined;
    return json({authenticated:!!session,mode:session?'admin':'citizen',...(session?{csrfToken:session.csrf,email:'admin@qlxd'}:{})});
  }catch(e){return errorResponse(e);}
}
