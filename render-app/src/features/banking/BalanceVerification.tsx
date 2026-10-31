import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../../lib/client';
import {appLocale} from '../../lib/locale';
import {displayText,plural} from '../../lib/text';
import {localToday} from '../../lib/dates';
import {checkTypedBalance,type AccountMovement} from './balance-check';

/** Operations attached to an account, by its imported transactions or by direct assignment (same rule as financial_accounts). */
export async function loadAccountMovements(householdId:string,accountId:string):Promise<AccountMovement[]>{
 const columns='id,kind,amount_cents,entry_date,label,bank_transaction_id';
 const {data:bankRows,error:bankError}=await supabase.from('bank_transactions').select('id').eq('bank_account_id',accountId).limit(10000);
 if(bankError)throw bankError;
 const bankIds=new Set((bankRows||[]).map(row=>row.id));
 const {data:direct,error:directError}=await supabase.from('entries').select(columns).eq('household_id',householdId).eq('account_id',accountId).limit(10000);
 if(directError)throw directError;
 const rows=[...(direct||[]).filter(row=>!row.bank_transaction_id||bankIds.has(row.bank_transaction_id))];
 const ids=[...bankIds];
 for(let i=0;i<ids.length;i+=200){
  const {data,error}=await supabase.from('entries').select(columns).eq('household_id',householdId).in('bank_transaction_id',ids.slice(i,i+200));
  if(error)throw error;rows.push(...(data||[]));
 }
 const unique=new Map(rows.map(row=>[row.id,row]));
 return [...unique.values()].map(row=>({id:row.id,date:row.entry_date,label:row.label,signedCents:row.kind==='income'?row.amount_cents:-row.amount_cents}));
}

const money=(cents:number,currency:string)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency}).format(cents/100);
const day=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString(appLocale());

function Movements({rows,currency}:{rows:AccountMovement[];currency:string}){
 if(!rows.length)return <p className="balance-check-empty">Aucune opération.</p>;
 return <ul className="balance-check-list">{rows.slice(0,200).map(row=><li key={row.id}><span>{day(row.date)}</span><span>{displayText(row.label)}</span><b className={row.signedCents>0?'positive':''}>{row.signedCents>0?'+':''}{money(row.signedCents,currency)}</b></li>)}{rows.length>200&&<li>… et {rows.length-200} autres</li>}</ul>;
}

/** Shows the operations behind a typed balance and reports whether the user validated it. */
export default function BalanceVerification({householdId,accountId,currency,previous,typedCents,typedDate,onValidChange}:{householdId:string;accountId:string;currency:string;previous:{cents:number;date:string}|null;typedCents:number|null;typedDate:string;onValidChange:(valid:boolean)=>void}){
 const [movements,setMovements]=useState<AccountMovement[]|null>(null),[loadError,setLoadError]=useState(''),[confirmed,setConfirmed]=useState(false);
 useEffect(()=>{let current=true;setMovements(null);setLoadError('');loadAccountMovements(householdId,accountId).then(rows=>{if(current)setMovements(rows)}).catch(e=>{if(current)setLoadError((e as Error).message||'Opérations du compte indisponibles.')});return()=>{current=false}},[householdId,accountId]);
 const check=useMemo(()=>movements&&typedCents!==null&&typedDate?checkTypedBalance({typedCents,typedDate,previous,movements,today:localToday()}):null,[movements,typedCents,typedDate,previous]);
 // Any change of amount or date asks for a fresh validation.
 useEffect(()=>{setConfirmed(false)},[typedCents,typedDate]);
 // An account without any operation proves nothing: matching its own previous balance is not a verification.
 const empty=movements?.length===0,coherent=check?.gapCents===0&&!empty;
 const valid=typedCents===null||Boolean(check)&&(coherent||confirmed);
 useEffect(()=>{onValidChange(valid)},[valid,onValidChange]);
 if(typedCents===null)return null;
 if(loadError)return <div className="balance-check" role="alert"><p className="error">{displayText(loadError)}</p></div>;
 if(!check)return <div className="balance-check" role="status"><p>Lecture des opérations du compte…</p></div>;
 return <div className="balance-check" aria-live="polite">
  <h3>Vérification avec les opérations</h3>
  {empty?<p className="balance-check-gap">Ce compte ne contient encore aucune opération : la somme saisie ne peut pas être vérifiée. Importez un relevé de ce compte pour la contrôler, ou confirmez-la ci-dessous.</p>:previous&&check.expectedCents!==null?<>
   <p>Dernier solde connu : <b>{money(previous.cents,currency)}</b> au {day(previous.date)}. {plural(check.between.length,'opération','opérations')} entre ce solde et le {day(typedDate)} :</p>
   <Movements rows={check.between} currency={currency}/>
   <dl className="balance-check-totals"><div><dt>Solde attendu au {day(typedDate)}</dt><dd>{money(check.expectedCents,currency)}</dd></div><div><dt>Solde saisi</dt><dd>{money(typedCents,currency)}</dd></div><div className={coherent?'balance-check-ok':'balance-check-gap'}><dt>Écart</dt><dd>{coherent?'Aucun':money(check.gapCents!,currency)}</dd></div></dl>
  </>:<p>Aucun solde antérieur ne permet de contrôler cette somme : vérifiez-la sur votre relevé ou votre appli bancaire.</p>}
  {!empty&&(!previous||previous.date===typedDate)&&(()=>{
   // Nothing to compare with: still show what the account contains up to that date.
   const history=movements!.filter(row=>row.date<=typedDate).sort((a,b)=>b.date.localeCompare(a.date));
   return <details open={history.length<=20}><summary>{plural(history.length,'opération','opérations')} du compte jusqu’au {day(typedDate)} · total {money(history.reduce((sum,row)=>sum+row.signedCents,0),currency)}</summary><Movements rows={history} currency={currency}/></details>;
  })()}
  {(()=>{
   // When the typed date precedes the known balance, the operations added are mostly those already listed.
   const listed=new Set(check.between.map(row=>row.id)),extra=check.after.filter(row=>!listed.has(row.id));
   if(!check.after.length)return <p>Aucune opération postérieure à cette date.</p>;
   if(!extra.length)return <p>{check.after.length===1?'Cette opération sera ajoutée':`Ces ${check.after.length} opérations seront ajoutées`} au solde saisi.</p>;
   return <><p>{plural(check.after.length,'opération postérieure sera ajoutée','opérations postérieures seront ajoutées')} au solde saisi :</p><Movements rows={check.after} currency={currency}/></>;
  })()}
  <p className="balance-check-current">Solde actuel après enregistrement : <b>{money(check.currentCents,currency)}</b></p>
  {coherent?<p className="balance-check-ok" role="status">La somme saisie correspond aux opérations.</p>:<label className="balance-check-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{empty?'Je confirme ce solde sans opération pour le vérifier (relevé ou appli bancaire consulté).':check.gapCents===null?'J’ai vérifié cette somme et les opérations ci-dessus.':'Je confirme cette somme malgré l’écart (opérations manquantes, en double ou mal datées).'}</label>}
 </div>;
}
