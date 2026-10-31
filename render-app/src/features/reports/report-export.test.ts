import {expect,it} from 'vitest';
import type {Entry} from '../../hooks/household-data';
import {monthlyReportCsv} from './report-export';
const entry={id:'1',date:'2026-10-30',incomeAllocation:'calendar',frequency:'monthly',kind:'expense',flowType:'standard',amount:12345,label:' =HYPERLINK("bad")',category:'Courses',categoryId:'category',subcategoryId:null,personId:null,bankTransactionId:null,expenseType:null} as Entry;
it('exporte la période et les centimes exacts en neutralisant les formules CSV',()=>{
 const csv=monthlyReportCsv([entry,{...entry,date:'2026-11-01'}],'2026-10','2026-10-29');
 expect(csv).toContain('"\' =HYPERLINK(""bad"")"');
 expect(csv).toContain('"-123,45"');
 expect(csv).toContain('"Prévu"');
 expect(csv).not.toContain('2026-11-01');
 expect(csv.startsWith('\uFEFF')).toBe(true);
});
