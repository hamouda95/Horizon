import type {Dispatch,SetStateAction} from 'react';
import type {Entry} from './household-data';
import {appLocale} from './locale';
import {budgetMonth} from './period';
import {summarizeFlows} from './flow';
import PeriodControl from './PeriodControl';
export type OverviewAccount={id:string;name:string;account_type:string;currency:string;balance_cents:number|null;balance_as_of:string|null};
type Props={accounts:OverviewAccount[];accountError:string;entries:Entry[];month:string;setMonth:Dispatch<SetStateAction<string>>;budgetCents:number|null;today:string;loading:boolean;onBank:()=>void;onBudget:()=>void;onIncome:()=>void;onExpenses:()=>void;onReport:()=>void};
const money=(cents:number,currency='EUR')=>new Intl.NumberFormat(appLocale(),{style:'currency',currency}).format(cents/100);
const typeName=(type:string)=>type==='checking'?'Courant':type==='savings'?'Épargne':type==='cash'?'Espèces':type==='crypto'?'Crypto':'Autre';
export default function CompactOverview({accounts,accountError,entries,month,setMonth,budgetCents,today,loading,onBank,onBudget,onIncome,onExpenses,onReport}:Props){
 const rows=entries.filter(e=>budgetMonth(e)===month&&e.date<=today),totals=summarizeFlows(rows);
 const review=rows.filter(e=>e.flowType==='review'),reviewIncome=review.filter(e=>e.kind==='income').length;
 const remaining=budgetCents===null?null:budgetCents-totals.expense;
 const percent=budgetCents!==null&&budgetCents>0?totals.expense/budgetCents*100:totals.expense>0&&budgetCents===0?100:0;
 const groups=['checking','savings','cash','crypto','other'].map(type=>({type,rows:accounts.filter(a=>a.account_type===type)})).filter(g=>g.rows.length);
 return <section className="compact-overview" aria-label="Résumé du foyer">
  <div className="compact-heading"><div><h1>Vue d’ensemble</h1><p>L’essentiel de votre foyer.</p></div><PeriodControl month={month} setMonth={setMonth}/></div>
  {loading?<div className="card" role="status">Chargement du résumé…</div>:<>
   <section className="card compact-budget" aria-labelledby="compact-budget-title"><div className="compact-section-title"><h2 id="compact-budget-title">Où en est le budget ?</h2><button className="textbtn" onClick={onBudget}>{budgetCents===null?'Définir le budget':'Modifier'}</button></div>
    <div className="compact-kpis"><button onClick={onIncome}><span>Revenus confirmés</span><strong>{money(totals.income)}</strong>{reviewIncome>0&&<small>{reviewIncome} entrée(s) à vérifier</small>}</button><button onClick={onExpenses}><span>Dépenses confirmées</span><strong>{money(totals.expense)}</strong><small>{budgetCents===null?'Plafond non défini':`Plafond ${money(budgetCents)}`}</small></button><div className="compact-main-number"><span>{remaining===null?'Équilibre du mois':remaining<0?'Dépassement du budget':'Budget restant'}</span><strong className={(remaining??totals.availableBalance)<0?'negative':''}>{money(remaining===null?totals.availableBalance:Math.abs(remaining))}</strong><small>{remaining===null?'Après remboursements et épargne nette':'Plafond − dépenses confirmées'}</small></div></div>
    {budgetCents!==null&&<div className="compact-budget-meter"><div role="progressbar" aria-label="Budget consommé" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(percent))}><i className={remaining!==null&&remaining<0?'over':''} style={{width:Math.min(100,percent)+'%'}}/></div><span>{budgetCents===0?'Plafond zéro':Math.round(percent)+' % consommé'}</span></div>}
    <div className="compact-budget-footer"><span>Équilibre après épargne : <b>{money(totals.availableBalance)}</b></span><button className="textbtn" onClick={onReport}>Voir le bilan →</button></div>
    {review.length>0&&<button className="compact-review" onClick={reviewIncome?onIncome:onExpenses}>{review.length} opération(s) à vérifier · exclues des totaux. Corriger →</button>}
   </section>
   <section className="card compact-accounts" aria-labelledby="compact-accounts-title"><div className="compact-section-title"><h2 id="compact-accounts-title">Total par compte</h2><button className="textbtn" onClick={onBank}>Gérer les comptes →</button></div>
    {accountError?<p role="alert">{accountError}</p>:!accounts.length?<button className="secondary" onClick={onBank}>Ajouter un compte</button>:<div className="compact-account-groups">{groups.map(group=>{return <div className="compact-account-group" key={group.type}><div className="compact-group-heading"><b>{typeName(group.type)}</b><span>{group.rows.length} compte{group.rows.length>1?'s':''}</span></div>{group.rows.map(a=><button className="compact-account-row" key={a.id} onClick={onBank}><span><b>{a.name}</b><small>{a.balance_as_of?`Relevé au ${new Date(a.balance_as_of).toLocaleDateString(appLocale(),{day:'numeric',month:'short'})}`:'Solde à renseigner'}</small></span><strong>{a.balance_cents===null?'—':money(a.balance_cents,a.currency)}</strong></button>)}</div>})}</div>}
    <p className="compact-disclaimer">Soldes relevés, distincts du budget. Chaque compte est présenté séparément ; aucun paiement futur n’est déduit.</p>
   </section>
  </>}
 </section>;
}
