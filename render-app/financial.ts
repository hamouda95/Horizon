import type {FlowType} from './flow';
export function savingsBudget(income:number,expense:number,rateBps:number|null){if(rateBps===null||income<=0)return null;const savings=Math.round(income*rateBps/10000),spending=income-savings;return {savings,spending,remaining:spending-expense,consumed:spending>0?expense/spending*100:null}}
export type MonthlyBudgetStatus={spentCents:number;budgetCents:number;remainingCents:number;percent:number|null;thresholdReached:boolean;overBudget:boolean};
export function monthlyBudgetStatus(spentCents:number,budgetCents:number|null,thresholdPercent=80):MonthlyBudgetStatus|null{
 if(budgetCents===null||!Number.isSafeInteger(spentCents)||spentCents<0||!Number.isSafeInteger(budgetCents)||budgetCents<0||!Number.isInteger(thresholdPercent)||thresholdPercent<1||thresholdPercent>100)return null;
 const overBudget=spentCents>budgetCents;
 const thresholdReached=budgetCents===0?overBudget:spentCents*100>=budgetCents*thresholdPercent;
 return {spentCents,budgetCents,remainingCents:budgetCents-spentCents,percent:budgetCents===0?null:spentCents/budgetCents*100,thresholdReached,overBudget};
}
export function expenseDistribution(items:{category:string;amount:number;kind:string;flowType?:FlowType}[]){const by=new Map<string,number>();for(const e of items)if(e.kind==='expense'&&(e.flowType||'standard')==='standard'&&e.amount>0)by.set(e.category,(by.get(e.category)||0)+e.amount);return [...by.entries()].sort((a,b)=>b[1]-a[1]);}
