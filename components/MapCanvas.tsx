'use client';
import { useEffect, useRef, useState } from 'react';
import { Layers3, X, LocateFixed, Maximize2, Minimize2, MapPin, MousePointer2, Ruler, Pentagon, Check, Trash2 } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import type { Map as LibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import { getCommuneBounds, setDisplayBoundaries, resolveCommune } from '@/lib/geo';
import type { BoundaryCollection } from '@/lib/geometry';
import communes from '@/lib/communes.json';
import type { MapRecord, Position } from '@/lib/types';
import { formatArea, formatDistance, measureLineMeters, measurePolygonAreaSquareMeters } from '@/lib/map-measurement';
import { BASEMAPS, GOOGLE_MAPS_KEY, GOOGLE_HYBRID_SOURCE, REFERENCE_SOURCES, googleCopyright, resolveBasemap, type BasemapId } from '@/lib/basemaps';

type MeasurementType = 'line' | 'area';
type WorkflowAction = 'report' | 'inspect' | 'permit';
type Props = {
  records: MapRecord[]; selectedCommune: string; onPick: (point: Position) => void;
  onSelect: (record: MapRecord) => void; picked: Position | null; selectedRecordId?: string; onCommuneNavigate?: (code:string)=>void;
  workflowRole?: 'citizen' | 'admin'; selectionOnly?: boolean;
  onWorkflowAction?: (action: WorkflowAction, point: Position) => void;
};

export default function MapCanvas({ records, selectedCommune, onPick, onSelect, picked, selectedRecordId, onCommuneNavigate, workflowRole, selectionOnly = false, onWorkflowAction }: Props) {
  const [candidate,setCandidate]=useState<{position:Position;accuracy?:number}|null>(null);
  const [locating,setLocating]=useState(false);
  const [locationMessage,setLocationMessage]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [positionToolsOpen,setPositionToolsOpen]=useState(false);
  const [gesturePosition,setGesturePosition]=useState<Position|null>(null);
  const [measureMode,setMeasureMode]=useState<MeasurementType|null>(null);
  const [measurementType,setMeasurementType]=useState<MeasurementType|null>(null);
  const [measurePoints,setMeasurePoints]=useState<Position[]>([]);
  const [measurementFinished,setMeasurementFinished]=useState(false);
  const [workflowPosition,setWorkflowPosition]=useState<Position|null>(null);
  const gpsRequest=useRef(0);
  const ignoreMapClick=useRef<{x:number;y:number;expiresAt:number}|null>(null);
  const workflowState=useRef({selectionOnly,measureMode});
  const longPressHandlers=useRef({open:(point:Position)=>setGesturePosition(point)});
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const handlers = useRef({ onPick, onSelect, onWorkflowAction });
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
  const [expresswayVisible, setExpresswayVisible] = useState(false);
  const [expresswayLoaded, setExpresswayLoaded] = useState(false);
  const [expresswayCount, setExpresswayCount] = useState(0);
  const [expresswayMessage, setExpresswayMessage] = useState('');
  const expresswayLoading = expresswayVisible && !expresswayLoaded && !expresswayMessage;
  const expresswayLayerAdded = useRef(false);
  useEffect(()=>()=>{gpsRequest.current++;},[]);
  useEffect(()=>{if(!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[expanded]);
  useEffect(()=>{workflowState.current={selectionOnly,measureMode};},[selectionOnly,measureMode]);
  useEffect(()=>{handlers.current={onPick,onSelect,onWorkflowAction};},[onPick,onSelect,onWorkflowAction]);
  useEffect(()=>{longPressHandlers.current={open:(point)=>{if(workflowState.current.selectionOnly||workflowState.current.measureMode)return;clearMeasurement();setCandidate(null);setWorkflowPosition(null);setGesturePosition(point);setPositionToolsOpen(false);setToolsOpen(false);}};},[]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;const stop=()=>{event.preventDefault();event.stopImmediatePropagation();};if(workflowPosition){stop();setWorkflowPosition(null);return;}if(gesturePosition){stop();setGesturePosition(null);return;}if(measureMode||measurementFinished){stop();setMeasureMode(null);setMeasurementType(null);setMeasurePoints([]);setMeasurementFinished(false);return;}if(candidate||expanded||positionToolsOpen){stop();gpsRequest.current++;setLocating(false);setCandidate(null);setExpanded(false);setPositionToolsOpen(false);setLocationMessage('');}};window.addEventListener('keydown',close,true);return()=>window.removeEventListener('keydown',close,true);},[candidate,expanded,positionToolsOpen,gesturePosition,measureMode,measurementFinished,workflowPosition]);
  function locate(){
    if(!navigator.geolocation){setLocationMessage('Thiết bị chưa hỗ trợ định vị. Hãy chọn điểm trên bản đồ.');return;}
    const request=++gpsRequest.current;setLocating(true);setLocationMessage('');
    navigator.geolocation.getCurrentPosition(result=>{if(request!==gpsRequest.current)return;setLocating(false);const position={lat:result.coords.latitude,lng:result.coords.longitude};setCandidate({position,accuracy:result.coords.accuracy});map.current?.flyTo({center:[position.lng,position.lat],zoom:15});},error=>{if(request!==gpsRequest.current)return;setLocating(false);setLocationMessage(error.code===1?'Bạn chưa cho phép định vị. Có thể chọn vị trí bằng tay.':error.code===3?'Định vị mất quá nhiều thời gian. Hãy thử lại hoặc chọn điểm.':'Chưa xác định được vị trí thiết bị. Hãy chọn điểm trên bản đồ.');},{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  }
  function coordinate(event:React.FormEvent<HTMLFormElement>){event.preventDefault();gpsRequest.current++;setLocating(false);const values=new FormData(event.currentTarget);const lat=Number(String(values.get('lat')).trim()),lng=Number(String(values.get('lng')).trim());if(!String(values.get('lat')).trim()||!String(values.get('lng')).trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){setLocationMessage('Tọa độ không hợp lệ. Vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180.');return;}setCandidate({position:{lat,lng}});setLocationMessage('');setPositionToolsOpen(false);map.current?.flyTo({center:[lng,lat],zoom:15});}
  const candidateCommune=candidate?resolveCommune(candidate.position):null;
  const measuredDistance=measureLineMeters(measurePoints);
  const measuredArea=measurePolygonAreaSquareMeters(measurePoints);
  function clearMeasurement(){setMeasureMode(null);setMeasurementType(null);setMeasurePoints([]);setMeasurementFinished(false);}
  function beginMeasurement(type:MeasurementType){
    if(!gesturePosition)return;
    setMeasurementType(type);setMeasurePoints([gesturePosition]);setMeasurementFinished(false);setMeasureMode(type);setGesturePosition(null);setWorkflowPosition(null);setCandidate(null);
  }
  function finishMeasurement(){
    if(!measureMode||measurePoints.length<(measureMode==='line'?2:3))return;
    const point=measurePoints[0];setMeasureMode(null);setMeasurementFinished(true);setGesturePosition(null);setCandidate(null);
    if(!resolveCommune(point)){setWorkflowPosition(null);setLocationMessage('Điểm bắt đầu phép đo chưa thuộc một xã/phường của tỉnh Sơn La. Kết quả đo được giữ lại nhưng chưa thể lập hồ sơ tại đây.');return;}
    setLocationMessage('');setWorkflowPosition(point);handlers.current.onPick(point);
  }
  function confirmCandidate(){
    if(!candidate||!candidateCommune)return;
    const point=candidate.position;gpsRequest.current++;setLocating(false);setCandidate(null);setExpanded(false);clearMeasurement();handlers.current.onPick(point);
    if(workflowRole&&!workflowState.current.selectionOnly)setWorkflowPosition(point);
  }
  function chooseWorkflowAction(action:WorkflowAction){
    if(!workflowPosition)return;
    const point=workflowPosition;setWorkflowPosition(null);handlers.current.onWorkflowAction?.(action,point);
  }
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
    instance.doubleClickZoom.disable();
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
    instance.on('click', (event) => {
      const suppressedClick=ignoreMapClick.current;
      if(suppressedClick&&Date.now()<=suppressedClick.expiresAt&&Math.hypot(event.point.x-suppressedClick.x,event.point.y-suppressedClick.y)<36){ignoreMapClick.current=null;return;}
      if(suppressedClick&&Date.now()>suppressedClick.expiresAt)ignoreMapClick.current=null;
      gpsRequest.current++;setLocating(false);setLocationMessage('');
      const point={lat:event.lngLat.lat,lng:event.lngLat.lng};
      if(workflowState.current.selectionOnly){setGesturePosition(null);setWorkflowPosition(null);clearMeasurement();setCandidate({position:point});return;}
      if(workflowState.current.measureMode){setMeasurePoints((previous)=>[...previous,point]);setMeasurementFinished(false);setWorkflowPosition(null);return;}
      setGesturePosition(null);setWorkflowPosition(null);clearMeasurement();setCandidate({position:point});
    });
    instance.on('dblclick', (event) => {
      event.preventDefault();
      if(workflowState.current.selectionOnly||workflowState.current.measureMode)return;
      longPressHandlers.current.open({lat:event.lngLat.lat,lng:event.lngLat.lng});
    });
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
        instance.addSource('measurement', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        instance.addLayer({ id: 'measurement-fill', type: 'fill', source: 'measurement', paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.2 } });
        instance.addLayer({ id: 'measurement-line', type: 'line', source: 'measurement', paint: { 'line-color': '#b45309', 'line-width': 3, 'line-dasharray': [1.2, 1.2] } });
        instance.addLayer({ id: 'measurement-points', type: 'circle', source: 'measurement', paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#b45309', 'circle-stroke-width': 2 } });
        instance.fitBounds([[103.21, 20.54], [105.08, 22.04]], { padding: 36, duration: 0 });
        setReady(true);
      } catch (reason) {
        if (alive) setError(reason instanceof Error ? reason.message : 'Không tải được ranh giới.');
      }
    });
    return () => { alive = false; controller.abort(); resizeObserver.disconnect(); markers.current.forEach((marker) => marker.remove()); pickMarker.current?.remove(); instance.remove(); map.current = null; };
  }, []);

  useEffect(()=>{
    const element=container.current;if(!element)return;
    let timer:ReturnType<typeof setTimeout>|undefined;let start:{x:number;y:number;pointerId:number;at:number}|null=null;
    let lastTap:{x:number;y:number;at:number}|null=null;
    const clear=()=>{if(timer)clearTimeout(timer);timer=undefined;start=null;};
    const openAt=(clientX:number,clientY:number)=>{const rect=element.getBoundingClientRect();const x=clientX-rect.left,y=clientY-rect.top;const point=map.current?.unproject([x,y]);if(!point)return;ignoreMapClick.current={x,y,expiresAt:Date.now()+900};longPressHandlers.current.open({lat:point.lat,lng:point.lng});};
    const down=(event:PointerEvent)=>{
      if(workflowState.current.selectionOnly||workflowState.current.measureMode||event.button>0||!(event.pointerType==='touch'||event.pointerType==='pen'||event.pointerType==='mouse'))return;
      const target=event.target as Element|null;
      if(target?.closest('.maplibregl-ctrl,.map-tools,.map-quick-controls,.map-position-tools,.map-candidate-card,.map-action-panel,.map-measurement-card,.map-record-marker'))return;
      const now=performance.now();
      if(lastTap&&now-lastTap.at<=500&&Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<=40){
        clear();lastTap=null;event.preventDefault();event.stopImmediatePropagation();openAt(event.clientX,event.clientY);return;
      }
      if(lastTap&&now-lastTap.at>500)lastTap=null;
      clear();start={x:event.clientX,y:event.clientY,pointerId:event.pointerId,at:now};
      const x=event.clientX,y=event.clientY;
      timer=setTimeout(()=>{if(!start)return;start=null;timer=undefined;lastTap=null;openAt(x,y);},600);
    };
    const move=(event:PointerEvent)=>{if(start&&event.pointerId===start.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>12){clear();lastTap=null;}};
    const up=(event:PointerEvent)=>{if(start&&event.pointerId===start.pointerId){if(performance.now()-start.at<600)lastTap={x:event.clientX,y:event.clientY,at:performance.now()};clear();}};
    const cancel=()=>{clear();lastTap=null;};
    const context=(event:MouseEvent)=>{const ignored=ignoreMapClick.current;const rect=element.getBoundingClientRect();if(ignored&&Date.now()<=ignored.expiresAt&&Math.hypot(event.clientX-rect.left-ignored.x,event.clientY-rect.top-ignored.y)<36)event.preventDefault();};
    element.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);element.addEventListener('contextmenu',context);
    return()=>{clear();element.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);element.removeEventListener('contextmenu',context);};
  },[]);

  useEffect(()=>{
    const source=map.current?.getSource('measurement') as GeoJSONSource|undefined;
    if(!source)return;
    const features:GeoJSON.Feature[]=[];
    if(measurePoints.length===1)features.push({type:'Feature',properties:{kind:'point'},geometry:{type:'Point',coordinates:[measurePoints[0].lng,measurePoints[0].lat]}});
    if(measurePoints.length>=2&&(measurementType==='line'||measurePoints.length<3))features.push({type:'Feature',properties:{kind:'line'},geometry:{type:'LineString',coordinates:measurePoints.map(point=>[point.lng,point.lat])}});
    if(measurementType==='area'&&measurePoints.length>=3){const ring=measurePoints.map(point=>[point.lng,point.lat]);ring.push(ring[0]);features.push({type:'Feature',properties:{kind:'area'},geometry:{type:'Polygon',coordinates:[ring]}});}
    source.setData({type:'FeatureCollection',features});
  },[measurePoints,measurementType,ready]);

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
    const layerIds = ['expressway-casing', 'expressway-lines', 'expressway-gpmb', 'expressway-chainage-points', 'expressway-chainage-labels'];
    if (expresswayLayerAdded.current) {
      for (const id of layerIds) instance.setLayoutProperty(id, 'visibility', expresswayVisible ? 'visible' : 'none');
      return;
    }
    if (!expresswayVisible) return;
    const controller = new AbortController();
    let alive = true;
    void fetch('/data/tuyen-cao-toc-12.geojson', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được dữ liệu tuyến cao tốc từ KMZ 12.');
        return await response.json() as GeoJSON.FeatureCollection;
      })
      .then((data) => {
        if (!alive) return;
        instance.addSource('expressway-route', { type: 'geojson', data });
        const allLines: maplibregl.FilterSpecification = ['==', ['get', 'featureType'], 'line'];
        const lineFilter: maplibregl.FilterSpecification = ['all', allLines, ['!=', ['get', 'description'], 'Ranh GPMB']];
        const gpmbFilter: maplibregl.FilterSpecification = ['all', allLines, ['==', ['get', 'description'], 'Ranh GPMB']];
        const pointFilter: maplibregl.FilterSpecification = ['==', ['get', 'featureType'], 'point'];
        instance.addLayer({
          id: 'expressway-casing', type: 'line', source: 'expressway-route', filter: allLines,
          layout: { visibility: 'visible', 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#172554', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.2, 13, 6], 'line-opacity': 0.9 },
        }, 'selection-fill');
        instance.addLayer({
          id: 'expressway-lines', type: 'line', source: 'expressway-route', filter: lineFilter,
          layout: { visibility: 'visible', 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['match', ['get', 'description'], 'C-ROAD', '#fb923c', '#fef08a'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.1, 13, 3.2],
            'line-opacity': 0.95,
          },
        }, 'selection-fill');
        instance.addLayer({
          id: 'expressway-gpmb', type: 'line', source: 'expressway-route', filter: gpmbFilter,
          layout: { visibility: 'visible', 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#c084fc', 'line-width': 2.4, 'line-opacity': 0.95, 'line-dasharray': [2, 1.5] },
        }, 'selection-fill');
        instance.addLayer({
          id: 'expressway-chainage-points', type: 'circle', source: 'expressway-route', filter: pointFilter,
          minzoom: 9, layout: { visibility: 'visible' },
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 15, 5], 'circle-color': '#fff', 'circle-stroke-color': '#7c3aed', 'circle-stroke-width': 1.5 },
        }, 'selection-fill');
        instance.addLayer({
          id: 'expressway-chainage-labels', type: 'symbol', source: 'expressway-route', filter: pointFilter,
          minzoom: 11, layout: { visibility: 'visible', 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.15], 'text-anchor': 'top', 'text-optional': true, 'text-allow-overlap': false },
          paint: { 'text-color': '#fff', 'text-halo-color': '#172554', 'text-halo-width': 2 },
        }, 'selection-fill');
        expresswayLayerAdded.current = true;
        setExpresswayLoaded(true);
        setExpresswayCount(data.features.length);
        setExpresswayMessage(`Đã nạp ${data.features.length.toLocaleString('vi-VN')} đối tượng từ KMZ 12. Tọa độ và ranh GPMB cần đối chiếu hồ sơ trước khi sử dụng pháp lý.`);
      })
      .catch((reason: unknown) => {
        if (alive && !controller.signal.aborted) setExpresswayMessage(reason instanceof Error ? reason.message : 'Không tải được dữ liệu tuyến.');
      });
    return () => { alive = false; controller.abort(); };
  }, [expresswayVisible, ready]);

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
    <div ref={container} data-testid="map-canvas" data-basemap={activeBase} data-basemap-loaded={baseLoaded ? 'true' : 'false'} data-reference-visible={referencesVisible && activeBase === 'satellite' ? 'true' : 'false'} data-reference-loaded={referencesLoaded ? 'true' : 'false'} data-boundaries-visible={boundariesVisible ? 'true' : 'false'} data-boundaries-rendered={rendered ? 'true' : 'false'} data-expressway-visible={expresswayVisible ? 'true' : 'false'} data-expressway-loaded={expresswayLoaded ? 'true' : 'false'} data-expressway-count={expresswayCount} role="region" aria-label="Bản đồ trật tự xây dựng tỉnh Sơn La" style={{ position: 'absolute', inset: 0 }} />
    <div ref={tools} className="map-tools" aria-label="Công cụ bản đồ">
      <button ref={toolsToggle} type="button" className="map-tools-toggle" aria-expanded={toolsOpen} aria-controls="map-layers-panel" onClick={() => setToolsOpen((open) => !open)}><Layers3 size={17} />Lớp bản đồ</button>
      <div id="map-layers-panel" className="map-tools-popover" hidden={!toolsOpen}>
      <header className="map-tools-header"><strong>Lớp bản đồ</strong><button type="button" className="icon-button" aria-label="Đóng lớp bản đồ" onClick={() => { setToolsOpen(false); toolsToggle.current?.focus(); }}><X size={16} /></button></header>
      <label className="map-base-select">Bản đồ nền<select aria-label="Bản đồ nền" value={basemap} disabled={!ready || switchingBase} onChange={(event) => { const id = event.target.value as BasemapId; setBaseMessage(''); setNoticeDismissed(false); setBasemap(id); if (id === basemap) setBaseAttempt((value) => value + 1); }}>
        {BASEMAPS.map((base) => <option key={base.id} value={base.id} disabled={Boolean(base.google && !GOOGLE_MAPS_KEY)}>{base.label}</option>)}
      </select></label>
      <label><input type="checkbox" checked={referencesVisible} disabled={!ready || activeBase !== 'satellite'} onChange={(event) => { setReferencesVisible(event.target.checked); setNoticeDismissed(false); }} />Tên địa danh và đường</label>
      <label><input type="checkbox" checked={boundariesVisible} disabled={!ready} onChange={(event) => setBoundariesVisible(event.target.checked)} />Ranh giới xã, phường</label>
      <label><input type="checkbox" checked={expresswayVisible} disabled={!ready} onChange={(event) => { setExpresswayMessage(''); setExpresswayVisible(event.target.checked); }} />{expresswayLoading ? 'Đang tải tuyến cao tốc…' : 'Tuyến cao tốc và mốc lý trình (KMZ 12)'}</label>
      {expresswayMessage && <p className="map-google-note" role={expresswayLoaded ? 'status' : 'alert'}>{expresswayMessage}</p>}
      <button type="button" className="button" disabled={!ready} onClick={() => map.current?.fitBounds([[103.21, 20.54], [105.08, 22.04]], { padding: 36, duration: 450 })}>Về toàn tỉnh</button>
      {!GOOGLE_MAPS_KEY && <p className="map-google-note">Nền Google Hybrid hiển thị sẵn tên đường và địa điểm.</p>}
      {(switchingBase || baseMessage) && <p className="map-google-note" role="status">{switchingBase ? 'Đang đổi bản đồ nền…' : baseMessage}</p>}
      </div>
    </div>
    <div className="map-quick-controls" aria-label="Chọn vị trí và màn hình"><button type="button" className="map-tools-toggle" disabled={!ready||locating} onClick={locate}><LocateFixed size={17}/>{locating?'Đang định vị…':'Vị trí của tôi'}</button><button type="button" className="map-tools-toggle" aria-label={expanded?'Thu nhỏ bản đồ':'Bản đồ toàn màn hình'} aria-pressed={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button><button type="button" className="map-tools-toggle" aria-expanded={positionToolsOpen} onClick={()=>setPositionToolsOpen(value=>!value)}><MapPin size={17}/>Tìm vị trí</button></div>
    {positionToolsOpen&&<section className="map-position-tools"><header className="map-panel-header"><strong>Tìm vị trí</strong><button className="icon-button" type="button" aria-label="Đóng tìm vị trí" onClick={()=>setPositionToolsOpen(false)}><X size={17}/></button></header><label>Tìm xã/phường<input list="map-commune-options" placeholder="Tên hoặc mã xã/phường" onChange={event=>{const value=event.target.value.trim().toLocaleLowerCase('vi');const commune=communes.find(c=>c.code===value||c.name.toLocaleLowerCase('vi')===value);if(commune){const bounds=getCommuneBounds(commune.code);if(bounds)map.current?.fitBounds(bounds,{padding:50});onCommuneNavigate?.(commune.code);setPositionToolsOpen(false);}}}/><datalist id="map-commune-options">{communes.map(c=><option key={c.code} value={c.name}>{c.code}</option>)}</datalist></label><form className="map-position-form" onSubmit={coordinate}><label>Vĩ độ<input name="lat" type="number" step="any" placeholder="21.3" required/></label><label>Kinh độ<input name="lng" type="number" step="any" placeholder="103.9" required/></label><button className="button secondary" type="submit">Đưa đến tọa độ</button></form></section>}
    {!selectionOnly&&gesturePosition&&<section className="map-action-panel" role="dialog" aria-label="Chọn thao tác tại điểm trên bản đồ"><header className="map-panel-header"><div><strong>Chọn thao tác</strong><small>{gesturePosition.lat.toFixed(6)}, {gesturePosition.lng.toFixed(6)}</small></div><button className="icon-button" type="button" aria-label="Đóng chọn thao tác" onClick={()=>setGesturePosition(null)}><X size={18}/></button></header><p>Chọn cách ghi nhận vị trí hoặc bắt đầu đo trên bản đồ.</p><div className="map-action-options"><button type="button" className="button primary" onClick={()=>{setCandidate({position:gesturePosition});setGesturePosition(null);}}><MousePointer2 size={17}/>Chọn điểm này</button><button type="button" className="button secondary" onClick={()=>beginMeasurement('line')}><Ruler size={17}/>Đo đoạn thẳng</button><button type="button" className="button secondary" onClick={()=>beginMeasurement('area')}><Pentagon size={17}/>Đo diện tích</button></div></section>}
    {!selectionOnly&&measureMode&&<section className="map-action-panel map-measure-panel" role="region" aria-label={measureMode==='line'?'Đo đoạn thẳng':'Đo diện tích'}><header className="map-panel-header"><div><strong>{measureMode==='line'?'Đang đo đoạn thẳng':'Đang vẽ diện tích'}</strong><small>Chạm/click các đỉnh tiếp theo trên bản đồ.</small></div><button className="icon-button" type="button" aria-label="Hủy đo" onClick={clearMeasurement}><X size={18}/></button></header><p>{measureMode==='line'?`Đã có ${measurePoints.length} điểm · ${formatDistance(measuredDistance)}`:`Đã có ${measurePoints.length} đỉnh${measurePoints.length>=3?` · khoảng ${formatArea(measuredArea)}`:''}`}</p><div className="map-action-options"><button type="button" className="button primary" disabled={measurePoints.length<(measureMode==='line'?2:3)} onClick={finishMeasurement}><Check size={17}/>{measureMode==='line'?'Kết thúc đo':'Hoàn tất diện tích'}</button><button type="button" className="button secondary" onClick={clearMeasurement}>Hủy phép đo</button></div></section>}
    {candidate&&<section className="map-candidate-card" role="status"><header className="map-panel-header"><strong>{candidateCommune?.name||'Điểm ngoài địa bàn hoặc sát ranh giới cần kiểm tra'}</strong><button className="icon-button" type="button" aria-label="Đóng điểm đang chọn" onClick={()=>setCandidate(null)}><X size={17}/></button></header><span>{candidate.position.lat.toFixed(6)}, {candidate.position.lng.toFixed(6)}</span>{candidate.accuracy!==undefined&&<small>Sai số vị trí thiết bị khoảng {Math.round(candidate.accuracy)} m. {candidate.accuracy>100?'Sai số lớn, hãy điều chỉnh ghim trước khi xác nhận.':'Hãy kiểm tra đây là vị trí công trình.'}</small>}<small>Kéo ghim để chỉnh điểm. Địa bàn gợi ý được máy chủ kiểm tra lại khi lưu.</small><div><button type="button" className="button primary" disabled={!candidateCommune} onClick={confirmCandidate}>Dùng điểm này</button><button type="button" className="button secondary" onClick={()=>{gpsRequest.current++;setLocating(false);setCandidate(null);}}>Hủy chọn điểm</button></div></section>}
    {!selectionOnly&&workflowPosition&&workflowRole&&<section className="map-action-panel map-workflow-panel" role="region" aria-label="Chọn nghiệp vụ tại vị trí đã chọn"><header className="map-panel-header"><div><strong>Điểm đã xác nhận</strong><small>{resolveCommune(workflowPosition)?.name||'Kiểm tra lại xã/phường'}</small></div><button className="icon-button" type="button" aria-label="Đóng lựa chọn nghiệp vụ" onClick={()=>setWorkflowPosition(null)}><X size={18}/></button></header><p>{workflowPosition.lat.toFixed(6)}, {workflowPosition.lng.toFixed(6)}{measurementFinished?measurementType==='line'?` · Đoạn thẳng ${formatDistance(measuredDistance)}`:` · Diện tích khoảng ${formatArea(measuredArea)}`:''}</p><div className="map-action-options">{workflowRole==='citizen'?<button type="button" className="button primary" onClick={()=>chooseWorkflowAction('report')}><MapPin size={17}/>Gửi phản ánh tại đây</button>:<><button type="button" className="button secondary" onClick={()=>chooseWorkflowAction('inspect')}><Check size={17}/>Ghi nhận kiểm tra</button><button type="button" className="button primary" onClick={()=>chooseWorkflowAction('permit')}><MapPin size={17}/>Nhập GPXD tại đây</button></>}</div><small className="map-panel-note">Hồ sơ gắn tại điểm bắt đầu thao tác. Đường đo và diện tích là số liệu tham khảo trên bản đồ.</small></section>}
    {!selectionOnly&&measurementFinished&&measurementType&&<section className="map-measurement-card" role="status"><button className="icon-button" type="button" aria-label="Xóa kết quả đo" title="Xóa kết quả đo" onClick={clearMeasurement}><Trash2 size={16}/></button><strong>{measurementType==='line'?`Độ dài: ${formatDistance(measuredDistance)}`:`Diện tích ước tính: ${formatArea(measuredArea)}`}</strong><small>Phép đo tham khảo, chưa lưu vào hồ sơ.</small></section>}
    {locationMessage&&<div className="map-source-notice" role="alert"><span>{locationMessage}</span><button type="button" className="icon-button" aria-label="Đóng thông báo vị trí" onClick={()=>setLocationMessage('')}><X size={16}/></button></div>}
    {activeBase.startsWith('google-') && <div className="map-provider-credit map-google-credit"><img src="/google-maps-logo.svg" alt="Google Maps" height={18} /><span>{copyright}</span></div>}
    {(!ready || !rendered) && !error && <div className="map-loading" style={{ position: 'absolute', top: 16, left: 16, background: 'white', padding: '10px 14px', borderRadius: 8 }}>Đang mở bản đồ…</div>}
    {!noticeDismissed && (baseUnavailable || (referenceUnavailable && referencesVisible && activeBase === 'satellite')) && <div className="map-source-notice" role="status"><span>{baseUnavailable ? 'Chưa tải được bản đồ nền. Ranh giới và hồ sơ tại máy vẫn sử dụng được.' : 'Chưa tải được tên địa danh và đường. Ảnh vệ tinh và hồ sơ vẫn sử dụng được.'}</span><button type="button" className="icon-button" aria-label="Đóng thông báo bản đồ" onClick={() => setNoticeDismissed(true)}><X size={16} /></button></div>}
    {error && !noticeDismissed && <div role="alert" style={{ position: 'absolute', top: 16, left: 16, right: 60, background: '#fff7ed', color: '#9a3412', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}><span>{error}</span><button type="button" className="icon-button" aria-label="Đóng cảnh báo bản đồ" onClick={() => setNoticeDismissed(true)}><X size={16} /></button></div>}
  </div>;
}
