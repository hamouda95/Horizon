import type {Entry} from './household-data';import {budgetMonth} from './period';import {summarizeFlows} from './flow';import {localToday} from './dates';
export function financialPeriod(entries:Entry[],month:string,today=localToday()){
 const rows=entries.filter(e=>e.date<=today&&budgetMonth(e)===month),flows=summarizeFlows(rows),byCategory=new Map<string,number>();
 for(const e of rows)if(e.kind==='expense'&&e.flowType==='standard')byCategory.set(e.categoryId,(byCategory.get(e.categoryId)||0)+e.amount);
 return {rows,flows,byCategory,income:flows.income,expense:flows.expense,balance:flows.availableBalance};
}
export type Loan={id:string;borrower:string;opening_principal_cents:number;opened_on:string|null;notes:string};
export function loanPosition(loan:Loan,entries:Entry[],today=localToday()){
 const rows=entries.filter(e=>e.loanId===loan.id&&e.flowType==='loan'&&e.date<=today);const opening=!loan.opened_on||loan.opened_on<=today?loan.opening_principal_cents:0;
 const advanced=rows.filter(e=>e.kind==='expense').reduce((n,e)=>n+e.amount,0),repaid=rows.filter(e=>e.kind==='income').reduce((n,e)=>n+e.amount,0);
 return {lent:opening+advanced,repaid,outstanding:opening+advanced-repaid};
}
