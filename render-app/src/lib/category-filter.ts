export function filterEntriesByCategory<T extends {kind:'income'|'expense';category:string}>(entries:T[],category:string|null):T[]{
 if(!category)return entries;
 return entries.filter(entry=>entry.kind==='income'||entry.category===category);
}
