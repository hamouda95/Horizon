export type BudgetTone='green'|'orange'|'light-green'|'red'|'unset';
export function categoryBudgetProgress(spent:number,limit:number|null){
 if(limit===null)return {percent:null,tone:'unset' as BudgetTone,remaining:null};
 const percent=limit>0?spent/limit*100:spent>0?100:0;
 return {percent,tone:(percent>=90?'red':percent>=70?'light-green':percent>=50?'orange':'green') as BudgetTone,remaining:limit-spent};
}
export function currentWealth(accounts:{account_type:string;currency:string;balance_cents:number|null}[]){
 const currencies=[...new Set(accounts.map(a=>a.currency))];
 return currencies.map(currency=>{const rows=accounts.filter(a=>a.currency===currency),sum=(type?:string)=>rows.filter(a=>!type||a.account_type===type).reduce((n,a)=>n+(a.balance_cents??0),0);return {currency,checking:sum('checking'),savings:sum('savings'),cash:sum('cash'),investments:sum('investment')+sum('crypto')+sum('other'),debts:sum('credit'),total:sum()-sum('credit'),netTotal:sum(),known:rows.filter(a=>a.balance_cents!==null).length,missing:rows.filter(a=>a.balance_cents===null).length}});
}
