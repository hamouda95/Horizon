import {test} from 'vitest';
import {strict as assert} from 'node:assert';
import {estimateNextPayday} from './dashboard-finance';

const salary=(date:string,overrides:Partial<{label:string;category:string;kind:'income'|'expense';flowType:'standard'|'transfer'|'refund'|'savings'|'review';personId:string|null;amount:number}>={})=>({date,label:'Virement Salaire',category:'Salaire',kind:'income' as const,flowType:'standard' as const,personId:'member-1',amount:250000,...overrides});

test('estime la prochaine paie à partir de deux salaires mensuels récents',()=>{
 assert.deepEqual(estimateNextPayday([salary('2026-09-28'),salary('2026-10-28')],'2026-10-29'),{date:'2026-11-27',daysUntil:29,label:'Virement Salaire'});
});

test('n’infère pas une paie depuis un seul salaire, un transfert ou une cadence irrégulière',()=>{
 assert.equal(estimateNextPayday([salary('2026-10-28')],'2026-10-29'),null);
 assert.equal(estimateNextPayday([salary('2026-09-28',{flowType:'transfer'}),salary('2026-10-28',{flowType:'transfer'})],'2026-10-29'),null);
 assert.equal(estimateNextPayday([salary('2026-09-01'),salary('2026-10-28')],'2026-10-29'),null);
});

test('refuse une estimation fondée sur un historique trop ancien',()=>{
 assert.equal(estimateNextPayday([salary('2026-07-01'),salary('2026-08-01')],'2026-10-29'),null);
});
