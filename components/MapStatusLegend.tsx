export default function MapStatusLegend(){
  return <div className="map-legend" aria-label="Chú giải màu trạng thái bản đồ">
    <span><i className="record-dot status-uninspected"/>GPXD · Chưa thi công</span>
    <span><i className="record-dot status-under_construction"/>GPXD · Đang thi công</span>
    <span><i className="record-dot status-completed"/>GPXD · Đã hoàn thành</span>
    <span><i className="record-dot status-unresolved"/>Phản ánh · Chưa xử lý</span>
    <span><i className="record-dot status-resolved"/>Phản ánh · Đã xử lý</span>
  </div>;
}
