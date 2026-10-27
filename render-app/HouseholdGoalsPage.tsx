import {useEffect,useState} from 'react';
import {Pencil,Trash2,X} from 'lucide-react';
import type {Tables} from './database.types';
import {collectPages} from './pagination';
import {parseEuroCents} from './money';
import {supabase} from './client';

type Goal=Pick<Tables<'household_savings_goals'>,'id'|'title'|'target_cents'|'target_date'|'created_at'>;
type Movement=Pick<Tables<'savings_movements'>,'id'|'goal_id'|'movement_type'|'amount_cents'>;
const fmt=(cents:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100);

export default function HouseholdGoalsPage({householdId,refreshVersion}:{householdId:string;refreshVersion:number}){
 const [goals,setGoals]=useState<Goal[]>([]),[movements,setMovements]=useState<Movement[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null),[title,setTitle]=useState(''),[target,setTarget]=useState(''),[targetDate,setTargetDate]=useState('');
 async function refresh(){
  if(!householdId){setGoals([]);setMovements([]);setLoading(false);return}
  setLoading(true);
  try{
   const [goalResult,movementRows]=await Promise.all([
    supabase.from('household_savings_goals').select('id,title,target_cents,target_date,created_at').eq('household_id',householdId).order('created_at',{ascending:false}),
    collectPages(async after=>{let q=supabase.from('savings_movements').select('id,goal_id,movement_type,amount_cents').eq('household_id',householdId).order('id',{ascending:true}).limit(500);if(after)q=q.gt('id',after);const {data,error:qError}=await q;if(qError)throw qError;return (data||[]) as Movement[]})
   ]);
   if(goalResult.error)throw goalResult.error;
   setGoals((goalResult.data||[]) as Goal[]);setMovements(movementRows);
  }catch(e){setError((e as Error).message||'Impossible de charger les objectifs.')}
  setLoading(false);
 }
 useEffect(()=>{void refresh()},[householdId,refreshVersion]);
 function reset(){setEditingId(null);setTitle('');setTarget('');setTargetDate('')}
 function edit(goal:Goal){setEditingId(goal.id);setTitle(goal.title);setTarget(String(goal.target_cents/100));setTargetDate(goal.target_date||'');setError('')}
 async function save(e:React.FormEvent){
  e.preventDefault();const cents=parseEuroCents(target);if(!title.trim()||title.trim().length>80||cents===null||cents<=0||cents>100000000000){setError('Renseignez un nom et un montant cible valides.');return}
  setBusy(true);setError('');setNotice('');const payload={household_id:householdId,title:title.trim(),target_cents:cents,target_date:targetDate||null};
  const result=editingId?await supabase.from('household_savings_goals').update(payload).eq('id',editingId):await supabase.from('household_savings_goals').insert(payload);
  if(result.error)setError(result.error.message);else{setNotice(editingId?'Objectif mis à jour.':'Objectif créé.');reset();await refresh()}setBusy(false);
 }
 async function remove(goal:Goal){if(!window.confirm(`Supprimer l’objectif « ${goal.title} » ? Les mouvements restent dans le suivi général.`))return;setBusy(true);setError('');const {error:removeError}=await supabase.from('household_savings_goals').delete().eq('id',goal.id);if(removeError)setError(removeError.message);else{setNotice('Objectif supprimé. Les mouvements associés restent dans le journal.');if(editingId===goal.id)reset();await refresh()}setBusy(false)}
 const progress=(goalId:string)=>movements.filter(m=>m.goal_id===goalId).reduce((sum,m)=>sum+(m.movement_type==='deposit'?m.amount_cents:-m.amount_cents),0);
 return <div className="product-page"><div className="page-heading"><div><span className="overline">PROJETS DU FOYER</span><h1>Objectifs d’épargne</h1><p>Fixez une cible et liez vos versements ou retraits à chaque projet.</p></div></div><section className="card product-summary"><div><small>Objectifs actifs</small><strong>{goals.length}</strong><p>Les objectifs sont partagés avec les membres du foyer.</p></div><div><small>Montants cibles</small><strong>{fmt(goals.reduce((sum,g)=>sum+g.target_cents,0))}</strong><p>Progression calculée à partir des mouvements affectés.</p></div></section>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Fermer">×</button></div>}<section className="card product-panel"><div className="sectionhead"><div><span className="overline">VOS PROJETS</span><h2>Progression du foyer</h2></div></div>{loading?<p>Chargement des objectifs…</p>:goals.length===0?<p className="product-empty">Aucun objectif pour le moment. Commencez par un projet qui compte pour votre foyer.</p>:<div className="goal-grid">{goals.map(goal=>{const saved=progress(goal.id),ratio=Math.max(0,Math.min(100,Math.round(saved/goal.target_cents*100)));return <article className="goal-card" key={goal.id}><div className="sectionhead"><div><span className="overline">OBJECTIF</span><h3>{goal.title}</h3></div><div className="goal-actions"><button className="delete" aria-label={`Modifier ${goal.title}`} onClick={()=>edit(goal)}><Pencil size={16}/></button><button className="delete" disabled={busy} aria-label={`Supprimer ${goal.title}`} onClick={()=>void remove(goal)}><Trash2 size={16}/></button></div></div><div className="goal-amounts"><b>{fmt(saved)}</b><span>sur {fmt(goal.target_cents)}</span></div><div className="envelope-progress" role="progressbar" aria-label={`Progression de ${goal.title}`} aria-valuemin={0} aria-valuemax={goal.target_cents} aria-valuenow={Math.max(0,Math.min(saved,goal.target_cents))}><span style={{width:`${ratio}%`}}/></div><small>{goal.target_date?`Échéance le ${new Date(`${goal.target_date}T12:00:00`).toLocaleDateString('fr-FR')}`:'Sans date cible'} · {ratio}% atteint</small></article>})}</div>}</section><section className="card product-panel"><div className="sectionhead"><div><span className="overline">PLANIFIER</span><h2>{editingId?'Modifier un objectif':'Créer un objectif'}</h2></div>{editingId&&<button type="button" className="textbtn" onClick={reset}><X size={15}/> Annuler</button>}</div><form className="product-form" onSubmit={save}><label>Nom du projet<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Vacances, précaution, travaux…"/></label><label>Montant cible (€)<input type="number" required min="0.01" max="1000000000" step="0.01" value={target} onChange={e=>setTarget(e.target.value)}/></label><label>Date souhaitée <span className="optional">(facultative)</span><input type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Enregistrement…':editingId?'Enregistrer les changements':'Créer l’objectif'}</button></form><p className="product-footnote">Les versements et retraits ne sont associés à un projet que si vous le choisissez dans le suivi d’épargne.</p></section></div>;
}
