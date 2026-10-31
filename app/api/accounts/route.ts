import { requireSession, json, errorResponse, readJson, ApiError } from '@/lib/security';
import { createManagedAccount, listManagedAccounts, updateManagedAccount } from '@/lib/persistence';
import { validateAccountInput, validateAccountUpdate } from '@/lib/account-validation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    if (session.user.role !== 'province') throw new ApiError(403, 'Chỉ tài khoản cấp tỉnh được quản lý phân quyền.');
    return json(await listManagedAccounts());
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, true);
    if (session.user.role !== 'province') throw new ApiError(403, 'Chỉ tài khoản cấp tỉnh được quản lý phân quyền.');
    const input = validateAccountInput(await readJson(request));
    return json(await createManagedAccount(input), 201);
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, true);
    if (session.user.role !== 'province') throw new ApiError(403, 'Chỉ tài khoản cấp tỉnh được quản lý phân quyền.');
    const input = validateAccountUpdate(await readJson(request));
    if (input.email === session.user.email) throw new ApiError(403, 'Không được thay đổi quyền hoặc khóa chính tài khoản đang sử dụng.');
    return json(await updateManagedAccount(input));
  } catch (error) { return errorResponse(error); }
}
