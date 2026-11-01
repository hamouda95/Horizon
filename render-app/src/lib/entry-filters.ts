// Filters shared by the operation registers. An operation's person and bank come from the entry itself
// or, for imported ones, from the bank account that carried them: few entries have a person typed in.
import type {Entry} from '../hooks/household-data';
import {budgetMonth} from './period';

export type EntryFilterValues={period:string;from:string;to:string;person:string;account:string;flow:string;category:string;min:string;max:string};
export const emptyEntryFilters:EntryFilterValues={period:'month',from:'',to:'',person:'',account:'',flow:'',category:'',min:'',max:''};
export type FilterAccount={id:string;name:string;source_name:string|null;owner_person_id:string|null;account_type?:string;balance_cents?:number|null;effective_balance_cents?:number|null};
export type EntryContext={account:(entry:Entry)=>FilterAccount|undefined;personName:(id:string|null)=>string};

export const fold=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const cents=(text:string)=>{const n=Number(text.replace(/\s/g,'').replace(',','.'));return text.trim()&&Number.isFinite(n)?Math.round(n*100):null};

/** Person an operation belongs to: the one chosen on it, otherwise the holder of its account. */
export function entryPerson(entry:Entry,ctx:EntryContext){return entry.personId??ctx.account(entry)?.owner_person_id??null}

/** Free text matches the label, category, account, bank or person, accents and case ignored; a number also matches the amount. */
export function matchesQuery(entry:Entry,query:string,ctx:EntryContext){
 const q=fold(query.trim());if(!q)return true;
 const account=ctx.account(entry),amount=cents(query);
 if(amount!==null&&/^[\d\s.,]+$/.test(query.trim())&&Math.abs(amount)===entry.amount)return true;
 return fold([entry.label,entry.category,entry.subcategory||'',account?.name||'',account?.source_name||'',ctx.personName(entryPerson(entry,ctx))].join(' ')).includes(q);
}

export function matchesFilters(entry:Entry,f:EntryFilterValues,ctx:EntryContext,month:string){
 if(f.period==='month'&&budgetMonth(entry)!==month)return false;
 if(f.period==='range'&&((f.from&&entry.date<f.from)||(f.to&&entry.date>f.to)))return false;
 if(f.person){const person=entryPerson(entry,ctx);if(f.person==='common'?person!==null:person!==f.person)return false}
 if(f.account){const account=ctx.account(entry);
  if(f.account==='none'?account:f.account.startsWith('bank:')?(account?.source_name||'')!==f.account.slice(5):account?.id!==f.account)return false}
 if(f.flow&&entry.flowType!==f.flow)return false;
 if(f.category&&entry.category!==f.category)return false;
 const min=cents(f.min),max=cents(f.max);
 if(min!==null&&entry.amount<min)return false;
 if(max!==null&&entry.amount>max)return false;
 return true;
}

/** Number of filters that narrow the list beyond the default month view. */
export function activeFilterCount(f:EntryFilterValues){
 return (f.period!=='month'?1:0)+(['person','account','flow','category'] as const).filter(k=>f[k]).length+(f.min||f.max?1:0);
}
