import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,CalendarClock,CheckCircle2,Plus,Wallet} from 'lucide-react';
import type {Tables} from './database.types';
import {supabase} from './client';

type Obligation=Pick<Tables<'household_obligations'>,'id'|'title'|'amount_cents'|'frequency'|'due_day'|'due_month'>;
type Plan={income_cents:number;expense_cents:number}|null;
const fmt=(cents:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100);
const monthName=(month:string)=>new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

export default function HouseholdPulse({householdId,month,expense,plan,refreshVersion,onAddExpense,onOpenBudget,onOpenBills,onOpenBank}:{householdId:string;month:string;expense:number;plan:Plan;refreshVersion:number;onAddExpense:()=>void;onOpenBudget:()=>void;onOpenBills:()=>void;onOpenBank:()=>void}){
 const [obligations,setObligations]=useState<Obligation[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false);
 useEffect(()=>{
  let active=true;
  async function load(){
   setLoading(true);setLoadError(false);
   const {data,error}=await supabase.from('household_obligations').select('id,title,amount_cents,frequency,due_day,due_month').eq('household_id',householdId).eq('active',true);
   if(!active)return;
   if(error){setLoadError(true);setObligations([])}else setObligations((data||[]) as Obligation[]);
   setLoading(false);
  }
  void load();return()=>{active=false};
 },[householdId,refreshVersion]);
 const [year,monthNumber]=month.split('-').map(Number);
 const dueRows=useMemo(()=>obligations.flatMap(row=>{
  if(row.frequency==='annual'&&row.due_month!==monthNumber)return [];
  const day=Math.min(row.due_day,new Date(year,monthNumber,0).getDate());
  return [{...row,day}];
 }).sort((a,b)=>a.day-b.day),[obligations,year,monthNumber]);
 const remaining=plan?plan.expense_cents-expense:null;
 const progress=plan?(plan.expense_cents>0?Math.min(100,Math.round(expense/plan.expense_cents*100)):expense>0?100:0):0;
 const overBudget=remaining!==null&&remaining<0;
 return <section className="card household-pulse" aria-labelledby="pulse-title">
  <div className="pulse-heading"><div><span className="overline">PILOTAGE DU FOYER</span><h2 id="pulse-title">Le mois en un coup d’œil</h2><p>{monthName(month)} · prévisions, dépenses saisies et factures prévues.</p></div><button className="textbtn pulse-bills-link" onClick={onOpenBills}>Voir les échéances <ArrowRight size={15}/></button></div>
  <div className="pulse-grid">
   <div className="pulse-budget">
    <div className="pulse-label"><Wallet size={17}/><span>Budget dépenses</span></div>
    {plan?<><div className="pulse-budget-amount"><strong>{fmt(Math.max(remaining??0,0))}</strong><span>{overBudget?`Dépassement de ${fmt(Math.abs(remaining??0))}`:`restants sur ${fmt(plan.expense_cents)}`}</span></div><div className={`pulse-progress ${overBudget?'over':''}`} role="progressbar" aria-label="Dépenses saisies par rapport au budget prévu" aria-valuemin={0} aria-valuemax={plan.expense_cents} aria-valuenow={Math.min(expense,plan.expense_cents)}><span style={{width:`${progress}%`}}/></div><div className="pulse-budget-foot"><span>{fmt(expense)} saisis</span><span>{progress}% utilisé</span></div></>:<div className="pulse-no-plan"><p>Ajoutez une prévision pour savoir ce qu’il vous reste à dépenser.</p><button className="secondary" onClick={onOpenBudget}>Préparer mon budget <ArrowRight size={15}/></button></div>}
    {plan&&<button className="textbtn pulse-budget-link" onClick={onOpenBudget}>Ajuster le budget <ArrowRight size={15}/></button>}
   </div>
   <div className="pulse-due">
    <div className="pulse-label"><CalendarClock size={17}/><span>Factures prévues</span><button className="pulse-add-button" aria-label="Ajouter une échéance" title="Ajouter une échéance" onClick={onOpenBills}><Plus size={16}/></button></div>
    {loading?<p className="pulse-muted">Chargement des échéances…</p>:loadError?<p className="pulse-muted">Les échéances n’ont pas pu être chargées. <button className="textbtn" onClick={onOpenBills}>Ouvrir le calendrier</button></p>:dueRows.length===0?<div className="pulse-no-plan"><p>Aucune facture planifiée pour ce mois.</p><button className="secondary" onClick={onOpenBills}>Ajouter une échéance <ArrowRight size={15}/></button></div>:<><div className="pulse-due-total"><strong>{fmt(dueRows.reduce((sum,row)=>sum+row.amount_cents,0))}</strong><span>{dueRows.length} échéance{dueRows.length>1?'s':''} · paiements non confirmés</span></div><ul className="pulse-due-list">{dueRows.slice(0,3).map(row=><li key={row.id}><span className="pulse-date"><b>{String(row.day).padStart(2,'0')}</b></span><span className="pulse-due-name">{row.title}<small>{row.frequency==='annual'?'Annuelle':'Mensuelle'}</small></span><strong>{fmt(row.amount_cents)}</strong></li>)}</ul>{dueRows.length>3&&<button className="textbtn" onClick={onOpenBills}>Afficher les {dueRows.length} échéances <ArrowRight size={15}/></button>}</>}
   </div>
  </div>
  <div className="pulse-actions"><span><CheckCircle2 size={16}/> Chaque montant reste modifiable dans votre budget.</span><div><button className="secondary" onClick={onAddExpense}><Plus size={15}/> Ajouter une dépense</button><button className="textbtn" onClick={onOpenBank}>Importer un relevé <ArrowRight size={15}/></button></div></div>
 </section>;
}
