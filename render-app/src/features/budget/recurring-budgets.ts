export type CategoryBudget={id:string;category_id:string;month:string;amount_cents:number;source?:'override'|'rule'};
export type BudgetRule={id:string;revision:number;category_id:string;effective_month:string;cadence:string;amount_cents:number;enabled:boolean;created_at:string};
export function effectiveCategoryBudget(overrides:CategoryBudget[],rules:BudgetRule[],categoryId:string,month:string):CategoryBudget|null{
 const override=overrides.find(b=>b.category_id===categoryId&&b.month===month+'-01');if(override)return {...override,source:'override'};
 const rule=rules.filter(r=>r.category_id===categoryId&&r.effective_month<=month+'-01').sort((a,b)=>b.effective_month.localeCompare(a.effective_month)||b.revision-a.revision)[0];
 if(!rule?.enabled)return null;const amount=rule.cadence==='annual'?Math.floor(rule.amount_cents/12)+(Number(month.slice(5,7))<=rule.amount_cents%12?1:0):rule.amount_cents;
 return {id:'rule:'+rule.id+':'+month,category_id:categoryId,month:month+'-01',amount_cents:amount,source:'rule'};
}
export function resolvedCategoryBudgets(overrides:CategoryBudget[],rules:BudgetRule[],months:string[]){const ids=[...new Set([...overrides.map(r=>r.category_id),...rules.map(r=>r.category_id)])];return months.flatMap(month=>ids.flatMap(id=>{const b=effectiveCategoryBudget(overrides,rules,id,month);return b?[b]:[]}))}
