import {errorResponse,json,readJson,requireSession} from '@/lib/security';
import {getRecordLifecycleData,updateRecordLifecycle} from '@/lib/persistence';
import {validateRecordLifecycle} from '@/lib/validation';

export const runtime='nodejs';

export async function GET(request:Request){
  try{await requireSession(request);return json(await getRecordLifecycleData());}
  catch(error){return errorResponse(error);}
}

export async function POST(request:Request){
  try{await requireSession(request,true);return json(await updateRecordLifecycle(validateRecordLifecycle(await readJson(request))));}
  catch(error){return errorResponse(error);}
}
