import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSearch,normalizeSearchText} from '../lib/search';

test('search ignores Vietnamese accents, case and common punctuation',()=>{
 assert.equal(matchesSearch('thao nguyen',['Phường Thảo Nguyên']),true);
 assert.equal(matchesSearch('NGUYEN thao',['Phường Thảo Nguyên']),true);
 assert.equal(matchesSearch('gpxd-2026/001',['GPXD 2026-001']),true);
 assert.equal(matchesSearch('chiềng cơi',['Phường Chiềng Cơi']),true);
 assert.equal(matchesSearch('chiềng an',['Phường Chiềng Cơi','Đã ghi nhận giấy phép']),false);
});

test('search requires every nonempty term and safely treats an empty query as no filter',()=>{
 assert.equal(matchesSearch('địa chỉ 103',['Địa chỉ công trình số 103']),true);
 assert.equal(matchesSearch('địa chỉ 104',['Địa chỉ công trình số 103']),false);
 assert.equal(matchesSearch('   ---   ',['Bất kỳ hồ sơ nào']),true);
 assert.equal(normalizeSearchText('Đường Tô Hiệu'),'duong to hieu');
});
