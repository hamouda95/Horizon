import {describe,expect,it} from 'vitest';
import {monthOverview,monthlyForecast} from './period';

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
