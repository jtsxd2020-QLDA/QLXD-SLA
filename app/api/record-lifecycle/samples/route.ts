import {errorResponse,json,readJson,requireSession} from '@/lib/security';
import {trashMarkedSamples} from '@/lib/persistence';
import {validateSampleCleanup} from '@/lib/validation';

export const runtime='nodejs';

export async function POST(request:Request){
  try{await requireSession(request,true);validateSampleCleanup(await readJson(request));return json(await trashMarkedSamples());}
  catch(error){return errorResponse(error);}
}
