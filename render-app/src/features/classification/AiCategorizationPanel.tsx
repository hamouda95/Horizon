import {useMemo,useState} from 'react';
import {supabase} from '../../lib/client';
import {appLocale} from '../../lib/locale';
import {displayText,plural} from '../../lib/text';
import {flowTypeLabels,type FlowType} from '../../lib/flow';
import type {Entry} from '../../hooks/household-data';
import {runInBatches} from '../operations/bulk';
import {aiCandidates,planSuggestions,type AiSuggestion} from './ai-suggestions';

type Category={id:string;name:string;kind:string;active:boolean};
type Subcategory={id:string;name:string;category_id:string;active:boolean};
const CALL_SIZE=100;
const CONSENT_TEXT='Les suggestions par IA envoient le libellé, le montant, la date et le sens de ces opérations à Anthropic (Claude), sous-traitant d’Horizon, uniquement pour proposer une catégorie. Les noms de compte, IBAN, e-mails et longs numéros sont masqués avant envoi. Rien n’est modifié sans votre validation.\n\nActiver les suggestions par IA ?';
const confidenceLabels={high:'Sûre',medium:'Probable',low:'Incertaine'} as const;

/** Reads the error message an Edge Function returned, whatever the failure. */
async function functionError(error:unknown):Promise<string>{
 const context=(error as {context?:unknown})?.context;
 if(context instanceof Response){try{const body=await context.json() as {error?:string;code?:string};if(context.status===404)return 'Les suggestions par IA ne sont pas encore installées sur ce projet.';return body.error||'Suggestions IA impossibles pour le moment.'}catch{/* corps illisible */}}
 const name=(error as {name?:string})?.name;
 if(name==='FunctionsFetchError'||name==='FunctionsRelayError')return 'Les suggestions par IA ne sont pas joignables pour le moment.';
 return (error as Error)?.message||'Suggestions IA impossibles pour le moment.';
}

/** Suggests categories with AI for operations that rules and dictionary left unclassified; the user picks which to apply. */
export default function AiCategorizationPanel({householdId,categories,subcategories,entries,onChanged}:{householdId:string;categories:Category[];subcategories:Subcategory[];entries:Entry[];onChanged:()=>Promise<void>}){
 const candidates=useMemo(()=>aiCandidates(entries.map(e=>({...e,date:e.date})),categories),[entries,categories]);
 const [suggestions,setSuggestions]=useState<AiSuggestion[]>([]),[selected,setSelected]=useState(new Set<string>()),[learn,setLearn]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const byId=useMemo(()=>new Map(entries.map(e=>[e.id,e])),[entries]);
 const name=(id:string|null|undefined)=>categories.find(c=>c.id===id)?.name||subcategories.find(s=>s.id===id)?.name||'';
 const money=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR'}).format(cents/100);

 async function ensureConsent(){
  const {data}=await supabase.auth.getUser();
  if(data.user?.user_metadata?.ai_consent===true)return true;
  if(!window.confirm(CONSENT_TEXT))return false;
  const {error}=await supabase.auth.updateUser({data:{ai_consent:true,ai_consent_at:new Date().toISOString()}});
  if(error)throw error;
  return true;
 }
 async function suggest(){
  if(busy||!candidates.length)return;
  setError('');setNotice('');setSuggestions([]);
  try{
   if(!await ensureConsent())return;
   setBusy(true);
   const found:AiSuggestion[]=[],ids=candidates.map(c=>c.id);
   for(let i=0;i<ids.length;i+=CALL_SIZE){
    setProgress(`Analyse de ${Math.min(i+CALL_SIZE,ids.length)} / ${ids.length} opérations…`);
    const {data,error}=await supabase.functions.invoke('ai-categorize',{body:{householdId,entryIds:ids.slice(i,i+CALL_SIZE)}});
    if(error){const message=await functionError(error);if(found.length){setError(`${message} Les suggestions déjà reçues restent affichées.`);break}throw Error(message)}
    found.push(...((data as {suggestions?:AiSuggestion[]})?.suggestions||[]));
   }
   // Only suggestions that change something are worth reviewing.
   const useful=found.filter(s=>{const e=byId.get(s.entryId);return e&&(s.categoryId!==e.categoryId||s.flowType!==e.flowType||s.subcategoryId&&s.subcategoryId!==e.subcategoryId)});
   setSuggestions(useful);setSelected(new Set(useful.filter(s=>s.confidence==='high').map(s=>s.entryId)));
   if(!useful.length)setNotice('Aucune nouvelle catégorie à proposer pour ces opérations.');
  }catch(e){setError((e as Error).message||'Suggestions IA impossibles pour le moment.')}finally{setBusy(false);setProgress('')}
 }
 async function apply(){
  const accepted=suggestions.filter(s=>selected.has(s.entryId));
  if(busy||!accepted.length)return;
  setBusy(true);setError('');setNotice('');
  try{
   const plan=planSuggestions(accepted,accepted.map(s=>byId.get(s.entryId)!).filter(Boolean).map(e=>({...e,date:e.date})));
   const bulk=(action:'category'|'flow',value:string)=>async(batch:string[])=>{const {data,error}=await supabase.rpc('bulk_manage_entries',{p_household_id:householdId,p_entry_ids:batch,p_action:action,p_value:value});if(error)throw error;return data??batch.length};
   for(const [categoryId,ids] of plan.categories){const r=await runInBatches(ids,bulk('category',categoryId));if(r.error)throw r.error}
   for(const [subcategoryId,ids] of plan.subcategories){const {error}=await supabase.from('entries').update({subcategory_id:subcategoryId}).eq('household_id',householdId).in('id',ids);if(error)throw error}
   for(const [flowType,ids] of plan.flows){const r=await runInBatches(ids,bulk('flow',flowType));if(r.error)throw r.error}
   let learned=0;
   if(learn&&plan.rules.length){
    const {data:auth}=await supabase.auth.getUser();
    const {error}=await supabase.from('household_merchant_rules').upsert(plan.rules.map(r=>({household_id:householdId,created_by:auth.user?.id??null,merchant_key:r.key,merchant_label:r.key,kind:r.kind,category_id:r.categoryId,subcategory_id:r.subcategoryId,flow_type:r.flowType,sample_count:1})),{onConflict:'household_id,merchant_key,kind'});
    if(error)setError('Catégories appliquées, mais les règles n’ont pas pu être mémorisées.');else learned=plan.rules.length;
   }
   setSuggestions(current=>current.filter(s=>!selected.has(s.entryId)));setSelected(new Set());
   setNotice(`${plural(accepted.length,'opération reclassée','opérations reclassées')}.${learned?` ${plural(learned,'règle mémorisée','règles mémorisées')} pour les prochains imports.`:''}`);
   await onChanged();
  }catch(e){setError((e as Error).message||'Application impossible.');await onChanged()}finally{setBusy(false)}
 }

 const allSelected=suggestions.length>0&&suggestions.every(s=>selected.has(s.entryId));
 return <section className="card product-panel ai-categorization">
  <div className="sectionhead"><h2>Suggestions par IA</h2></div>
  <p>Pour les opérations que vos règles et le dictionnaire n’ont pas su classer, l’IA propose une catégorie et une nature. Vous choisissez celles à appliquer.</p>
  {error&&<p className="error" role="alert">{displayText(error)}</p>}{notice&&<p role="status">{displayText(notice)}</p>}
  <div className="selection-toolbar"><span>{candidates.length?plural(candidates.length,'opération à classer','opérations à classer'):'Aucune opération à classer.'}</span><button className="secondary" disabled={busy||!candidates.length} onClick={()=>void suggest()}>{busy&&progress?progress:'Proposer des catégories'}</button></div>
  {suggestions.length>0&&<>
   <div className="selection-toolbar"><label><input type="checkbox" checked={allSelected} disabled={busy} onChange={e=>setSelected(e.target.checked?new Set(suggestions.map(s=>s.entryId)):new Set())}/> Tout sélectionner</label><label><input type="checkbox" checked={learn} disabled={busy} onChange={e=>setLearn(e.target.checked)}/> Mémoriser comme règles</label><button className="primary" disabled={busy||!selected.size} onClick={()=>void apply()}>Appliquer la sélection ({selected.size})</button><button className="textbtn" disabled={busy} onClick={()=>{setSuggestions([]);setSelected(new Set())}}>Ignorer</button></div>
   <table className="module-table"><thead><tr><th scope="col"><span className="sr-only">Sélection</span></th><th scope="col">Opération</th><th scope="col">Actuellement</th><th scope="col">Proposition</th><th scope="col">Confiance</th></tr></thead><tbody>
    {suggestions.map(s=>{const e=byId.get(s.entryId);if(!e)return null;return <tr key={s.entryId}>
     <td><input type="checkbox" aria-label={displayText(`Appliquer la proposition pour ${e.label}`)} checked={selected.has(s.entryId)} disabled={busy} onChange={ev=>setSelected(current=>{const next=new Set(current);ev.target.checked?next.add(s.entryId):next.delete(s.entryId);return next})}/></td>
     <td><b>{displayText(e.label)}</b><br/><small>{e.date} · {e.kind==='income'?'+':'−'}{money(e.amount)}</small></td>
     <td>{displayText(e.category)}<br/><small>{flowTypeLabels[e.flowType as FlowType]}</small></td>
     <td>{displayText(name(s.categoryId))}{s.subcategoryId?` / ${displayText(name(s.subcategoryId))}`:''}<br/><small>{flowTypeLabels[s.flowType]}{s.reason?` · ${displayText(s.reason)}`:''}</small></td>
     <td>{confidenceLabels[s.confidence]}</td>
    </tr>})}
   </tbody></table>
  </>}
 </section>;
}
