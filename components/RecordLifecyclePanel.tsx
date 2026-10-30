'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArchiveRestore,RefreshCw,Search,Trash2} from 'lucide-react';
import communes from '@/lib/communes.json';
import type {LifecycleRecordSummary,RecordLifecycleResponse,RecordKind} from '@/lib/types';

const kindLabel:Record<RecordKind,string>={permit:'Giấy phép xây dựng',report:'Phản ánh người dân',inspection:'Kết quả kiểm tra'};
const communeName=(code:string)=>communes.find(commune=>commune.code===code)?.name||code;

export default function RecordLifecyclePanel({csrfToken,onChanged,allowSampleCleanup=false,allowedCommuneCode}:{csrfToken:string;onChanged:()=>void;allowSampleCleanup?:boolean;allowedCommuneCode?:string}){
  const [data,setData]=useState<RecordLifecycleResponse>({active:[],trash:[],syntheticCount:0});
  const [view,setView]=useState<'active'|'trash'>('active');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{const response=await fetch('/api/record-lifecycle',{cache:'no-store'});const result=await response.json();if(!response.ok||!result.data)throw new Error(result.error||'Không tải được danh sách dữ liệu.');setData(result.data);}
    catch(reason){setError(reason instanceof Error?reason.message:'Không kết nối được.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{const request=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(request);},[refresh]);

  const records=useMemo(()=>{
    const needle=search.trim().toLocaleLowerCase('vi');
    const list=view==='active'?data.active:data.trash;
    return needle?list.filter(record=>`${record.identifier} ${record.title} ${communeName(record.communeCode)} ${kindLabel[record.kind]}`.toLocaleLowerCase('vi').includes(needle)):list;
  },[data.active,data.trash,search,view]);

  async function submit(input:{kind:RecordKind;id:string;version:number;action:'trash'|'restore'}){
    const record=data[view].find(item=>item.id===input.id);
    if(allowedCommuneCode&&record?.communeCode!==allowedCommuneCode){setError('Chỉ đơn vị được giao mới có thể xóa hoặc khôi phục hồ sơ này.');return;}
    setBusy(input.id);setError('');setNotice('');
    try{
      const response=await fetch('/api/record-lifecycle',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify(input)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Không cập nhật được hồ sơ.');
      setNotice(input.action==='trash'?`Đã chuyển ${record?.identifier||'hồ sơ'} vào thùng rác. Có thể khôi phục bất cứ lúc nào.`:`Đã khôi phục ${record?.identifier||'hồ sơ'}.`);
      await refresh();onChanged();
    }catch(reason){setError(reason instanceof Error?reason.message:'Không kết nối được.');}
    finally{setBusy('');}
  }

  async function trashSamples(){
    if(!allowSampleCleanup||!data.syntheticCount)return;
    const approved=window.confirm(`Chuyển ${data.syntheticCount} hồ sơ có nhãn mẫu/kiểm thử vào thùng rác? Dữ liệu sẽ được ẩn khỏi bản đồ và báo cáo; có thể khôi phục trong mục Thùng rác.`);
    if(!approved)return;
    setBusy('samples');setError('');setNotice('');
    try{
      const response=await fetch('/api/record-lifecycle/samples',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({confirm:true})});
      const result=await response.json();if(!response.ok||!result.data)throw new Error(result.error||'Không chuyển được dữ liệu mẫu.');
      const {total,trashed,failed}=result.data;
      setNotice(`Đã chuyển ${total} hồ sơ vào thùng rác: ${trashed.permit} GPXD, ${trashed.report} phản ánh, ${trashed.inspection} kết quả kiểm tra${failed?`; ${failed} hồ sơ liên kết cần xử lý riêng`:''}.`);
      await refresh();onChanged();
    }catch(reason){setError(reason instanceof Error?reason.message:'Không kết nối được.');}
    finally{setBusy('');}
  }

  return <section className="panel lifecycle-panel">
    <div className="section-heading"><div><h2>Quản lý dữ liệu hồ sơ</h2><p className="muted">Xóa mềm sẽ ẩn hồ sơ khỏi bản đồ, danh sách và báo cáo; quản lý có thể khôi phục trong thùng rác.</p></div><button type="button" className="button secondary" onClick={()=>void refresh()} disabled={loading||!!busy}><RefreshCw size={16}/>Tải lại</button></div>
    <div className="lifecycle-summary"><article><span>Đang sử dụng</span><strong>{data.active.length}</strong></article><article><span>Có nhãn mẫu/kiểm thử</span><strong>{data.syntheticCount}</strong></article><article><span>Trong thùng rác</span><strong>{data.trash.length}</strong></article></div>
    <div className="lifecycle-toolbar"><div className="lifecycle-tabs" role="tablist" aria-label="Trạng thái hồ sơ"><button type="button" role="tab" aria-selected={view==='active'} className={view==='active'?'active':''} onClick={()=>setView('active')}>Đang sử dụng ({data.active.length})</button><button type="button" role="tab" aria-selected={view==='trash'} className={view==='trash'?'active':''} onClick={()=>setView('trash')}>Thùng rác ({data.trash.length})</button></div><label className="lifecycle-search"><Search size={17}/><input type="search" aria-label="Tìm dữ liệu hồ sơ" placeholder="Tìm mã hoặc tên công trình" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>
    {view==='active'&&allowSampleCleanup?<div className="lifecycle-bulk"><div><strong>Dọn dữ liệu minh họa</strong><p>Chỉ chọn hồ sơ có nhãn [MẪU], [KIỂM THỬ], hoặc mã QA kiểm thử rõ ràng. Hồ sơ không gắn dấu này được giữ nguyên.</p></div><button type="button" className="button danger" disabled={!data.syntheticCount||!!busy||loading} onClick={()=>void trashSamples()}><Trash2 size={16}/>{busy==='samples'?'Đang chuyển…':`Chuyển ${data.syntheticCount} hồ sơ mẫu vào thùng rác`}</button></div>:null}
    {error?<p role="alert" className="error-box">{error}</p>:null}{notice?<p role="status" className="success-box">{notice}</p>:null}
    {loading?<p role="status" className="muted">Đang tải dữ liệu…</p>:records.length?<div className="table-scroll lifecycle-table-wrap"><table className="lifecycle-table"><thead><tr><th>Loại hồ sơ</th><th>Mã hồ sơ</th><th>Công trình / nội dung</th><th>Địa bàn</th><th>{view==='active'?'Ngày nhập':'Ngày chuyển'}</th><th>Thao tác</th></tr></thead><tbody>{records.map(record=><LifecycleRow key={`${record.kind}:${record.id}`} record={record} view={view} busy={busy===record.id} writable={!allowedCommuneCode||record.communeCode===allowedCommuneCode} onAction={action=>void submit({kind:record.kind,id:record.id,version:record.version,action})}/>)}</tbody></table></div>:<div className="empty-state"><ArchiveRestore size={34}/><h3>{view==='active'?'Không có hồ sơ đang sử dụng':'Thùng rác đang trống'}</h3><p>{search?'Thử từ khóa khác.':view==='trash'?'Hồ sơ chuyển vào đây có thể được khôi phục.':'Chưa có hồ sơ nào được nhập.'}</p></div>}
  </section>;
}

function LifecycleRow({record,view,busy,writable,onAction}:{record:LifecycleRecordSummary;view:'active'|'trash';busy:boolean;writable:boolean;onAction:(action:'trash'|'restore')=>void}){
  return <tr><td>{kindLabel[record.kind]}{record.synthetic?<small className="cell-sub lifecycle-flag">Mẫu / kiểm thử</small>:null}</td><td><strong>{record.identifier}</strong></td><td>{record.title}</td><td>{communeName(record.communeCode)}</td><td>{new Date(view==='active'?record.createdAt:record.deletedAt||record.createdAt).toLocaleDateString('vi-VN')}</td><td>{writable?(view==='active'?<button type="button" className="text-button danger-text" disabled={busy} onClick={()=>{if(window.confirm(`Chuyển ${record.identifier} vào thùng rác? Có thể khôi phục trong mục Thùng rác.`))onAction('trash');}}><Trash2 size={15}/>{busy?'Đang xử lý':'Xóa'}</button>:<button type="button" className="text-button" disabled={busy} onClick={()=>onAction('restore')}><ArchiveRestore size={15}/>{busy?'Đang xử lý':'Khôi phục'}</button>):<span className="cell-sub lifecycle-readonly">Chỉ xem · đơn vị khác</span>}</td></tr>;
}
