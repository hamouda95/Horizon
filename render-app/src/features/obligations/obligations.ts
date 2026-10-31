import {localToday} from '../../lib/dates';
export type ObligationSchedule={id:string;amount_cents:number;frequency:string;due_day:number;due_month:number|null};
export type Settlement={id:string;obligation_id:string;entry_id:string;settled_month:string};
export function obligationsForMonth<T extends ObligationSchedule>(rows:T[],settlements:Settlement[],month:string,today=localToday()){
 const [year,monthNumber]=month.split('-').map(Number);
 const lastDay=new Date(year,monthNumber,0).getDate();
 return rows.filter(row=>row.frequency==='monthly'||row.due_month===monthNumber).map(row=>{
  const day=Math.min(row.due_day,lastDay),dueDate=`${month}-${String(day).padStart(2,'0')}`;
  const settlement=settlements.find(s=>s.obligation_id===row.id&&s.settled_month===month+'-01');
  return {...row,day,dueDate,settlement,status:settlement?'paid' as const:dueDate<today?'overdue' as const:'pending' as const};
 }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
}

type PaymentCandidate={id:string;date:string;amount:number};
const dayDistance=(a:string,b:string)=>Math.abs(Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000;
/** Orders the expenses that could settle a bill: close amount and date first, then the rest of the surrounding two months. */
export function rankPaymentCandidates<T extends PaymentCandidate>(candidates:T[],amountCents:number,dueDate:string,{maxSuggestions=3,windowDays=62}={}){
 const tolerance=Math.max(100,Math.round(amountCents*0.1));
 const near=candidates.filter(c=>dayDistance(c.date,dueDate)<=windowDays);
 const score=(c:T)=>Math.abs(c.amount-amountCents)/Math.max(amountCents,1)+dayDistance(c.date,dueDate)/30;
 const suggested=near.filter(c=>Math.abs(c.amount-amountCents)<=tolerance&&dayDistance(c.date,dueDate)<=15).sort((a,b)=>score(a)-score(b)).slice(0,maxSuggestions);
 const others=near.filter(c=>!suggested.includes(c)).sort((a,b)=>b.date.localeCompare(a.date));
 return {suggested,others,hidden:candidates.length-near.length};
}
