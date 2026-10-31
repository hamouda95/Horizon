import {expect,it} from 'vitest';
import {parseDelimitedStatement,reconcileStatementBalances} from './bank-import';

// Synthetic layouts only: the goal is generic understanding, not one bank's format.
const read=(csv:string)=>{const preview=parseDelimitedStatement(csv,'releve.csv');return {preview,balance:reconcileStatementBalances(preview.transactions)?.latestBalance??null}};

it('comprend des en-têtes reformulés et lit le solde après opération',()=>{
 const {preview,balance}=read('Date de l’opération;Libellé de l’opération;Montant en euros;Solde après opération\n01/10/2026;SALAIRE;2 000,00;2 500,00\n03/10/2026;LOYER;-800,00;1 700,00\n05/10/2026;COURSES;-50,25;1 649,75');
 expect(preview.transactions.map(t=>[t.label,t.amountCents,t.error])).toEqual([['SALAIRE',200000,undefined],['LOYER',-80000,undefined],['COURSES',-5025,undefined]]);
 expect(balance).toEqual({date:'2026-10-05',balanceCents:164975});
});

it('comprend des en-têtes collés ou en camelCase',()=>{
 const {preview,balance}=read('dateOp,dateVal,label,amount,accountbalance\n2026-10-01,2026-10-02,Achat A,-10.00,90.00\n2026-10-02,2026-10-02,Achat B,-20.00,70.00\n2026-10-04,2026-10-04,Virement recu,100.00,170.00');
 expect(preview.mapping).toMatchObject({date:'0',valueDate:'1',label:'2',amount:'3',balance:'4'});
 expect(balance).toEqual({date:'2026-10-04',balanceCents:17000});
});

it('reconnaît une colonne de solde cumulé par son contenu même sans nom explicite',()=>{
 const {preview,balance}=read('Date;Libellé;Montant;Colonne libre\n01/10/2026;Achat;-10,00;990,00\n02/10/2026;Achat;-15,00;975,00\n03/10/2026;Remboursement;5,00;980,00\n04/10/2026;Achat;-30,00;950,00');
 expect(preview.mapping.balance).toBe('3');
 expect(balance).toEqual({date:'2026-10-04',balanceCents:95000});
});

it('ne prend pas une colonne numérique quelconque pour un solde',()=>{
 const {preview}=read('Date;Libellé;Montant;Quantité\n01/10/2026;Achat;-10,00;3\n02/10/2026;Achat;-15,00;1\n03/10/2026;Achat;-30,00;2\n04/10/2026;Achat;-5,00;4');
 expect(preview.mapping.balance).toBe('');
});

it('lit un relevé trié du plus récent au plus ancien avec débit et crédit séparés',()=>{
 const {preview,balance}=read('Jour;Détail;Sorties;Entrées;Cumul\n04/10/2026;Courses;30,00;;950,00\n03/10/2026;Remboursement;;5,00;980,00\n02/10/2026;Pharmacie;15,00;;975,00\n01/10/2026;Café;10,00;;990,00');
 expect(preview.transactions.map(t=>t.amountCents)).toEqual([-3000,500,-1500,-1000]);
 expect(balance).toEqual({date:'2026-10-04',balanceCents:95000});
});

it('propose un aperçu au lieu d’échouer quand les colonnes restent incomprises',()=>{
 const {preview}=read('A;B;C\nx;y;z\nu;v;w');
 expect(preview.transactions.length).toBeGreaterThan(0);
 expect(preview.transactions.every(t=>t.error)).toBe(true);
});
