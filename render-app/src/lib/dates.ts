/** Browser-local civil date. Never use a UTC ISO slice for household periods. */
export function localToday(){const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
export function realizedEntries<T extends {date:string}>(entries:T[],today=localToday()):T[]{return entries.filter(entry=>entry.date<=today)}
