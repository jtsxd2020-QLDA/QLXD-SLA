import {requireSession,errorResponse,json,readJson} from '@/lib/security';
import {validatePermitProgress} from '@/lib/validation';
import {updatePermitProgress} from '@/lib/persistence';
export const runtime='nodejs';
export async function POST(request:Request){try{await requireSession(request,true);return json(await updatePermitProgress(validatePermitProgress(await readJson(request))));}catch(error){return errorResponse(error);}}
