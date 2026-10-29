import {appLocale} from './locale';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,Plus} from 'lucide-react';
import type {Tables} from './database.types';
import {supabase} from './client';

type Obligation=Pick<Tables<'household_obligations'>,'id'|'title'|'amount_cents'|'frequency'|'due_day'|'due_month'>;
const fmt=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR'}).format(cents/100);
const monthName=(month:string)=>new Date(month+'-01T12:00:00').toLocaleDateString(appLocale(),{month:'long',year:'numeric'});

export default function HouseholdPulse({householdId,month,refreshVersion,onOpenBills}:{householdId:string;month:string;refreshVersion:number;onOpenBills:()=>void}){
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
  return [{...row,day:Math.min(row.due_day,new Date(year,monthNumber,0).getDate())}];
 }).sort((a,b)=>a.day-b.day),[obligations,year,monthNumber]);
 return <section className="card household-pulse pulse-upcoming" aria-labelledby="pulse-title">
  <div className="pulse-heading"><div><span className="overline">À VENIR</span><h2 id="pulse-title">Échéances · {monthName(month)}</h2></div><button className="textbtn" onClick={onOpenBills}>Calendrier <ArrowRight size={15}/></button></div>
  {loading?<p className="pulse-muted">Chargement…</p>:loadError?<p className="pulse-muted">Échéances indisponibles. <button className="textbtn" onClick={onOpenBills}>Ouvrir le calendrier</button></p>:dueRows.length===0?<div className="pulse-no-plan"><p>Aucune facture prévue.</p><button className="secondary" onClick={onOpenBills}>Ajouter une échéance <Plus size={15}/></button></div>:<><div className="pulse-due-total"><strong>{fmt(dueRows.reduce((sum,row)=>sum+row.amount_cents,0))}</strong><span>{dueRows.length} échéance{dueRows.length===1?'':'s'} · paiements non confirmés</span></div><ul className="pulse-due-list">{dueRows.slice(0,3).map(row=><li key={row.id}><span className="pulse-date"><b>{String(row.day).padStart(2,'0')}</b></span><span className="pulse-due-name">{row.title}<small>{row.frequency==='annual'?'Annuelle':'Mensuelle'}</small></span><strong>{fmt(row.amount_cents)}</strong></li>)}</ul>{dueRows.length>3&&<button className="textbtn" onClick={onOpenBills}>Voir les {dueRows.length} échéances <ArrowRight size={15}/></button>}</>}
 </section>;
}
