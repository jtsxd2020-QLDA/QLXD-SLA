import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_KNOWLEDGE, searchQAKnowledge } from '../lib/qa-knowledge';

test('citizen Q&A searches sourced usage instructions without inventing permit guidance',()=>{
  assert.ok(searchQAKnowledge('gui phan anh').some(entry=>entry.id==='send-report'));
  assert.ok(searchQAKnowledge('mã tiếp nhận').some(entry=>entry.id==='receipt-code'));
  assert.deepEqual(searchQAKnowledge('thủ tục xin cấp giấy phép xây dựng'),[]);
  assert.equal(QA_KNOWLEDGE.some(entry=>entry.answer.includes('127.0.0.1')),false);
  assert.ok(QA_KNOWLEDGE.every(entry=>entry.source.reference==='HUONG_DAN_SU_DUNG.md'));
});
