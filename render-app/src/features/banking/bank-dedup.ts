export function canonicalFingerprint(value:string){const result=value.replace(/\|id:.*$/, '|occurrence:1');return result.startsWith('row:')&&!/\|occurrence:[0-9]+$/.test(result)?result+'|occurrence:1':result}
type Account={id:string;owner_user_id:string};
type Transaction={bank_account_id:string;fingerprint:string};
export function userFingerprints(accounts:Account[],transactions:Transaction[],userId:string,accountId:string,allowOtherAccountDuplicates=false){
 const ids=new Set(accounts.filter(a=>a.owner_user_id===userId&&(!allowOtherAccountDuplicates||a.id===accountId)).map(a=>a.id));
 return new Set(transactions.filter(t=>ids.has(t.bank_account_id)).map(t=>canonicalFingerprint(t.fingerprint)));
}
export function overlappingAccount<T extends Account>(accounts:T[],transactions:Transaction[],fingerprints:string[],userId:string):T|null{
 const keys=new Set(fingerprints.map(canonicalFingerprint)),ranked=accounts.filter(a=>a.owner_user_id===userId).map(account=>({account,count:transactions.filter(t=>t.bank_account_id===account.id&&keys.has(canonicalFingerprint(t.fingerprint))).length})).sort((a,b)=>b.count-a.count);
 return ranked[0]?.count>0&&ranked[0].count>(ranked[1]?.count||0)?ranked[0].account:null;
}
export function repeatedUserOperations(accounts:Account[],transactions:Transaction[],userId:string){
 const ids=new Set(accounts.filter(a=>a.owner_user_id===userId).map(a=>a.id)),seen=new Set<string>();let duplicates=0;
 for(const t of transactions)if(ids.has(t.bank_account_id)){if(seen.has(canonicalFingerprint(t.fingerprint)))duplicates++;else seen.add(canonicalFingerprint(t.fingerprint))}
 return duplicates;
}

type Booked={id:string;bank_account_id:string;canonical_key:string;label:string;transaction_date:string};
const dayAfter=(date:string)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
/** The same card payment exported twice with booking dates one day apart: its label carries the purchase
 * date ("CARTE 19/09 …"), so equal amounts and labels one day apart are one operation, not two. */
export function shiftedDuplicatePairs<T extends Booked>(transactions:T[]):Array<[T,T]>{
 const groups=new Map<string,T[]>();
 for(const t of transactions){if(!/\b\d{2}\/\d{2}\b/.test(t.label))continue;const key=t.bank_account_id+'|'+t.canonical_key.replace(/^[^|]*\|/,'');groups.set(key,[...(groups.get(key)||[]),t])}
 const pairs:Array<[T,T]>=[];
 for(const rows of groups.values()){
  const byDate=new Map<string,T[]>();for(const t of rows)byDate.set(t.transaction_date,[...(byDate.get(t.transaction_date)||[]),t]);
  const used=new Set<string>();
  for(const date of [...byDate.keys()].sort()){
   const later=(byDate.get(dayAfter(date))||[]).filter(t=>!used.has(t.id));
   for(const first of byDate.get(date)!.filter(t=>!used.has(t.id))){const second=later.find(t=>!used.has(t.id));if(!second)break;used.add(first.id);used.add(second.id);pairs.push([first,second])}
  }
 }
 return pairs;
}
