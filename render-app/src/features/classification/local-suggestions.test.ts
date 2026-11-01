import {expect,it} from 'vitest';
import {suggestLocally} from './local-suggestions';

const categories=[{id:'other',name:'Autres dépenses',kind:'expense',active:true},{id:'food',name:'Courses',kind:'expense',active:true},{id:'fun',name:'Loisirs',kind:'expense',active:true},{id:'transport',name:'Transport',kind:'expense',active:true}];
const subcategories=[{id:'super',name:'Supermarchés et alimentation',category_id:'food',active:true}];
const op=(id:string,label:string,categoryId='other',flowType='standard')=>({id,label,kind:'expense' as const,categoryId,subcategoryId:null,flowType});

it('applique d’abord les règles du foyer, puis le dictionnaire, puis l’apprentissage local',()=>{
 const rules=[{merchant_key:'souk alcharq',merchant_label:'Souk Alcharq',kind:'expense' as const,category_id:'food',subcategory_id:null,sample_count:3,flow_type:'standard' as const}];
 const history=[op('h1','CB BIBOU 12/10','fun'),op('h2','CB BIBOU 20/10','fun'),op('h3','CB ZORGLUB 02/10','transport')];
 const result=suggestLocally([op('a','CB SOUK ALCHARQ 4'),op('b','CB LIDL 4362','other','review'),op('c','CB BIBOU 28/10'),op('d','CB XYZ123')],{categories,subcategories,rules,history});
 expect(result.map(r=>[r.entryId,r.categoryId,r.source,r.confidence])).toEqual([['a','food','rule','high'],['b','food','dictionary','high'],['c','fun','learned','high']]);
 expect(result.find(r=>r.entryId==='b')).toMatchObject({subcategoryId:'super',flowType:'standard'});
});

it('ne devine jamais un virement par ressemblance, mais garde le dictionnaire pour eux',()=>{
 const history=[op('h1','VIREMENT INSTANTANE JEAN MARTIN','fun'),op('h2','VIREMENT INSTANTANE JEAN MARTIN','fun')];
 const result=suggestLocally([op('a','VIREMENT INSTANTANE JEAN MARTIN','other','review'),op('b','VIREMENT CORNER - FLIXBUS')],{categories,subcategories,rules:[],history});
 expect(result.map(r=>[r.entryId,r.categoryId,r.source])).toEqual([['b','transport','dictionary']]);
});

it('retombe sur une catégorie équivalente avec une confiance moindre',()=>{
 const [s]=suggestLocally([op('a','CB AMAZON PAYMENTS','other','review')],{categories,subcategories,rules:[],history:[]});
 expect(s).toMatchObject({categoryId:'other',confidence:'medium',source:'dictionary'});
});

it('reprend la nature donnée par le dictionnaire',()=>{
 const [s]=suggestLocally([op('a','RETRAIT DAB PARIS','other','review')],{categories:[...categories,{id:'cash',name:'Retraits d’espèces',kind:'expense',active:true}],subcategories,rules:[],history:[]});
 expect(s).toMatchObject({categoryId:'cash',flowType:'transfer'});
});
