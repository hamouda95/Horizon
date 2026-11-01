import type {FlowType} from '../../lib/flow';
import {normalizeReference,referenceMatch,resolveReferenceCategory} from './classification-reference';
import {createHouseholdClassifier} from './local-classifier';
import {matchMerchantRule,type MerchantKnowledgeRule} from './merchant-knowledge';
import type {AiSuggestion} from './ai-suggestions';

type Category={id:string;name:string;kind:string;active:boolean};
type Subcategory={id:string;name:string;category_id:string;active:boolean};
type Operation={id:string;label:string;kind:'income'|'expense';categoryId:string;subcategoryId?:string|null;flowType:string};
export type LocalSuggestion=AiSuggestion&{source:'rule'|'dictionary'|'learned'};
export const isTransferLabel=(label:string)=>/\b(vir|virt|virement|virements|transfert|transfer)\b/.test(normalizeReference(label));

/**
 * Free, offline suggestions computed in the browser, in order of trust:
 * 1. the household's own rules, 2. the reference dictionary, 3. a model learned from the household's classified operations.
 */
export function suggestLocally(candidates:Operation[],context:{categories:Category[];subcategories:Subcategory[];rules:MerchantKnowledgeRule[];history:Operation[]}):LocalSuggestion[]{
 const {categories,subcategories,rules,history}=context;
 const candidateIds=new Set(candidates.map(c=>c.id));
 // Learn only from operations the household already settled, never from the ones being suggested.
 const learned=createHouseholdClassifier(categories,history.filter(h=>!candidateIds.has(h.id)&&h.flowType!=='review').map(h=>({label:h.label,kind:h.kind,categoryId:h.categoryId,subcategoryId:h.subcategoryId??null,flowType:h.flowType})));
 const subByName=(categoryId:string,name:string)=>subcategories.find(s=>s.active&&s.category_id===categoryId&&normalizeReference(s.name)===normalizeReference(name))?.id??null;
 const usable=(id:string,kind:string)=>categories.some(c=>c.id===id&&c.active&&c.kind===kind);
 const nature=(op:Operation,suggested?:FlowType|null):FlowType=>suggested||(op.flowType==='review'?'standard':op.flowType as FlowType);
 const out:LocalSuggestion[]=[];
 for(const op of candidates){
  const rule=matchMerchantRule(op.label,op.kind,rules);
  if(rule&&usable(rule.category_id,op.kind)){out.push({entryId:op.id,categoryId:rule.category_id,subcategoryId:rule.subcategory_id,flowType:nature(op,rule.flow_type),confidence:'high',reason:`Règle du foyer « ${rule.merchant_label} »`,source:'rule'});continue}
  const reference=referenceMatch(op.label,op.kind),category=reference?resolveReferenceCategory(reference,categories):null;
  if(reference&&category){
   // A rule landing on its own category is sure; one landing on a fallback alias is only probable.
   const exact=normalizeReference(category.name)===normalizeReference(reference.category);
   out.push({entryId:op.id,categoryId:category.id,subcategoryId:subByName(category.id,reference.subcategory),flowType:nature(op,reference.flowType),confidence:exact?'high':'medium',reason:`Dictionnaire : ${reference.subcategory}`,source:'dictionary'});continue;
  }
  // Transfers name people or the household's own accounts: similarity with past labels says nothing reliable
  // about them (own-account move, loan, rent…), so only explicit rules and the dictionary may classify them.
  if(isTransferLabel(op.label))continue;
  const guess=learned(op.label,op.kind);
  if(guess&&usable(guess.categoryId,op.kind))out.push({entryId:op.id,categoryId:guess.categoryId,subcategoryId:guess.subcategoryId,flowType:nature(op),confidence:guess.confidence,reason:'Ressemble à vos opérations déjà classées',source:'learned'});
 }
 return out;
}
