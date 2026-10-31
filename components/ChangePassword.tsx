'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';

export default function ChangePassword({ csrfToken }: { csrfToken: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [visible, setVisible] = useState(false);
  useEffect(() => { const element=dialog.current; if(open&&!element?.open)element?.showModal();else if(!open&&element?.open)element.close(); },[open]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy)return;setBusy(true);setError('');
    const form=new FormData(event.currentTarget),currentPassword=String(form.get('currentPassword')||''),newPassword=String(form.get('newPassword')||''),confirmPassword=String(form.get('confirmPassword')||'');
    if(newPassword!==confirmPassword){setError('Mật khẩu xác nhận không khớp.');setBusy(false);return;}
    try {
      const response=await fetch('/api/password',{method:'PATCH',headers:{'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({currentPassword,newPassword})});
      const result=await response.json();if(!response.ok||!result.data?.changed)throw new Error(result.error||'Chưa đổi được mật khẩu.');
      setError('Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.');
      window.setTimeout(()=>location.reload(),800);
    } catch(reason){setError(reason instanceof Error?reason.message:'Không kết nối được máy chủ.');}
    finally{setBusy(false);}
  }
  return <><button type="button" className="button secondary" onClick={()=>{setError('');setOpen(true);}}><KeyRound size={16}/>Đổi mật khẩu</button><dialog ref={dialog} className="record-dialog wizard-dialog" aria-labelledby="change-password-title" onCancel={event=>{event.preventDefault();if(!busy)setOpen(false);}}><form onSubmit={submit}><header className="dialog-head"><div><span className="eyebrow">TÀI KHOẢN CÁN BỘ</span><h2 id="change-password-title">Đổi mật khẩu</h2></div><button type="button" className="icon-button" aria-label="Đóng" disabled={busy} onClick={()=>setOpen(false)}><X size={19}/></button></header><div className="dialog-body"><label className="field">Mật khẩu hiện tại<input type={visible?'text':'password'} name="currentPassword" autoComplete="current-password" required maxLength={128}/></label><label className="field">Mật khẩu mới<input type={visible?'text':'password'} name="newPassword" autoComplete="new-password" required minLength={8} maxLength={128}/><small>Từ 8 đến 128 ký tự. Đổi mật khẩu không bắt buộc khi đăng nhập lần đầu.</small></label><label className="field">Nhập lại mật khẩu mới<input type={visible?'text':'password'} name="confirmPassword" autoComplete="new-password" required minLength={8} maxLength={128}/></label><button className="text-button" type="button" onClick={()=>setVisible(value=>!value)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>} {visible?'Ẩn mật khẩu':'Hiện mật khẩu'}</button>{error?<p role="status" className={error.startsWith('Đã đổi')?'success-box':'error-box'}>{error}</p>:null}</div><footer className="dialog-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setOpen(false)}>Đóng</button><button type="submit" className="button primary" disabled={busy}>{busy?'Đang lưu…':'Đổi mật khẩu'}</button></footer></form></dialog></>;
}
