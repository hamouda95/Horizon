import {appCurrency} from '../../lib/currency';
import {useMemo,useState} from 'react';
import type {Entry} from '../../hooks/household-data';
import {displayText} from '../../lib/text';
import {appLocale} from '../../lib/locale';
import {rankLinkCandidates} from './link-candidates';

const money=(n:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:appCurrency()}).format(n/100);

/** Picks an existing operation to attach to a loan: searchable, with the person's operations and similar amounts first. */
export default function OperationPicker({entries,kind,borrower,targetCents,value,onChange,label}:{entries:Entry[];kind:'income'|'expense';borrower:string;targetCents:number;value:string;onChange:(id:string)=>void;label:string}){
 const [query,setQuery]=useState('');
 const {suggested,others}=useMemo(()=>rankLinkCandidates(entries,{kind,borrower,targetCents,query}),[entries,kind,borrower,targetCents,query]);
 const option=(e:Entry)=><option key={e.id} value={e.id}>{e.date} · {displayText(e.label)} · {money(e.amount)}</option>;
 return <>
  <label>Rechercher une opération<input type="search" value={query} placeholder="Nom, libellé, montant ou date" onChange={e=>setQuery(e.target.value)}/></label>
  <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>
   <option value="">{suggested.length||others.length?'Choisir':'Aucune opération trouvée'}</option>
   {suggested.length>0&&<optgroup label="Suggestions : même personne ou montant proche">{suggested.map(option)}</optgroup>}
   {others.length>0&&<optgroup label={`Autres opérations, plus récentes d’abord${others.length>300?' (300 premières, affinez la recherche)':''}`}>{others.slice(0,300).map(option)}</optgroup>}
  </select></label>
 </>;
}
