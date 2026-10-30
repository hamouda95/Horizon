import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import MonthlyReportPage from './MonthlyReportPage';
import type {Entry} from './household-data';
const entry=(amount:number,kind:Entry['kind'],flowType:Entry['flowType']='standard',date='2026-10-01'):Entry=>({id:String(amount),kind,amount,flowType,date,label:'Fixture',category:'Fixture',categoryId:'fixture',subcategoryId:null,personId:null,bankTransactionId:null,frequency:'monthly',incomeAllocation:'calendar',expenseType:null});
afterEach(()=>vi.useRealTimers());
it('affiche le reste après épargne et remboursements en excluant le revenu futur',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
 const html=renderToStaticMarkup(createElement(MonthlyReportPage,{entries:[entry(300000,'income'),entry(100000,'expense'),entry(50000,'expense','savings'),entry(20000,'income','refund'),entry(900000,'income','standard','2026-10-31')],plans:[],month:'2026-10',setMonth:()=>{}}));
 expect(html).toContain('1 700,00');
 expect(html).toContain('3 000,00');
 expect(html).not.toContain('12 000,00');
});
