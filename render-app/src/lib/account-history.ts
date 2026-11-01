// Account balances at a past date, derived from the balance shown today so both always agree:
// the balance at the end of a day is today's balance minus the operations dated after that day.
import {shiftMonth} from './period';

export type DatedMovement={accountId:string;date:string;signedCents:number};

/** Last day shown for a month: its last day, or today while the month is not over. */
export function periodEnd(month:string,today:string){
 const last=new Date(shiftMonth(month,1)+'-01T12:00:00Z');last.setUTCDate(0);
 const end=last.toISOString().slice(0,10);
 return end<today?end:today;
}

/** Balance of each account at the end of `date`, from the current balances and the dated operations. */
export function balancesAt<T extends {id:string;account_type:string;balance_cents:number|null}>(accounts:T[],movements:DatedMovement[],date:string,today:string):T[]{
 if(date>=today)return accounts;
 const after=new Map<string,number>();
 for(const m of movements)if(m.date>date&&m.date<=today)after.set(m.accountId,(after.get(m.accountId)||0)+m.signedCents);
 // A valuation is a snapshot, not a sum of operations: it stays as declared.
 return accounts.map(a=>a.balance_cents===null||a.account_type==='investment'||!after.has(a.id)?a:{...a,balance_cents:a.balance_cents-after.get(a.id)!});
}
