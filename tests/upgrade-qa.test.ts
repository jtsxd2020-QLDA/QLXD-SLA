import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAnalyticsSnapshot} from '../lib/analytics';
import type {AnalyticsFilters,CitizenReport,Inspection,Permit,StatusEvent} from '../lib/types';

// Expectations are hand calculated in docs/qa/UPGRADE_EXPECTED_2026-10-14.md,
// not computed by reusing the implementation's date or grouping helpers.
const position={lat:21.3,lng:103.9,address:'Địa chỉ QA'};
const permitBase={...position,issuingAuthority:'QA',investorName:'Không xuất tên chủ đầu tư QA',projectName:'QA',area:120,floors:2,constructionType:'new' as const,notes:'MẪU trong ghi chú không quyết định nguồn',status:'active' as const};
const permits:Permit[]=[
 {...permitBase,id:'P1',permitNumber:'001',communeCode:'03664',source:'real',issueDate:'2026-08-31',createdAt:'2026-08-31T17:00:00.000Z'},
 {...permitBase,id:'P2',permitNumber:'002',communeCode:'03670',source:'demo',issueDate:'2026-09-30',createdAt:'2026-09-30T16:59:59.999Z'},
 {...permitBase,id:'P3',permitNumber:'003',communeCode:'03664',issueDate:'2026-09-01',createdAt:'2026-09-30T17:00:00.000Z'},
 {...permitBase,id:'P4',permitNumber:'004',communeCode:'03670',source:'real',issueDate:'2026-10-01',createdAt:'2026-09-30T17:00:00.000Z'},
];
const events:StatusEvent[]=[
 {at:'2026-09-10T03:00:00.000Z',actor:'admin@qlxd',from:'processing',to:'resolved',reason:'',result:'Kết quả 1'},
 {at:'2026-09-11T03:00:00.000Z',actor:'admin@qlxd',from:'resolved',to:'processing',reason:'Mở lại',result:''},
 {at:'2026-09-12T03:00:00.000Z',actor:'admin@qlxd',from:'processing',to:'resolved',reason:'',result:'Kết quả 2'},
 {at:'2026-09-30T17:00:00.000Z',actor:'admin@qlxd',from:'resolved',to:'processing',reason:'Mở lại tháng 10',result:''},
];
const reportBase={...position,title:'Không xuất tiêu đề riêng QA',content:'Nội dung liên hệ riêng QA 0912345678',reporterName:'Người liên hệ QA',reporterPhone:'0912345678',publicCode:'PA-QA'};
const reports:CitizenReport[]=[
 {...reportBase,id:'R1',communeCode:'03664',source:'real',category:'unlicensed',createdAt:'2026-08-31T17:00:00.000Z',status:'processing',history:events,historyStartedAt:'2026-08-31T17:00:00.000Z'},
 {...reportBase,id:'R2',communeCode:'03670',source:'demo',category:'wrong_permit',createdAt:'2026-09-30T16:59:59.999Z',status:'resolved',history:[{at:'2026-09-30T17:00:00.000Z',actor:'admin@qlxd',from:'received',to:'resolved',reason:'',result:'QA'}]},
 {...reportBase,id:'R3',communeCode:'03664',category:'safety',createdAt:'2026-09-30T17:00:00.000Z',status:'received'},
 {...reportBase,id:'R4',communeCode:'03670',source:'real',category:'other',createdAt:'2026-08-20T03:00:00.000Z',status:'received'},
 {...reportBase,id:'R5',communeCode:'03664',source:'real',category:'wrong_permit',createdAt:'2026-09-20T03:00:00.000Z',status:'resolved'},
];
const inspectionBase={...position,inspector:'Người kiểm tra QA',basis:'Căn cứ kiểm tra QA',notes:'',source:'real' as const,version:1,createdAt:'2026-10-01T03:00:00.000Z'};
const inspections:Inspection[]=[
 {...inspectionBase,id:'I1',permitId:'P1',siteKey:'S1',communeCode:'03664',inspectionDate:'2026-09-05',result:'wrong_permit',verified:true},
 {...inspectionBase,id:'I2',permitId:'P1',siteKey:'S1',communeCode:'03664',inspectionDate:'2026-09-20',result:'compliant',verified:true},
 {...inspectionBase,id:'I3',permitId:'P2',siteKey:'S2',communeCode:'03670',inspectionDate:'2026-09-30',result:'wrong_permit',verified:true,source:'demo'},
 {...inspectionBase,id:'I4',permitId:'P3',siteKey:'S3',communeCode:'03664',inspectionDate:'2026-09-30',result:'no_permit_presented',verified:false},
 {...inspectionBase,id:'I5',permitId:'P1',siteKey:'S1',communeCode:'03664',inspectionDate:'2026-10-01',result:'wrong_permit',verified:true},
];
const filters=(patch:Partial<AnalyticsFilters>={}):AnalyticsFilters=>({group:'permits',dateFrom:'2026-09-01',dateTo:'2026-09-30',communeCode:'',category:'',status:'',result:'',source:'all',dateBasis:'issue',inspectionMode:'all',search:'',...patch});
const snapshot=(patch:Partial<AnalyticsFilters>={},records={permits,reports})=>buildAnalyticsSnapshot(records,inspections,filters(patch),new Date('2026-10-14T03:00:00Z'));
const metric=(s:ReturnType<typeof snapshot>,key:string)=>{const result=s.metrics.find(item=>item.key===key);assert.ok(result,`Metric ${key} exists`);return result.value;};

test('QA independent: issue date and Vietnam created-month use different expected rows',()=>{
 assert.equal(snapshot().total,2);assert.equal(snapshot({dateBasis:'created'}).total,2);
 assert.equal(snapshot({dateBasis:'created',dateFrom:'2026-10-01',dateTo:'2026-10-31'}).total,2);
 assert.equal(snapshot({dateBasis:'created',source:'real'}).total,1);
 assert.equal(snapshot({dateBasis:'issue',source:'real'}).total,0);
 assert.equal(snapshot({source:'demo'}).total,1);assert.equal(snapshot({source:'unknown'}).total,1);
});
test('QA independent: report month boundary, received/current pending and repeated completion events',()=>{
 const s=snapshot({group:'reports'});assert.equal(s.total,3);assert.equal(metric(s,'currentPending'),1);
 assert.equal(metric(s,'resolutionEvents'),2);assert.equal(metric(s,'resolvedUnique'),1);
 assert.equal(snapshot({group:'reports',source:'real'}).total,2);
 assert.equal(snapshot({group:'reports',source:'demo'}).total,1);
 assert.equal(snapshot({group:'reports',source:'unknown'}).total,0);
 assert.equal(snapshot({group:'reports',dateFrom:'2026-10-01',dateTo:'2026-10-31'}).total,1);
 assert.ok(s.notes.some(note=>/lịch sử|quá khứ|tồn cuối kỳ/i.test(note)),'Legacy status must not manufacture historical backlog');
});
test('QA independent: inspection visits and latest site results stop at selected period',()=>{
 const all=snapshot({group:'inspections'});assert.equal(all.total,4);assert.equal(metric(all,'sites'),3);
 assert.equal(snapshot({group:'inspections',inspectionMode:'latest'}).total,3);
 assert.equal(snapshot({group:'inspections',inspectionMode:'latest',result:'wrong_permit'}).total,1,'Choose latest THEN filter result; no older noncompliant I1 or future I5');
 assert.equal(snapshot({group:'inspections',inspectionMode:'all',search:'',result:'wrong_permit'}).total,2);
 assert.equal(snapshot({group:'inspections',source:'real'}).total,3);
 assert.equal(snapshot({group:'inspections',source:'demo'}).total,1);
});
test('QA independent: analytics search matches accentless locality, report details and linked inspection records',()=>{
 const locality=snapshot({group:'permits',search:'Chieng An'});
 assert.equal(locality.total,1);assert.equal(locality.rows[0].permitNumber,'003');
 const report=snapshot({group:'reports',search:'noi dung lien he rieng'});
 assert.equal(report.total,3);assert.equal(metric(report,'total'),3);
 const inspectionsResult=snapshot({group:'inspections',search:'001'});
 assert.equal(inspectionsResult.total,2,'An inspection can be found by its linked permit number');
 assert.throws(()=>snapshot({group:'reports',search:'x'.repeat(121)}),/Bộ lọc báo cáo không hợp lệ/);
});
test('QA independent: geographic totals reconcile within each group and source',()=>{
 for(const group of ['permits','reports','inspections'] as const)for(const source of ['all','real','demo','unknown'] as const){
 const all=snapshot({group,source});const a=snapshot({group,source,communeCode:'03664'}),b=snapshot({group,source,communeCode:'03670'});
 assert.equal(a.total+b.total,all.total,`${group}/${source}`);assert.equal(all.monthly.reduce((sum,item)=>sum+item.count,0),all.total,`${group}/${source} monthly`);
 }
});
test('QA independent: permit group does not apply report category and returns no contact values',()=>{
 assert.throws(()=>snapshot({group:'permits',category:'wrong_permit'}),/Bộ lọc không áp dụng cho GPXD/);
 for(const group of ['permits','reports','inspections'] as const){const serialized=JSON.stringify(snapshot({group}));
 for(const privateText of ['Người liên hệ QA','0912345678','Nội dung liên hệ riêng QA','Không xuất tên chủ đầu tư QA'])assert.equal(serialized.includes(privateText),false,`${group} excludes ${privateText}`);
 }
});
test('QA independent: empty query produces genuine zeroes and no truncated fake records',()=>{
 for(const group of ['permits','reports','inspections'] as const){const s=snapshot({group,communeCode:'03679'});assert.equal(s.total,0);assert.equal(s.rows.length,0);assert.ok(s.metrics.every(item=>item.value===0));}
});

test('QA independent: completion in September counts an August intake without adding it to September intake rows',()=>{
 const older:CitizenReport={...reportBase,id:'OLDER',communeCode:'03664',source:'real',category:'other',createdAt:'2026-08-10T03:00:00Z',status:'resolved',history:[{at:'2026-09-01T03:00:00Z',actor:'admin@qlxd',from:'processing',to:'resolved',reason:'',result:'Kết quả trước kỳ'}]};
 const s=snapshot({group:'reports'},{permits,reports:[...reports,older]});assert.equal(s.total,3);assert.equal(metric(s,'resolutionEvents'),3);assert.equal(metric(s,'resolvedUnique'),2);
});

test('QA independent: exported workbook keeps codes and hostile values as literal text and matches snapshot',async()=>{
 const {default:ExcelJS}=await import('exceljs');const{exportXlsx}=await import('../lib/export-report');
 const hostile=['=HYPERLINK("https://evil.invalid")','+CMD','-CMD','@SUM(1,2)'];
 const s=buildAnalyticsSnapshot({permits:hostile.map((permitNumber,index)=>({...permits[1],id:`FORMULA-${index}`,permitNumber})),reports:[]},[],filters(),new Date('2026-10-14T03:00:00Z'));
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await exportXlsx(s) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
 assert.deepEqual(workbook.worksheets.map(x=>x.name),['Tong hop','Chi tiet','Giai thich']);
 const detail=workbook.getWorksheet('Chi tiet')!;assert.equal(detail.rowCount,5);
 for(let row=2;row<=5;row++){const cell=detail.getCell(row,2);assert.equal(typeof cell.value,'string');assert.equal(cell.value,"'"+hostile[row-2]);}
 for(const sheet of workbook.worksheets)sheet.eachRow(row=>row.eachCell(cell=>assert.equal(cell.type===ExcelJS.ValueType.Formula,false)));
 assert.ok(workbook.getWorksheet('Tong hop')!.getColumn(2).values.includes(s.id));
 const empty=new ExcelJS.Workbook();await empty.xlsx.load(await exportXlsx(snapshot({communeCode:'03679'})) as unknown as Parameters<typeof empty.xlsx.load>[0]);assert.equal(empty.getWorksheet('Chi tiet')!.getCell(2,1).value,'Không có hồ sơ theo bộ lọc.');
});
