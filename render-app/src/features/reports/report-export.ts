import type {Entry} from '../../hooks/household-data';
import {budgetMonth} from '../../lib/period';
import {flowTypeLabel} from '../../lib/flow';
import {localToday} from '../../lib/dates';
// Spreadsheet applications may execute formulas in otherwise quoted CSV cells.
const cell=(value:string)=>'"'+(/^[\s]*[=+\-@]/.test(value)?"'"+value:value).replace(/"/g,'""')+'"';
export function monthlyReportCsv(entries:Entry[],month:string,today=localToday()):string{
 const headers=['Date','Mois du budget','Libellé','Catégorie','Sous-catégorie','Nature','Montant EUR','Statut'];
 const rows=entries.filter(entry=>budgetMonth(entry)===month).sort((a,b)=>a.date.localeCompare(b.date)).map(entry=>{
  const absolute=`${Math.floor(entry.amount/100)},${String(entry.amount%100).padStart(2,'0')}`;
  return [entry.date,budgetMonth(entry),entry.label,entry.category,entry.subcategory||'',flowTypeLabel(entry.flowType,entry.kind),(entry.kind==='expense'?'-':'')+absolute,entry.date>today?'Prévu':'Réalisé'];
 });
 return '\uFEFF'+[headers,...rows].map(row=>row.map((value,index)=>index===6&&row!==headers?'"'+value+'"':cell(value)).join(';')).join('\r\n')+'\r\n';
}
export function downloadMonthlyReport(entries:Entry[],month:string){
 const url=URL.createObjectURL(new Blob([monthlyReportCsv(entries,month)],{type:'text/csv;charset=utf-8'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=`horizon-operations-${month}.csv`;document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
