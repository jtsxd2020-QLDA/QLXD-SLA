'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import communes from '@/lib/communes.json';
import type { ManagedAccount, UserRole } from '@/lib/types';

type AccountDraft = { email: string; password: string; role: UserRole; communeCode: string; active: boolean };
const emptyDraft = (): AccountDraft => ({ email: '', password: '', role: 'commune', communeCode: '', active: true });
const communeName = (code: string | null) => communes.find(item => item.code === code)?.name || 'Chưa phân địa bàn';

export default function AccountManagement({ csrfToken, currentEmail }: { csrfToken: string; currentEmail: string }) {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<AccountDraft>(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/accounts', { cache: 'no-store', signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error(result.error || 'Không tải được danh sách tài khoản.');
      if (!controller.signal.aborted) setAccounts(result.data);
    } catch (reason) {
      if (!controller.signal.aborted) { setAccounts([]); setError(reason instanceof Error ? reason.message : 'Không kết nối được máy chủ.'); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);

  useEffect(() => { let mounted = true; void Promise.resolve().then(() => { if (mounted) void load(); }); return () => { mounted = false; request.current?.abort(); }; }, [load]);
  useEffect(() => { const element = dialog.current; if (open && !element?.open) element?.showModal(); else if (!open && element?.open) element.close(); }, [open]);

  function close() { if (pending) return; setOpen(false); setDraft(emptyDraft()); setFormError(''); }
  function create() { setEditing(false); setDraft(emptyDraft()); setFormError(''); setOpen(true); }
  function edit(account: ManagedAccount) { setEditing(true); setDraft({ email: account.email, password: '', role: account.role, communeCode: account.communeCode || '', active: account.active }); setFormError(''); setOpen(true); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    if (draft.role === 'commune' && !communes.some(item => item.code === draft.communeCode)) { setFormError('Chọn xã/phường được giao cho tài khoản.'); return; }
    setPending(true); setFormError(''); setNotice('');
    const body = { email: draft.email.trim().toLowerCase(), role: draft.role, communeCode: draft.role === 'commune' ? draft.communeCode : null, ...(editing ? { active: draft.active, ...(draft.password ? { password: draft.password } : {}) } : { password: draft.password }) };
    try {
      const response = await fetch('/api/accounts', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || 'Chưa lưu được tài khoản.');
      setNotice(editing
        ? draft.password
          ? 'Đã cập nhật tài khoản và đặt lại mật khẩu. Các phiên đăng nhập cũ đã bị thu hồi.'
          : 'Đã cập nhật quyền và địa bàn. Các yêu cầu tiếp theo áp dụng quyền mới.'
        : 'Đã tạo tài khoản. Bàn giao mật khẩu riêng cho người sử dụng qua kênh bảo mật.');
      setOpen(false); setDraft(emptyDraft()); await load();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không kết nối được máy chủ.'); }
    finally { setPending(false); }
  }

  return <section className="panel account-management">
    <div className="section-heading"><div><h2>Tài khoản cán bộ</h2><p className="muted">Cấp tỉnh xem và quản lý toàn tỉnh. Cán bộ Phòng Kinh tế xã/phường xem hồ sơ toàn tỉnh; chỉ cập nhật hồ sơ thuộc địa bàn được giao. Thông tin người phản ánh ngoài địa bàn được ẩn.</p></div><div className="actions"><button type="button" className="button secondary" disabled={loading} onClick={() => void load()}><RefreshCw size={16} />Tải lại tài khoản</button><button type="button" className="button primary" onClick={create}><Plus size={17} />Tạo tài khoản</button></div></div>
    {notice ? <p role="status" className="success-box">{notice}</p> : null}
    {error ? <p role="alert" className="error-box">{error}</p> : null}
    {loading ? <p role="status">Đang tải tài khoản…</p> : !error ? <div className="table-scroll"><table><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Phạm vi quản lý</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{accounts.map(account => {
      const protectedAccount = account.email === currentEmail || account.email === 'admin@qlxd';
      return <tr key={account.email}><td>{account.email}</td><td>{account.role === 'province' ? 'Cấp tỉnh' : 'Phòng Kinh tế xã/phường'}</td><td>{account.role === 'province' ? 'Toàn tỉnh Sơn La' : communeName(account.communeCode)}</td><td>{account.active ? 'Đang hoạt động' : 'Đã khóa'}</td><td>{protectedAccount ? <span className="muted">{account.email === currentEmail ? 'Tài khoản đang dùng' : 'Quản trị cấp tỉnh'}</span> : <button type="button" className="text-button" onClick={() => edit(account)} aria-label={`Phân quyền ${account.email}`}>Phân quyền / Khóa / Đặt lại mật khẩu</button>}</td></tr>;
    })}</tbody></table>{!accounts.length ? <p>Chưa có tài khoản được tải.</p> : null}</div> : null}
    <p className="boundary-note"><ShieldCheck size={15} /> Quyền được máy chủ kiểm tra cho mỗi yêu cầu, kể cả xem báo cáo, xuất tệp và sửa hồ sơ theo mã. Bản đồ người dân vẫn chỉ có thông tin công khai rút gọn.</p>
    <dialog ref={dialog} className="record-dialog wizard-dialog account-dialog" aria-labelledby="account-form-title" onCancel={event => { event.preventDefault(); close(); }}><form onSubmit={save}><header className="dialog-head"><div><span className="eyebrow">QUẢN TRỊ CẤP TỈNH</span><h2 id="account-form-title">{editing ? 'Phân quyền tài khoản' : 'Tạo tài khoản cán bộ'}</h2></div><button type="button" className="icon-button" aria-label="Đóng tài khoản" disabled={pending} onClick={close}><X size={19} /></button></header><div className="dialog-body"><fieldset disabled={pending} className="form-fieldset"><div className="form-grid"><label className="field full">Tài khoản (email) *<input name="accountEmail" type="email" autoComplete="off" required maxLength={200} readOnly={editing} value={draft.email} onChange={event => setDraft(previous => ({ ...previous, email: event.target.value }))} /></label>{!editing ? <label className="field full">Mật khẩu ban đầu *<input name="accountPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={draft.password} onChange={event => setDraft(previous => ({ ...previous, password: event.target.value }))} /><small>Tối thiểu 12 ký tự. Không dùng chung mật khẩu giữa các cán bộ.</small></label> : <label className="field full">Đặt lại mật khẩu<input name="accountResetPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={draft.password} onChange={event => setDraft(previous => ({ ...previous, password: event.target.value }))} /><small>Để trống nếu không đổi mật khẩu. Mật khẩu mới tối thiểu 12 ký tự; các phiên cũ sẽ bị đăng xuất.</small></label>}<label className="field full">Vai trò *<select name="accountRole" value={draft.role} onChange={event => setDraft(previous => ({ ...previous, role: event.target.value as UserRole, communeCode: '' }))}><option value="commune">Phòng Kinh tế xã/phường</option><option value="province">Cấp tỉnh</option></select></label>{draft.role === 'commune' ? <label className="field full">Xã/phường được giao *<select name="accountCommune" required value={draft.communeCode} onChange={event => setDraft(previous => ({ ...previous, communeCode: event.target.value }))}><option value="">Chọn xã/phường</option>{communes.map(commune => <option value={commune.code} key={commune.code}>{commune.name}</option>)}</select></label> : <p className="boundary-note full">Tài khoản cấp tỉnh được xem và quản lý hồ sơ của tất cả 75 xã/phường, đồng thời tạo và phân quyền tài khoản.</p>}{editing ? <label className="checkbox-field full"><input type="checkbox" checked={draft.active} onChange={event => setDraft(previous => ({ ...previous, active: event.target.checked }))} />Cho phép tài khoản hoạt động</label> : null}</div>{formError ? <p role="alert" className="error-box">{formError}</p> : null}</fieldset></div><footer className="dialog-footer"><button type="button" className="button secondary" disabled={pending} onClick={close}>Đóng</button><button type="submit" className="button primary" disabled={pending}>{pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></footer></form></dialog>
  </section>;
}
