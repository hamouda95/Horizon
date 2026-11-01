import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {displayText} from '../lib/text';
import {translateDisplayed} from '../lib/dom-translation';
import {pickerOptions,searchOptions,optionText,type PickerCategory,type PickerSubcategory,type PickerOption} from './category-search';

type Value={categoryId:string|null;subcategoryId:string|null};
const shown=(o:Pick<PickerOption,'category'|'sub'>)=>translateDisplayed(o.sub?`${displayText(o.category)} › ${displayText(o.sub)}`:displayText(o.category));

/** Searchable choice of a category or one of its subcategories, typed in a single field. */
export default function CategoryPicker({label,categories,subcategories,value,onChange,required,disabled,allowSubcategories=true,placeholder='Rechercher une catégorie'}:{label:string;categories:PickerCategory[];subcategories:PickerSubcategory[];value:Value;onChange:(value:Value&{category:string})=>void;required?:boolean;disabled?:boolean;allowSubcategories?:boolean;placeholder?:string}){
 const all=useMemo(()=>pickerOptions(categories,allowSubcategories?subcategories:[],value),[categories,subcategories,allowSubcategories,value]);
 const current=all.find(o=>o.categoryId===value.categoryId&&o.subcategoryId===(value.subcategoryId||null));
 const [text,setText]=useState(''),[open,setOpen]=useState(false),[cursor,setCursor]=useState(0),id=useId(),list=useRef<HTMLUListElement>(null),input=useRef<HTMLInputElement>(null);
 const results=useMemo(()=>searchOptions(all,open?text:'').slice(0,80),[all,text,open]);
 useEffect(()=>{setCursor(0)},[text,open]);
 useEffect(()=>{list.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({block:'nearest'})},[cursor]);
 function pick(o:PickerOption){onChange({categoryId:o.categoryId,subcategoryId:o.subcategoryId,category:o.category});setText('');setOpen(false)}
 function key(e:React.KeyboardEvent){
  if(e.key==='ArrowDown'){e.preventDefault();if(!open)setOpen(true);else setCursor(c=>Math.min(c+1,results.length-1))}
  else if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>Math.max(c-1,0))}
  else if(e.key==='Enter'&&open){e.preventDefault();if(results[cursor])pick(results[cursor])}
  else if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);setText('')}
 }
 return <div className="category-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node)){setOpen(false);setText('')}}}>
  <label htmlFor={id+'-input'}>{label}</label>
  <div className="category-picker-field">
   <input ref={input} id={id+'-input'} role="combobox" aria-expanded={open} aria-controls={id+'-list'} aria-autocomplete="list" aria-activedescendant={open&&results[cursor]?`${id}-${cursor}`:undefined} autoComplete="off" disabled={disabled}
    required={required&&!current} placeholder={current?shown(current):translateDisplayed(placeholder)} value={open?text:current?shown(current):''}
    onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onChange={e=>{setText(e.target.value);setOpen(true)}} onKeyDown={key}/>
   <button type="button" tabIndex={-1} aria-hidden="true" disabled={disabled} onMouseDown={e=>{e.preventDefault();setOpen(v=>!v);input.current?.focus()}}><ChevronDown size={15}/></button>
  </div>
  {open&&<ul className="category-picker-list" id={id+'-list'} role="listbox" ref={list}>
   {results.length===0?<li className="category-picker-empty">Aucune catégorie ne correspond.</li>:results.map((o,i)=><li key={o.categoryId+(o.subcategoryId||'')} id={`${id}-${i}`} data-index={i} role="option" aria-selected={i===cursor}
    className={(o.sub?'is-sub':'is-category')+(i===cursor?' is-active':'')+(o===current?' is-current':'')} onMouseDown={e=>{e.preventDefault();pick(o)}} onMouseEnter={()=>setCursor(i)}>
    {o.sub?<><span>{displayText(o.sub)}</span><small>{displayText(o.category)}</small></>:<b>{displayText(o.category)}</b>}
   </li>)}
  </ul>}
 </div>;
}
