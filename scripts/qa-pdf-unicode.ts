import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {exportPdf} from '../lib/export-report';
import type {AnalyticsSnapshot} from '../lib/types';
const literal=[
 'Địa bàn phường Thảo Nguyên, tỉnh Sơn La.',
 'Giấy phép xây dựng; cấp mới, sửa chữa; diện tích 120 m².',
 'Phản ánh không phép, sai phép, an toàn; đã tiếp nhận, đang xử lý, đã giải quyết.',
 'Bản đồ: Đắk Lắk, Điện Biên, Chiềng Cơi, Tô Hiệu, Mộc Châu.',
 'office affine efficient difficult ffi fi fl Địa mặt định bộ lọc.',
 'á; à; ả; ã; ạ; ắ; ằ; ẳ; ẵ; ặ; ấ; ầ; ẩ; ẫ; ậ; é; è; ẻ; ẽ; ẹ; ế; ề; ể; ễ; ệ; í; ì; ỉ; ĩ; ị',
 'ó; ò; ỏ; õ; ọ; ố; ồ; ổ; ỗ; ộ; ớ; ờ; ở; ỡ; ợ; ú; ù; ủ; ũ; ụ; ứ; ừ; ử; ữ; ự; ý; ỳ; ỷ; ỹ; ỵ; Đ; đ; Ơ; ơ; Ư; ư',
];
async function main(){
 const evidence=join(process.cwd(),'test-results/upgrade');mkdirSync(evidence,{recursive:true});
 const id='11111111-1111-4111-a111-111111111111';const s:AnalyticsSnapshot={id,generatedAt:'2026-10-14T03:00:00Z',filters:{group:'reports',dateFrom:'2026-01-01',dateTo:'2026-12-31',communeCode:'',category:'',status:'',result:'',source:'all',dateBasis:'created',inspectionMode:'all'},metrics:[{key:'total',label:'Phản ánh tiếp nhận trong kỳ',value:18}],monthly:[{month:'2026-10',count:18}],communes:[{code:'03982',name:'Phường Thảo Nguyên',count:18}],breakdown:[{key:'other',label:'Khác',count:18}],columns:[{key:'id',label:'Mã hồ sơ'},{key:'text',label:'Căn cứ và ghi chú'}],rows:Array.from({length:18},(_,i)=>({id:`QA-${String(i+1).padStart(3,'0')}`,text:literal[i%literal.length]})),total:18,notes:literal};
 const file=join(evidence,'unicode-copy.pdf');writeFileSync(file,await exportPdf(s));const poppler=spawnSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});assert.equal(poppler.status,0,poppler.stderr);const normalized=poppler.stdout.replace(/\s+/g,' ').trim();writeFileSync(join(evidence,'unicode-poppler.txt'),poppler.stdout);for(const value of [id,...literal])assert.ok(normalized.includes(value),`Poppler exact literal missing: ${value}`);
 const executable=process.env.QA_PDFJS_MODULE;if(executable){const program=`import{readFileSync,writeFileSync}from'node:fs';const {getDocument}=await import(process.env.QA_PDFJS_MODULE);const task=getDocument({data:new Uint8Array(readFileSync(process.env.QA_PDF_FILE)),useSystemFonts:false});const pdf=await task.promise;const texts=[];for(let page=1;page<=pdf.numPages;page++){const content=await(await pdf.getPage(page)).getTextContent();texts.push(content.items.map(item=>item.str||'').join(' '));}writeFileSync(process.env.QA_PDF_TEXT,texts.join('\\n'));await task.destroy();`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',program],{env:{...process.env,QA_PDF_FILE:file,QA_PDF_TEXT:join(evidence,'unicode-pdfjs.txt')},encoding:'utf8'});assert.equal(child.status,0,child.stderr);const pdfjs=readFileSync(join(evidence,'unicode-pdfjs.txt'),'utf8').replace(/\s+/g,' ').trim();for(const value of [id,...literal])assert.ok(pdfjs.includes(value),`PDF.js exact literal missing: ${value}`);}
 writeFileSync(join(evidence,'unicode-copy-result.json'),JSON.stringify({passed:true,scope:'synthetic snapshot direct export',PopplerExact:true,PdfJsExact:!!executable,literals:[id,...literal],timestamp:new Date().toISOString()},null,2));console.log(`PASS PDF Unicode exact literals, UUID and office; Poppler${executable?' + PDF.js':''}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
