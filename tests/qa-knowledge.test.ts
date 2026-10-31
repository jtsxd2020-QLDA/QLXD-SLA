import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_KNOWLEDGE, searchQAKnowledge } from '../lib/qa-knowledge';

test('citizen Q&A finds usage instructions and sourced GPXD procedures', () => {
  assert.ok(searchQAKnowledge('gui phan anh').some(entry => entry.id === 'send-report'));
  assert.ok(searchQAKnowledge('mã tiếp nhận').some(entry => entry.id === 'receipt-code'));
  assert.ok(searchQAKnowledge('xay moi').some(entry => entry.id === 'permit-new-home'));
  assert.ok(searchQAKnowledge('cải tạo').some(entry => entry.id === 'permit-renovation'));
  assert.ok(searchQAKnowledge('giấy phép có thời hạn').some(entry => entry.id === 'permit-time-limited'));

  const permitGuides = QA_KNOWLEDGE.filter(entry => entry.id.startsWith('permit-'));
  assert.equal(permitGuides.length, 3);
  assert.ok(permitGuides.every(entry => entry.source.links?.some(link => link.url.startsWith('https://'))));
  assert.ok(permitGuides.some(entry => entry.source.links?.some(link => link.url.includes('vanban.chinhphu.vn'))));
  assert.ok(QA_KNOWLEDGE.every(entry => !entry.answer.includes('127.0.0.1')));
  assert.ok(QA_KNOWLEDGE.filter(entry => !entry.id.startsWith('permit-')).every(entry => entry.source.reference === 'HUONG_DAN_SU_DUNG.md'));
});
