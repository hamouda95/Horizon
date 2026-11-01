import {expect,it} from 'vitest';
import {maskLabel,systemPrompt,userPrompt,validateSuggestions,type AiCategory,type AiOperation,type AiSubcategory} from '../../../../supabase/functions/_shared/ai-categorize';

const categories:AiCategory[]=[{id:'c-food',name:'Courses',kind:'expense'},{id:'c-salary',name:'Salaire',kind:'income'}];
const subcategories:AiSubcategory[]=[{id:'s-super',name:'Supermarché',category_id:'c-food'}];
const ops:AiOperation[]=[{id:'e1',label:'CB CARREFOUR 12/10',amount_cents:4520,kind:'expense',entry_date:'2026-10-12'},{id:'e2',label:'VIR SALAIRE ACME',amount_cents:250000,kind:'income',entry_date:'2026-10-30'}];

it('masque IBAN, e-mails et longs numéros avant envoi',()=>{
 expect(maskLabel('VIR FR76 3000 4000 0312 3456 7890 143 DUPONT')).toBe('VIR [IBAN] DUPONT');
 expect(maskLabel('PRLV REF 123456789 contact@exemple.fr')).toBe('PRLV REF [n°] [e-mail]');
 expect(maskLabel('CB CARREFOUR 12/10')).toBe('CB CARREFOUR 12/10');
});

it('construit des consignes stables et une liste d’opérations numérotées',()=>{
 expect(systemPrompt(categories,subcategories)).toBe(systemPrompt([...categories].reverse(),subcategories));
 expect(systemPrompt(categories,subcategories)).toContain('c-food : Courses (dépense)\n    - s-super : Supermarché');
 expect(userPrompt(ops)).toContain('"n":1,"libelle":"VIR SALAIRE ACME","montant_eur":"2500.00","type":"revenu"');
});

it('ne garde que des suggestions valides pour ce foyer',()=>{
 const raw={suggestions:[
  {n:0,category_id:'c-food',subcategory_id:'s-super',flow_type:'standard',confidence:'high',reason:'Supermarché'},
  {n:0,category_id:'c-food',subcategory_id:'',flow_type:'standard',confidence:'high',reason:'doublon'},
  {n:1,category_id:'c-food',subcategory_id:'',flow_type:'standard',confidence:'high',reason:'mauvais type'},
  {n:7,category_id:'c-salary',subcategory_id:'',flow_type:'standard',confidence:'high',reason:'hors liste'},
  {n:1,category_id:'inconnue',subcategory_id:'',flow_type:'standard',confidence:'high',reason:'inventée'},
 ]};
 expect(validateSuggestions(raw,ops,categories,subcategories)).toEqual([{entryId:'e1',categoryId:'c-food',subcategoryId:'s-super',flowType:'standard',confidence:'high',reason:'Supermarché'}]);
 expect(validateSuggestions({suggestions:[{n:1,category_id:'c-salary',subcategory_id:'s-super',flow_type:'bizarre',confidence:'certain',reason:'x'}]},ops,categories,subcategories)).toEqual([{entryId:'e2',categoryId:'c-salary',subcategoryId:null,flowType:'review',confidence:'low',reason:'x'}]);
 expect(validateSuggestions('n’importe quoi',ops,categories,subcategories)).toEqual([]);
});
