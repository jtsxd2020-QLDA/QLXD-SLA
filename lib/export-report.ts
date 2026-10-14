import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import communes from './communes.json';
import type {AnalyticsSnapshot} from './types';

export function filterDescription(snapshot:AnalyticsSnapshot){
 const f=snapshot.filters;
 const labels:Record<string,string>={permits:'Giấy phép xây dựng',reports:'Phản ánh',inspections:'Kiểm tra',real:'Thực tế',demo:'Minh họa',unknown:'Chưa xác định nguồn',all:'Tất cả',issue:'Ngày cấp',created:'Ngày nhập',latest:'Kết quả gần nhất',received:'Đã tiếp nhận',processing:'Đang xử lý',resolved:'Đã giải quyết',pending:'Chưa hoàn tất',unlicensed:'Phản ánh không phép',wrong_permit:'Sai phép',safety:'An toàn',other:'Khác',unverified:'Chưa xác minh',compliant:'Phù hợp GPXD',no_permit_presented:'Chưa xuất trình GPXD'};
 return [`Nhóm: ${labels[f.group]}`,`Kỳ: ${f.dateFrom} đến ${f.dateTo} (giờ Việt Nam)`,`Địa bàn: ${communes.find(c=>c.code===f.communeCode)?.name||'Toàn tỉnh'}`,`Nguồn: ${labels[f.source]}`,f.group==='permits'?`Mốc thời gian: ${labels[f.dateBasis]}`:'',f.category?`Loại phản ánh: ${labels[f.category]||f.category}`:'',f.status?`Trạng thái: ${labels[f.status]||f.status}`:'',f.result?`Kết quả: ${labels[f.result]||f.result}`:'',f.group==='inspections'?`Cách đếm: ${f.inspectionMode==='latest'?'Kết quả gần nhất đến cuối kỳ':'Tất cả lượt kiểm tra'}`:''].filter(Boolean);
}
const text=(value:unknown)=>value===null||value===undefined?'':typeof value==='boolean'?(value?'Có':'Không'):String(value);
// Untrusted content always remains a literal string, never an Excel formula.
const excelText=(value:string)=>/^[=+\-@\t\r]/.test(value)?"'"+value:value;
export async function exportXlsx(snapshot:AnalyticsSnapshot){
 const book=new ExcelJS.Workbook();book.creator='QLXD-SLA';book.created=new Date(snapshot.generatedAt);
 const summary=book.addWorksheet('Tong hop');summary.columns=[{width:62},{width:24}];
 const header=summary.addRow(['BÁO CÁO ĐIỀU HÀNH TTXD SƠN LA']);summary.mergeCells(header.number,1,header.number,2);header.font={name:'Arial',size:16,bold:true,color:{argb:'FF1D3A6E'}};
 summary.addRow(['Mã báo cáo',snapshot.id]);summary.addRow(['Xuất lúc (giờ Việt Nam)',new Date(snapshot.generatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})]);
 for(const line of filterDescription(snapshot))summary.addRow([line]);summary.addRow([]);
 summary.addRow(['Chỉ tiêu','Số lượng']).font={bold:true};for(const m of snapshot.metrics)summary.addRow([m.label,m.value]);
 summary.addRow([]);summary.addRow(['Tháng','Số hồ sơ']).font={bold:true};for(const m of snapshot.monthly)summary.addRow([m.month,m.count]);
 summary.addRow([]);summary.addRow(['Địa bàn','Số hồ sơ']).font={bold:true};for(const c of snapshot.communes)summary.addRow([c.name,c.count]);
 summary.addRow([]);summary.addRow(['Phân loại','Số hồ sơ']).font={bold:true};for(const b of snapshot.breakdown)summary.addRow([b.label,b.count]);
 const detail=book.addWorksheet('Chi tiet',{views:[{state:'frozen',ySplit:1}]});
 detail.columns=snapshot.columns.map(c=>({header:c.label,key:c.key,width:/title|address|result|basis|notes|name/i.test(c.key)?40:23}));
 for(const row of snapshot.rows){const added=detail.addRow(Object.fromEntries(snapshot.columns.map(c=>{const value=row[c.key];return[c.key,typeof value==='string'&&/Date$/.test(c.key)&&/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T00:00:00Z'):typeof value==='number'?value:excelText(text(value))];})));for(const column of snapshot.columns)if(/Date$/.test(column.key))added.getCell(column.key).numFmt='yyyy-mm-dd';}
 if(!snapshot.rows.length)detail.addRow(['Không có hồ sơ theo bộ lọc.']);
 if(snapshot.columns.length)detail.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,snapshot.rows.length+1),column:snapshot.columns.length}};
 detail.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};detail.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D3A6E'}};
 const notes=book.addWorksheet('Giai thich');notes.getColumn(1).width=110;
 notes.addRow(['GIẢI THÍCH VÀ NGUỒN SỐ LIỆU']).font={bold:true};
 for(const note of [...snapshot.notes,'Dữ liệu trong tệp là cùng bản chụp số liệu đang xem trên giao diện.','Loại phản ánh là thông tin người gửi khai báo, không phải kết luận vi phạm.','Hồ sơ không có kết quả kiểm tra không được tính là đúng phép.','Thông tin liên hệ không được đưa vào mẫu báo cáo mặc định.','Ranh giới địa bàn là dữ liệu tham khảo.'])notes.addRow([excelText(note)]);
 for(const sheet of book.worksheets)sheet.eachRow(row=>{row.eachCell(cell=>{cell.alignment={vertical:'top',wrapText:true};if(!cell.font?.name)cell.font={...cell.font,name:'Arial',size:11};});const lines=Math.max(1,...row.values instanceof Array?row.values.slice(1).map((value,index)=>Math.ceil(text(value).length/Math.max(12,(sheet.getColumn(index+1).width||25)-2))):[1]);row.height=Math.max(row.height||22,lines*15+10);});
 notes.eachRow(row=>{row.height=48;});
 return Buffer.from(await book.xlsx.writeBuffer());
}

export async function exportPdf(snapshot:AnalyticsSnapshot){
 return new Promise<Buffer>((resolve,reject)=>{
  const doc=new PDFDocument({size:'A4',layout:'landscape',margin:34,bufferPages:true,info:{Title:'Báo cáo điều hành TTXD Sơn La',Author:'QLXD-SLA'}});
  const chunks:Buffer[]=[];doc.on('data',c=>chunks.push(Buffer.from(c)));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  try{
   // File read keeps the bundled font in Next.js output tracing; OFL licence accompanies it.
   doc.registerFont('Liberation',readFileSync(join(process.cwd(),'assets/fonts/LiberationSans-Regular.ttf')));doc.font('Liberation');
   const width=doc.page.width-68,bottom=doc.page.height-48;
   const ensure=(height:number)=>{if(doc.y+height>bottom){doc.addPage();doc.font('Liberation');}};
   const paragraph=(value:string,size=10)=>{doc.fontSize(size);const height=doc.heightOfString(value,{width});ensure(height+8);doc.fillColor('#24344c').text(value,34,doc.y,{width});doc.moveDown(.4);};
   paragraph('BÁO CÁO ĐIỀU HÀNH TTXD SƠN LA',19);
   paragraph(`Mã: ${snapshot.id} | Xuất: ${new Date(snapshot.generatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}`,9);
   for(const line of filterDescription(snapshot))paragraph(line);
   paragraph('CHỈ TIÊU TỔNG HỢP',13);for(let i=0;i<snapshot.metrics.length;i+=2){const items=snapshot.metrics.slice(i,i+2);doc.fontSize(10);const colWidth=width/2-12;const height=Math.max(...items.map(m=>doc.heightOfString(`${m.label}: ${m.value}`,{width:colWidth})))+10;ensure(height);const y=doc.y;items.forEach((m,index)=>doc.fillColor('#24344c').text(`${m.label}: ${m.value}`,34+index*(width/2),y,{width:colWidth}));doc.y=y+height;}
   const bars=(title:string,items:{label:string,count:number}[])=>{paragraph(title,13);const max=Math.max(1,...items.map(i=>i.count));for(const item of items){ensure(34);const y=doc.y;doc.fontSize(9).fillColor('#24344c').text(`${item.label}: ${item.count}`,34,y,{width:width*.55});doc.rect(34+width*.58,y+3,width*.35,10).fill('#e6edf6');if(item.count>0)doc.rect(34+width*.58,y+3,width*.35*item.count/max,10).fill('#345a98');doc.y=y+28;}};
   bars('THEO THÁNG',snapshot.monthly.map(m=>({label:m.month,count:m.count})));
   bars('PHÂN LOẠI',snapshot.breakdown.map(b=>({label:b.label,count:b.count})));
   bars('ĐỊA BÀN CÓ HỒ SƠ',snapshot.communes.filter(c=>c.count>0).map(c=>({label:c.name,count:c.count})));
   paragraph('GHI CHÚ PHƯƠNG PHÁP',13);for(const note of snapshot.notes)paragraph(note,9);
   doc.addPage();doc.font('Liberation');paragraph(`DANH SÁCH CHI TIẾT - ${snapshot.total} HỒ SƠ`,14);paragraph('Thông tin liên hệ không có trong báo cáo mặc định.',9);
   if(!snapshot.rows.length)paragraph('Không có hồ sơ theo bộ lọc.');
   // Detail records in a two-column labelled table prevent wide tables clipping on A4.
   snapshot.rows.forEach((row,index)=>{
    ensure(72);paragraph(`Hồ sơ ${index+1}`,12);
    for(const column of snapshot.columns){const value=text(row[column.key]);if(!value)continue;
     doc.fontSize(9);const leftWidth=170,rightWidth=width-leftWidth-12;
     const needed=Math.max(doc.heightOfString(column.label,{width:leftWidth}),doc.heightOfString(value,{width:rightWidth}))+10;
     ensure(needed);const y=doc.y;doc.fillColor('#56667c').text(column.label,34,y,{width:leftWidth});doc.fillColor('#172b48').text(value,34+leftWidth+12,y,{width:rightWidth});doc.y=y+needed;
    }
    ensure(12);doc.moveTo(34,doc.y).lineTo(34+width,doc.y).strokeColor('#d8e1ed').stroke();doc.y+=12;
   });
   const range=doc.bufferedPageRange();for(let p=range.start;p<range.start+range.count;p++){doc.switchToPage(p);const margin=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.font('Liberation').fontSize(8).fillColor('#69798e').text(`QLXD-SLA | ${snapshot.id} | Trang ${p+1}/${range.count}`,34,doc.page.height-29,{width,align:'right',lineBreak:false});doc.page.margins.bottom=margin;}
   doc.end();
  }catch(e){reject(e);doc.destroy();}
 });
}
