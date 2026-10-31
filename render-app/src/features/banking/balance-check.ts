// Confronts a balance typed by the user with the account's operations, using the same rule as the
// financial_accounts view: current balance = balance at its date + every operation after that date up to today.
export type AccountMovement={id:string;date:string;label:string;signedCents:number};
export type BalanceCheck={
 /** Balance the known operations predict at the typed date, when an earlier or later balance exists. */
 expectedCents:number|null;
 gapCents:number|null;
 /** Operations between the known balance and the typed date, which explain the expected balance. */
 between:AccountMovement[];
 /** Operations after the typed date that will be added to it. */
 after:AccountMovement[];
 currentCents:number;
};

const byDate=(a:AccountMovement,b:AccountMovement)=>a.date.localeCompare(b.date)||a.label.localeCompare(b.label);
const total=(rows:AccountMovement[])=>rows.reduce((sum,row)=>sum+row.signedCents,0);

export function checkTypedBalance({typedCents,typedDate,previous,movements,today}:{typedCents:number;typedDate:string;previous:{cents:number;date:string}|null;movements:AccountMovement[];today:string}):BalanceCheck{
 const after=movements.filter(m=>m.date>typedDate&&m.date<=today).sort(byDate);
 let expectedCents:number|null=null,between:AccountMovement[]=[];
 if(previous&&previous.date!==typedDate){
  const [from,to]=previous.date<typedDate?[previous.date,typedDate]:[typedDate,previous.date];
  between=movements.filter(m=>m.date>from&&m.date<=to).sort(byDate);
  expectedCents=previous.date<typedDate?previous.cents+total(between):previous.cents-total(between);
 }else if(previous)expectedCents=previous.cents;
 return {expectedCents,gapCents:expectedCents===null?null:typedCents-expectedCents,between,after,currentCents:typedCents+total(after)};
}
