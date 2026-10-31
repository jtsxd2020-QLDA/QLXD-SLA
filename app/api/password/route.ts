import { requireSession, json, errorResponse, readJson, ApiError } from '@/lib/security';
import { changeOwnPassword } from '@/lib/persistence';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, true);
    const input = await readJson(request) as { currentPassword?: unknown; newPassword?: unknown };
    if (typeof input?.currentPassword !== 'string' || input.currentPassword.length < 1 || input.currentPassword.length > 128 ||
        typeof input?.newPassword !== 'string' || input.newPassword.length < 8 || input.newPassword.length > 128 ||
        input.currentPassword === input.newPassword) throw new ApiError(422, 'Mật khẩu mới phải khác mật khẩu hiện tại và dài từ 8 đến 128 ký tự.');
    await changeOwnPassword(session.user.email, input.currentPassword, input.newPassword);
    return json({ changed: true, reLoginRequired: true });
  } catch (error) { return errorResponse(error); }
}
