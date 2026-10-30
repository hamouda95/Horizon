type Account={id:string;owner_user_id:string};
type Transaction={bank_account_id:string;fingerprint:string};
export function userFingerprints(accounts:Account[],transactions:Transaction[],userId:string,accountId:string,allowOtherAccountDuplicates=false){
 const ids=new Set(accounts.filter(a=>a.owner_user_id===userId&&(!allowOtherAccountDuplicates||a.id===accountId)).map(a=>a.id));
 return new Set(transactions.filter(t=>ids.has(t.bank_account_id)).map(t=>t.fingerprint));
}
export function overlappingAccount<T extends Account>(accounts:T[],transactions:Transaction[],fingerprints:string[],userId:string):T|null{
 const keys=new Set(fingerprints),ranked=accounts.filter(a=>a.owner_user_id===userId).map(account=>({account,count:transactions.filter(t=>t.bank_account_id===account.id&&keys.has(t.fingerprint)).length})).sort((a,b)=>b.count-a.count);
 return ranked[0]?.count>0&&ranked[0].count>(ranked[1]?.count||0)?ranked[0].account:null;
}
export function repeatedUserOperations(accounts:Account[],transactions:Transaction[],userId:string){
 const ids=new Set(accounts.filter(a=>a.owner_user_id===userId).map(a=>a.id)),seen=new Set<string>();let duplicates=0;
 for(const t of transactions)if(ids.has(t.bank_account_id)){if(seen.has(t.fingerprint))duplicates++;else seen.add(t.fingerprint)}
 return duplicates;
}
