import StartingAccountsEditor,{type StartingAccountDraft} from './StartingAccountsEditor';
import type {Dispatch, FormEventHandler, SetStateAction} from 'react';
import {ArrowRight, Check, X, Plus} from 'lucide-react';

type StringSetter=Dispatch<SetStateAction<string>>;
type ListSetter=Dispatch<SetStateAction<string[]>>;
type HouseholdPersonDraft={id?:string;name:string;relationship:'self'|'partner'|'child'|'other';isPrimary?:boolean};

export default function HouseholdSetupDialog({name,setName,incomeTypes,setIncomeTypes,expenseTypes,setExpenseTypes,custom,setCustom,customKind,setCustomKind,people,setPeople,onSubmit,onJoin,saving,startingAccounts,setStartingAccounts,isCreating,setupIncome,setSetupIncome,setupExpense,setSetupExpense}:{
 name:string;setName:StringSetter;
 incomeTypes:string[];setIncomeTypes:ListSetter;
 expenseTypes:string[];setExpenseTypes:ListSetter;
 custom:string;setCustom:StringSetter;
 customKind:'income'|'expense';setCustomKind:Dispatch<SetStateAction<'income'|'expense'>>;
 people:HouseholdPersonDraft[];setPeople:Dispatch<SetStateAction<HouseholdPersonDraft[]>>;
 onSubmit:FormEventHandler<HTMLFormElement>;
 onJoin:()=>void;
 saving:boolean;
 startingAccounts:StartingAccountDraft[];setStartingAccounts:Dispatch<SetStateAction<StartingAccountDraft[]>>;isCreating:boolean;setupIncome:string;setSetupIncome:StringSetter;setupExpense:string;setSetupExpense:StringSetter;
}){
 function addCategory(){
  const value=custom.trim();
  if(!value)return;
  const setTypes=customKind==='income'?setIncomeTypes:setExpenseTypes;
  setTypes(current=>[...new Set([...current,value])]);
  setCustom('');
 }

 return <form onSubmit={onSubmit}>
  <span className="overline">BIENVENUE CHEZ HORIZON</span>
  <h2>{people.some(person=>person.id)?'Faisons évoluer votre foyer':'Créons votre foyer'}</h2>
  <p>Donnez-lui un nom, ajoutez les personnes qui le composent et choisissez les catégories qui vous ressemblent. Vous pourrez tout ajuster ensuite.</p>
  <label>Nom du foyer<input required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label>
  <div className="household-composition-heading"><div><b>Les personnes du foyer</b><small>Pour attribuer simplement les revenus et les dépenses</small></div><button type="button" className="secondary" onClick={()=>setPeople(current=>[...current,{name:'',relationship:'child'}])}><Plus size={14}/> Ajouter</button></div>
  <div className="household-person-editor">{people.map((person,index)=><div className="household-person-edit" key={person.id||`new-${index}`}><input aria-label="Nom ou petit nom" maxLength={60} required value={person.name} onChange={event=>setPeople(current=>current.map((item,i)=>i===index?{...item,name:event.target.value}:item))} placeholder={person.relationship==='child'?'Prénom de l’enfant':person.isPrimary?'Moi':'Prénom'}/><select aria-label="Lien avec le foyer" value={person.relationship} disabled={person.isPrimary} onChange={event=>setPeople(current=>current.map((item,i)=>i===index?{...item,relationship:event.target.value as HouseholdPersonDraft['relationship']}:item))}><option value="self">Moi</option><option value="partner">Conjoint·e</option><option value="child">Enfant</option><option value="other">Proche</option></select>{!person.isPrimary&&<button type="button" className="delete" aria-label="Retirer cette personne" onClick={()=>setPeople(current=>current.filter((_,i)=>i!==index))}><X size={16}/></button>}</div>)}</div>
  <p className="field-help">Vous pouvez aussi inviter un adulte à rejoindre l’application depuis le menu de bienvenue. Les enfants n’ont pas besoin de créer un compte.</p>
  {isCreating&&<StartingAccountsEditor rows={startingAccounts} setRows={setStartingAccounts} disabled={saving}/>}
  {isCreating&&<details className="setup-categories"><summary>Préparer le budget du mois (facultatif)</summary><p className="field-help">Des objectifs pour démarrer : aucune opération réelle n’est créée.</p><div className="formgrid"><label>Revenus attendus (€)<input inputMode="decimal" value={setupIncome} onChange={e=>setSetupIncome(e.target.value)}/></label><label>Plafond de dépenses (€)<input inputMode="decimal" value={setupExpense} onChange={e=>setSetupExpense(e.target.value)}/></label></div></details>}
  <details className="setup-categories"><summary>Personnaliser les catégories de revenus et dépenses</summary>
  <label>Types de revenus</label>
  <div className="chips">{incomeTypes.map(value=><button type="button" key={value} onClick={()=>setIncomeTypes(current=>current.filter(item=>item!==value))}><Check size={13}/>{value} <X size={12}/></button>)}</div>
  <label>Types de dépenses</label>
  <div className="chips">{expenseTypes.map(value=><button type="button" key={value} onClick={()=>setExpenseTypes(current=>current.filter(item=>item!==value))}><Check size={13}/>{value} <X size={12}/></button>)}</div>
  <div className="custom">
   <select value={customKind} onChange={event=>setCustomKind(event.target.value as 'income'|'expense')}><option value="income">Revenu</option><option value="expense">Dépense</option></select>
   <input maxLength={59} placeholder="Ajouter une catégorie" value={custom} onChange={event=>setCustom(event.target.value)}/>
   <button type="button" className="secondary" onClick={addCategory}>Ajouter</button>
  </div>
  </details>
  <p className="field-help">Les revenus et dépenses seront saisis ou importés après la création du foyer.</p>
  <button className="primary wide" disabled={saving||!incomeTypes.length||!expenseTypes.length||!people.length||people.some(person=>!person.name.trim())}>{saving?'Enregistrement…':'Enregistrer mon foyer'} <ArrowRight size={17}/></button>
  <button type="button" className="textbtn setup-join-link" onClick={onJoin}>J’ai reçu une invitation · rejoindre un foyer</button>
 </form>;
}
