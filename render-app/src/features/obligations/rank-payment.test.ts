import {expect,it} from 'vitest';
import {rankPaymentCandidates} from './obligations';

const c=(id:string,date:string,amount:number)=>({id,date,amount});
it('propose d’abord la dépense au même montant proche de l’échéance',()=>{
 const r=rankPaymentCandidates([c('cafe','2026-10-28',2000),c('lebara','2026-10-07',799),c('old','2025-01-20',799),c('paypal','2026-10-07',3044)],799,'2026-10-07');
 expect(r.suggested.map(x=>x.id)).toEqual(['lebara']);
 expect(r.others.map(x=>x.id)).toEqual(['cafe','paypal']);
 expect(r.hidden).toBe(1);
});
it('tolère un écart de 10 % ou 1 € et classe par proximité',()=>{
 const r=rankPaymentCandidates([c('a','2026-10-12',5300),c('b','2026-10-05',5000),c('c','2026-10-05',6000)],5000,'2026-10-05');
 expect(r.suggested.map(x=>x.id)).toEqual(['b','a']);
});
