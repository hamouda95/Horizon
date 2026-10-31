/** Format visible labels only. Bank statements, identifiers and matching keys stay unchanged. */
const commonWords=new Set(('de du des le la les et en pour par au aux a à depuis vers compte comptes courant courants livret livrets épargne virement virements transfert transferts interne internes reçu reçus émis salaire salaires revenus dépenses entrées sorties budget courses factures loisirs voyage loyer loyers remboursement remboursements janvier février mars avril mai juin juillet août septembre octobre novembre décembre sepa csv pdf tsv camt ofx qif jpeg png webp iban bic cb vir inst').split(' '));
export function displayText(value:string|null|undefined):string{
 if(!value)return '';
 const result=value.trim().replace(/\bVIR\s+(?=Virement\b)/i,'').replace(/^VIR\s+INST\b/i,'Virement instantané').replace(/^VIR\s+SEPA\b/i,'Virement sepa').replace(/^VIR\b/i,'Virement').replace(/^CB\b/i,'Carte').replace(/^PRLV\b/i,'Prélèvement')
  .replace(/\p{L}[\p{L}’'-]*/gu,word=>{if(word.length<=1||word!==word.toLocaleUpperCase('fr-FR'))return word;const lower=word.toLocaleLowerCase('fr-FR');return commonWords.has(lower)?lower:lower.charAt(0).toLocaleUpperCase('fr-FR')+lower.slice(1)});
 return result.charAt(0).toLocaleUpperCase('fr-FR')+result.slice(1);
}
export function plural(count:number,singular:string,pluralForm=singular+'s'){return count+' '+(Math.abs(count)>1?pluralForm:singular)}
