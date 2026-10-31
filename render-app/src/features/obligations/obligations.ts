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
