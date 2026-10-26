import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionStatusLabel,constructionStatusOptions,getConstructionStatus} from '../lib/record-status';
test('three visible construction states label uninspected as not started and normalize compatibility alias',()=>{
 assert.equal(getConstructionStatus('not_started'),'uninspected');
 assert.equal(constructionStatusLabel('not_started'),'Chưa thi công');
 assert.equal(constructionStatusLabel('uninspected'),'Chưa thi công');
 assert.equal(getConstructionStatus(), 'uninspected');
 assert.equal(getConstructionStatus('unknown'),'uninspected');
 assert.deepEqual(new Set(constructionStatusOptions.map(option=>option.value)),new Set(['uninspected','under_construction','completed']));
});
