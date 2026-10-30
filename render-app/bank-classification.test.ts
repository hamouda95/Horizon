import {expect,it} from 'vitest';
import {keywordCategory,confirmedCounterpartyFlow} from './bank-classification';
import {createHouseholdClassifier} from './local-classifier';
const categories=[{id:'other',name:'Autres dépenses',kind:'expense',active:true},{id:'food',name:'Courses',kind:'expense',active:true},{id:'fun',name:'Loisirs',kind:'expense',active:true}];
it('ne réapprend pas les catégories fourre-tout produites par les anciens imports',()=>{
 const classify=createHouseholdClassifier(categories,[{label:'CB CARREFOUR',kind:'expense',categoryId:'other'}]);
 expect(classify('CB CARREFOUR','expense')).toBeNull();
 expect(keywordCategory('CB CARREFOUR','expense',categories)).toBe('food');
 expect(keywordCategory('UBER EATS','expense',categories)).toBe('fun');
});
it('réutilise une correction explicite de salaire sans imposer un employeur global à tous les foyers',()=>{
 const rules=[{merchant_key:'acme employeur',merchant_label:'acme employeur',kind:'income' as const,category_id:'salary',subcategory_id:null,sample_count:1,flow_type:'standard' as const}];
 expect(confirmedCounterpartyFlow('VIR SEPA ACME EMPLOYEUR','income',rules)).toBe('standard');
 expect(confirmedCounterpartyFlow('VIR SEPA AUTRE PERSONNE','income',rules)).toBeNull();
});
