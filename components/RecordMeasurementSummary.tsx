import { Pentagon, Ruler } from 'lucide-react';
import { formatArea, formatDistance, measureLineMeters, measurePolygonAreaSquareMeters } from '@/lib/map-measurement';
import type { RecordMeasurement } from '@/lib/types';

export default function RecordMeasurementSummary({measurement}:{measurement?:RecordMeasurement|null}){
 if(!measurement)return <section className="record-measurement empty" aria-label="Đo vẽ của hồ sơ"><strong><Ruler size={15}/>Đo vẽ</strong><span>Hồ sơ chưa lưu hình đo.</span><small>Chọn “Đo vẽ” trên bản đồ để đo tại vị trí này.</small></section>;
 const isArea=measurement.type==='area';
 const value=isArea?formatArea(measurePolygonAreaSquareMeters(measurement.points)):formatDistance(measureLineMeters(measurement.points));
 return <section className="record-measurement" aria-label="Đo vẽ của hồ sơ"><strong>{isArea?<Pentagon size={15}/>:<Ruler size={15}/>} {isArea?'Diện tích đã vẽ':'Chiều dài đã đo'}</strong><b>{value}</b><small>{measurement.points.length} {isArea?'đỉnh':'điểm'} · Hình đo được hiển thị trên bản đồ. Số đo tham khảo.</small></section>;
}
