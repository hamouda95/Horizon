import {supabase} from '../../lib/client';
import type {Entry} from '../../hooks/household-data';

// A manual entry paid by card, transfer or direct debit is provisional: the bank statement is the truth and
// confirms it later. Cash leaves no bank trace, so a cash entry is confirmed by being entered.
export type ReconcileEntry=Pick<Entry,'id'|'kind'|'amount'|'date'|'bankTransactionId'|'paymentMethod'|'flowType'>;
export type AccountOf<T extends ReconcileEntry=ReconcileEntry>=(entry:T)=>{id:string;account_type?:string|null}|undefined;
export type EntryStatus='confirmed'|'pending'|'missing'|'planned';

/** Days the bank may take to show a payment entered by hand: a card is debited a few days later, rarely earlier. */
export const MATCH_DAYS_BEFORE=3,MATCH_DAYS_AFTER=5;
/** Hand-entered amounts are often rounded: up to 1 € or 1 % apart, the bank amount wins. */
export const amountTolerance=(cents:number)=>Math.max(100,Math.round(cents*0.01));
const days=(from:string,to:string)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);

export function isProvisional<T extends ReconcileEntry>(entry:T,accountOf:AccountOf<T>,today:string){
 // Loans keep their own replacement flow on the loans page.
 return !entry.bankTransactionId&&entry.paymentMethod!=='cash'&&accountOf(entry)?.account_type!=='cash'&&entry.flowType!=='loan'&&entry.date<=today;
}

/** Latest imported date per account, and over all accounts for entries whose account is not known. */
export function statementCoverage<T extends ReconcileEntry>(entries:T[],accountOf:AccountOf<T>){
 const byAccount=new Map<string,string>();let any='';
 for(const e of entries){if(!e.bankTransactionId)continue;const id=accountOf(e)?.id;if(id&&e.date>(byAccount.get(id)||''))byAccount.set(id,e.date);if(e.date>any)any=e.date}
 return {byAccount,any};
}

/** Provisional, still expected from the bank; missing once the statement of its account goes past its date and the matching window. */
export function entryStatus<T extends ReconcileEntry>(entry:T,accountOf:AccountOf<T>,coverage:ReturnType<typeof statementCoverage>,today:string,matched=false):EntryStatus{
 if(entry.date>today)return 'planned';
 if(!isProvisional(entry,accountOf,today)||matched)return 'confirmed';
 const id=accountOf(entry)?.id,covered=id?coverage.byAccount.get(id)||'':coverage.any;
 return covered&&days(entry.date,covered)>MATCH_DAYS_AFTER?'missing':'pending';
}

export type ReconcilePair<T>={manual:T;imported:T};
export type ReconcileGroup<T>={imported:T;candidates:T[]};

/** Imported operations matching a provisional manual entry: same direction, same amount give or take the rounding tolerance, same account or account not
 * chosen, booked from 3 days before to 5 days after. A pair is certain only when each side has exactly one match. */
export function reconcileCandidates<T extends ReconcileEntry>(entries:T[],accountOf:AccountOf<T>,today:string){
 const manual=entries.filter(e=>isProvisional(e,accountOf,today)),imported=entries.filter(e=>e.bankTransactionId&&e.flowType!=='loan');
 const byImported=new Map<string,T[]>(),byManual=new Map<string,T[]>();
 for(const i of imported){
  const account=accountOf(i)?.id,near:T[]=[];
  for(const m of manual){
   const gap=days(m.date,i.date),mAccount=accountOf(m)?.id;
   if(m.kind!==i.kind||Math.abs(m.amount-i.amount)>amountTolerance(i.amount)||gap<-MATCH_DAYS_BEFORE||gap>MATCH_DAYS_AFTER||mAccount&&mAccount!==account)continue;
   near.push(m);
  }
  // An entry with the exact amount beats a rounded one ("1 402 €" entered, 1 402,73 € debited).
  const kept=near.some(m=>m.amount===i.amount)?near.filter(m=>m.amount===i.amount):near;
  if(kept.length)byImported.set(i.id,kept);
  for(const m of kept)byManual.set(m.id,[...(byManual.get(m.id)||[]),i]);
 }
 const certain:ReconcilePair<T>[]=[],uncertain:ReconcileGroup<T>[]=[];
 for(const i of imported){
  const candidates=byImported.get(i.id);if(!candidates)continue;
  if(candidates.length===1&&byManual.get(candidates[0].id)?.length===1)certain.push({manual:candidates[0],imported:i});
  else uncertain.push({imported:i,candidates:[...candidates].sort((a,b)=>Math.abs(days(a.date,i.date))-Math.abs(days(b.date,i.date)))});
 }
 return {certain,uncertain,matchedManual:new Set([...byManual.keys()])};
}

/** Confirms a manual entry with its bank operation: the bank keeps amount, date and label, the manual entry gives its
 * classification and its bill reconciliation, then it is removed so the money counts once. */
export async function mergeManualIntoImported(householdId:string,manual:Entry,imported:Entry){
 const {data,error}=await supabase.from('entries').update({category_id:manual.categoryId,subcategory_id:manual.subcategoryId,person_id:manual.personId,flow_type:manual.flowType,expense_type:manual.expenseType,frequency:manual.frequency,income_allocation:manual.incomeAllocation,...(manual.paymentMethod?{payment_method:manual.paymentMethod}:{})})
  .eq('id',imported.id).eq('household_id',householdId).not('bank_transaction_id','is',null).select('id').maybeSingle();
 if(error)throw error;if(!data)throw Error('Opération bancaire introuvable ou accès refusé.');
 const {data:settlement,error:readError}=await supabase.from('household_obligation_settlements').select('obligation_id,settled_month').eq('household_id',householdId).eq('entry_id',manual.id).maybeSingle();
 if(readError)throw readError;
 const {error:deleteError}=await supabase.from('entries').delete().eq('id',manual.id).eq('household_id',householdId).is('bank_transaction_id',null);
 if(deleteError)throw deleteError;
 // Deleting the manual entry released its bill; the bank operation settles it instead.
 if(settlement){const {error:settleError}=await supabase.from('household_obligation_settlements').insert({household_id:householdId,obligation_id:settlement.obligation_id,settled_month:settlement.settled_month,entry_id:imported.id});if(settleError)throw Error('Saisie confirmée, mais l’échéance est à rapprocher de nouveau.')}
}
