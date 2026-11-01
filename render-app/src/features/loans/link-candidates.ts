// Ranks the operations a user may attach to a loan: the person's name in the label first, then a similar amount.
type Candidate={id:string;kind:'income'|'expense';label:string;amount:number;date:string;loanId?:string|null};

const fold=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const nameTokens=(name:string)=>fold(name).split(' ').filter(token=>token.length>=3);
export const amountIsClose=(amount:number,target:number)=>target>0&&Math.abs(amount-target)<=Math.max(100,Math.round(target*0.1));

/** Free-text filter on label, date or amount ("450", "450,00", "koubaa", "2026-09"). */
export function matchesQuery(entry:Candidate,query:string){
 const q=fold(query);if(!q)return true;
 const euros=(entry.amount/100).toFixed(2);
 return fold(`${entry.label} ${entry.date}`).includes(q)||euros.replace('.',',').startsWith(query.trim().replace(/\s/g,''))||euros.startsWith(query.trim().replace(',','.'));
}

export function rankLinkCandidates<T extends Candidate>(entries:T[],{kind,borrower,targetCents,query=''}:{kind:'income'|'expense';borrower:string;targetCents:number;query?:string}):{suggested:T[];others:T[]}{
 const tokens=nameTokens(borrower);
 const pool=entries.filter(e=>e.kind===kind&&!e.loanId&&matchesQuery(e,query));
 const score=(e:T)=>{const label=` ${fold(e.label)} `;const named=tokens.length>0&&tokens.some(t=>label.includes(` ${t} `));return (named?2:0)+(amountIsClose(e.amount,targetCents)?1:0)};
 const byDate=(a:T,b:T)=>b.date.localeCompare(a.date);
 const suggested=pool.filter(e=>score(e)>0).sort((a,b)=>score(b)-score(a)||Math.abs(a.amount-targetCents)-Math.abs(b.amount-targetCents)||byDate(a,b)).slice(0,15);
 const picked=new Set(suggested.map(e=>e.id));
 return {suggested,others:pool.filter(e=>!picked.has(e.id)).sort(byDate)};
}
