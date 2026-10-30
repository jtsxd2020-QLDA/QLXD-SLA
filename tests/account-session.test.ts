import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomBytes,scryptSync} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import * as store from '../lib/store';

const directory=mkdtempSync(join(tmpdir(),'ttxd-account-session-qa-'));
process.env.TTXD_DATA_DIR=directory;
writeFileSync(join(directory,'secret.key'),randomBytes(32),{mode:0o600});
const database=new DatabaseSync(join(directory,'ttxd.sqlite'));
database.exec('CREATE TABLE admin_users(email TEXT PRIMARY KEY,salt TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL); CREATE TABLE admin_sessions(hash TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires INTEGER NOT NULL);');
const password='Legacy-unchanged-password-2026!',salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
for(const email of ['admin@qlxd','legacy-unassigned@qlxd.test'])database.prepare('INSERT INTO admin_users VALUES(?,?,?,?)').run(email,salt,hash,'2026-01-01T00:00:00Z');
const oldToken='legacy-unbound-session-token-for-qa';
database.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(createHash('sha256').update(oldToken).digest('hex'),'legacy-csrf',Date.now()+3600000);
database.close();

test('legacy migration preserves province administrator password but rejects unbound sessions and unassigned accounts',()=>{
  assert.equal(store.verifyAdminCredentials('admin@qlxd',password),true);
  assert.equal(store.verifyAdminCredentials('legacy-unassigned@qlxd.test',password),false);
  assert.equal(store.findAdminSession(oldToken),undefined);
  const session=store.createAdminSession('admin@qlxd');
  assert.equal(store.findAdminSession(session.token)?.user.role,'province');
  assert.equal(store.findAdminSession(session.token)?.user.communeCode,null);
  const db=new DatabaseSync(join(directory,'ttxd.sqlite'));
  assert.equal(db.prepare('SELECT password_hash FROM admin_users WHERE email=?').get('admin@qlxd')?.password_hash,hash);
  db.close();
});

test('bound sessions always use current assigned commune and are invalidated by disabling the account',()=>{
  const email='scoped-session@qlxd.test';
  store.createManagedAccount({email,password,role:'commune',communeCode:'03664'});
  const session=store.createAdminSession(email);
  assert.equal(store.findAdminSession(session.token)?.user.communeCode,'03664');
  store.updateManagedAccount({email,role:'commune',communeCode:'03982',active:true});
  assert.equal(store.findAdminSession(session.token)?.user.communeCode,'03982');
  store.updateManagedAccount({email,role:'commune',communeCode:'03982',active:false});
  assert.equal(store.findAdminSession(session.token),undefined);
  assert.equal(store.verifyAdminCredentials(email,password),false);
  store.updateManagedAccount({email,role:'commune',communeCode:'03982',active:true});
  assert.equal(store.findAdminSession(session.token),undefined,'re-enabling must not revive a token from before the account lock');
  const fresh=store.createAdminSession(email);assert.equal(store.findAdminSession(fresh.token)?.user.communeCode,'03982');
});

test('province password reset replaces credentials and immediately invalidates every previous session',()=>{
  const email='password-reset@qlxd.test',nextPassword='New-reset-password-2026!';
  store.createManagedAccount({email,password,role:'commune',communeCode:'03664'});
  const old=store.createAdminSession(email);
  const returned=store.updateManagedAccount({email,role:'commune',communeCode:'03664',active:true,password:nextPassword});
  assert.equal(store.findAdminSession(old.token),undefined);
  assert.equal(store.verifyAdminCredentials(email,password),false);
  assert.equal(store.verifyAdminCredentials(email,nextPassword),true);
  assert.equal('password' in returned,false);
  const fresh=store.createAdminSession(email);
  assert.equal(store.findAdminSession(fresh.token)?.user.email,email);
});

test('managed account listing is a whitelist without salts or password material',()=>{
  const listed=store.listManagedAccounts();
  assert.ok(listed.some(account=>account.email==='admin@qlxd'));
  for(const secret of ['password_hash','passwordHash',password,salt,hash])assert.equal(JSON.stringify(listed).includes(secret),false);
});
