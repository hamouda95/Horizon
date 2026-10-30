import {matchMerchantRule,normalizeMerchant} from './merchant-knowledge';
import type {MerchantKnowledgeRule} from './merchant-knowledge';
import type {FlowType} from './flow';
export function confirmedCounterpartyFlow(label:string,kind:'income'|'expense',rules:MerchantKnowledgeRule[]):FlowType|null{
 return matchMerchantRule(label,kind,rules)?.flow_type||null;
}
export function keywordCategory(label:string,kind:'income'|'expense',categories:{id:string;name:string;kind:string;active:boolean}[]):string|null{
 const text=normalizeMerchant(label);
 const rules:[string,RegExp][] = kind==='income'?[['salaire',/\b(salaire|paie|payroll|remuneration)\b/]]:[
  ['courses',/supermarche|epicerie|carrefour|auchan|lidl|aldi|intermarche|leclerc|monoprix|franprix|picard|boucherie|boulangerie/],
  ['loisirs',/restaurant|resto|uber eats|deliveroo|cinema|spotify|netflix|disney|streaming/],
  ['transport',/sncf|ratp|metro|carburant|essence|\buber\b|\bbolt\b|parking|peage/],
  ['logement',/\bloyer\b|syndic|immobilier|foncier/],
  ['sante',/pharmacie|medical|medecin|dentiste|hopital/],
  ['factures',/electricite|\bedf\b|engie|internet|telephone|orange|free mobile|bouygues|sfr|assurance|abonnement/]
 ];
 for(const [name,pattern] of rules)if(pattern.test(text)){const category=categories.find(c=>c.active&&c.kind===kind&&normalizeMerchant(c.name)===name);if(category)return category.id}
 return null;
}
