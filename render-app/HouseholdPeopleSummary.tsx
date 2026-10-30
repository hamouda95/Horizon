import {displayText} from './text';
import {appLocale} from './locale';
import type {Entry,HouseholdPerson} from './household-data';

const currency=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(cents/100);
export default function HouseholdPeopleSummary({people,entries}:{people:HouseholdPerson[];entries:Entry[]}){
 const visible=people.filter(person=>person.active||entries.some(entry=>entry.personId===person.id));if(visible.length<2)return null;
 const totals=visible.map(person=>{const rows=entries.filter(entry=>entry.personId===person.id);return {person,income:rows.filter(entry=>entry.kind==='income'&&(entry.flowType||'standard')==='standard').reduce((sum,entry)=>sum+entry.amount,0),expense:rows.filter(entry=>entry.kind==='expense'&&(entry.flowType||'standard')==='standard').reduce((sum,entry)=>sum+entry.amount,0)}});
 const sharedIncome=entries.filter(entry=>entry.kind==='income'&&(entry.flowType||'standard')==='standard'&&!entry.personId).reduce((sum,entry)=>sum+entry.amount,0),sharedExpense=entries.filter(entry=>entry.kind==='expense'&&(entry.flowType||'standard')==='standard'&&!entry.personId).reduce((sum,entry)=>sum+entry.amount,0);
 return <section className="card household-people-summary"><div className="sectionhead"><div><span className="overline">Le budget du foyer</span><h2>Budget par personne</h2></div></div><p>Entrées et sorties d’argent répartis par personne.</p><div className="household-people-summary-grid">{totals.map(({person,income,expense})=><article key={person.id}><b>{displayText(person.name)}{!person.active&&<small className="archived-person">· ancien membre</small>}</b><span><small>Entrées courantes</small><strong className="positive">{currency(income)}</strong></span><span><small>Sorties courantes</small><strong>{currency(expense)}</strong></span></article>)}</div>{sharedIncome+sharedExpense>0&&<div className="household-shared-summary"><b>En commun ou à répartir</b><span>Revenus {currency(sharedIncome)}</span><span>Dépenses {currency(sharedExpense)}</span></div>}</section>;
}
