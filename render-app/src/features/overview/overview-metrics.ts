import {bankKey,bankName} from '../banking/account-organization';
export type BudgetTone='green'|'orange'|'light-green'|'red'|'unset';
export function categoryBudgetProgress(spent:number,limit:number|null){
 if(limit===null)return {percent:null,tone:'unset' as BudgetTone,remaining:null};
 const percent=limit>0?spent/limit*100:spent>0?100:0;
 return {percent,tone:(percent>=100?'red':percent>=80?'orange':percent>=50?'green':'light-green') as BudgetTone,remaining:limit-spent};
}
export function currentWealth(accounts:{account_type:string;currency:string;balance_cents:number|null}[]){
 const currencies=[...new Set(accounts.map(a=>a.currency))];
 return currencies.map(currency=>{const rows=accounts.filter(a=>a.currency===currency),sum=(type?:string)=>rows.filter(a=>!type||a.account_type===type).reduce((n,a)=>n+(a.balance_cents??0),0);return {currency,checking:sum('checking'),savings:sum('savings'),cash:sum('cash'),investments:sum('investment')+sum('crypto')+sum('other'),debts:sum('credit'),total:sum()-sum('credit'),netTotal:sum(),known:rows.filter(a=>a.balance_cents!==null).length,missing:rows.filter(a=>a.balance_cents===null).length}});
}

export function budgetPercentLabel(percent:number,locale='fr-FR'){
 const displayed=percent<100?Math.min(99.9,Math.floor(Math.max(0,percent)*10+1e-8)/10):Math.round(percent*10)/10;
 return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(displayed);
}
export function banksByAccountType(accounts:{name:string;source_name?:string|null;account_type:string;currency:string;balance_cents:number|null}[],types:string[],currency:string){
 const groups=new Map<string,{bank:string;known:number;knownCount:number;missing:number;count:number}>();
 for(const a of accounts.filter(a=>types.includes(a.account_type)&&a.currency===currency)){
  const bank=bankName(a.source_name?.trim()||a.name),key=bankKey(bank);
  const row=groups.get(key)||{bank,known:0,knownCount:0,missing:0,count:0};row.count++;
  if(a.balance_cents===null)row.missing++;else{row.known+=a.balance_cents;row.knownCount++}groups.set(key,row);
 }
 return [...groups.values()].sort((a,b)=>a.bank.localeCompare(b.bank));
}
