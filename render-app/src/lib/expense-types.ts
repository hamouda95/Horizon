import type {FlowType} from './flow';
export type ExpenseType='recurring'|'one_off'|null;
export function expenseTotals(entries:{kind:string;amount:number;expenseType:ExpenseType;flowType?:FlowType}[]){return entries.reduce((acc,e)=>{if(e.kind==='expense'&&(e.flowType||'standard')==='standard'){if(e.expenseType==='recurring')acc.recurring+=e.amount;else if(e.expenseType==='one_off')acc.oneOff+=e.amount;else acc.unclassified+=e.amount}return acc},{recurring:0,oneOff:0,unclassified:0})}
