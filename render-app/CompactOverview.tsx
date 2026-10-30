import CategoryBudgetSummary,{type BudgetCategory} from './CategoryBudgetSummary';
import type {CategoryBudget} from './useCategoryBudgets';
import {currentWealth} from './overview-metrics';
import {accountTypeName} from './account-types';
import type {Dispatch,SetStateAction} from 'react';
import type {Entry} from './household-data';
import {appLocale} from './locale';
import {budgetMonth} from './period';
import {summarizeFlows} from './flow';
import PeriodControl from './PeriodControl';
export type OverviewAccount={id:string;name:string;account_type:string;currency:string;balance_cents:number|null;balance_as_of:string|null};
type Props={duplicateCount?:number;duplicateError?:string;categories?:BudgetCategory[];categoryBudgets?:CategoryBudget[];categoryBudgetError?:string;categoryBudgetsLoading?:boolean;accounts:OverviewAccount[];accountError:string;entries:Entry[];month:string;setMonth:Dispatch<SetStateAction<string>>;budgetCents:number|null;today:string;loading:boolean;onBank:()=>void;onBudget:()=>void;onIncome:()=>void;onExpenses:()=>void;onReport:()=>void};
const money=(cents:number,currency='EUR')=>new Intl.NumberFormat(appLocale(),{style:'currency',currency}).format(cents/100);
const typeName=accountTypeName;
export default function CompactOverview({duplicateCount=0,duplicateError='',categories=[],categoryBudgets=[],categoryBudgetError='',categoryBudgetsLoading=false,accounts,accountError,entries,month,setMonth,budgetCents,today,loading,onBank,onBudget,onIncome,onExpenses,onReport}:Props){
 const rows=entries.filter(e=>budgetMonth(e)===month&&e.date<=today),totals=summarizeFlows(rows);
 const review=rows.filter(e=>e.flowType==='review'),reviewIncome=review.filter(e=>e.kind==='income').length;
 const remaining=budgetCents===null?null:budgetCents-totals.expense;
 const percent=budgetCents!==null&&budgetCents>0?totals.expense/budgetCents*100:totals.expense>0&&budgetCents===0?100:0;
 const wealth=currentWealth(accounts);
 const groups=['checking','cash','savings','investment','crypto','credit','other'].map(type=>({type,rows:accounts.filter(a=>a.account_type===type)})).filter(g=>g.rows.length);
 return <section className="compact-overview" aria-label="Résumé du foyer">
  <div className="compact-heading"><div><h1>Vue d’ensemble</h1><p>L’essentiel de votre foyer.</p></div><PeriodControl month={month} setMonth={setMonth}/></div>
  {duplicateCount>0&&<div className="error" role="alert"><b>{duplicateCount} copie(s) potentielle(s) à vérifier.</b> Les revenus et dépenses peuvent être surévalués. <button className="textbtn" onClick={onBank}>Revoir les doublons →</button></div>}{duplicateError&&<p role="alert">{duplicateError}</p>}
  {loading?<div className="card" role="status">Chargement du résumé…</div>:<>
   <section className="card compact-budget" aria-labelledby="compact-budget-title"><div className="compact-section-title"><h2 id="compact-budget-title">Où en est le budget ?</h2><button className="textbtn" onClick={onBudget}>{budgetCents===null?'Définir le budget':'Modifier'}</button></div>
    <div className="compact-kpis"><button onClick={onIncome}><span>Revenus confirmés</span><strong>{money(totals.income)}</strong>{reviewIncome>0&&<small>{reviewIncome} entrée(s) à vérifier</small>}</button><button onClick={onExpenses}><span>Dépenses confirmées</span><strong>{money(totals.expense)}</strong><small>{budgetCents===null?'Plafond non défini':`Plafond ${money(budgetCents)}`}</small></button><div className="compact-main-number"><span>{remaining===null?'Équilibre du mois':remaining<0?'Dépassement du budget':'Budget restant'}</span><strong className={(remaining??totals.availableBalance)<0?'negative':''}>{money(remaining===null?totals.availableBalance:Math.abs(remaining))}</strong><small>{remaining===null?'Après remboursements, épargne et placements':'Plafond − dépenses confirmées'}</small></div></div>
    {budgetCents!==null&&<div className="compact-budget-meter"><div role="progressbar" aria-label="Budget consommé" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(percent))}><i className={remaining!==null&&remaining<0?'over':''} style={{width:Math.min(100,percent)+'%'}}/></div><span>{budgetCents===0?'Plafond zéro':Math.round(percent)+' % consommé'}</span></div>}
    <div className="compact-budget-footer"><span>Après épargne et placements : <b>{money(totals.availableBalance)}</b></span><button className="textbtn" onClick={onReport}>Voir le bilan →</button></div>
    {review.length>0&&<button className="compact-review" onClick={reviewIncome?onIncome:onExpenses}>{review.length} opération(s) à vérifier · exclues des totaux. Corriger →</button>}
   </section>
   <section className="card wealth-summary"><div className="compact-section-title"><h2>Ce que vous possédez</h2><button className="textbtn" onClick={onBank}>Actualiser les soldes →</button></div>{accountError?<p role="alert">{accountError}</p>:!wealth.length?<p>Aucun avoir renseigné. Ajoutez vos comptes, espèces et placements.</p>:wealth.map(w=><div key={w.currency}>{w.missing>0&&<p role="status">Total incomplet : {w.missing} solde(s) à renseigner. Les opérations seules ne permettent pas de connaître votre patrimoine.</p>}<div className="wealth-grid">{([['Compte courant','checking'],['Épargne','savings'],['Espèces','cash'],['Placements et autres avoirs','investments']] as const).map(([label,key])=><div key={key}><span>{label}</span><strong>{accounts.some(a=>a.currency===w.currency&&(key==='investments'?['investment','crypto','other'].includes(a.account_type):a.account_type===key)&&a.balance_cents===null)?'À compléter':money(w[key],w.currency)}</strong></div>)}<div className="wealth-total"><span>{w.missing?'Total des avoirs connus':'Total des avoirs déclarés'}</span><strong>{w.known?money(w.total,w.currency):'Non renseigné'}</strong></div></div>{accounts.some(a=>a.currency===w.currency&&a.account_type==='credit')&&<p>Comptes de crédit : {money(w.debts,w.currency)} · Situation nette connue : {money(w.netTotal,w.currency)}</p>}</div>)}<p className="compact-disclaimer">Soldes à la date de chaque relevé ou saisie, sans estimation automatique. Devises séparées ; crédits exclus du total des avoirs.</p></section>
   <CategoryBudgetSummary categories={categories} entries={entries} budgets={categoryBudgets} month={month} today={today} error={categoryBudgetError} loading={categoryBudgetsLoading} onBudget={onBudget}/>
   <section className="card compact-accounts" aria-labelledby="compact-accounts-title"><div className="compact-section-title"><h2 id="compact-accounts-title">Total par compte</h2><button className="textbtn" onClick={onBank}>Gérer les comptes →</button></div>
    {accountError?<p role="alert">{accountError}</p>:!accounts.length?<button className="secondary" onClick={onBank}>Ajouter un compte</button>:<details><summary>Détail des comptes</summary><div className="compact-account-groups">{groups.map(group=>{return <div className="compact-account-group" key={group.type}><div className="compact-group-heading"><b>{typeName(group.type)}</b><span>{group.rows.length} compte{group.rows.length>1?'s':''}</span></div>{group.rows.map(a=><button className="compact-account-row" key={a.id} onClick={onBank}><span><b>{a.name}</b><small>{a.balance_as_of?`Relevé au ${new Date(a.balance_as_of).toLocaleDateString(appLocale(),{day:'numeric',month:'short'})}`:'Solde à renseigner'}</small></span><strong>{a.balance_cents===null?'—':money(a.balance_cents,a.currency)}</strong></button>)}</div>})}</div></details>}
    <p className="compact-disclaimer">Soldes relevés, distincts du budget. Chaque compte est présenté séparément ; aucun paiement futur n’est déduit.</p>
   </section>
  </>}
 </section>;
}
