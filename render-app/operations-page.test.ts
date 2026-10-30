import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import OperationsPage from './OperationsPage';
import type {Entry} from './household-data';
it('rend la gestion groupée et sépare les opérations futures des totaux réalisés',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
 try{
  const base:Entry={id:'one',kind:'expense',label:'Exemple',date:'2026-10-01',amount:1000,category:'Courses',categoryId:'food',frequency:'monthly',incomeAllocation:'calendar',flowType:'standard',expenseType:'one_off',personId:null,subcategoryId:null,bankTransactionId:null};
  const html=renderToStaticMarkup(createElement(OperationsPage,{householdId:'fixture',entries:[base,{...base,id:'future',amount:50000,date:'2026-10-31'}],categories:[{id:'food',name:'Courses',kind:'expense',active:true}],people:[],month:'2026-10',setMonth:()=>{},kind:'expense',onEdit:()=>{},onChanged:async()=>{}}));
  expect(html).toContain('Consommation');expect(html).toContain('10,00');expect(html).not.toContain('510,00');expect(html).toContain('Sélectionner 2 résultat(s)');expect(html).toContain('Prévu');
 }finally{vi.useRealTimers()}
});
