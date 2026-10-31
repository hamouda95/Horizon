import {expect,it} from 'vitest';
import {startingAccountsPayload,startingBudgetPayload,type StartingAccountDraft} from './StartingAccountsEditor';
import {summarizeFlows} from '../../lib/flow';
const draft=(type:StartingAccountDraft['type'],balance:string):StartingAccountDraft=>({id:type,name:type,type,source:'',balance,date:'2026-10-01'});
it('prépare banque, espèces, épargne et placements comme des soldes initiaux et convertit les dettes en montants dus',()=>{
 const rows=startingAccountsPayload([draft('checking','-100,50'),draft('cash','250'),draft('savings','3000'),draft('investment','8000'),draft('crypto','400'),draft('credit','15000'),draft('other','')]);
 expect(rows.map(r=>r.balance_cents)).toEqual([-10050,25000,300000,800000,40000,-1500000,null]);
 expect(startingBudgetPayload('','')).toBeNull();
 expect(()=>startingBudgetPayload('2500','')).toThrow();
});
it('refuse les valeurs impossibles et distingue une valuation nulle d’une valeur inconnue',()=>{
 expect(()=>startingAccountsPayload([draft('cash','-10')])).toThrow();
 expect(()=>startingAccountsPayload([draft('investment','1e10')])).toThrow();
 expect(startingAccountsPayload([draft('investment','0')])[0].balance_cents).toBe(0);
});
it('un placement ne gonfle ni les revenus ni les dépenses et ajuste le reste disponible',()=>{
 expect(summarizeFlows([{kind:'income',amount:300000},{kind:'expense',amount:100000},{kind:'expense',amount:50000,flowType:'investment'},{kind:'income',amount:10000,flowType:'investment'}])).toMatchObject({income:300000,expense:100000,investmentDeposits:50000,investmentWithdrawals:10000,availableBalance:160000});
});
