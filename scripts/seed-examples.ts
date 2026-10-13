import { readFileSync } from 'node:fs';
import { resolveCommune } from '../lib/geo-server';
import { geometryBounds, type BoundaryCollection } from '../lib/geometry';
import communes from '../lib/communes.json';
import type { PermitInput, ReportInput } from '../lib/types';
import {insertPermit,insertReport,listRecords} from '../lib/store';
import {validatePermit,validateReport} from '../lib/validation';

// Synthetic locations and people: never represent actual buildings or allegations.
const prefix = 'MAU-TINH-2026-';
const disclaimer = 'DỮ LIỆU MINH HỌA: công trình, chủ đầu tư, kết quả kiểm tra và vị trí đều giả định; không phải giấy phép hoặc kết luận vi phạm thực tế.';
const areas = [
  { name: 'Phường Tô Hiệu', target: [103.91, 21.328], permits: 4, wrong: 2, reports: 3 },
  { name: 'Phường Chiềng Cơi', target: [103.90, 21.313], permits: 4, wrong: 1, reports: 3 },
  { name: 'Phường Thảo Nguyên', target: [104.704, 20.875], permits: 4, wrong: 1, reports: 2 },
  { name: 'Phường Mộc Châu', target: [104.638, 20.845], permits: 3, wrong: 1, reports: 2 },
];
const geometry = JSON.parse(readFileSync('geodata/sonla.full.geojson', 'utf8')) as BoundaryCollection;
function positions(name: string, target: number[], count: number) {
  const commune = communes.find(c => c.name === name)!;
  const feature = geometry.features.find(f => f.properties.communeCode === commune.code)!;
  const [[w,s],[e,n]] = geometryBounds(feature.geometry);
  const candidates: {lat:number;lng:number}[] = [];
  // Concentrate in the urban target, but require unambiguous full-geometry membership.
  for (let x=-50;x<=50;x++) for(let y=-50;y<=50;y++) {
    const point={lng:Number((target[0]+x*0.0008).toFixed(6)),lat:Number((target[1]+y*0.0008).toFixed(6))};
    if(point.lng>=w&&point.lng<=e&&point.lat>=s&&point.lat<=n&&resolveCommune(point)?.code===commune.code) candidates.push(point);
  }
  candidates.sort((a,b)=>((a.lng-target[0])**2+(a.lat-target[1])**2)-((b.lng-target[0])**2+(b.lat-target[1])**2));
  const chosen: typeof candidates=[];
  for(const point of candidates) {
    if(chosen.every(p=>Math.hypot(p.lat-point.lat,p.lng-point.lng)>0.0025)) chosen.push(point);
    if(chosen.length===count) break;
  }
  if(chosen.length!==count) throw new Error(`Không tìm đủ vị trí thuộc ${name}`);
  return {commune,points:chosen};
}
const wrongFindings = [
  'Giấy phép 2 tầng, kiểm tra giả định phát hiện xây thêm tầng thứ 3; yêu cầu dừng phần xây vượt phép và đối chiếu hồ sơ.',
  'Diện tích được phép 90 m², đo giả định 108 m²; phần mở rộng 18 m² chưa phù hợp giấy phép.',
  'Kiểm tra giả định phát hiện ban công vượt kích thước thiết kế được cấp phép 1 m; yêu cầu điều chỉnh.',
  'Vị trí xây dựng giả định lệch 1,5 m so với mặt bằng được duyệt; yêu cầu xác minh chỉ giới và khắc phục.',
  'Giấy phép cải tạo giữ nguyên kết cấu, kiểm tra giả định phát hiện tháo dỡ và xây mới; yêu cầu đối chiếu phạm vi cấp phép.',
];
const permits: PermitInput[]=[]; const reports: ReportInput[]=[];
let wrongIndex=0;
for(const area of areas) {
  const {commune,points}=positions(area.name,area.target,area.permits+area.reports);
  for(let i=0;i<area.permits;i++) {
    const number=permits.length+1, wrong=i<area.wrong;
    const finding=wrong?wrongFindings[wrongIndex++]:'Kiểm tra giả định: quy mô, số tầng và vị trí phù hợp giấy phép; tiếp tục theo dõi thi công.';
    permits.push({permitNumber:prefix+String(number).padStart(3,'0'),issueDate:`2026-09-${String(1+number).padStart(2,'0')}`,
      issuingAuthority:'[MẪU] Cơ quan cấp phép minh họa',investorName:`[MẪU] Chủ đầu tư ${String(number).padStart(2,'0')}`,
      projectName:`[MẪU] Nhà ở đô thị ${String(number).padStart(2,'0')} – ${wrong?'Sai phép':'Đúng phép'}`,
      address:`[MẪU] Vị trí giả định ${i+1}, khu vực đô thị ${area.name}`,communeCode:commune.code,...points[i],
      area:number===2?90:80+number*10,floors:2,constructionType:number===13?'renovation':'new',
      notes:`${disclaimer}\nKiểm tra minh họa ngày 10/10/2026. Kết quả: ${wrong?'SAI PHÉP':'ĐÚNG PHÉP'}.\n${finding}`});
  }
  for(let i=0;i<area.reports;i++) {
    const number=reports.length+1, wrong=i===area.reports-1;
    reports.push({title:`[MẪU ${String(number).padStart(2,'0')}] Phản ánh xây dựng ${wrong?'sai phép':'không phép'} – ${area.name}`,
      content:`${disclaimer}\nTình huống tiếp nhận minh họa: ${wrong?'người dân phản ánh công trình có dấu hiệu xây vượt số tầng hoặc mở rộng so với giấy phép':'người dân phản ánh công trình đang xây móng/tường nhưng chưa thấy thông tin giấy phép'}. Đề nghị kiểm tra hồ sơ và hiện trạng trước khi kết luận. Đây là phản ánh chưa được xác minh, không phải kết luận vi phạm.`,
      category:wrong?'wrong_permit':'unlicensed',reporterName:`[MẪU] Người phản ánh ${number}`,reporterPhone:'',
      address:`[MẪU] Vị trí giả định phản ánh ${i+1}, khu vực đô thị ${area.name}`,communeCode:commune.code,...points[area.permits+i]});
  }
}
async function main() {
  const before=listRecords(); let addedPermits=0,addedReports=0;
  for(const [path,inputs] of [['permits',permits],['reports',reports]] as const) {
    for(const input of inputs) {
      const exists='permitNumber' in input?before.permits.some(p=>p.permitNumber===input.permitNumber):before.reports.some(r=>r.title===input.title);
      if(exists) continue;
      if(path==='permits'){insertPermit(validatePermit(input));addedPermits++;}
      else {insertReport(validateReport(input));addedReports++;}
    }
  }
  const after=listRecords();
  const seededPermits=after.permits.filter(p=>p.permitNumber.startsWith(prefix));
  const seededReports=after.reports.filter(r=>reports.some(input=>input.title===r.title));
  const wrong=seededPermits.filter(p=>p.notes.includes('Kết quả: SAI PHÉP.')).length;
  if(seededPermits.length!==15||seededReports.length!==10||wrong!==5)throw new Error('Số lượng dữ liệu minh họa không khớp');
  console.log(JSON.stringify({addedPermits,addedReports,verified:{permits:seededPermits.length,wrongPermits:wrong,reports:seededReports.length},distribution:areas.map(a=>({name:a.name,permits:seededPermits.filter(p=>p.communeCode===communes.find(c=>c.name===a.name)!.code).length,wrong:a.wrong,reports:a.reports}))},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
