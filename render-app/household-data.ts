import {collectPages} from './pagination';
import {supabase} from './client';
import type {Tables} from './database.types';
import type {ExpenseType} from './expense-types';

type HouseholdTable='categories'|'subcategories'|'entries'|'monthly_budgets';
type CategoryRow=Pick<Tables<'categories'>,'id'|'name'|'kind'|'active'>;
type SubcategoryRow=Pick<Tables<'subcategories'>,'id'|'name'|'category_id'|'active'>;
type RawEntryRow=Pick<Tables<'entries'>,'id'|'kind'|'label'|'amount_cents'|'entry_date'|'category_id'|'frequency'|'income_allocation'|'expense_type'|'subcategory_id'>;
type EntryRow=Omit<RawEntryRow,'kind'|'frequency'|'income_allocation'|'expense_type'> & {
 kind:'income'|'expense';
 frequency:'monthly'|'annual';
 income_allocation:'calendar'|'next_month';
 expense_type:ExpenseType;
};
type MonthlyBudgetRow=Pick<Tables<'monthly_budgets'>,'id'|'month'|'income_cents'|'expense_cents'>;

export type Entry={id:string;kind:'income'|'expense';label:string;category:string;amount:number;date:string;frequency:'monthly'|'annual';incomeAllocation:'calendar'|'next_month';expenseType:ExpenseType;categoryId:string;subcategoryId:string|null;subcategory?:string};
export type Home={id:string;name:string;savingsRate:number|null;incomeTypes:string;expenseTypes:string;categories:{id:string;name:string;kind:string;active:boolean}[]};

function parseEntryRow(row:RawEntryRow):EntryRow{
 if(row.kind!=='income'&&row.kind!=='expense')throw new Error('Type d’opération invalide dans les données du foyer.');
 if(row.frequency!=='monthly'&&row.frequency!=='annual')throw new Error('Fréquence d’opération invalide dans les données du foyer.');
 if(row.income_allocation!=='calendar'&&row.income_allocation!=='next_month')throw new Error('Affectation de revenu invalide dans les données du foyer.');
 if(row.expense_type!==null&&row.expense_type!=='recurring'&&row.expense_type!=='one_off')throw new Error('Type de dépense invalide dans les données du foyer.');
 return {...row,kind:row.kind,frequency:row.frequency,income_allocation:row.income_allocation,expense_type:row.expense_type};
}

export function fetchHouseholdRows(table:'categories',columns:'id,name,kind,active',householdId:string):Promise<CategoryRow[]>;
export function fetchHouseholdRows(table:'entries',columns:'id,kind,label,amount_cents,entry_date,category_id,frequency,income_allocation,expense_type,subcategory_id',householdId:string):Promise<EntryRow[]>;
export function fetchHouseholdRows(table:'monthly_budgets',columns:'id,month,income_cents,expense_cents',householdId:string):Promise<MonthlyBudgetRow[]>;
export function fetchHouseholdRows(table:'subcategories',columns:'id,name,category_id,active',householdId:string):Promise<SubcategoryRow[]>;
export async function fetchHouseholdRows(table:HouseholdTable,columns:string,householdId:string):Promise<{id:string}[]>{
 return collectPages(async after=>{
  let query=supabase.from(table).select(columns).eq('household_id',householdId).order('id',{ascending:true}).limit(500);
  if(after)query=query.gt('id',after);
  const {data,error}=await query;
  if(error)throw error;
  const rows=(data||[]) as unknown as {id:string}[];
  return table==='entries'?rows.map(row=>parseEntryRow(row as RawEntryRow)) as {id:string}[]:rows;
 });
}
