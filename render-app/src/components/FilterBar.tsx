import {useEffect,useId,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {Search,SlidersHorizontal,X} from 'lucide-react';
import {displayText} from '../lib/text';

export type FilterOption={value:string;label:string;group?:string};
export type FilterField={key:string;label:string;type:'select'|'date'|'amount';options?:FilterOption[];placeholder?:string;hidden?:boolean;
 /** Value meaning "no filter" (an empty string by default): it gives no chip and is restored by "Effacer". */
 neutral?:string};

/** One search field, a "Filtres" button and the active filters as removable chips; the fields open in a compact panel. */
export default function FilterBar({query,onQuery,placeholder,fields,values,onChange,onReset,count,extra}:{query:string;onQuery:(value:string)=>void;placeholder:string;fields:FilterField[];values:Record<string,string>;onChange:(key:string,value:string)=>void;onReset:()=>void;count?:number;extra?:ReactNode}){
 const [open,setOpen]=useState(false),panel=useRef<HTMLDivElement>(null),id=useId();
 const shown=fields.filter(f=>!f.hidden),neutral=(f:FilterField)=>f.neutral??'';
 const active=shown.filter(f=>(values[f.key]??'')!==neutral(f));
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[open]);
 const label=(f:FilterField)=>{const v=values[f.key]??'';if(f.type==='select')return f.options?.find(o=>o.value===v)?.label??v;if(f.type==='amount')return `${v} €`;return v};
 return <div className="filter-bar">
  <div className="filter-bar-row">
   <label className="filter-search"><Search size={15} aria-hidden="true"/><span className="sr-only">{displayText(placeholder)}</span><input type="search" placeholder={displayText(placeholder)} value={query} onChange={e=>onQuery(e.target.value)}/>{query&&<button type="button" className="filter-clear" aria-label="Effacer la recherche" onClick={()=>onQuery('')}><X size={14}/></button>}</label>
   <button type="button" className={'filter-toggle'+(active.length?' has-active':'')} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><SlidersHorizontal size={15} aria-hidden="true"/><span>Filtres</span>{active.length>0&&<b>{active.length}</b>}</button>
   {extra}
   {count!==undefined&&<span className="filter-count">{count}</span>}
  </div>
  {open&&<div className="filter-panel" id={id} ref={panel} role="group" aria-label="Filtres">
   {shown.map(f=><label key={f.key} className={'filter-field filter-'+f.type}><span>{displayText(f.label)}</span>
    {f.type==='select'?<select value={values[f.key]??''} onChange={e=>onChange(f.key,e.target.value)}>{groupOptions(f.options||[])}</select>
    :<input type={f.type==='date'?'date':'text'} inputMode={f.type==='amount'?'decimal':undefined} placeholder={f.placeholder?displayText(f.placeholder):undefined} value={values[f.key]??''} onChange={e=>onChange(f.key,e.target.value)}/>}
   </label>)}
   <div className="filter-panel-actions"><button type="button" className="textbtn" disabled={!active.length} onClick={onReset}>Effacer les filtres</button><button type="button" className="secondary" onClick={()=>setOpen(false)}>Fermer</button></div>
  </div>}
  {active.length>0&&<div className="filter-chips">{active.map(f=><button type="button" key={f.key} className="filter-chip" aria-label={displayText(`Retirer le filtre ${f.label}`)} onClick={()=>onChange(f.key,neutral(f))}><small>{displayText(f.label)}</small> {displayText(label(f))} <X size={12} aria-hidden="true"/></button>)}</div>}
 </div>;
}

function groupOptions(options:FilterOption[]){
 const out:ReactNode[]=[],groups=new Map<string,FilterOption[]>();
 for(const o of options){if(!o.group){out.push(<option key={o.value} value={o.value}>{displayText(o.label)}</option>);continue}
  if(!groups.has(o.group)){groups.set(o.group,[]);out.push(o.group)}groups.get(o.group)!.push(o)}
 return out.map(item=>typeof item==='string'?<optgroup key={'g'+item} label={displayText(item)}>{groups.get(item)!.map(o=><option key={o.value} value={o.value}>{displayText(o.label)}</option>)}</optgroup>:item);
}
