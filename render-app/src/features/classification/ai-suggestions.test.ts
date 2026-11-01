import {expect,it} from 'vitest';
import {aiCandidates,isCatchAll,planSuggestions,type AiSuggestion} from './ai-suggestions';

const categories=[{id:'other',name:'Autres dépenses'},{id:'food',name:'Courses'},{id:'misc',name:'Divers'}];
const e=(id:string,label:string,categoryId:string,flowType='standard',date='2026-10-10',kind:'income'|'expense'='expense')=>({id,label,date,kind,categoryId,subcategoryId:null,flowType});

it('reconnaît les catégories fourre-tout',()=>{
 expect(['Autres dépenses','Autre','Divers','À classer'].map(isCatchAll)).toEqual([true,true,true,true]);
 expect(['Courses','Autoroute','Diversification'].map(isCatchAll)).toEqual([false,false,false]);
});

it('propose les opérations à vérifier ou rangées dans un fourre-tout, sans toucher aux virements décidés',()=>{
 const list=aiCandidates([e('a','CB X','food','review','2026-10-01'),e('b','CB Y','other','standard','2026-10-05'),e('c','VIR','other','transfer'),e('d','CB Z','food'),e('f','CB W','misc','standard','2026-10-20')],categories);
 expect(list.map(x=>x.id)).toEqual(['f','b','a']);
});

it('regroupe les changements et ne crée une règle que si le marchand est classé de façon cohérente',()=>{
 const entries=[e('1','CB CARREFOUR MARKET 12/10','other'),e('2','CB CARREFOUR MARKET 15/10','other'),e('3','PRLV EDF CLIENTS','other','review'),e('4','PRLV EDF CLIENTS','other','review')];
 const s=(entryId:string,categoryId:string,flowType:AiSuggestion['flowType']='standard',subcategoryId:string|null=null):AiSuggestion=>({entryId,categoryId,subcategoryId,flowType,confidence:'high',reason:''});
 const plan=planSuggestions([s('1','food','standard','super'),s('2','food','standard','super'),s('3','bills'),s('4','energy')],entries);
 expect([...plan.categories]).toEqual([['food',['1','2']],['bills',['3']],['energy',['4']]]);
 expect([...plan.subcategories]).toEqual([['super',['1','2']]]);
 expect([...plan.flows]).toEqual([['standard',['3','4']]]);
 expect(plan.rules).toEqual([{key:'carrefour market',kind:'expense',categoryId:'food',subcategoryId:'super',flowType:'standard'}]);
});
