import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, scryptSync } from 'node:crypto';
import communes from '../lib/communes.json';
import type { ManagedAccount } from '../lib/types';

test('cloud account adapter binds sessions, reads current scope each time and never returns stored credentials', async () => {
  const originalFetch = globalThis.fetch;
  const saved = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, TTXD_ENCRYPTION_KEY: process.env.TTXD_ENCRYPTION_KEY };
  process.env.SUPABASE_URL = 'https://synthetic-account-session.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-account-session-never-real';
  process.env.TTXD_ENCRYPTION_KEY = Buffer.alloc(32, 41).toString('base64');
  type Row = Record<string, unknown>;
  const accounts = new Map<string, Row>();
  const sessions = new Map<string, Row>();
  const reads: string[] = [];
  const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const table = url.pathname.split('/').at(-1);
    const method = options.method || 'GET';
    if (table === 'ttxd_admin_users') {
      if (method === 'POST') { const row = JSON.parse(String(options.body)); accounts.set(row.email, row); return response(null, 201); }
      const email = url.searchParams.get('email')?.slice(3);
      if (method === 'PATCH') {
        const account=accounts.get(email!)!;const previousHash=account.password_hash;Object.assign(account,JSON.parse(String(options.body)));
        if(account.password_hash!==previousHash)for(const session of sessions.values())if(session.user_email===email)session.expires=0;
        return response(account);
      }
      reads.push(email || 'list');
      return response(email ? accounts.get(email) || null : [...accounts.values()]);
    }
    if (table === 'ttxd_admin_sessions') {
      if (method === 'POST') { const row = JSON.parse(String(options.body)); sessions.set(row.hash, row); return response(null, 201); }
      const row = sessions.get(url.searchParams.get('hash')?.slice(3) || '');
      const minimumExpiry = Number(url.searchParams.get('expires')?.slice(3));
      return response(row && Number(row.expires) > minimumExpiry ? row : null);
    }
    throw new Error('Unexpected synthetic cloud account endpoint');
  };
  try {
    const cloud = await import('../lib/cloud-store');
    const password = 'Synthetic-account-password-only!';
    const created: ManagedAccount = await cloud.createManagedAccount({ email: 'staff@qa', password, role: 'commune', communeCode: communes[0].code });
    assert.deepEqual(Object.keys(created).sort(), ['active', 'communeCode', 'createdAt', 'email', 'role']);
    const stored = accounts.get(created.email)!;
    assert.equal(stored.password_hash, scryptSync(password, String(stored.salt), 64).toString('hex'));
    assert.notEqual(stored.password_hash, password);
    assert.equal(await cloud.verifyAdminCredentials('staff@qa', password), true);
    assert.equal(await cloud.verifyAdminCredentials('staff@qa', 'incorrect-password'), false);
    const session = await cloud.createAdminSession('staff@qa');
    const tokenHash = createHash('sha256').update(session.token).digest('hex');
    assert.equal(sessions.get(tokenHash)?.user_email, 'staff@qa');
    assert.equal((await cloud.findAdminSession(session.token))?.user.communeCode, communes[0].code);
    await cloud.updateManagedAccount({ email: 'staff@qa', role: 'commune', communeCode: communes[1].code, active: true });
    assert.equal((await cloud.findAdminSession(session.token))?.user.communeCode, communes[1].code);
    await cloud.updateManagedAccount({ email: 'staff@qa', role: 'commune', communeCode: communes[1].code, active: false });
    assert.equal(await cloud.findAdminSession(session.token), undefined);
    assert.equal(await cloud.verifyAdminCredentials('staff@qa', password), false);
    assert.equal(JSON.stringify(await cloud.listManagedAccounts()).includes('password_hash'), false);
    assert.equal(JSON.stringify(await cloud.listManagedAccounts()).includes('salt'), false);

    await cloud.updateManagedAccount({ email: 'staff@qa', role: 'commune', communeCode: communes[1].code, active: true });
    const beforeReset = await cloud.createAdminSession('staff@qa');
    const resetPassword = 'Synthetic-password-reset-2026!';
    const resetResult = await cloud.updateManagedAccount({ email: 'staff@qa', role: 'commune', communeCode: communes[1].code, active: true, password: resetPassword });
    assert.equal((await cloud.findAdminSession(beforeReset.token)), undefined);
    assert.equal(await cloud.verifyAdminCredentials('staff@qa', password), false);
    assert.equal(await cloud.verifyAdminCredentials('staff@qa', resetPassword), true);
    assert.equal('password' in resetResult, false);
    assert.equal('password_hash' in resetResult, false);
    assert.ok(reads.filter(email => email === 'staff@qa').length >= 5);
    const legacy = 'legacy-unbound-session';
    sessions.set(createHash('sha256').update(legacy).digest('hex'), { csrf: 'legacy', expires: Date.now() + 60_000 });
    assert.equal(await cloud.findAdminSession(legacy), undefined);
    stored.role = null; stored.active = true;
    assert.equal(await cloud.findAdminSession(session.token), undefined);
    assert.equal(await cloud.verifyAdminCredentials('staff@qa', password), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
