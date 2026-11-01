import {useState} from 'react';
import {ModuleDrawer} from '../../components/ModuleUI';
import {displayText} from '../../lib/text';
import {parseEuroCents} from '../../lib/money';
import {localToday} from '../../lib/dates';

export type QuickEntry={kind:'income'|'expense';label:string;amountCents:number;date:string;category:string};
type Props={categories:{name:string;kind:string;active:boolean}[];suggest:(label:string,kind:'income'|'expense')=>string|null;onSave:(entry:QuickEntry)=>Promise<boolean>;onMore:(draft:Partial<QuickEntry>&{amount:string})=>void;onClose:()=>void};

/** Four fields to record an operation from anywhere; the full form stays one click away. */
export default function QuickAdd({categories,suggest,onSave,onMore,onClose}:Props){
 const [kind,setKind]=useState<'income'|'expense'>('expense'),[amount,setAmount]=useState(''),[label,setLabel]=useState(''),[category,setCategory]=useState(''),[date,setDate]=useState(localToday()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const options=categories.filter(c=>c.active&&c.kind===kind);
 function guess(){if(!category&&label.trim()){const name=suggest(label,kind);if(name)setCategory(name)}}
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');
  const cents=parseEuroCents(amount.replace(/\s/g,'').replace(',','.'));
  if(cents===null||cents<=0)return setError('Saisissez un montant supérieur à zéro.');
  if(!category)return setError('Choisissez une catégorie.');
  setBusy(true);const ok=await onSave({kind,label:label.trim(),amountCents:cents,date,category});setBusy(false);
  if(ok)onClose();
 }
 return <ModuleDrawer title="Ajout rapide" onClose={onClose}><form className="product-form quick-add" onSubmit={submit}>
  <div className="quick-add-kind" role="group" aria-label="Sens de l’opération"><button type="button" className={kind==='expense'?'selected':''} aria-pressed={kind==='expense'} onClick={()=>{setKind('expense');setCategory('')}}>Dépense</button><button type="button" className={kind==='income'?'selected':''} aria-pressed={kind==='income'} onClick={()=>{setKind('income');setCategory('')}}>Entrée</button></div>
  <label>Montant (€)<input autoFocus required inputMode="decimal" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
  <label>Libellé<input required maxLength={100} placeholder={kind==='expense'?'Ex. Boulangerie, Carrefour':'Ex. Salaire, remboursement'} value={label} onChange={e=>setLabel(e.target.value)} onBlur={guess}/></label>
  <label>Catégorie<select required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Choisir</option>{options.map(c=><option key={c.name} value={c.name}>{displayText(c.name)}</option>)}</select></label>
  <label>Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer'}</button>
  <button type="button" className="textbtn" disabled={busy} onClick={()=>onMore({kind,label,amount,date,category})}>Plus d’options</button>
 </form></ModuleDrawer>;
}
