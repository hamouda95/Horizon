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
