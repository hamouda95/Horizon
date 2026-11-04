import type {HouseholdPerson} from '../../hooks/household-data';

const normalize=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// Words a bank puts on a payment sent to or received from someone.
const transferCue=/\b(?:vir|virement|virements|transfert|to|from|envoye|envoyee|recu|recue|paiement|wero|lydia|paylib)\b/;

/**
 * A transfer sent to or received from an adult of the household moves money inside it: it is neither income nor
 * spending. Every word of the member's name must appear, so "Sarah" matches "To Sarah Durand" but not "To Nina Durand".
 */
export function isMemberTransfer(label:string,people:Pick<HouseholdPerson,'name'|'relationship'|'active'>[]):boolean{
 const text=normalize(label);if(!transferCue.test(text))return false;
 const words=new Set(text.split(' '));
 return people.some(person=>{
  if(!person.active||person.relationship==='child')return false;
  const name=normalize(person.name).split(' ').filter(token=>token.length>=3);
  return name.length>0&&name.every(token=>words.has(token));
 });
}
