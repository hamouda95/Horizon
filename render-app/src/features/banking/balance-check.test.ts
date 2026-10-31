import {expect,it} from 'vitest';
import {checkTypedBalance,type AccountMovement} from './balance-check';

const m=(id:string,date:string,signedCents:number):AccountMovement=>({id,date,label:id,signedCents});
const movements=[m('loyer','2026-10-05',-80000),m('salaire','2026-10-10',200000),m('courses','2026-10-20',-5000),m('cafe','2026-10-28',-300)];

it('calcule le solde attendu à la date saisie depuis le dernier solde connu',()=>{
 const check=checkTypedBalance({typedCents:220000,typedDate:'2026-10-15',previous:{cents:100000,date:'2026-10-01'},movements,today:'2026-10-31'});
 expect(check.between.map(r=>r.id)).toEqual(['loyer','salaire']);
 expect(check.expectedCents).toBe(220000);expect(check.gapCents).toBe(0);
 expect(check.after.map(r=>r.id)).toEqual(['courses','cafe']);expect(check.currentCents).toBe(214700);
});

it('signale l’écart entre la somme saisie et les opérations',()=>{
 const check=checkTypedBalance({typedCents:250000,typedDate:'2026-10-15',previous:{cents:100000,date:'2026-10-01'},movements,today:'2026-10-31'});
 expect(check.gapCents).toBe(30000);
});

it('remonte le temps quand la date saisie précède le solde connu',()=>{
 const check=checkTypedBalance({typedCents:100000,typedDate:'2026-10-01',previous:{cents:214700,date:'2026-10-31'},movements,today:'2026-10-31'});
 expect(check.expectedCents).toBe(100000);expect(check.gapCents).toBe(0);
});

it('sans solde connu, montre les opérations ajoutées et le solde actuel obtenu',()=>{
 const check=checkTypedBalance({typedCents:100000,typedDate:'2026-10-15',previous:null,movements,today:'2026-10-31'});
 expect(check.expectedCents).toBeNull();expect(check.gapCents).toBeNull();
 expect(check.after.map(r=>r.id)).toEqual(['courses','cafe']);expect(check.currentCents).toBe(94700);
});

it('ignore les opérations futures',()=>{
 const check=checkTypedBalance({typedCents:0,typedDate:'2026-10-25',previous:null,movements:[...movements,m('futur','2026-11-05',-1000)],today:'2026-10-31'});
 expect(check.after.map(r=>r.id)).toEqual(['cafe']);
});
