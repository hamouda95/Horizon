import {describe,expect,it} from 'vitest';
import {budgetMonth,monthOverview,monthlyForecast,suggestMonthlyBudget} from './period';

const rows=[
 {date:'2026-09-05',kind:'income' as const,amount:300000,frequency:'monthly' as const,incomeAllocation:'calendar' as const,flowType:'standard' as const},
 {date:'2026-09-06',kind:'income' as const,amount:90000,frequency:'monthly' as const,incomeAllocation:'calendar' as const,flowType:'transfer' as const},
 {date:'2026-09-07',kind:'income' as const,amount:2500,frequency:'monthly' as const,incomeAllocation:'calendar' as const,flowType:'refund' as const},
 {date:'2026-09-08',kind:'expense' as const,amount:80000,frequency:'monthly' as const,incomeAllocation:'calendar' as const,flowType:'standard' as const},
 {date:'2026-09-09',kind:'expense' as const,amount:120000,frequency:'monthly' as const,incomeAllocation:'calendar' as const,flowType:'savings' as const},
];

describe('confirmed flow period totals',()=>{
 it('excludes transfers and savings from revenue, spending and budget forecasts',()=>{
  expect(monthOverview(rows,[],'2026-09')).toMatchObject({income:300000,expense:80000,hasEntries:true});
  expect(monthlyForecast(rows,'2026-09')).toMatchObject({income:300000,expense:80000});
 });
});

it('garde les remboursements, transferts et retraits au mois de valeur',()=>{
 for(const flowType of ['refund','transfer','savings','review'] as const)expect(budgetMonth({...rows[0],date:'2026-12-31',flowType,incomeAllocation:'next_month'})).toBe('2026-12');
});
it('reprend le budget prévu plutôt que les dépenses réalisées',()=>{
 expect(suggestMonthlyBudget(rows,[{month:'2026-09-01',income_cents:350000,expense_cents:180000}],'2026-10')).toEqual({income:350000,expense:180000});
});
it('utilise les provisions de la nouvelle année sans reporter celles de l’année terminée',()=>{
 const entries=[{...rows[3],date:'2026-12-02',amount:80000},{...rows[3],date:'2026-08-01',amount:12000,frequency:'annual' as const},{...rows[3],date:'2027-08-01',amount:24000,frequency:'annual' as const}];
 expect(suggestMonthlyBudget(entries,[],'2027-01')).toEqual({income:0,expense:82000});
});
