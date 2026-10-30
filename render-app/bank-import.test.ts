import {test} from 'vitest';import {strict as assert} from 'node:assert';
import {parseDelimitedStatement,parseCsvTransactions,transactionFingerprint,inferStatementFlowType,type StatementTransaction} from './bank-import.ts';

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
 const ofx=parseDelimitedStatement('<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261027000000<TRNAMT>-8.50<FITID>abc<NAME>Bus pass</STMTTRN></BANKTRANLIST></OFX>','statement.ofx');assert.equal(ofx.transactions[0].transactionDate,'2026-10-27');assert.equal(ofx.transactions[0].amountCents,-850);assert.equal(ofx.transactions[0].fingerprint,transactionFingerprint('2026-10-27',-850,'EUR','Bus pass','abc')+'|occurrence:1');
});

test('lit le solde OFX et conserve des doublons identiques comme lignes distinctes à confirmer',()=>{
 const text='<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261027000000<TRNAMT>-1.00<NAME>Market</STMTTRN><STMTTRN><DTPOSTED>20261027000000<TRNAMT>-1.00<NAME>Market</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>99.50<DTASOF>20261028000000</LEDGERBAL></OFX>';const result=parseDelimitedStatement(text,'releve.ofx');assert.equal(result.transactions[1].possibleDuplicate,true);assert.notEqual(result.transactions[0].fingerprint,result.transactions[1].fingerprint);assert.equal(result.transactions[1].balanceCents,9950);assert.equal(result.transactions[1].balanceDate,'2026-10-28');
});

test('préserve les opérations QIF identiques comme opérations distinctes',()=>{
 const preview=parseDelimitedStatement('!Type:Bank\nD27/10/2026\nT-4.25\nPMarket\n^\nD27/10/2026\nT-4.25\nPMarket\n^','statement.qif');assert.equal(preview.transactions[1].possibleDuplicate,true);assert.notEqual(preview.transactions[0].fingerprint,preview.transactions[1].fingerprint);
});

const flowRow=(label:string,amountCents:number):StatementTransaction=>({rowNumber:1,transactionDate:'2026-09-22',valueDate:null,label,amountCents,currency:'EUR',externalId:null,fingerprint:'test'});
test('exclut les virements entre comptes des revenus et dépenses',()=>{
 assert.equal(inferStatementFlowType(flowRow('VIR Virement depuis BoursoBank',399000)),'transfer');
 assert.equal(inferStatementFlowType(flowRow('VIR Virement depuis LIVRET A',10000)),'transfer');
 assert.equal(inferStatementFlowType(flowRow('VIR Virement depuis LIVRET A',-10000)),'transfer');
});
test('demande une vérification pour un mouvement inconnu sur un livret et conserve les intérêts comme revenu',()=>{
 assert.equal(inferStatementFlowType(flowRow('VIR CREATION COMPTE',1000),'savings'),'review');
 assert.equal(inferStatementFlowType(flowRow('INTÉRÊTS LIVRET A',125),'savings'),'standard');
 assert.equal(inferStatementFlowType(flowRow('SALAIRE',250000),'checking'),'standard');
});

test('reconnaît les en-têtes détaillés des exports bancaires français',()=>{
 const preview=parseDelimitedStatement('Date de l’opération;Date de valeur;Libellé de l’opération;Montant (EUR)\n27/10/2026;28/10/2026;SUPERMARCHÉ;−42,35','releve.csv');
 assert.equal(preview.transactions.length,1);
 assert.equal(preview.transactions[0].transactionDate,'2026-10-27');
 assert.equal(preview.transactions[0].valueDate,'2026-10-28');
 assert.equal(preview.transactions[0].label,'SUPERMARCHÉ');
 assert.equal(preview.transactions[0].amountCents,-4235);
});
test('montre un aperçu même quand les en-têtes nécessitent un mapping manuel',()=>{
 const preview=parseDelimitedStatement('Quand;Quoi;Somme\n27/10/2026;Marché;12,50','export.csv');
 assert.equal(preview.format,'csv');
 assert.ok(preview.transactions.length>0);
});

test('reconnaît montant et solde quand un export CSV répète la colonne Solde',()=>{
 const csv='Date Opération;Libellé;Solde;Numéro Compte;Libellé Compte;Solde\n2026-01-01;Achat;-10,00;123;BoursoBank;90,00\n2026-01-02;Achat;-5,00;123;BoursoBank;85,00\n2026-01-03;Virement;2,00;123;BoursoBank;87,00';
 const preview=parseDelimitedStatement(csv,'export.csv');
 assert.deepEqual(preview.transactions.map(row=>row.amountCents),[-1000,-500,200]);
 assert.deepEqual(preview.transactions.map(row=>row.balanceCents),[9000,8500,8700]);
});
test('importe un relevé CAMT.053 avec date, sens, devise et solde final',()=>{
 const xml='<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt><Ntry><NtryRef>op-1</NtryRef><Amt Ccy="EUR">10.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-01-01</Dt></BookgDt><NtryDtls><TxDtls><Refs><AcctSvcrRef>ref-1</AcctSvcrRef></Refs><RmtInf><Ustrd>Courses</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry><Ntry><NtryRef>op-2</NtryRef><Amt Ccy="EUR">2.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-01-02</Dt></BookgDt><NtryDtls><TxDtls><RmtInf><Ustrd>Virement</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry><Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">92.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-01-02</Dt></Dt></Bal></Stmt></BkToCstmrStmt></Document>';
 const preview=parseDelimitedStatement(xml,'statement.xml');
 assert.equal(preview.format,'camt');
 assert.equal(preview.transactions[0].amountCents,-1000);
 assert.equal(preview.transactions[0].label,'Courses');
 assert.equal(preview.transactions[0].externalId,'ref-1');
 assert.equal(preview.transactions[1].amountCents,200);
 assert.equal(preview.transactions[1].balanceCents,9200);
 assert.equal(preview.transactions[1].balanceDate,'2026-01-02');
});
test('détecte un fichier TSV sans mapping spécifique',()=>{
 const preview=parseDelimitedStatement('Date\tLibellé\tMontant\n2026-10-27\tBus\t-2,50','operations.tsv');
 assert.equal(preview.transactions[0].amountCents,-250);
});
