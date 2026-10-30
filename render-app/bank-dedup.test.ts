import {expect,it} from 'vitest';
import {overlappingAccount,repeatedUserOperations,userFingerprints} from './bank-dedup';
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
