// Hints for a loan: operations naming the borrower that are not attached yet, and manual entries that
// duplicate a real bank operation (the same money then counts twice: once as spending, once as a loan).
type Op={id:string;kind:'income'|'expense';label:string;amount:number;date:string;loanId?:string|null;bankTransactionId?:string|null;flowType:string};
type Borrowed={id:string;borrower:string};

const fold=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function namesBorrower(label:string,borrower:string){
 const words=fold(borrower).split(' ').filter(w=>w.length>=3),text=` ${fold(label)} `;
 return words.length>0&&words.some(w=>text.includes(` ${w} `));
}

/** Operations mentioning the borrower that belong to no loan yet, most recent first. */
export function unattachedForBorrower<T extends Op>(entries:T[],loan:Borrowed):T[]{
 return entries.filter(e=>!e.loanId&&namesBorrower(e.label,loan.borrower)).sort((a,b)=>b.date.localeCompare(a.date));
}

/** Manual loan entries whose amount matches an unattached bank operation for the same person and direction. */
export function likelyDuplicates<T extends Op>(entries:T[],loan:Borrowed):Array<{manual:T;real:T}>{
 const candidates=unattachedForBorrower(entries,loan).filter(e=>e.bankTransactionId);
 const used=new Set<string>(),pairs:Array<{manual:T;real:T}>=[];
 for(const manual of entries.filter(e=>e.loanId===loan.id&&!e.bankTransactionId)){
  const real=candidates.find(c=>!used.has(c.id)&&c.kind===manual.kind&&c.amount===manual.amount);
  if(real){used.add(real.id);pairs.push({manual,real})}
 }
 return pairs;
}

/** An opening amount equal to an attached bank transfer usually records the same loan twice. */
export function openingLooksDuplicated<T extends Op>(entries:T[],loan:Borrowed&{opening_principal_cents:number}):T|null{
 if(loan.opening_principal_cents<=0)return null;
 return entries.find(e=>e.loanId===loan.id&&e.kind==='expense'&&e.bankTransactionId&&e.amount===loan.opening_principal_cents)??null;
}
