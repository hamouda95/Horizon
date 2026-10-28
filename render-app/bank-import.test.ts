import {test} from 'vitest';import {strict as assert} from 'node:assert';
import {parseDelimitedStatement,parseCsvTransactions,transactionFingerprint} from './bank-import.ts';

test('détecte le CSV français, les guillemets, le signe et les doublons',()=>{
 const preview=parseDelimitedStatement('Date opération;Libellé;Débit;Crédit;Date valeur\r\n27/10/2026;"SUPERMARCHÉ; PARIS";42,35;;28/10/2026\r\n27/10/2026;"SUPERMARCHÉ; PARIS";42,35;;28/10/2026','releve.csv');
 assert.equal(preview.format,'csv');assert.equal(preview.transactions[0].transactionDate,'2026-10-27');assert.equal(preview.transactions[0].valueDate,'2026-10-28');assert.equal(preview.transactions[0].amountCents,-4235);assert.equal(preview.transactions[0].label,'SUPERMARCHÉ; PARIS');assert.equal(preview.transactions[1].possibleDuplicate,true);assert.notEqual(preview.transactions[0].fingerprint,preview.transactions[1].fingerprint);
});

test('gère montant séparé débit/crédit et formats numériques internationaux',()=>{
 const preview=parseDelimitedStatement('Date;Libellé;Débit;Crédit\n2026-10-27;Loyer;1 234,56;\n2026-10-28;Salaire;;2,345.67','transactions.csv');
 assert.deepEqual(preview.transactions.map(x=>x.amountCents),[-123456,234567]);assert.equal(preview.transactions[1].transactionDate,'2026-10-28');
});

test('permet de corriger le mapping et signale les dates et montants invalides',()=>{
 const text='A;B;C\n31/02/2026;Courses;12,00\n01/03/2026;Essence;abc';const mapping={date:'0',label:'1',amount:'2',debit:'',credit:'',valueDate:'',reference:'',currency:''};const rows=parseCsvTransactions(text,mapping);
 assert.equal(rows[0].error,'Date illisible');assert.equal(rows[1].error,'Montant illisible');
});

test('importe QIF et OFX/QFX en conservant identifiant et signe',()=>{
 const qif=parseDelimitedStatement('!Type:Bank\nD27/10/2026\nT-4.25\nPMarket\nN42\n^','statement.qif');assert.equal(qif.transactions[0].amountCents,-425);assert.equal(qif.transactions[0].externalId,'42');
 const ofx=parseDelimitedStatement('<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261027000000<TRNAMT>-8.50<FITID>abc<NAME>Bus pass</STMTTRN></BANKTRANLIST></OFX>','statement.ofx');assert.equal(ofx.transactions[0].transactionDate,'2026-10-27');assert.equal(ofx.transactions[0].amountCents,-850);assert.equal(ofx.transactions[0].fingerprint,transactionFingerprint('2026-10-27',-850,'EUR','Bus pass','abc'));
});

test('lit le solde OFX et conserve des doublons identiques comme lignes distinctes à confirmer',()=>{
 const text='<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261027000000<TRNAMT>-1.00<NAME>Market</STMTTRN><STMTTRN><DTPOSTED>20261027000000<TRNAMT>-1.00<NAME>Market</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>99.50<DTASOF>20261028000000</LEDGERBAL></OFX>';const result=parseDelimitedStatement(text,'releve.ofx');assert.equal(result.transactions[1].possibleDuplicate,true);assert.notEqual(result.transactions[0].fingerprint,result.transactions[1].fingerprint);assert.equal(result.transactions[1].balanceCents,9950);assert.equal(result.transactions[1].balanceDate,'2026-10-28');
});

test('préserve les opérations QIF identiques comme opérations distinctes',()=>{
 const preview=parseDelimitedStatement('!Type:Bank\nD27/10/2026\nT-4.25\nPMarket\n^\nD27/10/2026\nT-4.25\nPMarket\n^','statement.qif');assert.equal(preview.transactions[1].possibleDuplicate,true);assert.notEqual(preview.transactions[0].fingerprint,preview.transactions[1].fingerprint);
});
