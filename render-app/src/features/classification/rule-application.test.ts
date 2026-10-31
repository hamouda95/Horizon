import {expect,it} from 'vitest';
import {changedOperationCount,planRuleApplication,type RuleTarget} from './rule-application';
import type {MerchantKnowledgeRule} from './merchant-knowledge';

const rule=(merchant_key:string,category_id:string,flow_type:MerchantKnowledgeRule['flow_type']='standard',kind:'income'|'expense'='expense'):MerchantKnowledgeRule=>({merchant_key,merchant_label:merchant_key,kind,category_id,subcategory_id:null,sample_count:1,flow_type});
const op=(id:string,label:string,categoryId:string,flowType='standard',kind:'income'|'expense'='expense'):RuleTarget=>({id,kind,label,categoryId,flowType});

it('regroupe par catégorie cible les opérations à recatégoriser',()=>{
 const plan=planRuleApplication([op('a','CB CARREFOUR MARKET 12/10','loisirs'),op('b','CARREFOUR CITY','courses'),op('c','NETFLIX.COM','abonnements')],[rule('carrefour','courses')]);
 expect(plan.matched).toBe(2);expect([...plan.categoryChanges]).toEqual([['courses',['a']]]);expect(plan.flowChanges.size).toBe(0);
});

it('applique la nature prévue par la règle et ignore l’autre sens',()=>{
 const plan=planRuleApplication([op('a','VIR LIVRET A','divers'),op('b','VIR LIVRET A','salaire','standard','income')],[rule('livret a','divers','savings')]);
 expect([...plan.flowChanges]).toEqual([['savings',['a']]]);expect(plan.categoryChanges.size).toBe(0);expect(changedOperationCount(plan)).toBe(1);
});

it('compte une seule fois une opération qui change de catégorie et de nature',()=>{
 const plan=planRuleApplication([op('a','PRLV EDF','divers')],[rule('edf','energie','review')]);
 expect(changedOperationCount(plan)).toBe(1);
});
