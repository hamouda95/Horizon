import {expect,it} from 'vitest';
import {realizedEntries} from './dates';
it('sépare les paiements futurs des opérations réalisées sans modifier le journal',()=>{
 const rows=[{date:'2026-10-01',amount:1},{date:'2026-10-30',amount:2},{date:'2026-10-31',amount:3}];
 expect(realizedEntries(rows,'2026-10-30').map(row=>row.amount)).toEqual([1,2]);
 expect(rows).toHaveLength(3);
});
