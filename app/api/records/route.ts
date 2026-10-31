import {requireSession,errorResponse,json} from '@/lib/security';
import {listRecords} from '@/lib/persistence';
import {filterRecordsForUser} from '@/lib/authorization';
export const runtime='nodejs';
export async function GET(request:Request){try{const session=await requireSession(request);return json(filterRecordsForUser(await listRecords(),session.user));}catch(error){return errorResponse(error);}}
