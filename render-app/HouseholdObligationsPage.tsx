import {appLocale} from './locale';
import {useEffect,useMemo,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {Pencil,Trash2,X} from 'lucide-react';
import type {Tables} from './database.types';
import {parseEuroCents} from './money';
import PeriodControl from './PeriodControl';
import {supabase} from './client';

type Category={id:string;name:string};
type Obligation=Pick<Tables<'household_obligations'>,'id'|'category_id'|'title'|'amount_cents'|'frequency'|'due_day'|'due_month'|'note'|'active'>;
const fmt=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR'}).format(cents/100);
const monthName=(month:number)=>new Date(2026,month-1,1).toLocaleDateString(appLocale(),{month:'long'});
const actualDay=(year:number,month:number,day:number)=>Math.min(day,new Date(year,month,0).getDate());

export default function HouseholdObligationsPage({householdId,categories,month,setMonth,refreshVersion}:{householdId:string;categories:Category[];month:string;setMonth:Dispatch<SetStateAction<string>>;refreshVersion:number}){
 const [rows,setRows]=useState<Obligation[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[frequency,setFrequency]=useState<'monthly'|'annual'>('monthly'),[dueDay,setDueDay]=useState('1'),[dueMonth,setDueMonth]=useState('1'),[categoryId,setCategoryId]=useState(''),[note,setNote]=useState('');
 async function refresh(){
  if(!householdId){setRows([]);setLoading(false);return}
  setLoading(true);const {data,error:queryError}=await supabase.from('household_obligations').select('id,category_id,title,amount_cents,frequency,due_day,due_month,note,active').eq('household_id',householdId).eq('active',true).order('due_day',{ascending:true});
  if(queryError)setError(queryError.message);else setRows((data||[]) as Obligation[]);
  setLoading(false);
 }
 useEffect(()=>{void refresh()},[householdId,refreshVersion]);
 const [year,monthNumber]=month.split('-').map(Number);
 const dueRows=useMemo(()=>rows.flatMap(row=>{
  if(row.frequency==='annual'&&row.due_month!==monthNumber)return [];
  const day=actualDay(year,monthNumber,row.due_day);
  return [{...row,dueDate:`${year}-${String(monthNumber).padStart(2,'0')}-${String(day).padStart(2,'0')}`}];
 }),[rows,year,monthNumber]);
 const monthlyReserve=rows.reduce((sum,row)=>sum+(row.frequency==='monthly'?row.amount_cents:Math.floor(row.amount_cents/12)+(monthNumber-1<row.amount_cents%12?1:0)),0);
 function resetForm(){setEditingId(null);setTitle('');setAmount('');setFrequency('monthly');setDueDay('1');setDueMonth(String(monthNumber));setCategoryId('');setNote('')}
 function beginEdit(row:Obligation){setEditingId(row.id);setTitle(row.title);setAmount(String(row.amount_cents/100));setFrequency(row.frequency as 'monthly'|'annual');setDueDay(String(row.due_day));setDueMonth(String(row.due_month||monthNumber));setCategoryId(row.category_id||'');setNote(row.note||'');setError('')}
 async function save(e:React.FormEvent){
  e.preventDefault();const cents=parseEuroCents(amount);const day=Number(dueDay);const dueMonthValue=frequency==='annual'?Number(dueMonth):null;
  if(!title.trim()||title.trim().length>100||cents===null||cents<=0||cents>100000000000){setError('Renseignez un intitulé et un montant valides.');return}
  if(!Number.isInteger(day)||day<1||day>31||frequency==='annual'&&(!dueMonthValue||dueMonthValue<1||dueMonthValue>12)){setError('Choisissez une date d’échéance valide.');return}
  setBusy(true);setError('');setNotice('');
  const payload={household_id:householdId,category_id:categoryId||null,title:title.trim(),amount_cents:cents,frequency,due_day:day,due_month:dueMonthValue,note:note.trim()||null,active:true};
  const result=editingId?await supabase.from('household_obligations').update(payload).eq('id',editingId):await supabase.from('household_obligations').insert(payload);
  if(result.error)setError(result.error.message);else{setNotice(editingId?'Échéance mise à jour.':'Échéance ajoutée.');resetForm();await refresh()}
  setBusy(false);
 }
 async function remove(row:Obligation){if(!window.confirm(`Supprimer l’échéance « ${row.title} » ?`))return;setBusy(true);setError('');const {error:removeError}=await supabase.from('household_obligations').delete().eq('id',row.id);if(removeError)setError(removeError.message);else{setNotice('Échéance supprimée.');if(editingId===row.id)resetForm();await refresh()}setBusy(false)}
 return <div className="product-page"><div className="page-heading"><div><span className="overline">ANTICIPER LES PAIEMENTS</span><h1>Échéances et provisions</h1><p>Planifiez les factures du foyer et mensualisez les charges annuelles.</p></div><PeriodControl month={month} setMonth={setMonth}/></div><section className="card product-summary"><div><small>À prévoir ce mois</small><strong>{fmt(monthlyReserve)}</strong><p>Factures mensuelles plus provisions des charges annuelles.</p></div><div><small>Échéances en {monthName(monthNumber)}</small><strong>{dueRows.length}</strong><p>Récurrentes ou annuelles prévues sur la période.</p></div></section>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Fermer">×</button></div>}<section className="card product-panel"><div className="sectionhead"><div><span className="overline">CALENDRIER DU FOYER</span><h2>Échéances de {monthName(monthNumber)}</h2></div></div>{loading?<p>Chargement des échéances…</p>:dueRows.length===0?<p className="product-empty">Aucune échéance prévue sur cette période. Ajoutez une facture récurrente ci-dessous.</p>:<div className="product-list">{dueRows.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(row=><article className="product-row" key={row.id}><div className="due-date"><b>{Number(row.dueDate.slice(8,10))}</b><small>{monthName(monthNumber).slice(0,3)}</small></div><div className="product-row-main"><b>{row.title}</b><small>{row.frequency==='annual'?`Annuelle · provision ${fmt(Math.floor(row.amount_cents/12))}/mois`:'Mensuelle'}{row.category_id&&categories.find(c=>c.id===row.category_id)?` · ${categories.find(c=>c.id===row.category_id)?.name}`:''}</small>{row.note&&<small>{row.note}</small>}</div><strong>{fmt(row.amount_cents)}</strong><button type="button" className="delete" aria-label={`Modifier ${row.title}`} onClick={()=>beginEdit(row)}><Pencil size={16}/></button><button type="button" className="delete" aria-label={`Supprimer ${row.title}`} disabled={busy} onClick={()=>void remove(row)}><Trash2 size={16}/></button></article>)}</div>}</section><section className="card product-panel"><div className="sectionhead"><div><span className="overline">PARAMÉTRER</span><h2>{editingId?'Modifier l’échéance':'Ajouter une échéance'}</h2></div>{editingId&&<button className="textbtn" type="button" onClick={resetForm}><X size={15}/> Annuler</button>}</div><form className="product-form" onSubmit={save}><label>Nom de la facture<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Loyer, assurance, électricité…"/></label><label>Montant (€)<input type="number" required min="0.01" max="1000000000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Fréquence<select value={frequency} onChange={e=>setFrequency(e.target.value as 'monthly'|'annual')}><option value="monthly">Chaque mois</option><option value="annual">Une fois par an</option></select></label><label>Jour d’échéance<input type="number" required min="1" max="31" value={dueDay} onChange={e=>setDueDay(e.target.value)}/></label>{frequency==='annual'&&<label>Mois<select required value={dueMonth} onChange={e=>setDueMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{monthName(i+1)}</option>)}</select></label>}<label>Catégorie<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Sans catégorie</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="wide-field">Note facultative<input maxLength={180} value={note} onChange={e=>setNote(e.target.value)} placeholder="Information utile pour le foyer"/></label><button className="primary" disabled={busy}>{busy?'Enregistrement…':editingId?'Enregistrer les changements':'Ajouter l’échéance'}</button></form><p className="product-footnote">Les provisions sont indicatives. Une échéance ne crée ni opération ni paiement.</p></section></div>;
}
