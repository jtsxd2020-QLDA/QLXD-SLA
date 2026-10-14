'use client';
import { useEffect, useRef, useState } from 'react';
import { Layers3, X, LocateFixed, Maximize2, Minimize2, MapPin } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import type { Map as LibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import { getCommuneBounds, setDisplayBoundaries, resolveCommune } from '@/lib/geo';
import type { BoundaryCollection } from '@/lib/geometry';
import communes from '@/lib/communes.json';
import type { MapRecord, Position } from '@/lib/types';
import { BASEMAPS, GOOGLE_MAPS_KEY, GOOGLE_HYBRID_SOURCE, REFERENCE_SOURCES, googleCopyright, resolveBasemap, type BasemapId } from '@/lib/basemaps';

type Props = {
  records: MapRecord[]; selectedCommune: string; onPick: (point: Position) => void;
  onSelect: (record: MapRecord) => void; picked: Position | null; selectedRecordId?: string; onCommuneNavigate?: (code:string)=>void;
};

export default function MapCanvas({ records, selectedCommune, onPick, onSelect, picked, selectedRecordId, onCommuneNavigate }: Props) {
  const [candidate,setCandidate]=useState<{position:Position;accuracy?:number}|null>(null);
  const [locating,setLocating]=useState(false);
  const [locationMessage,setLocationMessage]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [positionToolsOpen,setPositionToolsOpen]=useState(false);
  const gpsRequest=useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const handlers = useRef({ onPick, onSelect });
  const markers = useRef<Marker[]>([]);
  const pickMarker = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [baseUnavailable, setBaseUnavailable] = useState(false);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [error, setError] = useState('');
  const [basemap, setBasemap] = useState<BasemapId>('google-hybrid');
  const [activeBase, setActiveBase] = useState<BasemapId>('google-hybrid');
  const [switchingBase, setSwitchingBase] = useState(false);
  const [baseAttempt, setBaseAttempt] = useState(0);
  const [baseMessage, setBaseMessage] = useState('');
  const [boundariesVisible, setBoundariesVisible] = useState(true);
  const [copyright, setCopyright] = useState('');
  const [activeGoogleSession, setActiveGoogleSession] = useState<string | undefined>();
  const [toolsOpen, setToolsOpen] = useState(false);
  const tools = useRef<HTMLDivElement>(null);
  const toolsToggle = useRef<HTMLButtonElement>(null);
  const [referencesVisible, setReferencesVisible] = useState(true);
  const [referencesLoaded, setReferencesLoaded] = useState(false);
  const referenceTiles = useRef(new Set<string>());
  const [referenceUnavailable, setReferenceUnavailable] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  useEffect(()=>()=>{gpsRequest.current++;},[]);
  useEffect(()=>{if(!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[expanded]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;if(candidate||expanded||positionToolsOpen){event.preventDefault();event.stopImmediatePropagation();gpsRequest.current++;setLocating(false);setCandidate(null);setExpanded(false);setPositionToolsOpen(false);setLocationMessage('');}};window.addEventListener('keydown',close,true);return()=>window.removeEventListener('keydown',close,true);},[candidate,expanded,positionToolsOpen]);
  function locate(){
    if(!navigator.geolocation){setLocationMessage('Thiết bị chưa hỗ trợ định vị. Hãy chọn điểm trên bản đồ.');return;}
    const request=++gpsRequest.current;setLocating(true);setLocationMessage('');
    navigator.geolocation.getCurrentPosition(result=>{if(request!==gpsRequest.current)return;setLocating(false);const position={lat:result.coords.latitude,lng:result.coords.longitude};setCandidate({position,accuracy:result.coords.accuracy});map.current?.flyTo({center:[position.lng,position.lat],zoom:15});},error=>{if(request!==gpsRequest.current)return;setLocating(false);setLocationMessage(error.code===1?'Bạn chưa cho phép định vị. Có thể chọn vị trí bằng tay.':error.code===3?'Định vị mất quá nhiều thời gian. Hãy thử lại hoặc chọn điểm.':'Chưa xác định được vị trí thiết bị. Hãy chọn điểm trên bản đồ.');},{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  }
  function coordinate(event:React.FormEvent<HTMLFormElement>){event.preventDefault();gpsRequest.current++;setLocating(false);const values=new FormData(event.currentTarget);const lat=Number(String(values.get('lat')).trim()),lng=Number(String(values.get('lng')).trim());if(!String(values.get('lat')).trim()||!String(values.get('lng')).trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){setLocationMessage('Tọa độ không hợp lệ. Vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180.');return;}setCandidate({position:{lat,lng}});setLocationMessage('');setPositionToolsOpen(false);map.current?.flyTo({center:[lng,lat],zoom:15});}
  const candidateCommune=candidate?resolveCommune(candidate.position):null;
  useEffect(() => { handlers.current = { onPick, onSelect }; }, [onPick, onSelect]);
  useEffect(() => {
    const dismissNotice = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) setNoticeDismissed(true);
    };
    window.addEventListener('keydown', dismissNotice);
    return () => window.removeEventListener('keydown', dismissNotice);
  }, []);

  useEffect(() => {
    if (!toolsOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!tools.current?.contains(event.target as Node)) setToolsOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      setToolsOpen(false); toolsToggle.current?.focus();
    };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeOnEscape, true);
    return () => { document.removeEventListener('pointerdown', closeOutside); window.removeEventListener('keydown', closeOnEscape, true); };
  }, [toolsOpen]);

  useEffect(() => {
    if (!container.current) return;
    const controller = new AbortController();
    let alive = true;
    let hasRendered = false;
    let instance: LibreMap;
    try {
      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      instance = new maplibregl.Map({
        container: container.current,
        center: [104.0, 21.35], zoom: 7.3, maxZoom: 20,
        attributionControl: false,
        transformRequest: (url) => ({ url, referrerPolicy: 'strict-origin-when-cross-origin' }),
        style: { version: 8, sources: { 'base-raster': GOOGLE_HYBRID_SOURCE }, layers: [{ id: 'base-map', type: 'raster', source: 'base-raster' }] },
      });
    } catch { setTimeout(() => { if (alive) setError('Thiết bị chưa hỗ trợ hiển thị bản đồ. Có thể nhập tọa độ trong biểu mẫu.'); }, 0); return () => { alive = false; }; }
    map.current = instance;
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(container.current);
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('error', (event) => {
      if (event.error.message.includes('Worker')) setError('Chưa tải được bộ xử lý bản đồ. Vui lòng tải lại trang.');
      else if ('sourceId' in event && event.sourceId === 'base-raster') setBaseUnavailable(true);
      else if ('sourceId' in event && REFERENCE_SOURCES.some((source) => source.id === event.sourceId)) setReferenceUnavailable(true);
    });
    instance.on('sourcedata', (event) => {
      if (event.sourceId === 'base-raster' && event.tile?.state === 'loaded') { setBaseUnavailable(false); setBaseLoaded(true); }
      if (REFERENCE_SOURCES.some((source) => source.id === event.sourceId) && event.tile?.state === 'loaded') {
        referenceTiles.current.add(event.sourceId);
        if (referenceTiles.current.size === REFERENCE_SOURCES.length) { setReferencesLoaded(true); setReferenceUnavailable(false); }
      }
    });
    instance.on('render', () => {
      if (!hasRendered && instance.getLayer('commune-lines') && instance.queryRenderedFeatures({ layers: ['commune-lines'] }).length > 0) {
        hasRendered = true; setRendered(true);
      }
    });
    instance.on('click', (event) => {gpsRequest.current++;setLocating(false);setLocationMessage('');setCandidate({position:{lat:event.lngLat.lat,lng:event.lngLat.lng}});});
    instance.on('load', async () => {
      try {
        const response = await fetch('/data/sonla-communes.geojson', { signal: controller.signal });
        if (!response.ok) throw new Error('Không tải được ranh giới.');
        const data = await response.json() as BoundaryCollection;
        if (!alive) return;
        setDisplayBoundaries(data);
        instance.addSource('communes', { type: 'geojson', data });
        instance.addLayer({ id: 'commune-fill', type: 'fill', source: 'communes', paint: { 'fill-color': '#34588a', 'fill-opacity': 0.025 } });
        instance.addLayer({ id: 'commune-lines', type: 'line', source: 'communes', paint: { 'line-color': '#2563eb', 'line-width': 1.4, 'line-opacity': 0.85 } });
        for (const reference of REFERENCE_SOURCES) {
          instance.addSource(reference.id, reference.source);
          instance.addLayer({ id: reference.id, type: 'raster', source: reference.id, layout: { visibility: 'none' } }, 'commune-fill');
        }
        instance.addSource('selection', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        instance.addLayer({ id: 'selection-fill', type: 'fill', source: 'selection', paint: { 'fill-color': '#1d3a6e', 'fill-opacity': 0.18 } });
        instance.addLayer({ id: 'selection-line', type: 'line', source: 'selection', paint: { 'line-color': '#1d3a6e', 'line-width': 2.5 } });
        instance.fitBounds([[103.21, 20.54], [105.08, 22.04]], { padding: 36, duration: 0 });
        setReady(true);
      } catch (reason) {
        if (alive) setError(reason instanceof Error ? reason.message : 'Không tải được ranh giới.');
      }
    });
    return () => { alive = false; controller.abort(); resizeObserver.disconnect(); markers.current.forEach((marker) => marker.remove()); pickMarker.current?.remove(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    const controller = new AbortController();
    const viewport = () => {
      const bounds = instance.getBounds();
      return { zoom: Math.floor(instance.getZoom()), north: Math.min(89.99, bounds.getNorth()), south: Math.max(-89.99, bounds.getSouth()), east: bounds.getEast(), west: bounds.getWest() };
    };
    void (async () => {
      setSwitchingBase(true);
      try {
        const resolved = await resolveBasemap(basemap, controller.signal);
        const credit = resolved.session ? await googleCopyright(resolved.session, viewport(), controller.signal) : '';
        if (controller.signal.aborted) return;
        setBaseLoaded(false);
        instance.removeLayer('base-map'); instance.removeSource('base-raster');
        instance.addSource('base-raster', resolved.source);
        instance.addLayer({ id: 'base-map', type: 'raster', source: 'base-raster' }, 'reference-roads');
        const imagery = basemap === 'satellite' || basemap === 'google-satellite' || basemap === 'google-hybrid';
        instance.setPaintProperty('commune-lines', 'line-color', imagery ? '#f8df72' : '#2563eb');
        instance.setPaintProperty('selection-line', 'line-color', imagery ? '#fff' : '#1d3a6e');
        instance.setPaintProperty('selection-fill', 'fill-opacity', imagery ? 0.08 : 0.18);
        setCopyright(credit); setActiveBase(basemap); setBaseUnavailable(false);
        setActiveGoogleSession(resolved.session);
      } catch {
        if (!controller.signal.aborted) setBaseMessage('Chưa chuyển được bản đồ nền. Nền đang mở và các hồ sơ vẫn được giữ lại.');
      } finally { if (!controller.signal.aborted) setSwitchingBase(false); }
    })();
    return () => { controller.abort(); };
  }, [basemap, ready, baseAttempt]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || !activeGoogleSession) return;
    let alive = true;
    let request: AbortController | undefined;
    const updateCredit = async () => {
      request?.abort();
      const controller = new AbortController(); request = controller;
      const bounds = instance.getBounds();
      try {
        const credit = await googleCopyright(activeGoogleSession, { zoom: Math.floor(instance.getZoom()), north: Math.min(89.99, bounds.getNorth()), south: Math.max(-89.99, bounds.getSouth()), east: bounds.getEast(), west: bounds.getWest() }, controller.signal);
        if (alive && !controller.signal.aborted) setCopyright(credit);
      } catch {
        if (alive && !controller.signal.aborted) {
          setBaseMessage('Chưa tải được thông tin nguồn Google. Đang chuyển về nền đường phố.');
          setBasemap('street');
        }
      }
    };
    instance.on('moveend', updateCredit); void updateCredit();
    return () => { alive = false; request?.abort(); instance.off('moveend', updateCredit); };
  }, [activeGoogleSession, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    for (const layer of ['commune-fill', 'commune-lines', 'selection-fill', 'selection-line']) {
      instance.setLayoutProperty(layer, 'visibility', boundariesVisible ? 'visible' : 'none');
    }
  }, [boundariesVisible, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    for (const reference of REFERENCE_SOURCES) instance.setLayoutProperty(reference.id, 'visibility', referencesVisible && activeBase === 'satellite' ? 'visible' : 'none');
  }, [referencesVisible, activeBase, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = records.map((record) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `map-record-marker ${record.kind}${record.id === selectedRecordId ? ' selected' : ''}`;
      button.setAttribute('aria-label', `${record.kind === 'permit' ? 'GPXD' : 'Phản ánh'}: ${record.title}`);
      button.setAttribute('data-record-id', record.id);
      button.title = record.title;
      button.textContent = record.kind === 'permit' ? '▥' : '!';
      button.addEventListener('click', (event) => { event.stopPropagation(); handlers.current.onSelect(record); });
      return new maplibregl.Marker({ element: button, anchor: 'center' }).setLngLat([record.lng, record.lat]).addTo(instance);
    });
    return () => { markers.current.forEach((marker) => marker.remove()); };
  }, [records, ready, selectedRecordId]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    pickMarker.current?.remove();
    const preview=candidate?.position||picked;
    if (preview) {
      pickMarker.current = new maplibregl.Marker({ color: '#2563eb', draggable: true }).setLngLat([preview.lng, preview.lat]).addTo(instance);
      pickMarker.current.getElement().setAttribute('data-testid', 'map-picked-marker');
      pickMarker.current.on('dragend', () => { const p = pickMarker.current?.getLngLat(); if (p) setCandidate({position:{lng:p.lng,lat:p.lat}}); });
    }
    return () => { pickMarker.current?.remove(); pickMarker.current = null; };
  }, [picked, candidate, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    const bounds = getCommuneBounds(selectedCommune);
    if (bounds) instance.fitBounds(bounds, { padding: 50, duration: 450 });
    else instance.fitBounds([[103.21, 20.54], [105.08, 22.04]], { padding: 36, duration: 450 });
    const controller = new AbortController();
    fetch('/data/sonla-communes.geojson', { signal: controller.signal }).then((response) => response.json()).then((data: BoundaryCollection) => {
      const source = instance.getSource('selection') as GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: data.features.filter((feature) => feature.properties.communeCode === selectedCommune) });
    }).catch(() => { /* Boundary loading errors already appear at initialization. */ });
    return () => controller.abort();
  }, [selectedCommune, ready]);

  useEffect(() => {
    const record = records.find((item) => item.id === selectedRecordId);
    if (record && map.current && ready) map.current.flyTo({ center: [record.lng, record.lat], zoom: Math.max(map.current.getZoom(), 13), duration: 550 });
  }, [selectedRecordId, records, ready]);

  return <div className={`map-canvas-shell${expanded?' map-expanded':''}`} style={{ position: 'relative', width: '100%', minHeight: 360 }}>
    <div ref={container} data-testid="map-canvas" data-basemap={activeBase} data-basemap-loaded={baseLoaded ? 'true' : 'false'} data-reference-visible={referencesVisible && activeBase === 'satellite' ? 'true' : 'false'} data-reference-loaded={referencesLoaded ? 'true' : 'false'} data-boundaries-visible={boundariesVisible ? 'true' : 'false'} data-boundaries-rendered={rendered ? 'true' : 'false'} role="region" aria-label="Bản đồ trật tự xây dựng tỉnh Sơn La" style={{ position: 'absolute', inset: 0 }} />
    <div ref={tools} className="map-tools" aria-label="Công cụ bản đồ">
      <button ref={toolsToggle} type="button" className="map-tools-toggle" aria-expanded={toolsOpen} aria-controls="map-layers-panel" onClick={() => setToolsOpen((open) => !open)}><Layers3 size={17} />Lớp bản đồ</button>
      <div id="map-layers-panel" className="map-tools-popover" hidden={!toolsOpen}>
      <header className="map-tools-header"><strong>Lớp bản đồ</strong><button type="button" className="icon-button" aria-label="Đóng lớp bản đồ" onClick={() => { setToolsOpen(false); toolsToggle.current?.focus(); }}><X size={16} /></button></header>
      <label className="map-base-select">Bản đồ nền<select aria-label="Bản đồ nền" value={basemap} disabled={!ready || switchingBase} onChange={(event) => { const id = event.target.value as BasemapId; setBaseMessage(''); setNoticeDismissed(false); setBasemap(id); if (id === basemap) setBaseAttempt((value) => value + 1); }}>
        {BASEMAPS.map((base) => <option key={base.id} value={base.id} disabled={Boolean(base.google && !GOOGLE_MAPS_KEY)}>{base.label}</option>)}
      </select></label>
      <label><input type="checkbox" checked={referencesVisible} disabled={!ready || activeBase !== 'satellite'} onChange={(event) => { setReferencesVisible(event.target.checked); setNoticeDismissed(false); }} />Tên địa danh và đường</label>
      <label><input type="checkbox" checked={boundariesVisible} disabled={!ready} onChange={(event) => setBoundariesVisible(event.target.checked)} />Ranh giới xã, phường</label>
      <button type="button" className="button" disabled={!ready} onClick={() => map.current?.fitBounds([[103.21, 20.54], [105.08, 22.04]], { padding: 36, duration: 450 })}>Về toàn tỉnh</button>
      {!GOOGLE_MAPS_KEY && <p className="map-google-note">Nền Google Hybrid hiển thị sẵn tên đường và địa điểm.</p>}
      {(switchingBase || baseMessage) && <p className="map-google-note" role="status">{switchingBase ? 'Đang đổi bản đồ nền…' : baseMessage}</p>}
      </div>
    </div>
    <div className="map-quick-controls" aria-label="Chọn vị trí và màn hình"><button type="button" className="map-tools-toggle" disabled={!ready||locating} onClick={locate}><LocateFixed size={17}/>{locating?'Đang định vị…':'Vị trí của tôi'}</button><button type="button" className="map-tools-toggle" aria-label={expanded?'Thu nhỏ bản đồ':'Bản đồ toàn màn hình'} aria-pressed={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button><button type="button" className="map-tools-toggle" aria-expanded={positionToolsOpen} onClick={()=>setPositionToolsOpen(value=>!value)}><MapPin size={17}/>Tìm vị trí</button></div>
    {positionToolsOpen&&<section className="map-position-tools"><label>Tìm xã/phường<input list="map-commune-options" placeholder="Tên hoặc mã xã/phường" onChange={event=>{const value=event.target.value.trim().toLocaleLowerCase('vi');const commune=communes.find(c=>c.code===value||c.name.toLocaleLowerCase('vi')===value);if(commune){const bounds=getCommuneBounds(commune.code);if(bounds)map.current?.fitBounds(bounds,{padding:50});onCommuneNavigate?.(commune.code);setPositionToolsOpen(false);}}}/><datalist id="map-commune-options">{communes.map(c=><option key={c.code} value={c.name}>{c.code}</option>)}</datalist></label><form className="map-position-form" onSubmit={coordinate}><label>Vĩ độ<input name="lat" type="number" step="any" placeholder="21.3" required/></label><label>Kinh độ<input name="lng" type="number" step="any" placeholder="103.9" required/></label><button className="button secondary" type="submit">Đưa đến tọa độ</button></form><button className="text-button" type="button" onClick={()=>setPositionToolsOpen(false)}>Đóng tìm vị trí</button></section>}
    {candidate&&<section className="map-candidate-card" role="status"><strong>{candidateCommune?.name||'Điểm ngoài địa bàn hoặc sát ranh giới cần kiểm tra'}</strong><span>{candidate.position.lat.toFixed(6)}, {candidate.position.lng.toFixed(6)}</span>{candidate.accuracy!==undefined&&<small>Sai số vị trí thiết bị khoảng {Math.round(candidate.accuracy)} m. {candidate.accuracy>100?'Sai số lớn, hãy điều chỉnh ghim trước khi xác nhận.':'Hãy kiểm tra đây là vị trí công trình.'}</small>}<small>Kéo ghim để chỉnh điểm. Địa bàn gợi ý được máy chủ kiểm tra lại khi lưu.</small><div><button type="button" className="button primary" disabled={!candidateCommune} onClick={()=>{const point=candidate.position;gpsRequest.current++;setLocating(false);setCandidate(null);setExpanded(false);handlers.current.onPick(point);}}>Dùng điểm này</button><button type="button" className="button secondary" onClick={()=>{gpsRequest.current++;setLocating(false);setCandidate(null);}}>Hủy chọn điểm</button></div></section>}
    {locationMessage&&<div className="map-source-notice" role="alert"><span>{locationMessage}</span><button type="button" className="icon-button" aria-label="Đóng thông báo vị trí" onClick={()=>setLocationMessage('')}><X size={16}/></button></div>}
    {activeBase.startsWith('google-') && <div className="map-provider-credit map-google-credit"><img src="/google-maps-logo.svg" alt="Google Maps" height={18} /><span>{copyright}</span></div>}
    {(!ready || !rendered) && !error && <div className="map-loading" style={{ position: 'absolute', top: 16, left: 16, background: 'white', padding: '10px 14px', borderRadius: 8 }}>Đang mở bản đồ…</div>}
    {!noticeDismissed && (baseUnavailable || (referenceUnavailable && referencesVisible && activeBase === 'satellite')) && <div className="map-source-notice" role="status"><span>{baseUnavailable ? 'Chưa tải được bản đồ nền. Ranh giới và hồ sơ tại máy vẫn sử dụng được.' : 'Chưa tải được tên địa danh và đường. Ảnh vệ tinh và hồ sơ vẫn sử dụng được.'}</span><button type="button" className="icon-button" aria-label="Đóng thông báo bản đồ" onClick={() => setNoticeDismissed(true)}><X size={16} /></button></div>}
    {error && !noticeDismissed && <div role="alert" style={{ position: 'absolute', top: 16, left: 16, right: 60, background: '#fff7ed', color: '#9a3412', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}><span>{error}</span><button type="button" className="icon-button" aria-label="Đóng cảnh báo bản đồ" onClick={() => setNoticeDismissed(true)}><X size={16} /></button></div>}
  </div>;
}
