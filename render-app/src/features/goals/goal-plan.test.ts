import {expect,it} from 'vitest';
import {monthlyContribution,monthsUntil} from './goal-plan';

it('calcule le versement mensuel pour atteindre l’objectif à temps',()=>{
 expect(monthsUntil('2040-12-28','2026-11-01')).toBe(169);
 expect(monthlyContribution(50000000,0,'2040-12-28','2026-11-01')).toEqual({months:170,cents:294200});
 expect(monthlyContribution(120000,20000,'2026-12-15','2026-11-01')).toEqual({months:2,cents:50000});
});

it('ne propose rien sans date ou une fois l’objectif atteint, et gère une date dépassée',()=>{
 expect(monthlyContribution(100000,0,null,'2026-11-01')).toBeNull();
 expect(monthlyContribution(100000,100000,'2027-01-01','2026-11-01')).toBeNull();
 expect(monthlyContribution(100000,0,'2026-01-01','2026-11-01')).toEqual({months:1,cents:100000});
});
