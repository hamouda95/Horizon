// Movements still "to check" that look like money moving inside the household: a transfer between one's
// own accounts, or a transfer naming a member of the household. They are not income nor spending.
type Reviewable={id:string;label:string;flowType?:string;amount:number};
const fold=(value:string)=>` ${value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()} `;
const ownAccounts=/ (cpte a cpte|compte a compte|virement interne|vir interne) /;

export function likelyInternal<T extends Reviewable>(entries:T[],memberNames:string[]):T[]{
 const names=memberNames.map(n=>fold(n).trim()).flatMap(n=>n.split(' ')).filter(w=>w.length>=4);
 return entries.filter(e=>{
  if(e.flowType!=='review')return false;
  const text=fold(e.label);
  return ownAccounts.test(text)||names.some(w=>text.includes(` ${w} `));
 });
}
