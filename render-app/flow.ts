export type FlowType='standard'|'transfer'|'refund'|'savings'|'investment'|'review';
export const flowTypeLabels:Record<FlowType,string>={
 standard:'Revenu ou dépense',
 transfer:'Transfert interne',
 refund:'Remboursement',
 savings:'Mouvement d’épargne',
 investment:'Versement ou retrait de placement',
 review:'À vérifier',
};
export function isFlowType(value:unknown):value is FlowType{
 return value==='standard'||value==='transfer'||value==='refund'||value==='savings'||value==='investment'||value==='review';
}
export function flowTypeLabel(value:FlowType,kind:'income'|'expense'){
 if(value==='standard')return kind==='income'?'Revenu':'Dépense';
 return flowTypeLabels[value];
}
export type FlowEntry={kind:'income'|'expense';amount:number;flowType?:FlowType};
export type FlowTotals={income:number;expense:number;refundsReceived:number;refundsReversed:number;transfersReceived:number;transfersSent:number;savingsDeposits:number;savingsWithdrawals:number;investmentDeposits:number;investmentWithdrawals:number;needsReviewReceived:number;needsReviewSent:number;confirmedBalance:number;availableBalance:number};
export function summarizeFlows(entries:FlowEntry[]):FlowTotals{
 const totals:FlowTotals={income:0,expense:0,refundsReceived:0,refundsReversed:0,transfersReceived:0,transfersSent:0,savingsDeposits:0,savingsWithdrawals:0,investmentDeposits:0,investmentWithdrawals:0,needsReviewReceived:0,needsReviewSent:0,confirmedBalance:0,availableBalance:0};
 for(const entry of entries){
  if(!Number.isSafeInteger(entry.amount)||entry.amount<0)continue;
  const type=entry.flowType||'standard';
  if(type==='standard'){
   if(entry.kind==='income')totals.income+=entry.amount;else totals.expense+=entry.amount;
  }else if(type==='refund'){
   if(entry.kind==='income')totals.refundsReceived+=entry.amount;else totals.refundsReversed+=entry.amount;
  }else if(type==='transfer'){
   if(entry.kind==='income')totals.transfersReceived+=entry.amount;else totals.transfersSent+=entry.amount;
  }else if(type==='savings'){
   if(entry.kind==='income')totals.savingsWithdrawals+=entry.amount;else totals.savingsDeposits+=entry.amount;
  }else if(type==='investment'){
   if(entry.kind==='income')totals.investmentWithdrawals+=entry.amount;else totals.investmentDeposits+=entry.amount;
  }else if(type==='review'){
   if(entry.kind==='income')totals.needsReviewReceived+=entry.amount;else totals.needsReviewSent+=entry.amount;
  }
 }
 totals.confirmedBalance=totals.income+totals.refundsReceived-totals.expense-totals.refundsReversed;
 totals.availableBalance=totals.confirmedBalance-totals.savingsDeposits+totals.savingsWithdrawals-totals.investmentDeposits+totals.investmentWithdrawals;
 return totals;
}
