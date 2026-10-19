import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionStatusLabel,constructionStatusOptions,getConstructionStatus} from '../lib/record-status';
test('not started and not inspected remain separate public labels and values',()=>{
 assert.equal(getConstructionStatus('not_started'),'not_started');
 assert.equal(constructionStatusLabel('not_started'),'Chưa thi công');
 assert.equal(constructionStatusLabel('uninspected'),'Chưa kiểm tra');
 assert.equal(getConstructionStatus(), 'uninspected');
 assert.equal(getConstructionStatus('unknown'),'uninspected');
 assert.deepEqual(new Set(constructionStatusOptions.map(option=>option.value)),new Set(['uninspected','not_started','under_construction','completed']));
});
