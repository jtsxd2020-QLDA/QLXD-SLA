'use client';
import RecordWizard from './RecordWizard';
import type {RecordMeasurement,Position} from '@/lib/types';
export type PublicReportReceipt={publicCode:string;receivedAt:string;communeCode:string;communeName:string};
type Props={open:boolean;position:Position|null;measurement?:RecordMeasurement|null;selectionKey?:string;initialCommune:string;onClose:()=>void;onChooseMap:()=>void;onSubmitted:(receipt:PublicReportReceipt)=>void|Promise<void>};
export default function PublicReportForm(props:Props){return <RecordWizard {...props} kind="report" publicMode onSaved={record=>{const receipt=record as PublicReportReceipt;void props.onSubmitted(receipt);}}/>;}
