import {expect,it} from 'vitest';
import {pdfStatementPreview,type PdfTextItem} from './statement-pdf';
import {reconcileStatementBalances} from './bank-import';

// Synthetic one-column statements: each string is one printed line, top to bottom.
const page=(...lines:string[]):PdfTextItem[][]=>[lines.map((str,i)=>({str,x:10,y:500-i*10}))];
const latest=(lines:string[])=>reconcileStatementBalances(pdfStatementPreview(page(...lines)).transactions)?.latestBalance??null;

it('garde un marchand nommé « Total » ou « Report » comme opération',()=>{
 const p=pdfStatementPreview(page('02/10/2026 TOTAL ENERGIES STATION -45,10','03/10/2026 REPORT LIBRAIRIE -12,00','Total des opérations 57,10'));
 expect(p.transactions.map(t=>[t.label,t.amountCents])).toEqual([['TOTAL ENERGIES STATION',-4510],['REPORT LIBRAIRIE',-1200]]);
});

it('déduit le solde final du solde initial et des opérations',()=>{
 expect(latest(['Ancien solde au 30/09/2026 1 000,00','02/10/2026 Achat -45,10','05/10/2026 Virement reçu +200,00'])).toEqual({date:'2026-10-05',balanceCents:115490});
});

it('lit un solde débiteur comme négatif',()=>{
 expect(latest(['02/10/2026 Achat -45,10','Solde débiteur au 31/10/2026 120,00'])).toEqual({date:'2026-10-31',balanceCents:-12000});
});

it('écarte des soldes qui contredisent les opérations au lieu de deviner',()=>{
 const p=pdfStatementPreview(page('01/10/2026 Achat -10,00','Solde au 01/10/2026 990,00','05/10/2026 Achat -10,00','Solde au 05/10/2026 500,00'));
 expect(p.transactions.every(t=>t.balanceCents===undefined)).toBe(true);
});
