import {appCurrency} from '../../lib/currency';
import {useMemo,useState} from 'react';
import {supabase} from '../../lib/client';
import {appLocale} from '../../lib/locale';
import {localToday} from '../../lib/dates';
import {displayText,plural} from '../../lib/text';
import type {Entry} from '../../hooks/household-data';
import {nextMonth,suggestCategoryBudgets} from './budget-suggestions';

type Category={id:string;name:string;kind:string;active:boolean};
type Budget={category_id:string;month:string;amount_cents:number};
const money=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:appCurrency()}).format(cents/100);
const monthLabel=(month:string)=>new Date(month+'-15T12:00:00').toLocaleDateString(appLocale(),{month:'long',year:'numeric'});

/** Suggested envelope per category for next month, from the last three months; the user picks which to apply. */
export default function BudgetSuggestions({householdId,categories,entries,budgets,onChanged}:{householdId:string;categories:Category[];entries:Entry[];budgets:Budget[];onChanged:()=>Promise<unknown>}){
 const current=localToday().slice(0,7),target=nextMonth(current);
 const expense=categories.filter(c=>c.active&&c.kind==='expense');
 const rows=useMemo(()=>suggestCategoryBudgets(entries,expense.map(c=>c.id),current).filter(s=>s.suggestedCents>0),[entries,expense,current]);
 const existing=(id:string)=>budgets.find(b=>b.category_id===id&&b.month.slice(0,7)===target)?.amount_cents??null;
 const [selected,setSelected]=useState<Set<string>|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 // Categories without a budget for next month are pre-selected; existing envelopes are only replaced on request.
 const chosen=selected??new Set(rows.filter(r=>existing(r.categoryId)===null).map(r=>r.categoryId));
 const total=rows.filter(r=>chosen.has(r.categoryId)).reduce((n,r)=>n+r.suggestedCents,0);
 async function apply(){
  const picked=rows.filter(r=>chosen.has(r.categoryId));if(!picked.length)return;
  setBusy(true);setError('');setNotice('');
  try{
   const {error}=await supabase.from('monthly_category_budgets').upsert(picked.map(r=>({household_id:householdId,category_id:r.categoryId,month:target+'-01',amount_cents:r.suggestedCents})),{onConflict:'household_id,category_id,month'});
   if(error)throw error;
   setNotice(`${plural(picked.length,'enveloppe enregistrée','enveloppes enregistrées')} pour ${monthLabel(target)}, soit ${money(total)}.`);setSelected(null);await onChanged();
  }catch(e){setError((e as Error).message||'Enregistrement impossible.')}finally{setBusy(false)}
 }
 if(!rows.length)return null;
 return <section className="card budget-suggestions">
  <div className="sectionhead"><h2>Budget suggéré pour {monthLabel(target)}</h2><button className="textbtn" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Replier':'Voir les suggestions'}</button></div>
  <p>Estimé à partir de vos dépenses courantes des trois derniers mois complets, plus un douzième de vos factures annuelles, arrondi aux 5 € supérieurs. {plural(rows.length,'catégorie','catégories')} · {money(rows.reduce((n,r)=>n+r.suggestedCents,0))} au total.</p>
  {error&&<p className="error" role="alert">{displayText(error)}</p>}{notice&&<p role="status">{displayText(notice)}</p>}
  {open&&<><table className="module-table"><thead><tr><th scope="col"><span className="sr-only">Appliquer</span></th><th scope="col">Catégorie</th><th scope="col">Moyenne mensuelle</th><th scope="col">Part des factures annuelles</th><th scope="col">Suggestion</th><th scope="col">Budget déjà prévu</th></tr></thead><tbody>
   {rows.map(r=>{const c=expense.find(x=>x.id===r.categoryId)!,prior=existing(r.categoryId);return <tr key={r.categoryId}>
    <td><input type="checkbox" aria-label={displayText(`Appliquer la suggestion pour ${c.name}`)} checked={chosen.has(r.categoryId)} disabled={busy} onChange={e=>{const next=new Set(chosen);e.target.checked?next.add(r.categoryId):next.delete(r.categoryId);setSelected(next)}}/></td>
    <td>{displayText(c.name)}<br/><small>{plural(r.months,'mois observé','mois observés')}</small></td>
    <td>{money(r.averageCents)}</td><td>{r.annualShareCents?money(r.annualShareCents):'—'}</td><td><b>{money(r.suggestedCents)}</b></td><td>{prior===null?'—':money(prior)}</td>
   </tr>})}
  </tbody></table>
  <div className="selection-toolbar"><span>{plural(chosen.size,'catégorie sélectionnée','catégories sélectionnées')} · {money(total)}</span><button className="primary" disabled={busy||!chosen.size} onClick={()=>void apply()}>Appliquer à {monthLabel(target)}</button></div></>}
 </section>;
}
