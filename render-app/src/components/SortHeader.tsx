import {ArrowDown,ArrowUp,ChevronsUpDown} from 'lucide-react';
import {appLocale} from '../lib/locale';

// Column sorting shared by the app's tables: click a header to sort, click again to reverse.
export type SortDirection='asc'|'desc';
export type SortState<K extends string>={key:K;dir:SortDirection};

/** Same column: reverse. Other column: its natural first direction (dates and amounts start with the largest). */
export function nextSort<K extends string>(current:SortState<K>,key:K,firstDir:SortDirection='asc'):SortState<K>{
 return current.key===key?{key,dir:current.dir==='asc'?'desc':'asc'}:{key,dir:firstDir};
}

export type SortValue=string|number|null|undefined;
/** Numbers by value, text in the reader's alphabetical order; empty values always last. */
export function compareSortValues(a:SortValue,b:SortValue,dir:SortDirection){
 const emptyA=a===null||a===undefined||a==='',emptyB=b===null||b===undefined||b==='';
 if(emptyA||emptyB)return emptyA===emptyB?0:emptyA?1:-1;
 const order=typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),appLocale(),{sensitivity:'base',numeric:true});
 return dir==='asc'?order:-order;
}
export function sortRows<T,K extends string>(rows:T[],sort:SortState<K>,value:(row:T,key:K)=>SortValue,tieBreak?:(a:T,b:T)=>number):T[]{
 return [...rows].sort((a,b)=>compareSortValues(value(a,sort.key),value(b,sort.key),sort.dir)||(tieBreak?.(a,b)??0));
}

export const ariaSort=<K extends string>(sort:SortState<K>,key:K)=>sort.key===key?(sort.dir==='asc'?'ascending' as const:'descending' as const):'none' as const;

/** The clickable label of a column header; the cell around it carries aria-sort. */
export function SortButton<K extends string>({label,column,sort,onSort,firstDir='asc'}:{label:string;column:K;sort:SortState<K>;onSort:(next:SortState<K>)=>void;firstDir?:SortDirection}){
 const active=sort.key===column;
 return <button type="button" className={'sort-button'+(active?' is-active':'')} onClick={()=>onSort(nextSort(sort,column,firstDir))}>
  <span>{label}</span>{active?(sort.dir==='asc'?<ArrowUp size={12} aria-hidden/>:<ArrowDown size={12} aria-hidden/>):<ChevronsUpDown size={12} className="sort-idle" aria-hidden/>}
 </button>;
}
