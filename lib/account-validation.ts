import { z } from 'zod';
import communes from './communes.json';
import { WorkflowError } from './workflow';
import type { AccountInput, AccountUpdateInput, ManagedAccount, UserIdentity } from './types';

const communeCodes = new Set(communes.map(commune => commune.code));
const accountEmail = z.string().trim().toLowerCase().min(3).max(200).regex(/^[^\s@]+@[^\s@]+$/, 'Tài khoản phải có dạng tên@đơn-vị.').refine(value => [...value].every(character => character.charCodeAt(0) >= 33 && character.charCodeAt(0) !== 127));
const scope = { email: accountEmail, role: z.enum(['province', 'commune']), communeCode: z.string().max(20).nullable() };
const createSchema = z.object({ ...scope, password: z.string().min(12).max(128) }).strict();
const updateSchema = z.object({ ...scope, active: z.boolean(), password: z.string().max(128).optional() }).strict();

function validScope(value: {role: string; communeCode: string | null}) {
  return value.role === 'province' ? value.communeCode === null : value.role === 'commune' && !!value.communeCode && communeCodes.has(value.communeCode);
}

export function validateAccountInput(input: unknown): AccountInput {
  const result = createSchema.safeParse(input);
  if (!result.success || !validScope(result.data)) throw new WorkflowError(422, 'Tài khoản, mật khẩu hoặc địa bàn phân quyền không hợp lệ. Mật khẩu cần từ 12 đến 128 ký tự.');
  return result.data;
}

export function validateAccountUpdate(input: unknown): AccountUpdateInput {
  const result = updateSchema.safeParse(input);
  if (!result.success || !validScope(result.data)) throw new WorkflowError(422, 'Thông tin phân quyền không hợp lệ. Cán bộ xã phải được giao đúng một xã/phường.');
  if (result.data.password !== undefined && result.data.password !== '' && result.data.password.length < 12) throw new WorkflowError(422, 'Mật khẩu mới cần từ 12 đến 128 ký tự.');
  if (result.data.email === 'admin@qlxd' && (result.data.role !== 'province' || !result.data.active)) throw new WorkflowError(422, 'Không được khóa hoặc hạ quyền tài khoản khởi tạo cấp tỉnh.');
  return { ...result.data, password: result.data.password || undefined };
}

export type AccountRow = {email: string; role: unknown; commune_code: unknown; active: unknown; created_at: string};

/** Fail closed for legacy, corrupt, inactive or unassigned accounts. */
export function accountIdentity(row: AccountRow | undefined | null): UserIdentity | undefined {
  if (!row || !(row.active === true || row.active === 1)) return undefined;
  const role = row.role;
  if (role !== 'province' && role !== 'commune') return undefined;
  const communeCode = row.commune_code === null ? null : typeof row.commune_code === 'string' ? row.commune_code : undefined;
  if (communeCode === undefined || !validScope({ role, communeCode })) return undefined;
  if (row.email.toLowerCase() === 'admin@qlxd' && (role !== 'province' || communeCode !== null)) return undefined;
  return { email: row.email, role, communeCode };
}

export function managedAccount(row: AccountRow): ManagedAccount {
  const identity = accountIdentity(row);
  return {
    email: row.email,
    role: identity?.role ?? (row.role === 'province' ? 'province' : 'commune'),
    communeCode: identity?.communeCode ?? (typeof row.commune_code === 'string' && communeCodes.has(row.commune_code) ? row.commune_code : null),
    active: !!identity,
    createdAt: row.created_at,
  };
}
