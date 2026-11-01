import {categoryAliases,referenceData,type ReferenceRule} from './reference-data';
export type {ReferenceRule};
// Public starting reference. Household-confirmed rules always take precedence.
export const classificationReference:ReferenceRule[]=referenceData;
export const normalizeReference=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

// Pre-normalised terms, computed once: the dictionary is large and matched on every imported row.
const indexed=classificationReference.map(rule=>({rule,terms:rule.terms.map(term=>{const normalized=normalizeReference(term);return {length:normalized.length,spaced:' '+normalized+' ',glued:normalized.includes(' ')&&normalized.length>=6?normalized.replace(/ /g,''):''}})}));

export function referenceMatch(label:string,kind:'income'|'expense'){
 const normalized=normalizeReference(label),text=' '+normalized+' ',compact=normalized.replace(/ /g,'');
 let best:{rule:ReferenceRule;length:number}|null=null;
 for(const {rule,terms} of indexed){
  if(rule.kind!==kind)continue;
  // Whole-word match, or a multi-word brand written without spaces ("UBEREATS", "AMAZONPAYMENTS").
  for(const term of terms)if((text.includes(term.spaced)||term.glued&&compact.includes(term.glued))&&(!best||term.length>best.length))best={rule,length:term.length};
 }
 return best?.rule||null;
}

/** The household category for a reference rule: same name first, then the usual equivalents it may already have. */
export function resolveReferenceCategory<T extends {id:string;name:string;kind:string;active:boolean}>(rule:Pick<ReferenceRule,'category'|'kind'>,categories:T[]):T|null{
 const usable=categories.filter(c=>c.active&&c.kind===rule.kind);
 for(const name of [rule.category,...(categoryAliases[rule.category]||[])]){const found=usable.find(c=>normalizeReference(c.name)===normalizeReference(name));if(found)return found}
 return null;
}

export function referenceTaxonomy(){
 const groups=new Map<string,{kind:string;name:string;subcategories:string[]}>();
 for(const rule of classificationReference){const key=rule.kind+'|'+rule.category,g=groups.get(key)||{kind:rule.kind,name:rule.category,subcategories:[]};if(!g.subcategories.includes(rule.subcategory))g.subcategories.push(rule.subcategory);groups.set(key,g)}
 return [...groups.values()];
}
