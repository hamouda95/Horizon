import type {FlowType} from '../../lib/flow';
import {matchMerchantRule,type MerchantKnowledgeRule} from './merchant-knowledge';

export type RuleTarget={id:string;kind:'income'|'expense';label:string;categoryId:string;flowType?:string|null};
export type RulePlan={matched:number;categoryChanges:Map<string,string[]>;flowChanges:Map<FlowType,string[]>};

/** Lists the operations whose category or nature differs from what the household rules prescribe. */
export function planRuleApplication(entries:readonly RuleTarget[],rules:MerchantKnowledgeRule[]):RulePlan{
 const plan:RulePlan={matched:0,categoryChanges:new Map(),flowChanges:new Map()};
 for(const entry of entries){
  const rule=matchMerchantRule(entry.label,entry.kind,rules);if(!rule)continue;
  plan.matched++;
  if(rule.category_id!==entry.categoryId)plan.categoryChanges.set(rule.category_id,[...(plan.categoryChanges.get(rule.category_id)||[]),entry.id]);
  if(rule.flow_type&&rule.flow_type!==(entry.flowType||'standard'))plan.flowChanges.set(rule.flow_type,[...(plan.flowChanges.get(rule.flow_type)||[]),entry.id]);
 }
 return plan;
}

export function changedOperationCount(plan:RulePlan){
 return new Set([...plan.categoryChanges.values(),...plan.flowChanges.values()].flat()).size;
}

export const ruleKey=(rule:Pick<MerchantKnowledgeRule,'kind'|'merchant_key'>)=>`${rule.kind}:${rule.merchant_key}`;
