import {Pencil} from 'lucide-react';
import CategoryBudgetEditor from '../budget/CategoryBudgetEditor';
import {displayText} from '../../lib/text';
import {useState} from 'react';
import {financialPeriod} from '../../lib/finance-engine';
import type {Entry} from '../../hooks/household-data';
import type {CategoryBudget} from '../../hooks/useCategoryBudgets';
import {categoryBudgetProgress,budgetPercentLabel} from './overview-metrics';
import {budgetMonth} from '../../lib/period';
import {appLocale} from '../../lib/locale';
export type BudgetCategory={id:string;name:string;kind:string;active:boolean};
export function categorySpending(entries:Entry[],categoryId:string,month:string,today:string){return financialPeriod(entries,month,today).byCategory.get(categoryId)||0}
const money=(n:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR'}).format(n/100);
export default function CategoryBudgetSummary({householdId,onChanged,categories,entries,budgets,month,today,error,loading,onBudget}:{householdId?:string;onChanged?:()=>Promise<unknown>;categories:BudgetCategory[];entries:Entry[];budgets:CategoryBudget[];month:string;today:string;error:string;loading:boolean;onBudget:()=>void}){
 const [editing,setEditing]=useState<{id:string;name:string;limit:number|null}|null>(null);
 const rows=categories.filter(c=>c.kind==='expense').map(c=>{const spent=categorySpending(entries,c.id,month,today),limit=budgets.find(b=>b.category_id===c.id&&b.month===month+'-01')?.amount_cents??null;return {...c,spent,limit,...categoryBudgetProgress(spent,limit)}}).filter(c=>c.active||c.spent>0||c.limit!==null).sort((a,b)=>(b.percent??-1)-(a.percent??-1)||b.spent-a.spent);
 return <section className="card category-budget-summary"><div className="compact-section-title"><h2>Budget par catégorie</h2><button className="textbtn" onClick={onBudget}>Définir les plafonds →</button></div>{error?<p role="alert">{displayText(error)}</p>:loading?<p>Chargement des plafonds…</p>:!rows.length?<p>Aucune catégorie de sortie renseignée. Ajoutez vos catégories pour suivre leur budget.</p>:<div className="category-budget-grid">{rows.map(c=><div className="category-budget-item" key={c.id}><div><span className="budget-category-name">{householdId&&<button type="button" className="budget-pencil" aria-label={displayText('Modifier le plafond : '+displayText(c.name))} title={displayText('Modifier le plafond : '+displayText(c.name))} onClick={()=>setEditing(c)}><Pencil size={12}/></button>}<b>{displayText(c.name)}</b></span><span>{money(c.spent)}{c.limit!==null?' / '+money(c.limit):''}</span></div><div className={'category-meter tone-'+c.tone} role={c.percent!==null?'progressbar':undefined} aria-label={displayText(c.name)} aria-valuemin={c.percent!==null?0:undefined} aria-valuemax={c.percent!==null?100:undefined} aria-valuenow={c.percent!==null?Math.min(100,Math.round(c.percent)):undefined}><i style={{width:Math.max(0,Math.min(100,c.percent??0))+'%'}}/></div><small>{c.percent===null?'Plafond non défini':`${budgetPercentLabel(c.percent)} % · ${c.remaining!<0?'Dépassement '+money(-c.remaining!):'Reste '+money(c.remaining!)}`}</small></div>)}</div>}<p className="compact-disclaimer">Sorties de consommation confirmées du mois. Transferts, épargne, placements et opérations à vérifier exclus. Un remboursement reste affiché séparément des dépenses.</p>{editing&&householdId&&<CategoryBudgetEditor key={editing.id+month} householdId={householdId} category={editing} month={month} onClose={()=>setEditing(null)} onChanged={onChanged||(async()=>{})}/>}</section>;
}
