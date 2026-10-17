import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSearch,normalizeSearchText,rankCommunes,suggestPermits} from '../lib/search';

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

test('permit suggestions match owner, phone, permit number and project name without accents',()=>{
 const permits=[{permitNumber:'GPXD-2026-001',projectName:'Công trình Thảo Nguyên',investorName:'Nguyễn Văn A',investorPhone:'0912 345 678',address:'Đường Tô Hiệu',communeCode:'xa-a'}];
 for(const query of ['Nguyen Van','0912345','345678','GPXD 2026 001','cong trinh thao'])assert.equal(suggestPermits(query,permits).length,1,query);
 assert.equal(suggestPermits('không có',permits).length,0);
});

test('permit suggestions put the closest project-name match first',()=>{
 const permits=[
  {permitNumber:'GPXD-1',projectName:'Công trình mở rộng',investorName:'Nguyễn A',address:'',communeCode:'xa-a'},
  {permitNumber:'GPXD-2',projectName:'Trường học',investorName:'Nguyễn A',address:'',communeCode:'xa-a'},
  {permitNumber:'GPXD-3',projectName:'Công trình',investorName:'Nguyễn A',address:'',communeCode:'xa-a'},
 ];
 assert.deepEqual(suggestPermits('cong trinh',permits).map(permit=>permit.permitNumber),['GPXD-3','GPXD-1']);
});

test('commune rankings sort by count descending and then by Vietnamese name',()=>{
 const places=[{code:'a',name:'Bản A'},{code:'b',name:'Chiềng Cơi'},{code:'c',name:'Tô Hiệu'}];
 const records=[{communeCode:'a'},{communeCode:'b'},{communeCode:'b'},{communeCode:'c'},{communeCode:'c'}];
 assert.deepEqual(rankCommunes(records,places).map(place=>[place.code,place.count]),[['b',2],['c',2],['a',1]]);
});
