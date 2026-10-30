import {useEffect,useState} from 'react';
import {supabase} from './client';
import {collectPages} from './pagination';
export type CategoryBudget={id:string;category_id:string;month:string;amount_cents:number};
export function useCategoryBudgets(householdId:string,refreshVersion:number){
 const [state,setState]=useState<{householdId:string;rows:CategoryBudget[];error:string;loading:boolean}>({householdId:'',rows:[],error:'',loading:true});
 useEffect(()=>{let active=true;setState({householdId,rows:[],error:'',loading:true});if(!householdId){setState({householdId,rows:[],error:'',loading:false});return}void collectPages<CategoryBudget>(async after=>{let q=supabase.from('monthly_category_budgets').select('id,category_id,month,amount_cents').eq('household_id',householdId).order('id').limit(500);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return data||[]}).then(rows=>{if(active)setState({householdId,rows,error:'',loading:false})}).catch(e=>{if(active)setState({householdId,rows:[],error:e.message||'Budgets indisponibles',loading:false})});return()=>{active=false}},[householdId,refreshVersion]);
 return state.householdId===householdId?state:{householdId,rows:[],error:'',loading:true};
}
