import {useEffect,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {supabase} from './client';
import {fetchHouseholdRows} from './household-data';
import type {Entry,Home} from './household-data';

export function useHouseholdData(userId:string,modal:string,tab:string,setModal:Dispatch<SetStateAction<string>>){
 const [home,setHome]=useState<Home|null>(null),[entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [subcategories,setSubcategories]=useState<{id:string;name:string;category_id:string;active:boolean}[]>([]);
 const [plans,setPlans]=useState<{month:string;income_cents:number;expense_cents:number}[]>([]);
 const loadSequence=useRef(0);
 async function load(){const sequence=++loadSequence.current;try{const {data:h,error:he}=await supabase.from('households').select('id,name,savings_rate_bps').eq('owner_id',userId).maybeSingle();if(he)throw he;if(sequence!==loadSequence.current)return true;if(!h){setHome(null);setEntries([]);setModal('setup');return true}const [categories,entryRows,budgetRows,subRows]=await Promise.all([fetchHouseholdRows('categories','id,name,kind,active',h.id),fetchHouseholdRows('entries','id,kind,label,amount_cents,entry_date,category_id,frequency,income_allocation,expense_type,subcategory_id',h.id),fetchHouseholdRows('monthly_budgets','id,month,income_cents,expense_cents',h.id),fetchHouseholdRows('subcategories','id,name,category_id,active',h.id)]);if(sequence!==loadSequence.current)return true;setSubcategories(subRows);setPlans(budgetRows);setHome({id:h.id,name:h.name,savingsRate:h.savings_rate_bps,incomeTypes:JSON.stringify(categories.filter(x=>x.active&&x.kind==='income').map(x=>x.name)),expenseTypes:JSON.stringify(categories.filter(x=>x.active&&x.kind==='expense').map(x=>x.name)),categories});setEntries(entryRows.map(x=>({id:x.id,kind:x.kind,label:x.label,category:categories.find(c=>c.id===x.category_id)?.name||'Autre',amount:Number(x.amount_cents),date:x.entry_date,frequency:x.frequency,incomeAllocation:x.income_allocation,expenseType:x.expense_type,categoryId:x.category_id,subcategoryId:x.subcategory_id,subcategory:subRows.find(y=>y.id===x.subcategory_id)?.name})));return true}catch(e){if(sequence!==loadSequence.current)return true;setError((e as Error).message||'Impossible de charger vos données.');return false}finally{if(sequence===loadSequence.current)setLoading(false)}}
 useEffect(()=>{load()},[userId]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&!modal&&tab!=='Budget')void load()};window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}},[userId,modal,tab]);
 return {home,entries,loading,error,setError,subcategories,setSubcategories,plans,load};
}
