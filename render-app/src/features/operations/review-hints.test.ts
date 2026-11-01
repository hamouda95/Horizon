import {expect,it} from 'vitest';
import {likelyInternal} from './review-hints';

const e=(id:string,label:string,flowType='review')=>({id,label,flowType,amount:1000});

it('repère les virements entre membres du foyer et entre ses propres comptes',()=>{
 const rows=[e('a','VIR INST MOHAMED BEN MAKHLOUF'),e('b','VIR CPTE A CPTE RECU'),e('c','VIR SEPA RECU'),e('d','VIR INST LYNDA ATTAYA','standard'),e('e','CB MOHAMEDIA MARKET')];
 expect(likelyInternal(rows,['Mohamed','Lynda']).map(r=>r.id)).toEqual(['a','b']);
});

it('ignore les prénoms trop courts pour être fiables',()=>{
 expect(likelyInternal([e('a','VIR INST ABM SERVICES')],['ABM'])).toEqual([]);
});
