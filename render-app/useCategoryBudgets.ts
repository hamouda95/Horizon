import {useEffect,useMemo,useState} from 'react';
import {supabase} from './client';import {collectPages} from './pagination';import {localToday} from './dates';
import {resolvedCategoryBudgets,type CategoryBudget,type BudgetRule} from './recurring-budgets';
export type {CategoryBudget} from './recurring-budgets';
export function useCategoryBudgets(householdId:string,refreshVersion:number,selectedMonth=localToday().slice(0,7)){
 const [state,setState]=useState<{householdId:string;overrides:CategoryBudget[];rules:BudgetRule[];error:string;loading:boolean}>({householdId:'',overrides:[],rules:[],error:'',loading:true});
 useEffect(()=>{let active=true;setState({householdId,overrides:[],rules:[],error:'',loading:true});if(!householdId){setState({householdId,overrides:[],rules:[],error:'',loading:false});return}void Promise.all([
 collectPages<CategoryBudget>(async after=>{let q=supabase.from('monthly_category_budgets').select('id,category_id,month,amount_cents').eq('household_id',householdId).order('id').limit(500);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return data||[]}),
 collectPages<BudgetRule>(async after=>{let q=supabase.from('category_budget_rules').select('id,revision,category_id,effective_month,cadence,amount_cents,enabled,created_at').eq('household_id',householdId).order('id').limit(500);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return data||[]})
 ]).then(([overrides,rules])=>{if(active)setState({householdId,overrides,rules,error:'',loading:false})}).catch(e=>{if(active)setState({householdId,overrides:[],rules:[],error:e.message||'Budgets indisponibles',loading:false})});return()=>{active=false}},[householdId,refreshVersion]);
 const rows=useMemo(()=>{const years=[...new Set([selectedMonth.slice(0,4),localToday().slice(0,4),String(Number(selectedMonth.slice(0,4))+1)])];const months=[...new Set([...state.overrides.map(b=>b.month.slice(0,7)),...years.flatMap(y=>Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`))])];return resolvedCategoryBudgets(state.overrides,state.rules,months)},[state.overrides,state.rules,selectedMonth]);
 return state.householdId===householdId?{...state,rows}:{householdId,overrides:[],rules:[],rows:[],error:'',loading:true};
}
