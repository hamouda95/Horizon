import {budgetMonth} from './period.ts';
import type {BudgetEntry} from './period.ts';
export type TipEntry=BudgetEntry & {id:string;label:string;category:string};
export type Tip={id:string;type:'timing'|'category';label:string;category?:string;amount:number;currentMonth?:string;betterMonth?:string;currentIncome?:number;betterIncome?:number};
export function generateTips(entries:TipEntry[],year:string):Tip[]{
 const incomes=new Map<string,number>();for(const e of entries)if(e.kind==='income'&&(e.flowType||'standard')==='standard'){const m=budgetMonth(e);if(m.startsWith(year+'-'))incomes.set(m,(incomes.get(m)||0)+e.amount)}
 const sorted=[...incomes.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));const tips:Tip[]=[];
 if(sorted.length>=2){const [bestMonth,bestIncome]=sorted[0];for(const e of entries){if(e.kind!=='expense'||(e.flowType||'standard')!=='standard'||e.frequency!=='annual'||!e.date.startsWith(year+'-'))continue;const current=e.date.slice(0,7),currentIncome=incomes.get(current);if(currentIncome!==undefined&&current!==bestMonth&&bestIncome>currentIncome)tips.push({id:e.id,type:'timing',label:e.label,amount:e.amount,currentMonth:current,betterMonth:bestMonth,currentIncome,betterIncome:bestIncome});}}
 const categories=new Map<string,number>();for(const e of entries)if(e.kind==='expense'&&(e.flowType||'standard')==='standard'&&e.date.startsWith(year+'-'))categories.set(e.category,(categories.get(e.category)||0)+e.amount);
 const ranked=[...categories.entries()].sort((a,b)=>b[1]-a[1]);if(ranked.length)tips.push({id:'category-summary',type:'category',label:ranked[0][0],amount:ranked[0][1]});
 return tips;
}
