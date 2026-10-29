import type {Entry} from './household-data';
import type {Tables} from './database.types';
import {appLocale} from './locale';
import {summarizeFlows} from './flow';
import {estimateNextPayday} from './dashboard-finance';
import {budgetMonth} from './period';

type Account=Pick<Tables<'bank_accounts'>,'id'|'name'|'account_type'|'currency'|'balance_cents'|'balance_as_of'>;
type Props={accounts:Account[];accountError:string;entries:Entry[];month:string;spentCents:number;budgetCents:number|null;today:string;onOpenBank:()=>void;onOpenBudget:()=>void};
const currencyCode=(value:string)=>/^[A-Z]{3}$/.test(value)?value:'EUR';
const money=(cents:number,currency='EUR')=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:currencyCode(currency),maximumFractionDigits:2}).format(cents/100);
const dateLabel=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString(appLocale(),{day:'numeric',month:'short',year:'numeric'});
const monthLabel=(value:string)=>new Date(value+'-01T12:00:00').toLocaleDateString(appLocale(),{month:'long',year:'numeric'});
function totalsByCurrency(accounts:Account[],accountType?:string){
 const totals=new Map<string,number>();
 for(const account of accounts)if((!accountType||account.account_type===accountType)&&account.balance_cents!==null)totals.set(currencyCode(account.currency),(totals.get(currencyCode(account.currency))||0)+Number(account.balance_cents));
 return [...totals.entries()];
}
function amountLines(accounts:Account[],accountType?:string){
 const rows=totalsByCurrency(accounts,accountType);
 return rows.length?rows.map(([currency,total])=><span key={currency}>{money(total,currency)}</span>):<span>—</span>;
}
function accountTypeName(value:string){return value==='checking'?'Compte courant':value==='savings'?'Épargne':value==='cash'?'Espèces':value==='crypto'?'Crypto':'Autre compte'}
function accountDetail(account:Account){const type=accountTypeName(account.account_type);const hasTypeInName=account.name.toLocaleLowerCase(appLocale()).includes(type.toLocaleLowerCase(appLocale()));return [hasTypeInName?'':type,account.balance_as_of?'au '+dateLabel(account.balance_as_of.slice(0,10)):'date de relevé inconnue'].filter(Boolean).join(' · ')}

export default function DashboardMoneyOverview({accounts,accountError,entries,month,spentCents,budgetCents,today,onOpenBank,onOpenBudget}:Props){
 const currentEntries=entries.filter(entry=>budgetMonth(entry)===month);
 const flows=summarizeFlows(currentEntries);
 const netSavings=flows.savingsDeposits-flows.savingsWithdrawals;
 const pay=estimateNextPayday(entries,today);
 const checking=totalsByCurrency(accounts,'checking');
 const checkingMissing=accounts.filter(account=>account.account_type==='checking'&&account.balance_cents===null).length;
 const savingAccounts=accounts.filter(account=>account.account_type==='savings');
 const savingTotals=totalsByCurrency(accounts,'savings');
 const savingsMissing=savingAccounts.filter(account=>account.balance_cents===null).length;
 const savingsDates=savingAccounts.map(account=>account.balance_as_of).filter((value):value is string=>Boolean(value)).sort();
 const latestSavingsDate=savingsDates[savingsDates.length-1];
 const percent=budgetCents&&budgetCents>0?spentCents/budgetCents*100:null;
 const budgetRemaining=budgetCents===null?null:budgetCents-spentCents;
 const monthSavingTotal=netSavings<0?'- '+money(-netSavings):money(netSavings);
 return <section className="dashboard-money-grid" aria-label="Soldes, paie, budget et épargne">
  <article className="card dashboard-money-card dashboard-account-card">
   <div className="dashboard-money-heading"><div><span className="overline">COMPTES DU FOYER</span><h2>Soldes par compte</h2></div><button type="button" className="textbtn" onClick={onOpenBank}>Gérer</button></div>
   {accountError?<div className="dashboard-money-empty" role="status"><p>{accountError}</p><button type="button" className="secondary" onClick={onOpenBank}>Ouvrir la banque</button></div>:!accounts.length?<div className="dashboard-money-empty"><p>Aucun compte bancaire suivi.</p><button type="button" className="secondary" onClick={onOpenBank}>Ajouter un compte</button></div>:<><div className="dashboard-account-list">{accounts.map(account=><div className="dashboard-account-row" key={account.id}><div><b>{account.name}</b><small>{accountDetail(account)}</small></div><strong>{account.balance_cents===null?'Solde inconnu':money(Number(account.balance_cents),account.currency)}</strong></div>)}</div>{accounts.some(account=>account.account_type==='checking')&&<div className="dashboard-account-total"><span>Total courant</span><strong>{amountLines(accounts,'checking')}</strong></div>}</>}
  </article>
  <article className="card dashboard-money-card dashboard-pay-card">
   <div className="dashboard-money-heading"><div><span className="overline">JUSQU’À LA PAIE</span><h2>{pay?'À tenir jusqu’à la paie':'Solde des comptes courants'}</h2></div></div>
   <div className="dashboard-pay-total">{checking.length?checking.map(([currency,total])=><strong key={currency}>{money(total,currency)}</strong>):<strong>—</strong>}</div>
   <p>Solde cumulé des comptes courants{checkingMissing?'; '+checkingMissing+' solde(s) inconnu(s)':''}.</p>
   {pay?<div className="dashboard-pay-date"><b>{pay.daysUntil===0?'Aujourd’hui':pay.daysUntil===1?'Demain':'Dans '+pay.daysUntil+' jours'}</b><span>Paie estimée le {dateLabel(pay.date)} · « {pay.label} »</span></div>:<div className="dashboard-pay-date"><b>Paie non estimée</b><span>Classez deux versements récurrents en « Salaire » pour l’estimer.</span></div>}
   <small>Les paiements à venir ne sont pas déduits du solde.</small>
  </article>
  <article className="card dashboard-money-card dashboard-budget-card">
   <div className="dashboard-money-heading"><div><span className="overline">BUDGET · {monthLabel(month)}</span><h2>Vos dépenses</h2></div><button type="button" className="textbtn" onClick={onOpenBudget}>{budgetCents===null?'Définir':'Modifier'}</button></div>
   {budgetCents===null?<div className="dashboard-money-empty"><p>Ajoutez un plafond mensuel pour suivre ce qu’il vous reste.</p><button type="button" className="secondary" onClick={onOpenBudget}>Définir le budget</button></div>:<><div className="dashboard-budget-numbers"><strong>{money(spentCents)}</strong><span>sur {money(budgetCents)}</span></div><div className="dashboard-budget-track" role="progressbar" aria-label="Budget mensuel dépensé" aria-valuemin={0} aria-valuemax={budgetCents} aria-valuenow={Math.min(spentCents,budgetCents)}><i style={{width:Math.max(0,Math.min(100,percent||0))+'%'}}/></div><div className="dashboard-budget-foot"><b>{percent===null?'—':Math.round(percent)+' %'}</b><span>{budgetRemaining!==null&&budgetRemaining<0?'Dépassement de '+money(-budgetRemaining):'Reste '+money(budgetRemaining||0)}</span></div><small>Seules les dépenses confirmées sont comptées.</small></>}
  </article>
  <article className="card dashboard-money-card dashboard-savings-card">
   <div className="dashboard-money-heading"><div><span className="overline">ÉPARGNE · {monthLabel(month)}</span><h2>Votre épargne</h2></div></div>
   <div className="dashboard-savings-month"><span>Mouvements nets du mois</span><strong className={netSavings<0?'negative':'positive'}>{monthSavingTotal}</strong></div>
   <div className="dashboard-savings-total"><span>Solde cumulé des livrets{latestSavingsDate?' · relevé au '+dateLabel(latestSavingsDate.slice(0,10)):''}</span><strong>{savingTotals.length?savingTotals.map(([currency,total])=><span key={currency}>{money(total,currency)}</span>):'—'}</strong></div>
   {savingsMissing>0&&<small>{savingsMissing} solde(s) d’épargne non renseigné(s).</small>}
   {!savingAccounts.length&&<button type="button" className="textbtn" onClick={onOpenBank}>Ajouter un livret</button>}
   <small>Le mouvement du mois vient des opérations classées « épargne ».</small>
  </article>
 </section>;
}
