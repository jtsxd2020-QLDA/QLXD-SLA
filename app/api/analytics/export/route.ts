import {assertSnapshotAccess} from '@/lib/authorization';
import {requireSession,errorResponse,ApiError} from '@/lib/security';
import {getAnalyticsSnapshot} from '@/lib/persistence';
import {exportXlsx,exportPdf} from '@/lib/export-report';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const session=await requireSession(request);const params=new URL(request.url).searchParams,id=params.get('id'),format=params.get('format');
 if(!id||!/^[-a-zA-Z0-9]{20,80}$/.test(id)||!['xlsx','pdf'].includes(format||''))throw new ApiError(400,'Mã báo cáo hoặc định dạng không hợp lệ.');
 const snapshot=await getAnalyticsSnapshot(id);if(!snapshot)throw new ApiError(410,'Bản chụp báo cáo đã hết hạn. Hãy áp dụng bộ lọc để tạo báo cáo mới.');
 assertSnapshotAccess(session.user,snapshot);
 if(snapshot.rows.length>5000)throw new ApiError(413,'Báo cáo vượt 5.000 dòng. Hãy thu hẹp kỳ hoặc địa bàn để xuất đầy đủ.');
 const buffer=format==='xlsx'?await exportXlsx(snapshot):await exportPdf(snapshot);
 return new Response(new Uint8Array(buffer),{headers:{'Content-Type':format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/pdf','Content-Disposition':`attachment; filename="QLXD-SLA-${snapshot.id}.${format}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}catch(error){return errorResponse(error);}}
