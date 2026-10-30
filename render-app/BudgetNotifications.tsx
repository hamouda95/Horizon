import {useState} from 'react';
import {Bell} from 'lucide-react';
import type {Entry} from './household-data';
import type {CategoryBudget} from './useCategoryBudgets';
import {categorySpending,type BudgetCategory} from './CategoryBudgetSummary';
import {categoryBudgetProgress} from './overview-metrics';
export default function BudgetNotifications({householdId,categories,entries,budgets,today,error,loading,onBudget}:{householdId:string;categories:BudgetCategory[];entries:Entry[];budgets:CategoryBudget[];today:string;error:string;loading:boolean;onBudget:()=>void}){
 const [open,setOpen]=useState(false),[read,setRead]=useState<Set<string>>(new Set());const month=today.slice(0,7);
 const alerts=categories.filter(c=>c.kind==='expense').flatMap(c=>{const limit=budgets.find(b=>b.category_id===c.id&&b.month===month+'-01')?.amount_cents;if(limit===undefined)return [];const progress=categoryBudgetProgress(categorySpending(entries,c.id,month,today),limit);return progress.percent!==null&&progress.percent>=90?[{id:householdId+month+c.id,name:c.name,percent:progress.percent}]:[]});
 const unread=alerts.filter(a=>!read.has(a.id)).length;
 return <div className="budget-notifications"><button type="button" className="notification-trigger" aria-label={`Notifications : ${unread} non lue(s)`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Bell size={20}/>{unread>0&&<b>{unread}</b>}</button>{open&&<div className="notification-popover"><div className="compact-section-title"><b>Notifications du mois</b><button className="textbtn" onClick={()=>setOpen(false)}>Fermer</button></div>{error?<p role="alert">Les alertes sont indisponibles : {error}</p>:loading?<p>Chargement…</p>:!alerts.length?<p>Aucune catégorie à 90 % de son plafond.</p>:<>{alerts.map(a=><button className="notification-item" key={a.id} onClick={()=>{setRead(v=>new Set([...v,a.id]));setOpen(false);onBudget()}}><b>{a.name} : {Math.round(a.percent)} %</b><span>{a.percent>=100?'Plafond atteint ou dépassé.':'Seuil de 90 % atteint.'} Voir le budget →</span></button>)}<button className="textbtn" onClick={()=>setRead(new Set(alerts.map(a=>a.id)))}>Tout marquer comme lu</button></>}<small>Les alertes reposent sur les plafonds définis. Aucun e-mail envoyé.</small></div>}</div>;
}
