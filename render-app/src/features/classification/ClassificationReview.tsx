import {displayText,plural} from '../../lib/text';
import {referenceMatch} from './classification-reference';
import {useMemo,useState} from 'react';
import type {Entry} from '../../hooks/household-data';
import {keywordCategory,confirmedCounterpartyFlow} from './bank-classification';
import {createHouseholdClassifier} from './local-classifier';
import {matchMerchantRule,type MerchantKnowledgeRule} from './merchant-knowledge';
import {supabase} from '../../lib/client';
type Category={id:string;name:string;kind:string;active:boolean};
export default function ClassificationReview({subcategories=[],entries,categories,rules,householdId,onChanged}:{subcategories?:{id:string;name:string;category_id:string;active:boolean}[];entries:Entry[];categories:Category[];rules:MerchantKnowledgeRule[];householdId:string;onChanged:()=>Promise<void>}){
 const [selected,setSelected]=useState(new Set<string>()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const suggestions=useMemo(()=>{
  const classifier=createHouseholdClassifier(categories,entries,rules);
  return entries.flatMap(entry=>{
   if(!['standard','review'].includes(entry.flowType))return [];
   const rule=matchMerchantRule(entry.label,entry.kind,rules);
   const categoryId=rule?.category_id||keywordCategory(entry.label,entry.kind,categories)||classifier(entry.label,entry.kind)?.categoryId;
   const reference=referenceMatch(entry.label+' '+(entry.subcategory||''),entry.kind);const subcategoryId=rule?.subcategory_id||subcategories.find(s=>s.active&&s.category_id===categoryId&&s.name===reference?.subcategory)?.id||(categoryId===entry.categoryId?entry.subcategoryId:null);
   const flowType=confirmedCounterpartyFlow(entry.label,entry.kind,rules)||reference?.flowType||entry.flowType;
   if(!categoryId||!categories.some(c=>c.id===categoryId&&c.active&&c.kind===entry.kind)||(categoryId===entry.categoryId&&flowType===entry.flowType&&subcategoryId===entry.subcategoryId))return [];
   return [{entry,categoryId,subcategoryId,flowType}];
  }).sort((a,b)=>b.entry.date.localeCompare(a.entry.date));
 },[entries,categories,subcategories,rules]);
 async function apply(){if(busy||!selected.size)return;setBusy(true);setError('');setNotice('');let updated=0;try{
  for(const suggestion of suggestions.filter(s=>selected.has(s.entry.id))){let query=supabase.from('entries').update({category_id:suggestion.categoryId,subcategory_id:suggestion.subcategoryId,flow_type:suggestion.flowType}).eq('id',suggestion.entry.id).eq('household_id',householdId).eq('category_id',suggestion.entry.categoryId).eq('flow_type',suggestion.entry.flowType);query=suggestion.entry.subcategoryId?query.eq('subcategory_id',suggestion.entry.subcategoryId):query.is('subcategory_id',null);const {data,error}=await query.select('id').maybeSingle();if(error)throw error;if(!data)throw Error('Une opération a changé. Actualisez les suggestions avant de continuer.');updated++}
  setSelected(new Set());setNotice(`${plural(updated,'opération corrigée','opérations corrigées')}.`);await onChanged();
 }catch(e){setError(`${plural(updated,'correction enregistrée','corrections enregistrées')}. ${(e as Error).message}`);await onChanged()}finally{setBusy(false)}}
 return <details className="card product-panel"><summary>Revoir la catégorisation · {plural(suggestions.length,'suggestion','suggestions')}</summary><p>Vérifiez puis cochez les corrections à appliquer. Les mouvements incertains restent à vérifier ; les montants et les dates sont conservés.</p>{error&&<p className="error" role="alert">{displayText(error)}</p>}{notice&&<p className="notice" role="status">{displayText(notice)}</p>}{suggestions.length>0&&<><button className="textbtn" disabled={busy} onClick={()=>setSelected(new Set(suggestions.slice(0,100).map(s=>s.entry.id)))}>Sélectionner les suggestions affichées</button><button className="textbtn" disabled={busy} onClick={()=>setSelected(new Set())}>Désélectionner</button></>}{suggestions.slice(0,100).map(({entry,categoryId,subcategoryId,flowType})=><label className="account-manager-row" key={entry.id}><input type="checkbox" checked={selected.has(entry.id)} disabled={busy} onChange={e=>setSelected(current=>{const next=new Set(current);if(e.target.checked)next.add(entry.id);else next.delete(entry.id);return next})}/><span><b>{displayText(entry.label)}</b><small>{entry.date} · {displayText(entry.category)} → {displayText(categories.find(c=>c.id===categoryId)?.name)}{subcategoryId?' / '+subcategories.find(s=>s.id===subcategoryId)?.name:''}{flowType!==entry.flowType?' · nature corrigée':''}</small></span></label>)}{suggestions.length>100&&<p>100 suggestions affichées. Les suivantes apparaîtront après correction.</p>}<button className="secondary" disabled={busy||!selected.size} onClick={()=>void apply()}>{busy?'Correction…':`Appliquer ${plural(selected.size,'correction','corrections')}`}</button></details>;
}
