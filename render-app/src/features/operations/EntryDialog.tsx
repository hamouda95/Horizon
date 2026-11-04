import CategoryPicker from '../../components/CategoryPicker';
import {appCurrency} from '../../lib/currency';
import {displayText} from '../../lib/text';
import type {Dispatch, FormEventHandler, SetStateAction} from 'react';
import {ArrowRight} from 'lucide-react';
import {useState} from 'react';
import {flowTypeLabel,flowTypeLabels,type FlowType} from '../../lib/flow';

type EntryKind='income'|'expense';
type Frequency='monthly'|'annual';
type Allocation='calendar'|'next_month';
type ExpenseType=''|'recurring'|'one_off';
type Setter<T>=Dispatch<SetStateAction<T>>;
type Subcategory={id:string;name:string};

export default function EntryDialog({accountId='',setAccountId=()=>{},accounts=[],loanId='',setLoanId=()=>{},loans=[],paymentMethod='',setPaymentMethod=()=>{},imported=false,kind,setKind,label,setLabel,amount,setAmount,date,setDate,category,setCategory,categories,subcategoryId,setSubcategoryId,subcategories,pickerCategories,pickerSubcategories,newSubcategory,setNewSubcategory,addSubcategory,frequency,setFrequency,expenseType,setExpenseType,flowType,setFlowType,allocation,setAllocation,personId,setPersonId,people,editingId,saving,onSubmit,onLabelSettled}:{onLabelSettled?:(label:string)=>void;
 accountId?:string;setAccountId?:Setter<string>;accounts?:{id:string;name:string;account_type:string;currency:string}[];
 loanId?:string;setLoanId?:Setter<string>;loans?:{id:string;borrower:string}[];paymentMethod?:string;setPaymentMethod?:Setter<string>;imported?:boolean;
 kind:EntryKind;setKind:Setter<EntryKind>;
 label:string;setLabel:Setter<string>;
 amount:string;setAmount:Setter<string>;
 date:string;setDate:Setter<string>;
 category:string;setCategory:Setter<string>;categories:string[];
 subcategoryId:string;setSubcategoryId:Setter<string>;subcategories:Subcategory[];
 pickerCategories?:{id:string;name:string;active:boolean}[];pickerSubcategories?:{id:string;name:string;category_id:string;active:boolean}[];
 newSubcategory:string;setNewSubcategory:Setter<string>;addSubcategory:()=>void;
 frequency:Frequency;setFrequency:Setter<Frequency>;
 expenseType:ExpenseType;setExpenseType:Setter<ExpenseType>;
 flowType:FlowType;setFlowType:Setter<FlowType>;
 allocation:Allocation;setAllocation:Setter<Allocation>;
 personId:string;setPersonId:Setter<string>;people:{id:string;name:string;active:boolean}[];
 editingId:string|null;saving:boolean;onSubmit:FormEventHandler<HTMLFormElement>;
}){
 // Essentials first; options that rarely change are folded, and open by themselves when one is already set.
 const extras=[flowType!=='standard'?'nature':'',paymentMethod?'paiement':'',expenseType?'type':'',frequency!=='monthly'?'fréquence':'',allocation!=='calendar'?'affectation':''].filter(Boolean).length;
 const [more,setMore]=useState(extras>0);
 return <form onSubmit={onSubmit} className="entry-form">
  <h2>{editingId?'Modifier l’opération':'Ajouter une opération'}</h2>
  <div className="switch">
   <button type="button" disabled={!!editingId} className={kind==='expense'?'selected':''} onClick={()=>{setKind('expense');setCategory('');setSubcategoryId('');setAllocation('calendar')}}>Sortie d’argent</button>
   <button type="button" disabled={!!editingId} className={kind==='income'?'selected':''} onClick={()=>{setKind('income');setCategory('');setSubcategoryId('')}}>Entrée d’argent</button>
  </div>
  <div className="entry-form-main">
   <label className="entry-amount">Montant (€)<input required autoFocus={!editingId} inputMode="decimal" type="number" min="0.01" max="1000000000" step="0.01" placeholder="0,00" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
   <label>Date<input required type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
  </div>
  <label>Libellé<input required maxLength={100} placeholder="Ex. Courses de la semaine" value={label} onChange={event=>setLabel(event.target.value)} onBlur={()=>{if(!category&&label.trim())onLabelSettled?.(label)}}/></label>
  {pickerCategories?<CategoryPicker label="Catégorie" required categories={pickerCategories} subcategories={pickerSubcategories||[]} value={{categoryId:pickerCategories.find(c=>c.name===category)?.id||null,subcategoryId:subcategoryId||null}} onChange={v=>{setCategory(v.category);setSubcategoryId(v.subcategoryId||'')}}/>:<div className="formgrid">
   <label>Catégorie<select required value={category} onChange={event=>{setCategory(event.target.value);setSubcategoryId('')}}><option value="">Choisir</option>{categories.map(value=><option key={value} value={value}>{displayText(value)}</option>)}</select></label>
   <label>Sous-catégorie<select value={subcategoryId} onChange={event=>setSubcategoryId(event.target.value)}><option value="">Aucune</option>{subcategories.map(item=><option key={item.id} value={item.id}>{displayText(item.name)}</option>)}</select></label>
  </div>}
  {(!imported||people.length>0)&&<div className="formgrid">
   {!imported&&<label>{kind==='income'?'Compte crédité':'Compte débité'}<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">À préciser</option>{accounts.filter(a=>a.currency===appCurrency()&&(paymentMethod!=='cash'||a.account_type==='cash')).map(a=><option key={a.id} value={a.id}>{displayText(a.name)}</option>)}</select></label>}
   {people.length>0&&<label>{kind==='expense'?'Pour qui ?':'Reçue par'}<select value={personId} onChange={event=>setPersonId(event.target.value)}><option value="">Tout le foyer</option>{people.filter(person=>person.active).map(person=><option key={person.id} value={person.id}>{displayText(person.name)}</option>)}</select></label>}
  </div>}
  <details className="entry-more" open={more} onToggle={event=>setMore(event.currentTarget.open)}>
   <summary>Plus d’options{extras>0&&<b>{extras}</b>}</summary>
   <div className="formgrid">
    <label>Nature<select value={flowType} onChange={event=>{const next=event.target.value as FlowType;setFlowType(next);if(next!=='standard')setExpenseType('')}}>{(Object.keys(flowTypeLabels) as FlowType[]).map(value=><option key={value} value={value}>{flowTypeLabel(value,kind)}</option>)}</select></label>
    <label>Paiement<select required={flowType==='loan'} value={paymentMethod} onChange={e=>{setPaymentMethod(e.target.value);if(e.target.value==='cash'&&!imported)setAccountId('')}}><option value="">À préciser</option><option value="cash">Espèces</option><option value="transfer">Virement</option><option value="card">Carte</option><option value="cheque">Chèque</option><option value="other">Autre</option></select></label>
    {flowType==='loan'&&<label>Prêt concerné<select required value={loanId} onChange={e=>setLoanId(e.target.value)}><option value="">Choisir un prêt</option>{loans.map(l=><option key={l.id} value={l.id}>{displayText(l.borrower)}</option>)}</select></label>}
    {kind==='expense'&&flowType==='standard'&&<label>Type de dépense<select value={expenseType} onChange={event=>setExpenseType(event.target.value as ExpenseType)}><option value="">Non précisé</option><option value="recurring">Récurrente</option><option value="one_off">Ponctuelle</option></select></label>}
    {flowType==='standard'&&<label>Fréquence<select value={frequency} onChange={event=>setFrequency(event.target.value as Frequency)}><option value="monthly">Mensuelle</option><option value="annual">Annuelle</option></select></label>}
    {kind==='income'&&flowType==='standard'&&<label>Compter au budget de<select value={allocation} onChange={event=>setAllocation(event.target.value as Allocation)}><option value="calendar">Mois du versement</option><option value="next_month">Mois suivant</option></select></label>}
   </div>
   {kind==='expense'&&flowType==='standard'&&frequency==='annual'&&<p className="field-help">Provision répartie sur les 12 mois de l’année.</p>}
   {category&&<div className="subcategory-add"><input aria-label="Nouvelle sous-catégorie" maxLength={60} placeholder="Nouvelle sous-catégorie" value={newSubcategory} onChange={event=>setNewSubcategory(event.target.value)}/><button type="button" className="secondary" disabled={saving||!newSubcategory.trim()} onClick={addSubcategory}>Ajouter</button></div>}
  </details>
  <button className="primary wide entry-submit" disabled={saving}>{saving?'Enregistrement…':editingId?'Enregistrer':'Ajouter'} <ArrowRight size={17}/></button>
 </form>;
}
