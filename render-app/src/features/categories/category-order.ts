// Category order: the household's own order first; otherwise the most important first, i.e. the most money
// moved over the last six months, so new or unused categories sink to the bottom.
type Orderable={id:string;name:string;active:boolean;sort_order?:number|null};
type Movement={categoryId:string;subcategoryId?:string|null;amount:number;date:string};

export function importanceByCategory(entries:Movement[],today:string,months=6):Map<string,number>{
 const since=new Date(Date.parse(today+'T12:00:00Z'));since.setUTCMonth(since.getUTCMonth()-months);
 const from=since.toISOString().slice(0,10),totals=new Map<string,number>();
 for(const e of entries)if(e.date>=from&&e.date<=today){totals.set(e.categoryId,(totals.get(e.categoryId)||0)+Math.abs(e.amount));if(e.subcategoryId)totals.set(e.subcategoryId,(totals.get(e.subcategoryId)||0)+Math.abs(e.amount))}
 return totals;
}

/** Active before archived; explicit sort_order first; then importance; then name. */
export function orderByImportance<T extends Orderable>(items:T[],importance:Map<string,number>):T[]{
 return [...items].sort((a,b)=>Number(b.active)-Number(a.active)
  ||(a.sort_order??Number.MAX_SAFE_INTEGER)-(b.sort_order??Number.MAX_SAFE_INTEGER)
  ||(importance.get(b.id)||0)-(importance.get(a.id)||0)
  ||a.name.localeCompare(b.name,'fr'));
}

/** New sort_order values after moving one item up or down among its siblings (spaced by 10). */
export function moveInOrder<T extends {id:string}>(ordered:T[],id:string,direction:-1|1):Array<{id:string;sort_order:number}>{
 const list=[...ordered],index=list.findIndex(item=>item.id===id),target=index+direction;
 if(index<0||target<0||target>=list.length)return [];
 [list[index],list[target]]=[list[target],list[index]];
 return list.map((item,i)=>({id:item.id,sort_order:(i+1)*10}));
}
