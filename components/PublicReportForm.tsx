'use client';
import RecordWizard from './RecordWizard';
import type {Position} from '@/lib/types';
type Props={open:boolean;position:Position|null;initialCommune:string;onClose:()=>void;onChooseMap:()=>void;onSubmitted:(code:string)=>void};
export default function PublicReportForm(props:Props){return <RecordWizard {...props} kind="report" publicMode onSaved={record=>props.onSubmitted((record as {publicCode:string}).publicCode)}/>;}
