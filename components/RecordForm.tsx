'use client';
import RecordWizard from './RecordWizard';
import type {RecordMeasurement,Position,Permit,CitizenReport} from '@/lib/types';
type Props={draftNamespace?:string;allowedCommuneCode?:string;kind:'permit'|'report';csrfToken:string;position:Position|null;measurement?:RecordMeasurement|null;selectionKey?:string;initialCommune:string;onClose:()=>void;onChooseMap:()=>void;onSaved:(record:Permit|CitizenReport)=>void;hidden:boolean};
export default function RecordForm(props:Props){return <RecordWizard {...props} open={!props.hidden} onSaved={record=>props.onSaved(record as Permit|CitizenReport)}/>;}
