import {errorResponse,json,readJson,requireSession} from '@/lib/security';
import {trashMarkedSamples} from '@/lib/persistence';
import {validateSampleCleanup} from '@/lib/validation';
import {assertProvinceAccess} from '@/lib/authorization';
export const runtime='nodejs';
export async function POST(request:Request){try{const session=await requireSession(request,true);assertProvinceAccess(session.user);validateSampleCleanup(await readJson(request));return json(await trashMarkedSamples());}catch(error){return errorResponse(error);}}
