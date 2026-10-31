import {displayText} from '../../lib/text';
import {localToday} from '../../lib/dates';
import {collectPages} from '../../lib/pagination';
import {obligationsForMonth,rankPaymentCandidates,type Settlement} from './obligations';
import type {Entry} from '../../hooks/household-data';
import {appLocale} from '../../lib/locale';
import {useEffect,useMemo,useState,useRef} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {Pencil,Trash2,X} from 'lucide-react';
import type {Tables} from '../../lib/database.types';
import {parseEuroCents} from '../../lib/money';
import PeriodControl from '../../components/PeriodControl';
import {supabase} from '../../lib/client';

type Category={id:string;name:string};
type Obligation=Pick<Tables<'household_obligations'>,'id'|'category_id'|'title'|'amount_cents'|'frequency'|'due_day'|'due_month'|'note'|'active'>;
const fmt=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR'}).format(cents/100);
const monthName=(month:number)=>new Date(2026,month-1,1).toLocaleDateString(appLocale(),{month:'long'});

export default function HouseholdObligationsPage({householdId,categories,month,setMonth,refreshVersion,entries}:{householdId:string;categories:Category[];month:string;setMonth:Dispatch<SetStateAction<string>>;refreshVersion:number;entries:Entry[]}){
 const [rows,setRows]=useState<Obligation[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [settlements,setSettlements]=useState<Settlement[]>([]),[paymentChoices,setPaymentChoices]=useState<Record<string,string>>({});
 const sequence=useRef(0);
 const [editingId,setEditingId]=useState<string|null>(null),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[frequency,setFrequency]=useState<'monthly'|'annual'>('monthly'),[dueDay,setDueDay]=useState('1'),[dueMonth,setDueMonth]=useState('1'),[categoryId,setCategoryId]=useState(''),[note,setNote]=useState('');
 async function refresh(){
  const version=++sequence.current;
  setLoading(true);setError('');
  try{
   const [obligations,payments]=await Promise.all([
    collectPages(async after=>{let q=supabase.from('household_obligations').select('id,category_id,title,amount_cents,frequency,due_day,due_month,note,active').eq('household_id',householdId).eq('active',true).order('id').limit(500);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return (data||[]) as Obligation[]}),
    collectPages(async after=>{let q=supabase.from('household_obligation_settlements').select('id,obligation_id,entry_id,settled_month').eq('household_id',householdId).order('id').limit(500);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return (data||[]) as Settlement[]})
   ]);
   if(version!==sequence.current)return;
   setRows(obligations);setSettlements(payments);
  }catch(e){if(version===sequence.current)setError((e as Error).message||'Impossible de charger les échéances.')}
  finally{if(version===sequence.current)setLoading(false)}
 }
 useEffect(()=>{void refresh();return()=>{sequence.current++}},[householdId,refreshVersion]);
 const monthNumber=Number(month.slice(5,7));
 const dueRows=useMemo(()=>obligationsForMonth(rows,settlements,month),[rows,settlements,month]);
 const unpaid=dueRows.filter(row=>row.status!=='paid');
 const candidates=entries.filter(entry=>entry.kind==='expense'&&entry.flowType==='standard'&&entry.date<=localToday()&&!settlements.some(s=>s.entry_id===entry.id)).sort((a,b)=>b.date.localeCompare(a.date));
 async function reconcile(obligationId:string){
  const entryId=paymentChoices[obligationId];if(!entryId)return;
  setBusy(true);setError('');setNotice('');
  try{
   const {error}=await supabase.from('household_obligation_settlements').insert({household_id:householdId,obligation_id:obligationId,entry_id:entryId,settled_month:month+'-01'});
   if(error)throw error;
   setPaymentChoices({});setNotice('Échéance rapprochée de la dépense existante. Aucun montant ajouté au budget.');await refresh();
  }catch(e){setError((e as Error).message||'Rapprochement impossible.')}
  finally{setBusy(false)}
 }
 async function unlink(settlement:Settlement){
  setBusy(true);setError('');setNotice('');
  try{
   const {data,error}=await supabase.from('household_obligation_settlements').delete().eq('id',settlement.id).eq('household_id',householdId).select('id').maybeSingle();
   if(error)throw error;if(!data)throw Error('Rapprochement introuvable. Actualisez les données.');
   setNotice('Rapprochement annulé. La dépense reste dans le budget.');await refresh();
  }catch(e){setError((e as Error).message||'Impossible d’annuler ce rapprochement.')}
  finally{setBusy(false)}
 }
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
 return <div className="product-page"><div className="page-heading"><div><span className="overline">Anticiper les paiements</span><h1>Échéances et provisions</h1><p>Factures prévues et charges annuelles, au même endroit.</p></div><PeriodControl month={month} setMonth={setMonth}/></div><section className="card product-summary"><div><small>À prévoir ce mois</small><strong>{fmt(monthlyReserve)}</strong><p>Factures + provisions annuelles.</p></div><div><small>Échéances en {monthName(monthNumber)}</small><strong>{dueRows.length}</strong><p>{unpaid.length} à payer · {dueRows.filter(row=>row.status==='overdue').length} en retard.</p></div><div><small>Reste à payer</small><strong>{fmt(unpaid.reduce((sum,row)=>sum+row.amount_cents,0))}</strong><p>Estimations des échéances non rapprochées.</p></div></section>{error&&<div className="error" role="alert">{displayText(error)}</div>}{notice&&<div className="notice" role="status">{displayText(notice)}<button onClick={()=>setNotice('')} aria-label="Fermer">×</button></div>}<section className="card product-panel"><div className="sectionhead"><div><span className="overline">Calendrier du foyer</span><h2>Échéances de {monthName(monthNumber)}</h2></div></div>{loading?<p>Chargement des échéances…</p>:dueRows.length===0?<p className="product-empty">Aucune échéance. Ajoutez une facture ci-dessous.</p>:<div className="product-list">{dueRows.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(row=><article className="product-row" key={row.id}><div className="due-date"><b>{Number(row.dueDate.slice(8,10))}</b><small>{monthName(monthNumber).slice(0,3)}</small></div><div className="product-row-main"><b>{row.title}</b><small>{row.frequency==='annual'?`Annuelle · provision ${fmt(Math.floor(row.amount_cents/12))}/mois`:'Mensuelle'}{row.category_id&&categories.find(c=>c.id===row.category_id)?` · ${categories.find(c=>c.id===row.category_id)?.name}`:''}</small>{row.note&&<small>{row.note}</small>}<small className={row.status==='overdue'?'negative':row.status==='paid'?'positive':''}>{row.status==='paid'?'Payée':row.status==='overdue'?'En retard':'À payer'}{row.settlement?` · dépense rapprochée : ${fmt(entries.find(entry=>entry.id===row.settlement?.entry_id)?.amount||0)}`:''}</small>{row.settlement?<button className="textbtn" type="button" disabled={busy} onClick={()=>void unlink(row.settlement!)}>Annuler le rapprochement</button>:<div className="bill-reconcile"><select aria-label={displayText(`Dépense réglant ${row.title}`)} value={paymentChoices[row.id]||''} disabled={busy} onChange={e=>setPaymentChoices(current=>({...current,[row.id]:e.target.value}))}><option value="">Choisir une dépense enregistrée</option>{(()=>{const ranked=rankPaymentCandidates(candidates,row.amount_cents,row.dueDate),option=(entry:Entry)=><option key={entry.id} value={entry.id}>{entry.date} · {displayText(entry.label)} · {fmt(entry.amount)}</option>;return <>{ranked.suggested.length>0&&<optgroup label="Suggestions : montant et date proches">{ranked.suggested.map(option)}</optgroup>}<optgroup label={`Autres dépenses à moins de 2 mois${ranked.hidden?` · ${ranked.hidden} plus éloignées masquées`:''}`}>{ranked.others.map(option)}</optgroup></>})()}</select><button type="button" className="secondary" disabled={busy||!paymentChoices[row.id]} onClick={()=>void reconcile(row.id)}>Marquer payée</button></div>}</div><strong>{fmt(row.amount_cents)}</strong><button type="button" className="delete" aria-label={displayText(`Modifier ${row.title}`)} onClick={()=>beginEdit(row)}><Pencil size={16}/></button><button type="button" className="delete" aria-label={displayText(`Supprimer ${row.title}`)} disabled={busy} onClick={()=>void remove(row)}><Trash2 size={16}/></button></article>)}</div>}</section><section className="card product-panel"><div className="sectionhead"><div><span className="overline">Paramétrer</span><h2>{editingId?'Modifier l’échéance':'Ajouter une échéance'}</h2></div>{editingId&&<button className="textbtn" type="button" onClick={resetForm}><X size={15}/> Annuler</button>}</div><form className="product-form" onSubmit={save}><label>Nom de la facture<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Loyer, assurance, électricité…"/></label><label>Montant (€)<input type="number" required min="0.01" max="1000000000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Fréquence<select value={frequency} onChange={e=>setFrequency(e.target.value as 'monthly'|'annual')}><option value="monthly">Chaque mois</option><option value="annual">Une fois par an</option></select></label><label>Jour d’échéance<input type="number" required min="1" max="31" value={dueDay} onChange={e=>setDueDay(e.target.value)}/></label>{frequency==='annual'&&<label>Mois<select required value={dueMonth} onChange={e=>setDueMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{monthName(i+1)}</option>)}</select></label>}<label>Catégorie<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Sans catégorie</option>{categories.map(category=><option key={category.id} value={category.id}>{displayText(category.name)}</option>)}</select></label><label className="wide-field">Note facultative<input maxLength={180} value={note} onChange={e=>setNote(e.target.value)} placeholder="Information utile pour le foyer"/></label><button className="primary" disabled={busy}>{busy?'Enregistrement…':editingId?'Enregistrer les changements':'Ajouter l’échéance'}</button></form><p className="product-footnote">Les provisions sont indicatives. « Marquer payée » associe une dépense déjà saisie ou importée ; aucun paiement ni nouvelle dépense n’est créé. Un paiement peut être rapproché d’une échéance d’un autre mois.</p></section></div>;
}
