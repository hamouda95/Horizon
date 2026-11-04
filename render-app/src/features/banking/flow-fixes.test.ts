import {expect,it} from 'vitest';
import {inferStatementFlowType,type StatementTransaction} from './bank-import';

const row=(label:string,amountCents:number):StatementTransaction=>({rowNumber:1,transactionDate:'2026-10-10',valueDate:null,label,suggestedLabel:'',categoryHint:'',parentCategoryHint:'',amountCents,currency:'EUR',externalId:null,fingerprint:'f',possibleDuplicate:false});

it('ne prend pas le nom « Caisse d’Épargne » pour un mouvement d’épargne',()=>{
 expect(inferStatementFlowType(row('CB CARREFOUR CAISSE D EPARGNE ILE DE FRANCE',-4500))).toBe('standard');
 expect(inferStatementFlowType(row('PRLV CAISSE D EPARGNE ECHEANCE PRET',-35000))).toBe('standard');
 expect(inferStatementFlowType(row('VIR LIVRET A',-10000))).toBe('savings');
});

it('ne classe en remboursement que l’argent reçu',()=>{
 expect(inferStatementFlowType(row('PRLV REMBOURSEMENT PRET IMMO',-80000))).toBe('standard');
 expect(inferStatementFlowType(row('VIR CPAM REMBOURSEMENT',2350))).toBe('refund');
 expect(inferStatementFlowType(row('AVOIR AMAZON',1999))).toBe('refund');
});

it('reconnaît les recharges, dépôts d’espèces et virements de compte à compte comme des mouvements internes',()=>{
 expect(inferStatementFlowType({...row('Paiement envoyé par Durand Sarah',100000),categoryHint:'Ajout de fonds'})).toBe('transfer');
 expect(inferStatementFlowType(row('VRST ESPECES AUTOMATE',34000))).toBe('transfer');
 expect(inferStatementFlowType(row('VIREMENT CPTE A CPTE EMIS',-15000))).toBe('transfer');
});

it('laisse à vérifier un virement émis sans bénéficiaire, pas un virement nommé',()=>{
 expect(inferStatementFlowType(row('VIREMENT SEPA INST EMIS',-145000))).toBe('review');
 expect(inferStatementFlowType(row('VIREMENT SEPA EMIS',-50000))).toBe('review');
 expect(inferStatementFlowType(row('VIR SEPA INST EMIS LOYER OCTOBRE',-90000))).toBe('standard');
 expect(inferStatementFlowType(row('Virement Corner - Flixbus',-4324))).toBe('standard');
 expect(inferStatementFlowType(row('FACTURE CARTE',-1114))).toBe('standard');
});
