import {appLocale} from './locale';
import {useEffect,useState} from 'react';
import {Trash2} from 'lucide-react';
import type {Tables} from './database.types';
import {collectPages} from './pagination';
import {parseEuroCents} from './money';
import {supabase} from './client';

type Movement=Pick<Tables<'savings_movements'>,'id'|'goal_id'|'movement_type'|'amount_cents'|'movement_date'|'note'>;
type Goal=Pick<Tables<'household_savings_goals'>,'id'|'title'>;
const euro=(amount:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(amount/100);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

export default function SavingsMovementTracker({householdId}:{householdId:string}){
 const [movements,setMovements]=useState<Movement[]>([]),[goals,setGoals]=useState<Goal[]>([]),[goalId,setGoalId]=useState(''),[type,setType]=useState<'deposit'|'withdrawal'>('deposit'),[amount,setAmount]=useState(''),[date,setDate]=useState(today()),[note,setNote]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function refresh(){
  if(!householdId){setMovements([]);setLoading(false);return}
  setLoading(true);
  try{
   const [rows,goalResult]=await Promise.all([collectPages(async after=>{
    let query=supabase.from('savings_movements').select('id,goal_id,movement_type,amount_cents,movement_date,note').eq('household_id',householdId).order('id',{ascending:true}).limit(500);
    if(after)query=query.gt('id',after);
    const {data,error:queryError}=await query;if(queryError)throw queryError;
    return (data||[]) as Movement[];
   }),supabase.from('household_savings_goals').select('id,title').eq('household_id',householdId).order('title')]);
   if(goalResult.error)throw goalResult.error;setGoals((goalResult.data||[]) as Goal[]);
   setMovements(rows.sort((a,b)=>b.movement_date.localeCompare(a.movement_date)||b.id.localeCompare(a.id)));
  }catch(e){setError((e as Error).message||'Impossible de charger les mouvements d’épargne.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[householdId]);
 async function addMovement(e:React.FormEvent){
  e.preventDefault();const cents=parseEuroCents(amount);
  if(cents===null||cents<=0||cents>100000000000){setError('Saisissez un montant valide supérieur à zéro.');return}
  if(!date){setError('Choisissez une date.');return}
  setSaving(true);setError('');setNotice('');
  const {error:insertError}=await supabase.from('savings_movements').insert({household_id:householdId,goal_id:goalId||null,movement_type:type,amount_cents:cents,movement_date:date,note:note.trim()||null});
  if(insertError)setError(insertError.message);else{setAmount('');setNote('');setGoalId('');setDate(today());setNotice('Mouvement ajouté au suivi.');await refresh()}
  setSaving(false);
 }
 async function removeMovement(movement:Movement){
  if(!window.confirm('Supprimer ce mouvement du suivi ?'))return;
  setSaving(true);setError('');setNotice('');
  const {error:deleteError}=await supabase.from('savings_movements').delete().eq('id',movement.id);
  if(deleteError)setError(deleteError.message);else{setNotice('Mouvement supprimé.');await refresh()}
  setSaving(false);
 }
 const balance=movements.reduce((total,m)=>total+(m.movement_type==='deposit'?m.amount_cents:-m.amount_cents),0);
 return <section className="card savings-tracker"><div className="savings-tracker-head"><div><span className="overline">SUIVI MANUEL</span><h2>Mouvements d’épargne</h2><p>Notez les versements et retraits pour suivre votre solde d’épargne.</p></div><div className="savings-balance"><small>Solde suivi</small><b>{euro(balance)}</b></div></div>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="sharing-notice" role="status">{notice}</div>}<form className="savings-movement-form" onSubmit={addMovement}><label>Type<select value={type} onChange={e=>setType(e.target.value as 'deposit'|'withdrawal')}><option value="deposit">Versement</option><option value="withdrawal">Retrait</option></select></label><label>Montant (€)<input type="number" min="0.01" max="1000000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>{goals.length>0&&<label>Projet lié<select value={goalId} onChange={e=>setGoalId(e.target.value)}><option value="">Aucun projet</option>{goals.map(goal=><option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>}<label className="savings-note">Note <span className="optional">(facultative)</span><input maxLength={120} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex. épargne vacances"/></label><button className="primary" disabled={saving||!householdId}>{saving?'Enregistrement…':'Ajouter'}</button></form><p className="savings-disclaimer">Ce suivi est déclaratif et n’effectue aucun virement.</p><div className="savings-movements-list"><h3>Historique</h3>{loading?<p>Chargement des mouvements…</p>:movements.length===0?<p>Aucun mouvement enregistré.</p>:movements.map(m=><div className="savings-movement-row" key={m.id}><div><b>{m.movement_type==='deposit'?'Versement':'Retrait'}{m.goal_id&&goals.find(goal=>goal.id===m.goal_id)?` · ${goals.find(goal=>goal.id===m.goal_id)?.title}`:''}</b><small>{new Date(`${m.movement_date}T12:00:00`).toLocaleDateString(appLocale())}{m.note?` · ${m.note}`:''}</small></div><strong className={m.movement_type==='deposit'?'positive':'negative'}>{m.movement_type==='deposit'?'+':'−'} {euro(m.amount_cents)}</strong><button className="delete" type="button" disabled={saving} onClick={()=>void removeMovement(m)} aria-label="Supprimer ce mouvement"><Trash2 size={16}/></button></div>)}</div></section>;
}
