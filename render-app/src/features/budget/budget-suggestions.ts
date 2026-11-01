// Suggested budget per category for a coming month, from what the household actually spent.
type SpendEntry={kind:'income'|'expense';categoryId:string;amount:number;date:string;flowType:string;frequency:'monthly'|'annual'};
export type CategorySuggestion={categoryId:string;averageCents:number;annualShareCents:number;suggestedCents:number;months:number};

const monthKey=(date:string)=>date.slice(0,7);
const shiftMonth=(month:string,delta:number)=>{const d=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1+delta,1));return d.toISOString().slice(0,7)};
const roundUpTo5=(cents:number)=>Math.ceil(cents/500)*500;

/**
 * Average of everyday spending over the last three complete months (fewer when the household is newer),
 * plus a twelfth of yearly bills paid in the last twelve months, rounded up to the next 5 €.
 */
export function suggestCategoryBudgets(entries:SpendEntry[],categoryIds:string[],currentMonth:string):CategorySuggestion[]{
 const spending=entries.filter(e=>e.kind==='expense'&&e.flowType==='standard');
 const windowMonths=[1,2,3].map(n=>shiftMonth(currentMonth,-n));
 const firstMonth=spending.map(e=>monthKey(e.date)).sort()[0];
 // Months before the first recorded operation are unknown, not zero.
 const known=firstMonth?windowMonths.filter(m=>m>=firstMonth):[];
 const yearStart=shiftMonth(currentMonth,-12);
 return categoryIds.map(categoryId=>{
  const own=spending.filter(e=>e.categoryId===categoryId);
  const everyday=own.filter(e=>e.frequency!=='annual'&&known.includes(monthKey(e.date))).reduce((n,e)=>n+e.amount,0);
  const yearly=own.filter(e=>e.frequency==='annual'&&monthKey(e.date)>=yearStart&&monthKey(e.date)<currentMonth).reduce((n,e)=>n+e.amount,0);
  const averageCents=known.length?Math.round(everyday/known.length):0,annualShareCents=Math.round(yearly/12);
  return {categoryId,averageCents,annualShareCents,suggestedCents:averageCents+annualShareCents>0?roundUpTo5(averageCents+annualShareCents):0,months:known.length};
 });
}
export const nextMonth=(month:string)=>shiftMonth(month,1);
