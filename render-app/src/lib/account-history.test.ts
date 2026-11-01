import {expect,it} from 'vitest';
import {balancesAt,periodEnd} from './account-history';

it('arrête le mois à aujourd’hui tant qu’il n’est pas terminé',()=>{
 expect(periodEnd('2026-10','2026-11-01')).toBe('2026-10-31');
 expect(periodEnd('2026-11','2026-11-01')).toBe('2026-11-01');
 expect(periodEnd('2024-02','2026-11-01')).toBe('2024-02-29');
});

it('remonte le solde en retirant les opérations postérieures à la date',()=>{
 const accounts=[{id:'a',account_type:'checking',balance_cents:21522},{id:'p',account_type:'investment',balance_cents:853174},{id:'n',account_type:'savings',balance_cents:null}];
 const moves=[{accountId:'a',date:'2026-11-01',signedCents:-3000},{accountId:'a',date:'2026-10-31',signedCents:-5650},{accountId:'a',date:'2026-12-01',signedCents:-100},{accountId:'p',date:'2026-11-01',signedCents:500}];
 expect(balancesAt(accounts,moves,'2026-11-01','2026-11-01')).toBe(accounts);
 const oct31=balancesAt(accounts,moves,'2026-10-31','2026-11-01');
 expect(oct31[0].balance_cents).toBe(24522);
 expect(oct31[1].balance_cents).toBe(853174);
 expect(oct31[2].balance_cents).toBeNull();
 expect(balancesAt(accounts,moves,'2026-10-30','2026-11-01')[0].balance_cents).toBe(30172);
});
