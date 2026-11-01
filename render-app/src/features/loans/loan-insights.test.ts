import {expect,it} from 'vitest';
import {likelyDuplicates,namesBorrower,openingLooksDuplicated,unattachedForBorrower} from './loan-insights';

const loan={id:'L',borrower:'Hamza KOUBAA'};
const op=(id:string,label:string,amount:number,date:string,extra:Partial<{kind:'income'|'expense';loanId:string|null;bankTransactionId:string|null;flowType:string}>={})=>({id,label,amount,date,kind:'expense' as const,loanId:null,bankTransactionId:null,flowType:'standard',...extra});

it('reconnaît le nom de la personne dans un libellé',()=>{
 expect(namesBorrower('VIR INST HAMZA KOUBAA','Hamza KOUBAA')).toBe(true);
 expect(namesBorrower('Virement instantané Koubaa','Hamza Koubaa')).toBe(true);
 expect(namesBorrower('CB HAMZAOUI MARKET','Hamza Koubaa')).toBe(false);
});

it('liste les opérations au nom de la personne non rattachées',()=>{
 const entries=[op('a','Virement instantané Hamza Koubaa',45000,'2026-09-11',{bankTransactionId:'t1'}),op('b','Virement instantané Hamza Koubaa',55000,'2026-09-11',{loanId:'L',bankTransactionId:'t2',flowType:'loan'}),op('c','CB FRANPRIX',500,'2026-09-12')];
 expect(unattachedForBorrower(entries,loan).map(e=>e.id)).toEqual(['a']);
});

it('repère une saisie manuelle qui double un vrai virement',()=>{
 const entries=[op('manual','Prêt',45000,'2026-11-01',{loanId:'L',flowType:'loan'}),op('real','Virement instantané Hamza Koubaa',45000,'2026-09-11',{bankTransactionId:'t1'}),op('other','Virement Hamza Koubaa',12000,'2026-09-20',{bankTransactionId:'t3'})];
 expect(likelyDuplicates(entries,loan).map(p=>[p.manual.id,p.real.id])).toEqual([['manual','real']]);
 expect(likelyDuplicates(entries.filter(e=>e.id!=='real'),loan)).toEqual([]);
});

it('signale une créance antérieure qui double un virement rattaché',()=>{
 const linked=op('v','Virement instantané Hamza Koubaa',55000,'2026-09-11',{loanId:'L',bankTransactionId:'t2',flowType:'loan'});
 expect(openingLooksDuplicated([linked],{...loan,opening_principal_cents:55000})?.id).toBe('v');
 expect(openingLooksDuplicated([linked],{...loan,opening_principal_cents:100000})).toBeNull();
 expect(openingLooksDuplicated([linked],{...loan,opening_principal_cents:0})).toBeNull();
});
