import {expect,it} from 'vitest';
import {amountIsClose,matchesQuery,rankLinkCandidates} from './link-candidates';

const e=(id:string,label:string,amount:number,date:string,kind:'income'|'expense'='expense',loanId:string|null=null)=>({id,label,amount,date,kind,loanId});
const entries=[
 e('a','Virement instantané Hamza Koubaa',45000,'2026-09-11'),
 e('b','Carte Franprix',4500,'2026-10-02'),
 e('c','Virement instantané Dupont',100000,'2026-09-01'),
 e('d','Virement instantané Hamza Koubaa',55000,'2026-09-11','expense','loan-1'),
 e('e','Virement reçu Hamza Koubaa',20000,'2026-10-20','income'),
 e('f','Prélèvement EDF',98000,'2026-10-05'),
];

it('met en tête les opérations au nom de la personne, puis celles au montant proche',()=>{
 const {suggested,others}=rankLinkCandidates(entries,{kind:'expense',borrower:'Hamza KOUBAA',targetCents:100000});
 expect(suggested.map(x=>x.id)).toEqual(['a','c','f']);
 expect(others.map(x=>x.id)).toEqual(['b']);
});

it('ignore les opérations déjà rattachées et celles de l’autre sens',()=>{
 const {suggested,others}=rankLinkCandidates(entries,{kind:'income',borrower:'Hamza Koubaa',targetCents:0});
 expect([...suggested,...others].map(x=>x.id)).toEqual(['e']);
});

it('filtre par texte, date ou montant',()=>{
 expect(matchesQuery(entries[0],'koubaa')).toBe(true);
 expect(matchesQuery(entries[0],'450')).toBe(true);
 expect(matchesQuery(entries[0],'450,00')).toBe(true);
 expect(matchesQuery(entries[0],'2026-09')).toBe(true);
 expect(matchesQuery(entries[1],'koubaa')).toBe(false);
});

it('considère un montant proche à 10 % ou 1 € près',()=>{
 expect([amountIsClose(95000,100000),amountIsClose(89000,100000),amountIsClose(150,100),amountIsClose(500,0)]).toEqual([true,false,true,false]);
});
