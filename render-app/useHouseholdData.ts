import {collectPages} from './pagination';
import type {Loan} from './finance-engine';
import {useEffect,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {supabase} from './client';
import {fetchHouseholdRows} from './household-data';
import type {Entry,Home} from './household-data';

export type HouseholdChoice={id:string;name:string;role:'owner'|'member';savingsRate:number|null};

export function useHouseholdData(userId:string,modal:string,tab:string,setModal:Dispatch<SetStateAction<string>>){
 const [home,setHome]=useState<Home|null>(null),[households,setHouseholds]=useState<HouseholdChoice[]>([]),[entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refreshVersion,setRefreshVersion]=useState(0);
 const [loans,setLoans]=useState<Loan[]>([]);
 const [subcategories,setSubcategories]=useState<{id:string;name:string;category_id:string;active:boolean}[]>([]);
 const [plans,setPlans]=useState<{month:string;income_cents:number;expense_cents:number}[]>([]);
 const loadSequence=useRef(0),selectedId=useRef<string|null>(null);
 async function load(preferredId?:string){
  const sequence=++loadSequence.current;
  setError('');
  try{
   const {data:members,error:memberError}=await supabase.from('household_members').select('household_id,role,households!inner(id,name,savings_rate_bps)').eq('user_id',userId).order('joined_at',{ascending:true});
   if(memberError)throw memberError;
   const choices=(members||[]).flatMap(row=>{
    const related=row.households;
    const h=Array.isArray(related)?related[0]:related;
    return h?[{id:h.id,name:h.name,role:row.role==='owner'?'owner' as const:'member' as const,savingsRate:h.savings_rate_bps}]:[];
   });
   if(sequence!==loadSequence.current)return true;
   setHouseholds(choices);
   if(!choices.length){setHome(null);setEntries([]);setLoans([]);setSubcategories([]);setPlans([]);setRefreshVersion(value=>value+1);setModal('setup');return true}
   let savedId='';try{savedId=localStorage.getItem(`horizon.household.${userId}`)||''}catch{/* le choix reste valable pour cette session */}
   const selected=choices.find(x=>x.id===(preferredId||selectedId.current||savedId))||choices.find(x=>x.role==='owner')||choices[0];
   if(selectedId.current!==selected.id){selectedId.current=selected.id;setHome(null);setEntries([]);setLoans([]);setSubcategories([]);setPlans([]);setLoading(true)}
   try{localStorage.setItem(`horizon.household.${userId}`,selected.id)}catch{/* le choix reste valable pour cette session */}
   const [categories,entryRows,budgetRows,subRows,peopleRows,loanRows]=await Promise.all([
    fetchHouseholdRows('categories','id,name,kind,active',selected.id),
    fetchHouseholdRows('entries','id,kind,label,amount_cents,entry_date,category_id,frequency,income_allocation,expense_type,subcategory_id,bank_transaction_id,person_id,flow_type,account_id,loan_id,payment_method',selected.id),
    fetchHouseholdRows('monthly_budgets','id,month,income_cents,expense_cents',selected.id),
    fetchHouseholdRows('subcategories','id,name,category_id,active',selected.id),
    supabase.from('household_people').select('id,name,relationship,is_primary,active,sort_order').eq('household_id',selected.id).order('sort_order').order('name'),
    collectPages<Loan>(async after=>{let q=supabase.from('household_loans').select('id,borrower,opening_principal_cents,opened_on,notes').eq('household_id',selected.id).order('id').limit(500);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return data||[]})
   ]);
   if(peopleRows.error)throw peopleRows.error;
   if(sequence!==loadSequence.current)return true;
   setLoans(loanRows);setSubcategories(subRows);setPlans(budgetRows);
   const people=(peopleRows.data||[]).map(x=>({id:x.id,name:x.name,relationship:x.relationship as 'self'|'partner'|'child'|'other',isPrimary:x.is_primary,active:x.active,sortOrder:x.sort_order}));
   setHome({id:selected.id,name:selected.name,role:selected.role,savingsRate:selected.savingsRate,incomeTypes:JSON.stringify(categories.filter(x=>x.active&&x.kind==='income').map(x=>x.name)),expenseTypes:JSON.stringify(categories.filter(x=>x.active&&x.kind==='expense').map(x=>x.name)),categories,people});
   setEntries(entryRows.map(x=>({id:x.id,kind:x.kind,label:x.label,category:categories.find(c=>c.id===x.category_id)?.name||'Autre',amount:Number(x.amount_cents),date:x.entry_date,frequency:x.frequency,incomeAllocation:x.income_allocation,expenseType:x.expense_type,flowType:x.flow_type,categoryId:x.category_id,subcategoryId:x.subcategory_id,bankTransactionId:x.bank_transaction_id,personId:x.person_id,accountId:x.account_id,loanId:x.loan_id,paymentMethod:x.payment_method,subcategory:subRows.find(y=>y.id===x.subcategory_id)?.name})));
   setRefreshVersion(value=>value+1);
   return true;
  }catch(e){if(sequence!==loadSequence.current)return true;setError((e as Error).message||'Impossible de charger vos données.');return false}
  finally{if(sequence===loadSequence.current)setLoading(false)}
 }
 const loadRef=useRef(load);
 loadRef.current=load;
 function selectHousehold(id:string){if(id!==selectedId.current&&households.some(x=>x.id===id)){selectedId.current=id;setModal('');setHome(null);setEntries([]);setLoans([]);setSubcategories([]);setPlans([]);setLoading(true);void loadRef.current(id)}}
 useEffect(()=>{setLoading(true);void load()},[userId]);
 useEffect(()=>{
  const householdId=home?.id;
  if(!householdId)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{if(selectedId.current===householdId)void loadRef.current(householdId)},120)};
  const channel=supabase.channel(`household-sync:${userId}:${householdId}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'households',filter:`id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'categories',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'household_loans',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'category_budget_rules',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'entries',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'bank_accounts',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'bank_transactions',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'monthly_budgets',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'monthly_category_budgets',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'savings_movements',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'household_savings_goals',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'household_obligations',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'household_obligation_settlements',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'household_documents',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'subcategories',filter:`household_id=eq.${householdId}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'household_people',filter:`household_id=eq.${householdId}`},refresh)
   .subscribe();
  return ()=>{if(timer)clearTimeout(timer);void supabase.removeChannel(channel)};
 },[userId,home?.id]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&!modal)void loadRef.current()};window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}},[userId,modal,tab]);
 return {loans,home,households,selectHousehold,entries,loading,error,setError,subcategories,setSubcategories,plans,refreshVersion,load};
}
