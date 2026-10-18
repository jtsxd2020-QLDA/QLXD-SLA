'use client';
import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import communes from '@/lib/communes.json';
import { rankCommunes } from '@/lib/search';

type Props={kind:'permit'|'report';records:readonly {communeCode:string}[];loading:boolean;loadError:boolean;onSelectCommune:(code:string)=>void};

export default function CommuneColumnChart({kind,records,loading,loadError,onSelectCommune}:Props){
 const rows=useMemo(()=>rankCommunes(records,communes),[records]);
 const title=kind==='permit'?'Xếp hạng giấy phép theo địa phương':'Xếp hạng phản ánh theo địa phương';
 const unit=kind==='permit'?'GPXD':'phản ánh';
 const max=rows[0]?.count??1;
 const roughStep=max/4;
 const magnitude=10**Math.floor(Math.log10(Math.max(roughStep,1)));
 const step=Math.max(1,[1,2,5,10].find(value=>value*magnitude>=roughStep)!*magnitude);
 const ceiling=Math.ceil(max/step)*step;
 const ticks=Array.from({length:ceiling/step+1},(_,index)=>index*step);
 return <section className={`panel commune-column-chart chart-${kind}`} aria-label={title} data-testid="commune-column-chart" data-kind={kind==='permit'?'permits':'reports'} data-state={loading?'loading':loadError?'error':rows.length?'ready':'empty'}>
  <div className="section-heading"><div><span className="eyebrow">SO SÁNH THEO ĐỊA BÀN</span><h2><BarChart3 size={20}/>{title}</h2><p className="muted">Sắp xếp số lượng từ lớn đến nhỏ theo bộ lọc hiện tại. Chọn một cột để lọc địa bàn.</p></div>{!loading&&!loadError&&rows.length>0?<span className="column-chart-total">{rows.length} địa phương · {records.length.toLocaleString('vi-VN')} {unit}</span>:null}</div>
  {loading?<p className="column-chart-message muted" role="status">Đang tải dữ liệu để lập biểu đồ…</p>:loadError?<p className="column-chart-message muted" role="status">Chưa tải được dữ liệu. Tải lại hồ sơ để xác minh số liệu biểu đồ.</p>:!rows.length?<p className="column-chart-message muted" role="status">Chưa có {unit} theo bộ lọc hiện tại để lập biểu đồ.</p>:<>
   <div className="column-chart-axis-label">Số {unit}</div>
   <div className="column-chart-frame">
    <div className="column-chart-y-axis" aria-hidden="true">{ticks.map(tick=><span key={tick} style={{bottom:`${tick/ceiling*100}%`}}>{tick.toLocaleString('vi-VN')}</span>)}</div>
    <div className="column-chart-scroll" tabIndex={0} role="region" aria-label={`Biểu đồ ${unit} theo địa phương, cuộn ngang để xem tất cả`}>
     <div className="column-chart-content">
      <div className="column-chart-gridlines" aria-hidden="true">{ticks.map(tick=><i key={tick} style={{bottom:`${tick/ceiling*100}%`}}/>)}</div>
      <ol className="column-chart-columns" aria-label="Địa phương theo số hồ sơ giảm dần">{rows.map((row,index)=><li key={row.code}>
       <button type="button" className="column-chart-column" data-commune-code={row.code} data-count={row.count} aria-label={`${index+1}. ${row.name}: ${row.count} ${unit}; lọc địa bàn`} onClick={()=>onSelectCommune(row.code)}>
        <span className="column-chart-bar-space" aria-hidden="true"><strong className="column-chart-count" style={{bottom:`calc(${row.count/ceiling*100}% + 7px)`}}>{row.count.toLocaleString('vi-VN')}</strong><i className="column-chart-bar" style={{height:`${row.count/ceiling*100}%`}}/></span>
        <span className="column-chart-commune">{row.name}</span>
       </button>
      </li>)}</ol>
     </div>
    </div>
   </div>
   <p className="column-chart-footnote">Chỉ hiển thị địa phương có hồ sơ trong kết quả lọc. Có thể cuộn ngang hoặc dùng phím Tab để chọn cột.</p>
  </>}
 </section>;
}
