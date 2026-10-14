import {requireSession,json,errorResponse,readJson} from '@/lib/security';
import {validateStatus} from '@/lib/validation';
import {updateReportStatus} from '@/lib/persistence';
export const runtime='nodejs';
export async function POST(request:Request){try{await requireSession(request,true);return json(await updateReportStatus(validateStatus(await readJson(request))));}catch(e){return errorResponse(e);}}
