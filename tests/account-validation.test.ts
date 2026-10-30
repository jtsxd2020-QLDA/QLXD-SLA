import test from 'node:test';
import assert from 'node:assert/strict';
import {accountIdentity,validateAccountUpdate} from '../lib/account-validation';
import {WorkflowError} from '../lib/workflow';

const input={email:'canbo@qlxd.test',role:'commune' as const,communeCode:'03664',active:true};

test('blank or omitted account password means no reset; a supplied reset password must meet policy',()=>{
  assert.equal(validateAccountUpdate(input).password,undefined);
  assert.equal(validateAccountUpdate({...input,password:''}).password,undefined);
  assert.equal(validateAccountUpdate({...input,password:'Valid-new-pass-2026!'}).password,'Valid-new-pass-2026!');
  assert.throws(()=>validateAccountUpdate({...input,password:'too-short'}),error=>error instanceof WorkflowError&&error.status===422);
});

test('bootstrap admin identity requires an active province role with no commune assignment',()=>{
  const row={email:'admin@qlxd',role:'province',commune_code:null,active:true,created_at:'2026-01-01T00:00:00.000Z'};
  assert.deepEqual(accountIdentity(row),{email:'admin@qlxd',role:'province',communeCode:null});
  assert.equal(accountIdentity({...row,role:'commune',commune_code:'03664'}),undefined);
  assert.equal(accountIdentity({...row,commune_code:'03664'}),undefined);
  assert.equal(accountIdentity({...row,active:false}),undefined);
  assert.throws(()=>validateAccountUpdate({email:'admin@qlxd',role:'commune',communeCode:'03664',active:true}),error=>error instanceof WorkflowError&&error.status===422);
  assert.throws(()=>validateAccountUpdate({email:'admin@qlxd',role:'province',communeCode:null,active:false}),error=>error instanceof WorkflowError&&error.status===422);
});
