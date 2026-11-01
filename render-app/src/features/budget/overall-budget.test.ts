import {expect,it} from 'vitest';
import {overallBudget} from './overall-budget';

it('les enveloppes du mois font le budget, même avec un plafond global saisi',()=>{
 expect(overallBudget(120000,[{amount_cents:30000},{amount_cents:45000}])).toEqual({cents:75000,source:'envelopes'});
 expect(overallBudget(null,[{amount_cents:0}])).toEqual({cents:0,source:'envelopes'});
});

it('le plafond global ne sert qu’en l’absence d’enveloppes',()=>{
 expect(overallBudget(120000,[])).toEqual({cents:120000,source:'plan'});
 expect(overallBudget(0,[])).toEqual({cents:0,source:'plan'});
 expect(overallBudget(undefined,[])).toEqual({cents:null,source:null});
});
