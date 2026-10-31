import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {buildAnalyticsSnapshot,validateAnalyticsFilters} from '../lib/analytics';
import {filterRecordsForUser} from '../lib/authorization';
import {exportXlsx} from '../lib/export-report';
import type {AnalyticsFilters,CitizenReport,Inspection,UserIdentity} from '../lib/types';

const communeUser:UserIdentity={email:'canbo-a@qlxd.test',role:'commune',communeCode:'03664'};
const filters:AnalyticsFilters={group:'reports',dateFrom:'2026-01-01',dateTo:'2026-12-31',communeCode:'',category:'',status:'',result:'',source:'all',dateBasis:'created',inspectionMode:'all',search:''};
const foreignReport:CitizenReport={id:'foreign-report',publicCode:'PA-FOREIGN',title:'Phản ánh kiểm thử',content:'Nội dung kiểm thử',category:'unlicensed',reporterName:'NGUOI-GUI-PRIVATE',reporterPhone:'0987654322',address:'Địa chỉ kiểm thử',communeCode:'03982',lat:21,lng:104,createdAt:'2026-10-30T00:00:00.000Z',status:'received',source:'real',version:1};
const foreignInspection:Inspection={id:'foreign-inspection',reportId:foreignReport.id,siteKey:'SITE-FOREIGN',address:foreignReport.address,communeCode:foreignReport.communeCode,lat:foreignReport.lat,lng:foreignReport.lng,inspectionDate:'2026-10-30',inspector:'Cán bộ kiểm thử',result:'unlicensed',verified:true,basis:'Kết quả đã xác minh',notes:'',createdAt:'2026-10-30T00:00:00.000Z',source:'real',version:1};

test('cross-commune report PII is redacted before analytics matching, snapshots and Excel exports',async()=>{
  const records=filterRecordsForUser({permits:[],reports:[foreignReport]},communeUser);
  assert.equal(records.reports[0].reporterName,'');
  assert.equal(records.reports[0].reporterPhone,'');

  const snapshot=buildAnalyticsSnapshot(records,[],filters,new Date('2026-10-31T00:00:00.000Z'));
  assert.equal(snapshot.total,1);
  assert.equal(JSON.stringify(snapshot).includes('NGUOI-GUI-PRIVATE'),false);
  assert.equal(JSON.stringify(snapshot).includes('0987654322'),false);

  const phoneSearch=buildAnalyticsSnapshot(records,[],{...filters,search:'0987654322'},new Date('2026-10-31T00:00:00.000Z'));
  const nameSearch=buildAnalyticsSnapshot(records,[],{...filters,search:'NGUOI-GUI-PRIVATE'},new Date('2026-10-31T00:00:00.000Z'));
  assert.equal(phoneSearch.total,0);
  assert.equal(nameSearch.total,0);

  const workbook=new ExcelJS.Workbook();
  const excelBuffer=await exportXlsx(snapshot) as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(excelBuffer);
  const cells:string[]=[];
  for(const sheet of workbook.worksheets)sheet.eachRow(row=>row.eachCell(cell=>cells.push(String(cell.value??''))));
  const exported=cells.join(' ');
  assert.equal(exported.includes('NGUOI-GUI-PRIVATE'),false);
  assert.equal(exported.includes('0987654322'),false);
});

test('inspection analytics accept the unlicensed result and show its full result label',()=>{
  const inspectionFilters:AnalyticsFilters={...filters,group:'inspections',result:'unlicensed'};
  assert.equal(validateAnalyticsFilters(inspectionFilters).result,'unlicensed');
  const snapshot=buildAnalyticsSnapshot({permits:[],reports:[{...foreignReport,reporterName:'',reporterPhone:''}]},[foreignInspection],inspectionFilters,new Date('2026-10-31T00:00:00.000Z'));
  assert.equal(snapshot.total,1);
  assert.equal(snapshot.rows[0].result,'Thi công không có GPXD');
  assert.deepEqual(snapshot.breakdown,[{key:'unlicensed',label:'Thi công không có GPXD',count:1}]);
});
