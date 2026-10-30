import {useMemo,useState} from 'react';
import type {Entry} from './household-data';
import {keywordCategory,confirmedCounterpartyFlow} from './bank-classification';
import {createHouseholdClassifier} from './local-classifier';
import {matchMerchantRule,type MerchantKnowledgeRule} from './merchant-knowledge';
import {supabase} from './client';
type Category={id:string;name:string;kind:string;active:boolean};
export default function ClassificationReview({entries,categories,rules,householdId,onChanged}:{entries:Entry[];categories:Category[];rules:MerchantKnowledgeRule[];householdId:string;onChanged:()=>Promise<void>}){
 const [selected,setSelected]=useState(new Set<string>()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const suggestions=useMemo(()=>{
  const classifier=createHouseholdClassifier(categories,entries,rules);
  return entries.flatMap(entry=>{
   if(!['standard','review'].includes(entry.flowType))return [];
   const rule=matchMerchantRule(entry.label,entry.kind,rules);
   const categoryId=rule?.category_id||keywordCategory(entry.label,entry.kind,categories)||classifier(entry.label,entry.kind)?.categoryId;
   const flowType=confirmedCounterpartyFlow(entry.label,entry.kind,rules)||entry.flowType;
   if(!categoryId||!categories.some(c=>c.id===categoryId&&c.active&&c.kind===entry.kind)||(categoryId===entry.categoryId&&flowType===entry.flowType))return [];
   return [{entry,categoryId,flowType}];
  }).sort((a,b)=>b.entry.date.localeCompare(a.entry.date));
 },[entries,categories,rules]);
 async function apply(){if(busy||!selected.size)return;setBusy(true);setError('');setNotice('');let updated=0;try{
  for(const suggestion of suggestions.filter(s=>selected.has(s.entry.id))){const {data,error}=await supabase.from('entries').update({category_id:suggestion.categoryId,subcategory_id:null,flow_type:suggestion.flowType}).eq('id',suggestion.entry.id).eq('household_id',householdId).eq('category_id',suggestion.entry.categoryId).eq('flow_type',suggestion.entry.flowType).select('id').maybeSingle();if(error)throw error;if(!data)throw Error('Une opération a changé. Actualisez les suggestions avant de continuer.');updated++}
  setSelected(new Set());setNotice(`${updated} opération(s) corrigée(s).`);await onChanged();
 }catch(e){setError(`${updated} correction(s) enregistrée(s). ${(e as Error).message}`);await onChanged()}finally{setBusy(false)}}
 return <details className="card product-panel"><summary>Revoir la catégorisation · {suggestions.length} suggestion(s)</summary><p>Vérifiez puis cochez les corrections à appliquer. Les mouvements incertains restent à vérifier ; les montants et les dates sont conservés.</p>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}{suggestions.slice(0,100).map(({entry,categoryId,flowType})=><label className="account-manager-row" key={entry.id}><input type="checkbox" checked={selected.has(entry.id)} disabled={busy} onChange={e=>setSelected(current=>{const next=new Set(current);if(e.target.checked)next.add(entry.id);else next.delete(entry.id);return next})}/><span><b>{entry.label}</b><small>{entry.date} · {entry.category} → {categories.find(c=>c.id===categoryId)?.name}{flowType!==entry.flowType?' · nature corrigée':''}</small></span></label>)}{suggestions.length>100&&<p>100 suggestions affichées. Les suivantes apparaîtront après correction.</p>}<button className="secondary" disabled={busy||!selected.size} onClick={()=>void apply()}>{busy?'Correction…':`Appliquer ${selected.size} correction(s)`}</button></details>;
}
