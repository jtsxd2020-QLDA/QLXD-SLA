import { requireSession, json, errorResponse, ApiError } from '@/lib/security';
import { createDefaultCommuneAccounts } from '@/lib/persistence';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, true);
    if (session.user.role !== 'province') throw new ApiError(403, 'Chỉ tài khoản cấp tỉnh được tạo tài khoản hàng loạt.');
    return json(await createDefaultCommuneAccounts(), 201);
  } catch (error) { return errorResponse(error); }
}
