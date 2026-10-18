'use client';
import {useCallback,useEffect,useState} from 'react';
import {DRAFT_TTL,draftValid,freshDraft,takeMemoryDraft,type Draft} from './draft-lifecycle';
const drafts=new Map<string,Draft>();
export function useRecordDraft(name:string,defaults:Record<string,string>){
 const [draft,setDraft]=useState<Draft>(()=>takeMemoryDraft(drafts,name,defaults));
 const [restored,setRestored]=useState(false);const [readyName,setReadyName]=useState<string|null>(null);const ready=readyName===name;
 useEffect(()=>{let active=true;let recovered:Draft|undefined;
 try{const raw=sessionStorage.getItem(`qlxd-draft:${name}`);if(raw&&!drafts.has(name)){const parsed:unknown=JSON.parse(raw);if(draftValid(parsed)&&parsed.persist)recovered=parsed;else sessionStorage.removeItem(`qlxd-draft:${name}`);}}catch{/* Storage may be blocked; in-session draft remains available. */}
 // Hydrate before syncing a map selection or writing device storage. Otherwise
 // initial props can overwrite an edited draft while its recovery is queued.
 queueMicrotask(()=>{if(!active)return;if(recovered){setDraft(recovered);setRestored(true);}setReadyName(name);});return()=>{active=false;};},[name]);
 useEffect(()=>{if(!ready)return;drafts.set(name,draft);try{if(draft.persist)sessionStorage.setItem(`qlxd-draft:${name}`,JSON.stringify(draft));else sessionStorage.removeItem(`qlxd-draft:${name}`);}catch{/* Keep memory draft if device storage is unavailable. */}
 // Every draft expires, including memory-only drafts. Closing an unmounted form
 // stops its timer; takeMemoryDraft checks the same deadline when it reopens.
 const timer=setTimeout(()=>{drafts.delete(name);try{sessionStorage.removeItem(`qlxd-draft:${name}`);}catch{/* Device storage is optional. */}setDraft(current=>current.key===draft.key?freshDraft(defaults,Date.now(),true):current);setRestored(false);},Math.max(0,draft.expires-Date.now()));return()=>clearTimeout(timer);},[name,draft,defaults,ready]);
 const update=useCallback((values:Record<string,string>)=>setDraft(d=>({...d,values:{...d.values,...values},key:crypto.randomUUID(),expires:Date.now()+DRAFT_TTL})),[]);
 const setStep=(step:number)=>setDraft(d=>({...d,step}));
 const setPersist=(persist:boolean)=>setDraft(d=>({...d,persist,expires:Date.now()+DRAFT_TTL}));
 const clear=()=>{drafts.delete(name);try{sessionStorage.removeItem(`qlxd-draft:${name}`);}catch{/* The draft still clears in memory. */}setDraft(freshDraft(defaults,Date.now(),true));setRestored(false);};
 return{draft,update,setStep,setPersist,clear,restored,ready};
}
export function clearAdminDrafts(){for(const name of ['admin-permit','admin-report']){drafts.delete(name);try{sessionStorage.removeItem(`qlxd-draft:${name}`);}catch{/* Clear memory even when storage is blocked. */}}}
