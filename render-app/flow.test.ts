import {describe,expect,it} from 'vitest';
import {summarizeFlows} from './flow';

describe('summarizeFlows',()=>{
 it('counts only regular income and spending in confirmed balance',()=>{
  expect(summarizeFlows([
   {kind:'income',amount:230000,flowType:'standard'},
   {kind:'expense',amount:4280,flowType:'standard'},
   {kind:'income',amount:15000,flowType:'savings'},
   {kind:'income',amount:75000,flowType:'refund'},
   {kind:'income',amount:40000,flowType:'transfer'},
   {kind:'income',amount:90000,flowType:'review'},
  ])).toMatchObject({income:230000,expense:4280,savingsWithdrawals:15000,refundsReceived:75000,transfersReceived:40000,needsReviewReceived:90000,confirmedBalance:225720});
 });
 it('keeps refunds separate and subtracts reversed refunds from balance',()=>{
  expect(summarizeFlows([{kind:'expense',amount:8000,flowType:'refund'}])).toMatchObject({refundsReversed:8000,expense:0,confirmedBalance:-8000});
 });
 it('ignores unsafe or negative amounts',()=>{
  expect(summarizeFlows([{kind:'income',amount:-1},{kind:'income',amount:Number.MAX_SAFE_INTEGER+1}]).income).toBe(0);
 });
});
