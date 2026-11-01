import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesPublicPermitSearch,matchesPublicReportSearch} from '../lib/search';

test('public map searches permit numbers and project or investor names without exposing those fields',()=>{
 const permit={id:'permit-id',permitNumber:'GPXD-2026-001',projectName:'Nhà ở Hưng Phát',investorName:'Nguyễn Văn Hưng',address:'Phường Chiềng An',issuingAuthority:'Sở Xây dựng',communeCode:'001'};
 assert.equal(matchesPublicPermitSearch('GPXD-2026-001',permit),true);
 assert.equal(matchesPublicPermitSearch('hưng',permit),true);
 assert.equal(matchesPublicPermitSearch('không tồn tại',permit),false);
});

test('public map searches citizen reports by tracking code only, not reporter names or report contents',()=>{
 const report={id:'report-id',publicCode:'PA-ABC123'};
 assert.equal(matchesPublicReportSearch('PA-ABC123',report),true);
 assert.equal(matchesPublicReportSearch('tên người gửi',report),false);
});
