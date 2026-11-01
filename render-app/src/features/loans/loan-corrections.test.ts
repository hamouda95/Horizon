import {expect,it} from 'vitest';
import {loanErrorMessage,repaymentStatus} from './loan-corrections';

it('traduit les règles de la base en français',()=>{
 expect(loanErrorMessage({message:'Repayments cannot exceed the amount lent at that date'})).toMatch(/dépasseraient/);
 expect(loanErrorMessage({message:'The loan date must precede its first operation'})).toMatch(/précéder/);
 expect(loanErrorMessage({message:'new row violates check constraint "household_loans_expected_after_opening"'})).toMatch(/suivre la date du prêt/);
 expect(loanErrorMessage({message:'Opening receivable history is immutable; correct linked operations instead'})).toMatch(/mise à jour de la base/);
 expect(loanErrorMessage({message:'column household_loans.expected_repayment_on does not exist',code:'42703'})).toMatch(/mise à jour de la base/);
 expect(loanErrorMessage({message:'Choose a loan from this household dated before the operation'})).toMatch(/antérieure à la date du prêt/);
 expect(loanErrorMessage({message:'A cash payment requires a cash account'})).toMatch(/compte Espèces/);
 expect(loanErrorMessage(null)).toBe('Modification impossible pour le moment.');
});

it('signale l’échéance de remboursement et le retard',()=>{
 expect(repaymentStatus('2026-12-15',50000,'2026-11-01')).toEqual({label:'Remboursement prévu le 15/12/2026',late:false});
 expect(repaymentStatus('2026-10-15',50000,'2026-11-01')).toEqual({label:'Remboursement prévu le 15/10/2026 · en retard',late:true});
 expect(repaymentStatus('2026-10-15',0,'2026-11-01')).toBeNull();
 expect(repaymentStatus(null,50000,'2026-11-01')).toBeNull();
});
