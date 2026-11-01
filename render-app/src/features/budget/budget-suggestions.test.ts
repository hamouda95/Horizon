import {expect,it} from 'vitest';
import {nextMonth,suggestCategoryBudgets} from './budget-suggestions';
import {importanceByCategory,moveInOrder,orderByImportance} from '../categories/category-order';

const e=(categoryId:string,amount:number,date:string,extra:Partial<{flowType:string;frequency:'monthly'|'annual';kind:'income'|'expense'}>={})=>({kind:'expense' as const,categoryId,amount,date,flowType:'standard',frequency:'monthly' as const,...extra});

it('propose la moyenne des trois derniers mois complets, arrondie aux 5 € supérieurs',()=>{
 const entries=[e('food',30000,'2026-08-10'),e('food',36000,'2026-09-10'),e('food',33100,'2026-10-12'),e('food',99900,'2026-11-01'),e('food',5000,'2026-10-20',{flowType:'transfer'})];
 const [food]=suggestCategoryBudgets(entries,['food'],'2026-11');
 expect(food).toMatchObject({averageCents:33033,months:3,suggestedCents:33500});
});

it('ne compte pas comme zéro les mois antérieurs aux premières opérations',()=>{
 const [fun]=suggestCategoryBudgets([e('fun',12000,'2026-10-05')],['fun'],'2026-11');
 expect(fun).toMatchObject({averageCents:12000,months:1,suggestedCents:12000});
});

it('lisse les factures annuelles sur douze mois',()=>{
 const [ins]=suggestCategoryBudgets([e('ins',60000,'2026-03-15',{frequency:'annual'}),e('ins',2000,'2026-10-01')],['ins'],'2026-11');
 expect(ins).toMatchObject({annualShareCents:5000,averageCents:667,suggestedCents:6000});
 expect(nextMonth('2026-12')).toBe('2027-01');
});

it('classe les catégories par ordre choisi, puis par importance',()=>{
 const cats=[{id:'a',name:'Loisirs',active:true},{id:'b',name:'Logement',active:true},{id:'c',name:'Santé',active:true,sort_order:10},{id:'d',name:'Ancienne',active:false}];
 const importance=importanceByCategory([{categoryId:'b',amount:-90000,date:'2026-10-01'},{categoryId:'a',amount:-20000,date:'2026-10-02'},{categoryId:'a',amount:-99999,date:'2025-01-01'}],'2026-11-01');
 expect(orderByImportance(cats,importance).map(c=>c.id)).toEqual(['c','b','a','d']);
 expect(moveInOrder([{id:'c'},{id:'b'},{id:'a'}],'a',-1)).toEqual([{id:'c',sort_order:10},{id:'a',sort_order:20},{id:'b',sort_order:30}]);
 expect(moveInOrder([{id:'c'}],'c',-1)).toEqual([]);
});
