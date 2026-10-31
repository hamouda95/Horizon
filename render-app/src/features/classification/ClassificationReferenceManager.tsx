import {displayText,plural} from '../../lib/text';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {classificationReference,referenceTaxonomy} from './classification-reference';
import {normalizeMerchant,type MerchantKnowledgeRule} from './merchant-knowledge';
import {changedOperationCount,planRuleApplication,ruleKey,type RuleTarget} from './rule-application';
import {runInBatches} from '../operations/bulk';
import {flowTypeLabels,type FlowType} from '../../lib/flow';
import {supabase} from '../../lib/client';
type Category={id:string;name:string;kind:string;active:boolean};
type Subcategory={id:string;name:string;category_id:string;active:boolean};
const RULE_COLUMNS='merchant_key,merchant_label,kind,category_id,subcategory_id,sample_count,flow_type';
const flowOptions:Array<[FlowType,string]>=[['standard','Revenu / dépense'],['refund','Remboursement'],['transfer','Transfert interne'],['savings','Épargne'],['investment','Placement'],['review','À vérifier']];

/** Household categorisation rules: "label contains X → category, subcategory, nature". Rules override the general dictionary. */
export default function ClassificationReferenceManager({householdId,userId,categories,subcategories,rules:providedRules,entries,open=false,onChanged}:{householdId:string;userId:string;categories:Category[];subcategories:Subcategory[];rules?:MerchantKnowledgeRule[];entries?:RuleTarget[];open?:boolean;onChanged:()=>Promise<void>}){
 const [phrase,setPhrase]=useState(''),[kind,setKind]=useState<'income'|'expense'>('expense'),[category,setCategory]=useState(''),[subcategory,setSubcategory]=useState(''),[flow,setFlow]=useState<FlowType>('standard'),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loadedRules,setLoadedRules]=useState<MerchantKnowledgeRule[]>([]),[selected,setSelected]=useState(new Set<string>()),[filter,setFilter]=useState('');
 const loadRules=useCallback(async()=>{if(providedRules)return;const {data,error}=await supabase.from('household_merchant_rules').select(RULE_COLUMNS).eq('household_id',householdId).order('merchant_label');if(error)setError(error.message);else setLoadedRules((data||[]) as MerchantKnowledgeRule[])},[householdId,providedRules]);
 useEffect(()=>{void loadRules()},[loadRules]);
 const rules=providedRules??loadedRules;
 const categoryName=(id:string)=>categories.find(c=>c.id===id)?.name||'Catégorie indisponible';
 const subcategoryName=(id:string|null)=>id?subcategories.find(s=>s.id===id)?.name:undefined;
 const shown=useMemo(()=>{const q=normalizeMerchant(filter);return [...rules].filter(r=>!q||`${normalizeMerchant(r.merchant_label)} ${r.merchant_key} ${normalizeMerchant(categoryName(r.category_id))}`.includes(q)).sort((a,b)=>a.merchant_label.localeCompare(b.merchant_label,'fr'))},[rules,filter,categories]);
 const plan=useMemo(()=>entries?planRuleApplication(entries,rules):null,[entries,rules]);
 const pending=plan?changedOperationCount(plan):0;
 useEffect(()=>{const keys=new Set(rules.map(ruleKey));setSelected(current=>new Set([...current].filter(k=>keys.has(k))))},[rules]);

 async function refresh(){await loadRules();await onChanged()}
 async function run(task:()=>Promise<string>){setBusy(true);setError('');setNotice('');try{setNotice(await task());await refresh()}catch(e){setError((e as Error).message||'Action impossible.')}finally{setBusy(false)}}
 function reset(){setEditing(null);setPhrase('');setCategory('');setSubcategory('');setFlow('standard')}
 function edit(r:MerchantKnowledgeRule){setEditing(ruleKey(r));setPhrase(r.merchant_label);setKind(r.kind);setCategory(r.category_id);setSubcategory(r.subcategory_id||'');setFlow(r.flow_type||'standard')}
 async function install(){await run(async()=>{const {error}=await supabase.rpc('ensure_classification_reference',{p_household_id:householdId,p_definitions:referenceTaxonomy()});if(error)throw error;return 'Catégories et sous-catégories du référentiel disponibles. Les opérations existantes restent à valider.'})}
 async function save(){
  const key=normalizeMerchant(phrase);
  if(key.length<2||key.length>120){setError('Indiquez un nom ou une expression de 2 à 120 caractères (hors mots génériques comme « CB » ou « PRLV »).');return}
  await run(async()=>{
   const previous=editing?rules.find(r=>ruleKey(r)===editing):undefined;
   const {error}=await supabase.from('household_merchant_rules').upsert({household_id:householdId,created_by:userId,merchant_key:key,merchant_label:phrase.trim().slice(0,120),kind,category_id:category,subcategory_id:subcategory||null,flow_type:flow,sample_count:previous?.sample_count||1},{onConflict:'household_id,merchant_key,kind'});
   if(error)throw error;
   // Renaming the expression or switching income/expense creates a new key: remove the rule being replaced.
   if(previous&&ruleKey(previous)!==`${kind}:${key}`){const {error:removeError}=await supabase.from('household_merchant_rules').delete().eq('household_id',householdId).eq('kind',previous.kind).eq('merchant_key',previous.merchant_key);if(removeError)throw removeError}
   reset();return editing?'Règle modifiée.':'Règle enregistrée pour le foyer. Elle est prioritaire sur le dictionnaire général.';
  });
 }
 async function remove(keys:string[]){
  if(!keys.length)return;
  if(!window.confirm(`Supprimer ${plural(keys.length,'règle','règles')} ? Les opérations déjà classées ne changent pas.`))return;
  await run(async()=>{
   for(const k of ['income','expense'] as const){const merchantKeys=keys.filter(x=>x.startsWith(k+':')).map(x=>x.slice(k.length+1));if(!merchantKeys.length)continue;const {error}=await supabase.from('household_merchant_rules').delete().eq('household_id',householdId).eq('kind',k).in('merchant_key',merchantKeys);if(error)throw error}
   if(editing&&keys.includes(editing))reset();setSelected(new Set());return `${plural(keys.length,'règle supprimée','règles supprimées')}.`;
  });
 }
 async function removeAll(){
  if(!rules.length||!window.confirm(`Supprimer les ${rules.length} règles du foyer ? Les opérations déjà classées ne changent pas.`))return;
  await run(async()=>{const {error}=await supabase.from('household_merchant_rules').delete().eq('household_id',householdId);if(error)throw error;reset();setSelected(new Set());return 'Toutes les règles du foyer ont été supprimées.'});
 }
 async function applyToExisting(){
  if(!plan||!pending)return;
  if(!window.confirm(`Appliquer les règles à ${plural(pending,'opération existante','opérations existantes')} ? Leur catégorie et leur nature seront remplacées par celles des règles ; la sous-catégorie est retirée lors d’un changement de catégorie.`))return;
  await run(async()=>{
   const call=(action:'category'|'flow',value:string)=>async(batch:string[])=>{const {data,error}=await supabase.rpc('bulk_manage_entries',{p_household_id:householdId,p_entry_ids:batch,p_action:action,p_value:value});if(error)throw error;return data??batch.length};
   for(const [categoryId,ids] of plan.categoryChanges){const r=await runInBatches(ids,call('category',categoryId));if(r.error)throw r.error}
   for(const [flowType,ids] of plan.flowChanges){const r=await runInBatches(ids,call('flow',flowType));if(r.error)throw r.error}
   return `${plural(pending,'opération mise à jour','opérations mises à jour')} selon les règles.`;
  });
 }

 const allShownSelected=shown.length>0&&shown.every(r=>selected.has(ruleKey(r)));
 return <details className="card product-panel" open={open}><summary>Règles de catégorisation du foyer</summary>
  <p>Quand le libellé d’une opération contient l’expression d’une règle, Horizon propose sa catégorie et sa nature. La règle la plus précise l’emporte, et les règles du foyer passent avant le dictionnaire général.</p>
  {error&&<p className="error" role="alert">{displayText(error)}</p>}{notice&&<p role="status">{displayText(notice)}</p>}
  <form onSubmit={e=>{e.preventDefault();void save()}} className="product-form rules-form"><h3>{editing?'Modifier la règle':'Ajouter une règle'}</h3>
   <label>Le libellé contient<input value={phrase} maxLength={120} required placeholder="ex. Carrefour, EDF, Netflix" onChange={e=>setPhrase(e.target.value)}/></label>
   <label>Type<select value={kind} onChange={e=>{setKind(e.target.value as 'income'|'expense');setCategory('');setSubcategory('')}}><option value="expense">Dépense</option><option value="income">Revenu</option></select></label>
   <label>Catégorie<select value={category} required onChange={e=>{setCategory(e.target.value);setSubcategory('')}}><option value="">Choisir</option>{categories.filter(c=>c.active&&c.kind===kind).map(c=><option value={c.id} key={c.id}>{displayText(c.name)}</option>)}</select></label>
   <label>Sous-catégorie<select value={subcategory} onChange={e=>setSubcategory(e.target.value)}><option value="">Sans sous-catégorie</option>{subcategories.filter(s=>s.active&&s.category_id===category).map(s=><option value={s.id} key={s.id}>{displayText(s.name)}</option>)}</select></label>
   <label>Nature<select value={flow} onChange={e=>setFlow(e.target.value as FlowType)}>{flowOptions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
   <button className="primary" disabled={busy}>{editing?'Enregistrer la modification':'Ajouter la règle'}</button>{editing&&<button type="button" className="secondary" disabled={busy} onClick={reset}>Annuler</button>}
  </form>
  {plan&&<div className="selection-toolbar"><span>{pending?`${plural(pending,'opération existante ne suit','opérations existantes ne suivent')} pas les règles.`:'Toutes les opérations suivent les règles.'}</span>{pending>0&&<button className="secondary" disabled={busy} onClick={()=>void applyToExisting()}>Appliquer aux opérations existantes</button>}</div>}
  <h3>{plural(rules.length,'règle','règles')}</h3>
  {rules.length>0&&<>
   <div className="selection-toolbar"><input type="search" aria-label="Rechercher une règle" placeholder="Rechercher une règle ou une catégorie" value={filter} onChange={e=>setFilter(e.target.value)}/><label><input type="checkbox" checked={allShownSelected} disabled={busy||!shown.length} onChange={e=>setSelected(current=>{const next=new Set(current);for(const r of shown)e.target.checked?next.add(ruleKey(r)):next.delete(ruleKey(r));return next})}/> Tout sélectionner</label>{selected.size>0&&<button className="secondary" disabled={busy} onClick={()=>void remove([...selected])}>Supprimer la sélection ({selected.size})</button>}<button className="textbtn" disabled={busy} onClick={()=>void removeAll()}>Supprimer toutes les règles</button></div>
   <table className="module-table"><thead><tr><th scope="col"><span className="sr-only">Sélection</span></th><th scope="col">Le libellé contient</th><th scope="col">Type</th><th scope="col">Catégorie</th><th scope="col">Nature</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
    {shown.map(r=>{const k=ruleKey(r),sub=subcategoryName(r.subcategory_id);return <tr key={k}><td><input type="checkbox" aria-label={displayText(`Sélectionner ${r.merchant_label}`)} checked={selected.has(k)} disabled={busy} onChange={e=>setSelected(current=>{const next=new Set(current);e.target.checked?next.add(k):next.delete(k);return next})}/></td><td>{displayText(r.merchant_label)}</td><td>{r.kind==='income'?'Revenu':'Dépense'}</td><td>{displayText(categoryName(r.category_id))}{sub?` / ${displayText(sub)}`:''}</td><td>{flowTypeLabels[r.flow_type||'standard']}</td><td><button className="textbtn" disabled={busy} onClick={()=>edit(r)}>Modifier</button><button className="textbtn" disabled={busy} onClick={()=>void remove([k])}>Supprimer</button></td></tr>})}
   </tbody></table>
  </>}
  <button className="secondary" disabled={busy} onClick={()=>void install()}>Compléter les catégories du référentiel</button>
  <details><summary>Voir le dictionnaire général</summary><div className="reference-table">{classificationReference.map(r=><p key={r.key}><b>{r.kind==='income'?'Revenu':'Dépense'} · {displayText(r.category)} / {displayText(r.subcategory)}</b><br/>{r.terms.join(', ')}</p>)}</div></details>
 </details>;
}
