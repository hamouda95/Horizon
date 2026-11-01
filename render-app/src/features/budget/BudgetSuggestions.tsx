import {appCurrency} from '../../lib/currency';
import {useState} from 'react';
import {Sparkles} from 'lucide-react';
import {supabase} from '../../lib/client';
import {appLocale} from '../../lib/locale';
import {displayText,plural} from '../../lib/text';
import type {CategorySuggestion} from './budget-suggestions';

type Category={id:string;name:string;kind:string;active:boolean};
type Budget={category_id:string;month:string;amount_cents:number};
const money=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:appCurrency()}).format(cents/100);
export const monthLabel=(month:string)=>new Date(month+'-15T12:00:00').toLocaleDateString(appLocale(),{month:'long',year:'numeric'});

/** Saves suggested envelopes for one month, or as monthly budgets from that month on. */
export async function applySuggestions(householdId:string,month:string,rows:{categoryId:string;suggestedCents:number}[],everyMonth:boolean){
 if(!rows.length)return;
 const {error}=everyMonth
  ?await supabase.rpc('configure_category_budgets',{p_household_id:householdId,p_effective_month:month+'-01',p_rules:rows.map(r=>({category_id:r.categoryId,cadence:'monthly',amount_cents:r.suggestedCents,enabled:true})),p_replace_override:false})
  :await supabase.from('monthly_category_budgets').upsert(rows.map(r=>({household_id:householdId,category_id:r.categoryId,month:month+'-01',amount_cents:r.suggestedCents})),{onConflict:'household_id,category_id,month'});
 if(error)throw error;
}

/** Envelopes suggested from the last three complete months for the month on screen; categories still without a budget come first. */
export default function BudgetSuggestions({householdId,month,categories,suggestions,budgets,onChanged}:{householdId:string;month:string;categories:Category[];suggestions:CategorySuggestion[];budgets:Budget[];onChanged:()=>Promise<unknown>}){
 const existing=(id:string)=>budgets.find(b=>b.category_id===id&&b.month.slice(0,7)===month)?.amount_cents??null;
 const rows=suggestions.filter(s=>s.suggestedCents>0&&categories.some(c=>c.id===s.categoryId)),missing=rows.filter(r=>existing(r.categoryId)===null);
 const [selected,setSelected]=useState<Set<string>|null>(null),[open,setOpen]=useState(false),[everyMonth,setEveryMonth]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 // Categories without a budget are pre-selected; existing envelopes are only replaced on request.
 const chosen=selected??new Set(missing.map(r=>r.categoryId));
 const picked=rows.filter(r=>chosen.has(r.categoryId)),total=picked.reduce((n,r)=>n+r.suggestedCents,0);
 const name=(id:string)=>categories.find(c=>c.id===id)?.name||'';
 async function apply(list=picked){
  if(!list.length)return;setBusy(true);setError('');setNotice('');
  try{await applySuggestions(householdId,month,list,everyMonth);setNotice(`${list.length} ${list.length>1?'enveloppes enregistrées':'enveloppe enregistrée'} ${everyMonth?'à partir de':'pour'} ${monthLabel(month)}, soit ${money(list.reduce((n,r)=>n+r.suggestedCents,0))} par mois.`);setSelected(null);await onChanged()}
  catch(e){setError((e as Error).message||'Enregistrement impossible.')}finally{setBusy(false)}
 }
 if(!rows.length)return null;
 return <section className={'card budget-suggestions'+(missing.length?' has-missing':'')}>
  <div className="sectionhead"><div><span className="overline"><Sparkles size={12}/> Suggestions</span><h2>{missing.length?`Compléter le budget de ${monthLabel(month)}`:`Budget suggéré pour ${monthLabel(month)}`}</h2></div><button className="textbtn" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Replier':'Voir le détail'}</button></div>
  <p>{missing.length?`${missing.length} ${missing.length>1?'catégories ont':'catégorie a'} des dépenses récentes mais pas encore de budget ce mois-ci.`:'Toutes vos catégories dépensées ont un budget. Comparez-les à vos dépenses récentes.'} Calcul : moyenne des trois derniers mois complets, plus un douzième des factures annuelles, arrondie aux 5 € supérieurs.</p>
  {missing.length>0&&!open&&<ul className="suggestion-chips">{missing.map(r=><li key={r.categoryId}><span>{displayText(name(r.categoryId))}</span><b>{money(r.suggestedCents)}</b></li>)}</ul>}
  {error&&<p className="error" role="alert">{displayText(error)}</p>}{notice&&<p className="notice" role="status">{displayText(notice)}</p>}
  {open&&<div className="module-table-scroll"><table className="module-table"><thead><tr><th scope="col"><span className="sr-only">Appliquer</span></th><th scope="col">Catégorie</th><th scope="col">Moyenne mensuelle</th><th scope="col">Part des factures annuelles</th><th scope="col">Suggestion</th><th scope="col">Budget actuel</th></tr></thead><tbody>
   {rows.map(r=>{const prior=existing(r.categoryId);return <tr key={r.categoryId}>
    <td><input type="checkbox" aria-label={displayText(`Appliquer la suggestion pour ${name(r.categoryId)}`)} checked={chosen.has(r.categoryId)} disabled={busy} onChange={e=>{const next=new Set(chosen);if(e.target.checked)next.add(r.categoryId);else next.delete(r.categoryId);setSelected(next)}}/></td>
    <td>{displayText(name(r.categoryId))}<br/><small>{plural(r.months,'mois observé','mois observés')}</small></td>
    <td>{money(r.averageCents)}</td><td>{r.annualShareCents?money(r.annualShareCents):'—'}</td><td><b>{money(r.suggestedCents)}</b></td><td>{prior===null?'Non défini':money(prior)}</td>
   </tr>})}
  </tbody></table></div>}
  <div className="selection-toolbar"><label className="checkline"><input type="checkbox" checked={everyMonth} disabled={busy} onChange={e=>setEveryMonth(e.target.checked)}/> Reconduire chaque mois</label><span>{plural(picked.length,'catégorie sélectionnée','catégories sélectionnées')} · {money(total)}</span><button className="primary" disabled={busy||!picked.length} onClick={()=>void apply()}>{busy?'Enregistrement…':`Appliquer à ${monthLabel(month)}`}</button></div>
 </section>;
}
