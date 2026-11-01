// One monthly cap for every screen: the category envelopes when the month has any, so editing an envelope
// moves the remaining budget at once; the global figure typed in the forecast form only fills in otherwise.
export type OverallBudget={cents:number|null;source:'envelopes'|'plan'|null};
export function overallBudget(planExpenseCents:number|null|undefined,envelopes:{amount_cents:number}[]):OverallBudget{
 if(envelopes.length)return {cents:envelopes.reduce((n,b)=>n+b.amount_cents,0),source:'envelopes'};
 if(planExpenseCents!=null)return {cents:planExpenseCents,source:'plan'};
 return {cents:null,source:null};
}
