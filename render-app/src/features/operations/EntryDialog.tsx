import {displayText} from '../../lib/text';
import type {Dispatch, FormEventHandler, SetStateAction} from 'react';
import {ArrowRight} from 'lucide-react';
import type {FlowType} from '../../lib/flow';

type EntryKind='income'|'expense';
type Frequency='monthly'|'annual';
type Allocation='calendar'|'next_month';
type ExpenseType=''|'recurring'|'one_off';
type Setter<T>=Dispatch<SetStateAction<T>>;
type Subcategory={id:string;name:string};

export default function EntryDialog({accountId='',setAccountId=()=>{},accounts=[],loanId='',setLoanId=()=>{},loans=[],paymentMethod='',setPaymentMethod=()=>{},imported=false,kind,setKind,label,setLabel,amount,setAmount,date,setDate,category,setCategory,categories,subcategoryId,setSubcategoryId,subcategories,newSubcategory,setNewSubcategory,addSubcategory,frequency,setFrequency,expenseType,setExpenseType,flowType,setFlowType,allocation,setAllocation,personId,setPersonId,people,editingId,saving,onSubmit}:{
 accountId?:string;setAccountId?:Setter<string>;accounts?:{id:string;name:string;account_type:string;currency:string}[];
 loanId?:string;setLoanId?:Setter<string>;loans?:{id:string;borrower:string}[];paymentMethod?:string;setPaymentMethod?:Setter<string>;imported?:boolean;
 kind:EntryKind;setKind:Setter<EntryKind>;
 label:string;setLabel:Setter<string>;
 amount:string;setAmount:Setter<string>;
 date:string;setDate:Setter<string>;
 category:string;setCategory:Setter<string>;categories:string[];
 subcategoryId:string;setSubcategoryId:Setter<string>;subcategories:Subcategory[];
 newSubcategory:string;setNewSubcategory:Setter<string>;addSubcategory:()=>void;
 frequency:Frequency;setFrequency:Setter<Frequency>;
 expenseType:ExpenseType;setExpenseType:Setter<ExpenseType>;
 flowType:FlowType;setFlowType:Setter<FlowType>;
 allocation:Allocation;setAllocation:Setter<Allocation>;
 personId:string;setPersonId:Setter<string>;people:{id:string;name:string;active:boolean}[];
 editingId:string|null;saving:boolean;onSubmit:FormEventHandler<HTMLFormElement>;
}){
 return <form onSubmit={onSubmit}>
  <span className="overline">Votre budget</span>
  <h2>{editingId?'Modifier l’opération':'Ajouter une opération'}</h2>
  <p>Renseignez une entrée ou une sortie pour garder votre budget à jour.</p>
  <div className="switch">
   <button type="button" disabled={!!editingId} className={kind==='expense'?'selected':''} onClick={()=>{setKind('expense');setCategory('');setSubcategoryId('');setAllocation('calendar')}}>Sortie d’argent</button>
   <button type="button" disabled={!!editingId} className={kind==='income'?'selected':''} onClick={()=>{setKind('income');setCategory('');setSubcategoryId('')}}>Entrée d’argent</button>
  </div>
  <label>Nature du mouvement<select value={flowType} onChange={event=>{const next=event.target.value as FlowType;setFlowType(next);if(next!=='standard')setExpenseType('')}}><option value="standard">{kind==='income'?'Entrée courante':'Sortie de consommation'} comptabilisée au budget</option><option value="transfer">Transfert entre comptes</option><option value="refund">Remboursement</option><option value="savings">Mouvement d’épargne</option><option value="investment">Versement / retrait de placement</option><option value="loan">Prêt ou remboursement de créance</option><option value="review">À vérifier</option></select></label>
  {flowType==='loan'&&<label>Prêt concerné<select required value={loanId} onChange={e=>setLoanId(e.target.value)}><option value="">Choisir un prêt</option>{loans.map(l=><option key={l.id} value={l.id}>{displayText(l.borrower)}</option>)}</select></label>}
  {!imported&&<label>{kind==='income'?'Compte de réception':'Compte débité'}<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">À préciser (solde non actualisé)</option>{accounts.filter(a=>a.currency==='EUR'&&(paymentMethod!=='cash'||a.account_type==='cash')).map(a=><option key={a.id} value={a.id}>{displayText(a.name)}</option>)}</select></label>}
  <label>Moyen de paiement<select required={flowType==='loan'} value={paymentMethod} onChange={e=>{setPaymentMethod(e.target.value);if(e.target.value==='cash'&&!imported)setAccountId('')}}><option value="">À préciser</option><option value="cash">Espèces</option><option value="transfer">Virement</option><option value="card">Carte</option><option value="cheque">Chèque</option><option value="other">Autre</option></select></label>
  <label>Libellé<input required maxLength={100} placeholder="Ex. Courses de la semaine" value={label} onChange={event=>setLabel(event.target.value)}/></label>
  <div className="formgrid">
   <label>Montant (€)<input required type="number" min="0.01" max="1000000000" step="0.01" placeholder="0,00" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
   <label>Date<input required type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
  </div>
  <label>Catégorie<select value={category||categories[0]||''} onChange={event=>{setCategory(event.target.value);setSubcategoryId('')}}>{categories.map(value=><option key={value} value={value}>{displayText(value)}</option>)}</select></label>
  <label>Sous-catégorie <span className="optional">(facultatif)</span><select value={subcategoryId} onChange={event=>setSubcategoryId(event.target.value)}><option value="">Sans sous-catégorie</option>{subcategories.map(item=><option key={item.id} value={item.id}>{displayText(item.name)}</option>)}</select></label>
  {people.length>0&&<label>{kind==='expense'?'Pour qui ?':'Qui reçoit cette entrée ?'} <span className="optional">(facultatif)</span><select value={personId} onChange={event=>setPersonId(event.target.value)}><option value="">Opération commune</option>{people.filter(person=>person.active).map(person=><option key={person.id} value={person.id}>{displayText(person.name)}</option>)}</select></label>}
  <div className="subcategory-add"><input aria-label="Nouvelle sous-catégorie" maxLength={60} placeholder="Nouvelle sous-catégorie" value={newSubcategory} onChange={event=>setNewSubcategory(event.target.value)}/><button type="button" className="secondary" disabled={saving||!newSubcategory.trim()} onClick={addSubcategory}>Ajouter</button></div>
  {kind==='expense'&&flowType==='standard'&&<label>Type de dépense<select required value={expenseType} onChange={event=>setExpenseType(event.target.value as ExpenseType)}><option value="">Choisir un type</option><option value="recurring">Récurrente — loyer, abonnement…</option><option value="one_off">Ponctuelle — achat occasionnel…</option></select></label>}
  {flowType==='standard'&&<label>Fréquence<select value={frequency} onChange={event=>setFrequency(event.target.value as Frequency)}><option value="monthly">Mensuelle</option><option value="annual">Annuelle</option></select></label>}
  {kind==='expense'&&flowType==='standard'&&frequency==='annual'&&<p className="field-help">La dépense reste datée du jour saisi. Sa provision est répartie sur les 12 mois de cette année.</p>}
  {kind==='expense'&&flowType==='standard'&&<p className="field-help">La classification organise vos sorties d’argent ; elle ne crée pas automatiquement de futurs paiements.</p>}
  {kind==='income'&&flowType==='standard'&&<label>Affecter ce revenu au budget<select value={allocation} onChange={event=>setAllocation(event.target.value as Allocation)}><option value="calendar">Mois de la date de versement</option><option value="next_month">Mois suivant le versement</option></select></label>}
  <button className="primary wide" disabled={saving}>{saving?'Enregistrement…':editingId?'Enregistrer les modifications':'Enregistrer l’opération'} <ArrowRight size={17}/></button>
 </form>;
}
