import {expect,it} from 'vitest';
import {typedBalanceCents} from './HouseholdBankingPage';

it('lit un solde saisi avec espaces, symbole euro ou signe négatif',()=>{
 expect(typedBalanceCents('1 250,50 €')).toBe(125050);
 expect(typedBalanceCents('-120')).toBe(-12000);
 expect(typedBalanceCents('')).toBeNull();
 expect(typedBalanceCents('abc')).toBeNull();
});
