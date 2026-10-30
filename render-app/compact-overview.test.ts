import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import CompactOverview from './CompactOverview';
import type {Entry} from './household-data';
const entry=(flowType:Entry['flowType'],amount:number):Entry=>({id:flowType,amount,kind:'income',label:'Fixture',date:'2026-10-30',flowType,frequency:'monthly',incomeAllocation:'calendar',category:'Salaire',categoryId:'c',subcategoryId:null,bankTransactionId:null,personId:null,expenseType:null});
it('résume budget et comptes sans cacher les crédits à vérifier ni assimiler un solde inconnu à zéro',()=>{
 const html=renderToStaticMarkup(createElement(CompactOverview,{accounts:[{id:'a',name:'Livret',account_type:'savings',currency:'EUR',balance_cents:null,balance_as_of:null}],accountError:'',entries:[entry('standard',250000),entry('review',100000)],month:'2026-10',setMonth:()=>{},budgetCents:100000,today:'2026-10-30',loading:false,onBank:()=>{},onBudget:()=>{},onIncome:()=>{},onExpenses:()=>{},onReport:()=>{}}));
 expect(html).toContain('Total par compte');expect(html).toContain('Où en est le budget');expect(html).toContain('2 500,00');expect(html).toContain('1 entrée à vérifier');expect(html).toContain('Solde à renseigner');expect(html).not.toContain('Dernières opérations');expect(html).not.toContain('Paie estimée');
});
