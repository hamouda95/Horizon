import {expect,it} from 'vitest';
import {overlappingAccount,repeatedUserOperations,shiftedDuplicatePairs,userFingerprints} from './bank-dedup';
const accounts=[{id:'a',owner_user_id:'u'},{id:'b',owner_user_id:'u'},{id:'c',owner_user_id:'other'}];
const transactions=[{bank_account_id:'a',fingerprint:'one'},{bank_account_id:'b',fingerprint:'one'},{bank_account_id:'c',fingerprint:'other'}];
it('détecte les opérations du même utilisateur sur plusieurs comptes sans mélanger les utilisateurs',()=>{
 expect([...userFingerprints(accounts,transactions,'u','b')]).toEqual(['one']);
 expect(repeatedUserOperations(accounts,transactions,'u')).toBe(1);
 expect([...userFingerprints(accounts,transactions,'u','new',true)]).toEqual([]);
});
it('retrouve un compte par contenu même si le fichier a changé de nom et refuse les correspondances ambiguës',()=>{
 expect(overlappingAccount(accounts,transactions,['one'],'u')).toBeNull();
 expect(overlappingAccount(accounts.slice(0,1),transactions,['one'],'u')?.id).toBe('a');
});
it('rapproche un paiement par carte exporté deux fois avec un jour d’écart, sans toucher aux achats répétés',()=>{
 const t=(id:string,date:string,label='CARTE 19/09 UrbanSoccer',amount=-1000,account='a')=>({id,bank_account_id:account,transaction_date:date,label,canonical_key:`row:${date}|${amount}|EUR|${label.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}`});
 // Two real payments on the 21st and one copy on the 20th: one pair only, the second payment stays.
 expect(shiftedDuplicatePairs([t('x','2026-09-21'),t('y','2026-09-21'),t('z','2026-09-20')]).map(p=>p.map(r=>r.id))).toEqual([['z','x']]);
 expect(shiftedDuplicatePairs([t('x','2026-09-30'),t('y','2026-10-01')]).length).toBe(1);
 expect(shiftedDuplicatePairs([t('x','2026-09-21'),t('y','2026-09-23')])).toEqual([]);
 expect(shiftedDuplicatePairs([t('x','2026-09-21','VIR INST MOHAMED'),t('y','2026-09-22','VIR INST MOHAMED')])).toEqual([]);
 expect(shiftedDuplicatePairs([t('x','2026-09-21'),t('y','2026-09-22',undefined,-1200)])).toEqual([]);
 expect(shiftedDuplicatePairs([t('x','2026-09-21'),t('y','2026-09-22',undefined,undefined,'b')])).toEqual([]);
});
