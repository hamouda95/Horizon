import {expect,it} from 'vitest';
import type {Entry} from '../hooks/household-data';
import {activeFilterCount,emptyEntryFilters,entryPerson,matchesFilters,matchesQuery,type EntryContext} from './entry-filters';

const entry=(over:Partial<Entry>={}):Entry=>({id:'e',kind:'expense',label:'CARTE 30/10 MAZROOM PARIS',category:'Loisirs',amount:2570,date:'2026-10-30',frequency:'monthly',incomeAllocation:'calendar',expenseType:null,categoryId:'c',subcategoryId:null,bankTransactionId:'t',personId:null,flowType:'standard',...over} as Entry);
const accounts={fortuneo:{id:'a1',name:'Compte Courant',source_name:'Fortuneo',owner_person_id:'p1'},bnp:{id:'a2',name:'Compte courant',source_name:'BNP Paribas',owner_person_id:'p2'}};
const ctx=(account?:keyof typeof accounts):EntryContext=>({account:()=>account?accounts[account]:undefined,personName:id=>id==='p1'?'Mohamed':id==='p2'?'Lynda':''});

it('déduit la personne du compte quand l’opération n’en a pas',()=>{
 expect(entryPerson(entry(),ctx('fortuneo'))).toBe('p1');
 expect(entryPerson(entry({personId:'p2'}),ctx('fortuneo'))).toBe('p2');
 expect(entryPerson(entry(),ctx())).toBeNull();
});

it('cherche dans le libellé, la banque, la personne et le montant, sans accents',()=>{
 expect(matchesQuery(entry(),'mazroom',ctx('fortuneo'))).toBe(true);
 expect(matchesQuery(entry(),'fortunéo',ctx('fortuneo'))).toBe(true);
 expect(matchesQuery(entry(),'mohamed',ctx('fortuneo'))).toBe(true);
 expect(matchesQuery(entry(),'25,70',ctx('fortuneo'))).toBe(true);
 expect(matchesQuery(entry(),'25,71',ctx('fortuneo'))).toBe(false);
 expect(matchesQuery(entry(),'lynda',ctx('fortuneo'))).toBe(false);
});

it('combine période, personne, banque, compte, nature, catégorie et montant',()=>{
 const f={...emptyEntryFilters};
 expect(matchesFilters(entry(),f,ctx('fortuneo'),'2026-10')).toBe(true);
 expect(matchesFilters(entry(),f,ctx('fortuneo'),'2026-11')).toBe(false);
 expect(matchesFilters(entry(),{...f,period:'range',from:'2026-10-01',to:'2026-10-29'},ctx('fortuneo'),'2026-11')).toBe(false);
 expect(matchesFilters(entry(),{...f,period:'all',person:'p1'},ctx('fortuneo'),'')).toBe(true);
 expect(matchesFilters(entry(),{...f,period:'all',person:'common'},ctx('fortuneo'),'')).toBe(false);
 expect(matchesFilters(entry(),{...f,period:'all',account:'bank:Fortuneo'},ctx('fortuneo'),'')).toBe(true);
 expect(matchesFilters(entry(),{...f,period:'all',account:'a2'},ctx('fortuneo'),'')).toBe(false);
 expect(matchesFilters(entry({bankTransactionId:null}),{...f,period:'all',account:'none'},ctx(),'')).toBe(true);
 expect(matchesFilters(entry(),{...f,period:'all',flow:'transfer'},ctx('fortuneo'),'')).toBe(false);
 expect(matchesFilters(entry(),{...f,period:'all',min:'20',max:'30'},ctx('fortuneo'),'')).toBe(true);
 expect(matchesFilters(entry(),{...f,period:'all',min:'30'},ctx('fortuneo'),'')).toBe(false);
 expect(activeFilterCount({...f,period:'all',person:'p1',min:'5',max:'9'})).toBe(3);
});
