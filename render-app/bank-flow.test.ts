import {describe,expect,it} from 'vitest';
import {inferStatementFlowType} from './bank-import';
import type {StatementTransaction} from './bank-import';

function row(label:string,amountCents:number,categoryHint?:string,parentCategoryHint?:string):StatementTransaction{
 return {rowNumber:1,transactionDate:'2026-09-01',valueDate:null,label,amountCents,currency:'EUR',externalId:null,fingerprint:'test',categoryHint,parentCategoryHint};
}

describe('inferStatementFlowType',()=>{
 it('keeps transfers out of income even when the bank reports a credit',()=>{
  expect(inferStatementFlowType(row('VIR SEPA VIR INST Mohamed',10000,'Virements reçus'))).toBe('review');
  expect(inferStatementFlowType(row('Virement vers BoursoBank',-10000))).toBe('transfer');
  expect(inferStatementFlowType(row('Virement émis de comptes à comptes',-10000))).toBe('transfer');
 });
 it('recognizes savings, refunds and clearly identified salary',()=>{
  expect(inferStatementFlowType(row('Livret A',15000))).toBe('savings');
  expect(inferStatementFlowType(row('CPAM remboursement',2535))).toBe('refund');
  expect(inferStatementFlowType(row('GEOp ost paie salaire',332399))).toBe('standard');
 });
 it('defaults ordinary debits to expenses and uncertain credits to review',()=>{
  expect(inferStatementFlowType(row('CARTE SUPERMARCHE',-4280))).toBe('standard');
  expect(inferStatementFlowType(row('VIR SEPA HENTATI',5000))).toBe('review');
 });
});
