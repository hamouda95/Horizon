import {appLocale} from './locale';
import {useEffect,useState} from 'react';
import {Trash2} from 'lucide-react';
import {supabase} from './client';
import {parseEuroCents} from './money';
import {monthlyBudgetStatus} from './financial';
import type {Entry} from './household-data';

type Category={id:string;name:string;active:boolean};
type Envelope={id:string;category_id:string;amount_cents:number};
const euro=(amount:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(amount/100);

export default function CategoryEnvelopePlanner({householdId,categories,month,entries,refreshVersion}:{householdId:string;categories:Category[];month:string;entries:Entry[];refreshVersion:number}){
 const [envelopes,setEnvelopes]=useState<Envelope[]>([]),[amounts,setAmounts]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[saving,setSaving]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function refresh(){
  if(!householdId){setEnvelopes([]);setLoading(false);return}
  setLoading(true);setError('');
  const {data,error:queryError}=await supabase.from('monthly_category_budgets').select('id,category_id,amount_cents').eq('household_id',householdId).eq('month',`${month}-01`);
  if(queryError){setError(queryError.message);setLoading(false);return}
  const rows=(data||[]) as Envelope[];setEnvelopes(rows);
  setAmounts(Object.fromEntries(categories.map(c=>{const row=rows.find(x=>x.category_id===c.id);return [c.id,row?String(row.amount_cents/100):'']})));
  setLoading(false);
 }
 useEffect(()=>{void refresh()},[householdId,month,categories,refreshVersion]);
 async function save(category:Category){
  const cents=parseEuroCents(amounts[category.id]||'');
  if(cents===null||cents<0||cents>100000000000){setError('Saisissez un montant de budget valide.');return}
  setSaving(category.id);setError('');setNotice('');
  const {error:saveError}=await supabase.from('monthly_category_budgets').upsert({household_id:householdId,category_id:category.id,month:`${month}-01`,amount_cents:cents},{onConflict:'household_id,category_id,month'});
  if(saveError)setError(saveError.message);else{setNotice(`Enveloppe « ${category.name} » enregistrée.`);await refresh()}
  setSaving(null);
 }
 async function remove(category:Category){
  const envelope=envelopes.find(x=>x.category_id===category.id);if(!envelope)return;
  setSaving(category.id);setError('');setNotice('');
  const {error:deleteError}=await supabase.from('monthly_category_budgets').delete().eq('id',envelope.id);
  if(deleteError)setError(deleteError.message);else{setNotice(`Enveloppe « ${category.name} » supprimée.`);await refresh()}
  setSaving(null);
 }
 return <section className="card envelope-planner"><div><span className="overline">RÉPARTIR LES DÉPENSES</span><h2>Enveloppes par catégorie</h2><p>Plafond et dépenses enregistrées pour {new Date(`${month}-01T12:00:00`).toLocaleDateString(appLocale(),{month:'long',year:'numeric'})}.</p></div>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="sharing-notice" role="status">{notice}</div>}{!householdId?<p>Créez un foyer pour définir des plafonds.</p>:loading?<p>Chargement des enveloppes…</p>:categories.length===0?<p>Ajoutez une catégorie pour créer son plafond.</p>:<div className="envelope-list">{categories.map(category=>{
  const envelope=envelopes.find(x=>x.category_id===category.id),limit=envelope?.amount_cents||0;
  const spent=entries.filter(x=>x.kind==='expense'&&(x.flowType||'standard')==='standard'&&x.categoryId===category.id).reduce((sum,x)=>sum+x.amount,0);
  const status=monthlyBudgetStatus(spent,limit);const percent=limit>0?Math.min(100,Math.round(spent/limit*100)):0;
  return <form className="envelope-row" key={category.id} onSubmit={e=>{e.preventDefault();void save(category)}}><div className="envelope-heading"><div><b>{category.name}</b><small>{limit>0?`${euro(spent)} dépensés sur ${euro(limit)}`:`Dépenses : ${euro(spent)}`}</small></div><label className="envelope-input"><span className="sr-only">Budget mensuel pour {category.name}, en euros</span><input type="number" min="0" max="1000000000" step="0.01" required value={amounts[category.id]??''} onChange={e=>setAmounts(v=>({...v,[category.id]:e.target.value}))} placeholder="0,00 €"/><span>€</span></label><button className="primary envelope-save" disabled={saving===category.id}>{saving===category.id?'…':'Enregistrer'}</button>{envelope&&<button className="delete" type="button" disabled={saving===category.id} aria-label={`Supprimer l’enveloppe ${category.name}`} onClick={()=>void remove(category)}><Trash2 size={16}/></button>}</div>{limit>0&&<div className="envelope-progress" role="progressbar" aria-label={`Dépenses de ${category.name}`} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(spent,limit)}><span className={spent>limit?'over-limit':''} style={{width:`${percent}%`}}/></div>}{status?.thresholdReached&&spent<=limit&&<small className="envelope-warning" role="status">{spent===limit?'Enveloppe consommée':'80 % de cette enveloppe atteint'} · {Math.round(status.percent||0)} % utilisé</small>}{limit>0&&spent>limit&&<small className="envelope-over">Dépassement de {euro(spent-limit)}</small>}</form>;
 })}</div>}</section>;
}
