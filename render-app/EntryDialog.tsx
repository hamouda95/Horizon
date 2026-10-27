import type {Dispatch, FormEventHandler, SetStateAction} from 'react';
import {ArrowRight} from 'lucide-react';

type EntryKind='income'|'expense';
type Frequency='monthly'|'annual';
type Allocation='calendar'|'next_month';
type ExpenseType=''|'recurring'|'one_off';
type Setter<T>=Dispatch<SetStateAction<T>>;
type Subcategory={id:string;name:string};

export default function EntryDialog({kind,setKind,label,setLabel,amount,setAmount,date,setDate,category,setCategory,categories,subcategoryId,setSubcategoryId,subcategories,newSubcategory,setNewSubcategory,addSubcategory,frequency,setFrequency,expenseType,setExpenseType,allocation,setAllocation,editingId,saving,onSubmit}:{
 kind:EntryKind;setKind:Setter<EntryKind>;
 label:string;setLabel:Setter<string>;
 amount:string;setAmount:Setter<string>;
 date:string;setDate:Setter<string>;
 category:string;setCategory:Setter<string>;categories:string[];
 subcategoryId:string;setSubcategoryId:Setter<string>;subcategories:Subcategory[];
 newSubcategory:string;setNewSubcategory:Setter<string>;addSubcategory:()=>void;
 frequency:Frequency;setFrequency:Setter<Frequency>;
 expenseType:ExpenseType;setExpenseType:Setter<ExpenseType>;
 allocation:Allocation;setAllocation:Setter<Allocation>;
 editingId:string|null;saving:boolean;onSubmit:FormEventHandler<HTMLFormElement>;
}){
 return <form onSubmit={onSubmit}>
  <span className="overline">VOTRE BUDGET</span>
  <h2>{editingId?'Modifier l’opération':'Ajouter une opération'}</h2>
  <p>Renseignez une entrée ou une sortie pour garder votre budget à jour.</p>
  <div className="switch">
   <button type="button" disabled={!!editingId} className={kind==='expense'?'selected':''} onClick={()=>{setKind('expense');setCategory('');setSubcategoryId('');setAllocation('calendar')}}>Dépense</button>
   <button type="button" disabled={!!editingId} className={kind==='income'?'selected':''} onClick={()=>{setKind('income');setCategory('');setSubcategoryId('')}}>Revenu</button>
  </div>
  <label>Libellé<input required maxLength={100} placeholder="Ex. Courses de la semaine" value={label} onChange={event=>setLabel(event.target.value)}/></label>
  <div className="formgrid">
   <label>Montant (€)<input required type="number" min="0.01" max="1000000000" step="0.01" placeholder="0,00" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
   <label>Date<input required type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
  </div>
  <label>Catégorie<select value={category||categories[0]||''} onChange={event=>{setCategory(event.target.value);setSubcategoryId('')}}>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
  <label>Sous-catégorie <span className="optional">(facultatif)</span><select value={subcategoryId} onChange={event=>setSubcategoryId(event.target.value)}><option value="">Sans sous-catégorie</option>{subcategories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
  <div className="subcategory-add"><input aria-label="Nouvelle sous-catégorie" maxLength={60} placeholder="Nouvelle sous-catégorie" value={newSubcategory} onChange={event=>setNewSubcategory(event.target.value)}/><button type="button" className="secondary" disabled={saving||!newSubcategory.trim()} onClick={addSubcategory}>Ajouter</button></div>
  {kind==='expense'&&<label>Type de dépense<select required value={expenseType} onChange={event=>setExpenseType(event.target.value as ExpenseType)}><option value="">Choisir un type</option><option value="recurring">Récurrente — loyer, abonnement…</option><option value="one_off">Ponctuelle — achat occasionnel…</option></select></label>}
  <label>Fréquence<select value={frequency} onChange={event=>setFrequency(event.target.value as Frequency)}><option value="monthly">Mensuelle</option><option value="annual">Annuelle</option></select></label>
  {kind==='expense'&&frequency==='annual'&&<p className="field-help">La dépense reste datée du jour saisi. Sa provision est répartie sur les 12 mois de cette année.</p>}
  {kind==='expense'&&<p className="field-help">La classification organise vos dépenses ; elle ne crée pas automatiquement de futurs paiements.</p>}
  {kind==='income'&&<label>Affecter ce revenu au budget<select value={allocation} onChange={event=>setAllocation(event.target.value as Allocation)}><option value="calendar">Mois de la date de versement</option><option value="next_month">Mois suivant le versement</option></select></label>}
  <button className="primary wide" disabled={saving}>{saving?'Enregistrement…':editingId?'Enregistrer les modifications':'Enregistrer l’opération'} <ArrowRight size={17}/></button>
 </form>;
}
