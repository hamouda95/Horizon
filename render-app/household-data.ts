import {collectPages} from './pagination';
import {supabase} from './client';
import type {ExpenseType} from './expense-types';

export type Entry={id:string;kind:'income'|'expense';label:string;category:string;amount:number;date:string;frequency:'monthly'|'annual';incomeAllocation:'calendar'|'next_month';expenseType:ExpenseType;categoryId:string;subcategoryId:string|null;subcategory?:string};
export type Home={id:string;name:string;savingsRate:number|null;incomeTypes:string;expenseTypes:string;categories:{id:string;name:string;kind:string;active:boolean}[]};

export async function fetchHouseholdRows(table:string,columns:string,householdId:string):Promise<any[]>{return collectPages(async after=>{let query=supabase.from(table).select(columns).eq('household_id',householdId).order('id',{ascending:true}).limit(500);if(after)query=query.gt('id',after);const {data,error}=await query;if(error)throw error;return (data||[]) as unknown as {id:string}[]})}
