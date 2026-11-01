import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/client';
import {collectPages} from '../lib/pagination';
import type {Entry} from './household-data';
import type {FilterAccount} from '../lib/entry-filters';

/** Accounts of the household and the account each imported operation came from, to filter by bank or person. */
export function useAccountDirectory(householdId:string,version:number){
 const [accounts,setAccounts]=useState<FilterAccount[]>([]),[byTransaction,setByTransaction]=useState<Map<string,string>>(new Map());
 useEffect(()=>{let live=true;
  void (async()=>{try{
   const [{data,error},links]=await Promise.all([
    supabase.from('financial_accounts').select('id,name,source_name,owner_person_id').eq('household_id',householdId).order('created_at',{ascending:true}),
    collectPages(async after=>{let q=supabase.from('bank_transactions').select('id,bank_account_id').eq('household_id',householdId).order('id',{ascending:true}).limit(1000);if(after)q=q.gt('id',after);const {data,error}=await q;if(error)throw error;return data||[]})]);
   if(error)throw error;if(!live)return;
   setAccounts((data||[]) as FilterAccount[]);setByTransaction(new Map(links.map(l=>[l.id,l.bank_account_id])));
  }catch{/* Filters by bank or person stay available on the operations that carry them. */}})();
  return()=>{live=false}},[householdId,version]);
 return useMemo(()=>{const index=new Map(accounts.map(a=>[a.id,a]));
  const account=(e:Entry)=>index.get(e.accountId||(e.bankTransactionId?byTransaction.get(e.bankTransactionId)||'':''));
  return {accounts,account}},[accounts,byTransaction]);
}
