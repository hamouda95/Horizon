import type {Dispatch, FormEventHandler, SetStateAction} from 'react';
import {ArrowRight, Check, X} from 'lucide-react';

type StringSetter=Dispatch<SetStateAction<string>>;
type ListSetter=Dispatch<SetStateAction<string[]>>;

export default function HouseholdSetupDialog({name,setName,incomeTypes,setIncomeTypes,expenseTypes,setExpenseTypes,custom,setCustom,customKind,setCustomKind,onSubmit}:{
 name:string;setName:StringSetter;
 incomeTypes:string[];setIncomeTypes:ListSetter;
 expenseTypes:string[];setExpenseTypes:ListSetter;
 custom:string;setCustom:StringSetter;
 customKind:'income'|'expense';setCustomKind:Dispatch<SetStateAction<'income'|'expense'>>;
 onSubmit:FormEventHandler<HTMLFormElement>;
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
  <h2>Créons votre espace</h2>
  <p>Commencez simplement : choisissez les catégories qui correspondent à votre foyer. Vous pourrez les modifier ensuite.</p>
  <label>Nom du foyer<input required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label>
  <label>Types de revenus</label>
  <div className="chips">{incomeTypes.map(value=><button type="button" key={value} onClick={()=>setIncomeTypes(current=>current.filter(item=>item!==value))}><Check size={13}/>{value} <X size={12}/></button>)}</div>
  <label>Types de dépenses</label>
  <div className="chips">{expenseTypes.map(value=><button type="button" key={value} onClick={()=>setExpenseTypes(current=>current.filter(item=>item!==value))}><Check size={13}/>{value} <X size={12}/></button>)}</div>
  <div className="custom">
   <select value={customKind} onChange={event=>setCustomKind(event.target.value as 'income'|'expense')}><option value="income">Revenu</option><option value="expense">Dépense</option></select>
   <input maxLength={59} placeholder="Ajouter une catégorie" value={custom} onChange={event=>setCustom(event.target.value)}/>
   <button type="button" className="secondary" onClick={addCategory}>Ajouter</button>
  </div>
  <button className="primary wide" disabled={!incomeTypes.length||!expenseTypes.length}>Enregistrer mon foyer <ArrowRight size={17}/></button>
 </form>;
}
