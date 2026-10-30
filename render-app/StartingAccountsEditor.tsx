import type {Dispatch,SetStateAction} from 'react';
import {accountTypes,type AccountType} from './account-types';
import {localToday} from './dates';
import {parseEuroCents} from './money';
export type StartingAccountDraft={id:string;name:string;type:AccountType;source:string;balance:string;date:string};
export function startingAccountsPayload(rows:StartingAccountDraft[]){
 return rows.map(row=>{
  const raw=row.balance.trim(),negative=raw.startsWith('-'),absolute=raw?parseEuroCents(negative?raw.slice(1):raw):null;
  if(!row.name.trim()||row.name.trim().length>100||raw&&(absolute===null||absolute>100000000000))throw Error('Vérifiez le nom et le montant de chaque compte de départ.');
  if(raw&&(!row.date||row.date>localToday()))throw Error('Indiquez une date de relevé passée ou actuelle.');
  if(row.type==='credit'&&negative)throw Error('Pour une dette, saisissez le montant restant à rembourser sans signe.');
  if(['cash','investment','crypto'].includes(row.type)&&negative)throw Error('Les espèces et la valeur des placements ne peuvent pas être négatives.');
  return {name:row.name.trim(),account_type:row.type,source_name:row.source.trim()||null,balance_cents:absolute===null?null:(row.type==='credit'||negative?-absolute:absolute),balance_date:raw?row.date:null};
 });
}
export function startingBudgetPayload(income:string,expense:string){
 if(!income.trim()&&!expense.trim())return null;
 const i=parseEuroCents(income),e=parseEuroCents(expense);
 if(i===null||e===null||i>100000000000||e>100000000000)throw Error('Renseignez les deux montants du budget, ou laissez les deux champs vides.');
 return {month:localToday().slice(0,7)+'-01',income_cents:i,expense_cents:e};
}
export default function StartingAccountsEditor({rows,setRows,disabled=false}:{rows:StartingAccountDraft[];setRows:Dispatch<SetStateAction<StartingAccountDraft[]>>;disabled?:boolean}){
 function patch(id:string,values:Partial<StartingAccountDraft>){setRows(current=>current.map(row=>row.id===id?{...row,...values}:row))}
 return <section className="starting-finances"><h3>Ce que vous avez déjà <span className="optional">(facultatif)</span></h3><p>Ajoutez vos soldes actuels, même sans importer de relevé. Ils ne seront pas comptés comme des revenus.</p><div className="starting-type-buttons">{accountTypes.map(([type,label])=><button key={type} type="button" className="secondary" disabled={disabled||rows.length>=50} onClick={()=>setRows(current=>[...current,{id:crypto.randomUUID(),name:label,type,source:'',balance:'',date:localToday()}])}>+ {label}</button>)}</div>{rows.map(row=><div className="starting-account" key={row.id}><div className="sectionhead"><b>{accountTypes.find(([type])=>type===row.type)?.[1]}</b><button type="button" className="textbtn" disabled={disabled} onClick={()=>setRows(current=>current.filter(item=>item.id!==row.id))}>Retirer</button></div><div className="formgrid"><label>Nom<input required maxLength={100} disabled={disabled} value={row.name} onChange={e=>patch(row.id,{name:e.target.value})}/></label><label>{row.type==='cash'?'Lieu / portefeuille':'Banque ou organisme'}<input maxLength={100} disabled={disabled} value={row.source} onChange={e=>patch(row.id,{source:e.target.value})} placeholder="Facultatif"/></label><label>{row.type==='credit'?'Reste à rembourser (€)':row.type==='investment'||row.type==='crypto'?'Valeur actuelle estimée (€)':'Solde actuel (€)'}<input inputMode="decimal" disabled={disabled} value={row.balance} onChange={e=>patch(row.id,{balance:e.target.value})} placeholder="Inconnu pour le moment"/></label><label>Date du relevé<input type="date" max={localToday()} required={Boolean(row.balance.trim())} disabled={disabled} value={row.date} onChange={e=>patch(row.id,{date:e.target.value})}/></label></div>{row.type==='credit'&&<small>Le montant dû est affiché comme une dette, séparément de vos avoirs.</small>}{(row.type==='investment'||row.type==='crypto')&&<small>Valeur déclarative : pas de cours en temps réel ni de calcul de performance.</small>}</div>)}{rows.length===0&&<p className="field-help">Vous pouvez commencer sans compte et les ajouter plus tard dans « Comptes et avoirs ».</p>}</section>;
}
