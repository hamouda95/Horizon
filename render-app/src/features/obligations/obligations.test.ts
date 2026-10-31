import {expect,it} from 'vitest';
import {obligationsForMonth} from './obligations';
const bill={id:'bill',amount_cents:10000,frequency:'monthly',due_day:31,due_month:null};
it('borne les échéances en février et respecte les années bissextiles',()=>{
 expect(obligationsForMonth([bill],[],'2027-02','2027-02-01')[0].dueDate).toBe('2027-02-28');
 expect(obligationsForMonth([bill],[],'2028-02','2028-02-01')[0].dueDate).toBe('2028-02-29');
});
it('distingue payé, à payer et en retard sans reporter le paiement au mois suivant',()=>{
 const payment={id:'payment',entry_id:'entry',obligation_id:'bill',settled_month:'2026-09-01'};
 expect(obligationsForMonth([bill],[payment],'2026-09','2026-10-01')[0].status).toBe('paid');
 expect(obligationsForMonth([bill],[payment],'2026-10','2026-10-01')[0].status).toBe('pending');
 expect(obligationsForMonth([{...bill,due_day:15}],[],'2026-10','2026-10-30')[0].status).toBe('overdue');
});
it('une facture annuelle ne devient exigible que pendant son mois',()=>{
 expect(obligationsForMonth([{...bill,frequency:'annual',due_month:6}],[],'2026-10')).toEqual([]);
});
