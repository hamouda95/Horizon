import type {FlowType} from '../../lib/flow';
import {transactionMerchantKey} from './merchant-knowledge';

export type AiSuggestion={entryId:string;categoryId:string;subcategoryId:string|null;flowType:FlowType;confidence:'high'|'medium'|'low';reason:string};
type Candidate={id:string;label:string;date:string;kind:'income'|'expense';categoryId:string;subcategoryId?:string|null;flowType:string};
type Category={id:string;name:string};

const folded=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
/** Catch-all categories ("Autres dépenses", "Divers"…) are where unrecognised operations end up. */
export const isCatchAll=(name:string)=>/^(autres?|divers|non classe|a classer|inconnu)\b/.test(folded(name));
// Natures the user or the import already decided: the AI does not second-guess them.
const settledFlows=new Set(['transfer','savings','investment','loan']);

/** Operations worth a suggestion: still to review, or parked in a catch-all category; most recent first. */
export function aiCandidates<T extends Candidate>(entries:T[],categories:Category[],limit=300):T[]{
 const catchAll=new Set(categories.filter(c=>isCatchAll(c.name)).map(c=>c.id));
 return entries.filter(e=>e.flowType==='review'||catchAll.has(e.categoryId)&&!settledFlows.has(e.flowType)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,limit);
}

export type SuggestionPlan={categories:Map<string,string[]>;subcategories:Map<string,string[]>;flows:Map<FlowType,string[]>;rules:Array<{key:string;kind:'income'|'expense';categoryId:string;subcategoryId:string|null;flowType:FlowType}>};
const push=<K,>(map:Map<K,string[]>,key:K,id:string)=>map.set(key,[...(map.get(key)||[]),id]);

/** Turns accepted suggestions into grouped updates, plus one rule per merchant when every suggestion for it agrees. */
export function planSuggestions(accepted:AiSuggestion[],entries:Candidate[]):SuggestionPlan{
 const plan:SuggestionPlan={categories:new Map(),subcategories:new Map(),flows:new Map(),rules:[]};
 const byKey=new Map<string,{kind:'income'|'expense';targets:Set<string>;first:AiSuggestion}>();
 for(const s of accepted){
  const entry=entries.find(e=>e.id===s.entryId);if(!entry)continue;
  const categoryChanges=s.categoryId!==entry.categoryId;
  if(categoryChanges)push(plan.categories,s.categoryId,entry.id);
  // Changing the category clears the subcategory server-side, so it is set again afterwards.
  if(s.subcategoryId&&(categoryChanges||s.subcategoryId!==entry.subcategoryId))push(plan.subcategories,s.subcategoryId,entry.id);
  if(s.flowType!==entry.flowType)push(plan.flows,s.flowType,entry.id);
  const key=transactionMerchantKey(entry.label);
  if(key){const target=`${s.categoryId}|${s.subcategoryId||''}|${s.flowType}`,known=byKey.get(`${entry.kind}:${key}`);
   if(known)known.targets.add(target);else byKey.set(`${entry.kind}:${key}`,{kind:entry.kind,targets:new Set([target]),first:s})}
 }
 for(const [composite,{kind,targets,first}] of byKey)if(targets.size===1)plan.rules.push({key:composite.slice(kind.length+1),kind,categoryId:first.categoryId,subcategoryId:first.subcategoryId,flowType:first.flowType});
 return plan;
}
