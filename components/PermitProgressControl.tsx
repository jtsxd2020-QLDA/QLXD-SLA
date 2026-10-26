'use client';
import { useState } from 'react';
import { Save } from 'lucide-react';
import type { ConstructionStatus, Permit } from '@/lib/types';
import { constructionStatusLabel, constructionStatusOptions, getConstructionStatus } from '@/lib/record-status';

export default function PermitProgressControl({permit,csrfToken,onSaved}:{permit:Permit;csrfToken:string;onSaved:(record:Permit)=>void}){
  const current=getConstructionStatus(permit.constructionStatus);
  const [value,setValue]=useState<ConstructionStatus>(current);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(pending||value===current)return;
    setPending(true);setError('');
    try{
      const response=await fetch('/api/permit-progress',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({id:permit.id,version:permit.version||1,constructionStatus:value})});
      const result=await response.json();
      if(!response.ok||!result.data){setError(result.error||'Chưa cập nhật được tình trạng.');return;}
      onSaved(result.data as Permit);
    }catch{setError('Không kết nối được máy chủ. Tình trạng chưa được cập nhật.');}
    finally{setPending(false);}
  }
  const last=permit.progressHistory?.at(-1);
  return <section className="permit-progress-control" aria-label="Cập nhật tình trạng công trình">
    <h4>Tình trạng công trình</h4>
    <form onSubmit={submit}>
      <label className="field">Trạng thái theo ghi nhận hiện trường<select aria-label="Tình trạng công trình" value={value} disabled={pending} onChange={event=>setValue(event.target.value as ConstructionStatus)}>{constructionStatusOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <button className="button secondary small" type="submit" disabled={pending||value===current}><Save size={15}/>{pending?'Đang lưu…':'Lưu trạng thái'}</button>
    </form>
    {last?<small>Cập nhật gần nhất: {constructionStatusLabel(last.to)} · {new Date(last.at).toLocaleString('vi-VN')}</small>:<small>Hồ sơ cũ mặc định “Chưa thi công” cho đến khi có ghi nhận.</small>}
    {error?<p className="field-error" role="alert">{error}</p>:null}
  </section>;
}
