'use client';
import RecordWizard from './RecordWizard';
import type {RecordMeasurement,Position} from '@/lib/types';
type Props={open:boolean;position:Position|null;measurement?:RecordMeasurement|null;selectionKey?:string;initialCommune:string;onClose:()=>void;onChooseMap:()=>void;onSubmitted:(code:string)=>void};
export default function PublicReportForm(props:Props){return <RecordWizard {...props} kind="report" publicMode onSaved={record=>props.onSubmitted((record as {publicCode:string}).publicCode)}/>;}
