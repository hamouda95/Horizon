// Generic header understanding for bank exports: no bank-specific layout, only words and their usual meaning.
export type ColumnRole='date'|'valueDate'|'label'|'amount'|'debit'|'credit'|'reference'|'currency'|'category'|'parentCategory'|'balance';

const abbreviations:Record<string,string>={op:'operation',ope:'operation',oper:'operation',ops:'operation',val:'valeur',lib:'libelle',lbl:'libelle',mnt:'montant',mt:'montant',mont:'montant',amt:'amount',desc:'description',bal:'balance',cpt:'compte',ref:'reference',dt:'date',cat:'categorie',dev:'devise',cur:'currency',ccy:'currency',cr:'credit',dr:'debit',db:'debit'};
const stopWords=new Set(['de','d','l','le','la','les','du','des','en','a','au','aux','of','the','par','pour']);
// Glued words seen in exports (e.g. "accountbalance", "dateop"): split them on known vocabulary.
const vocabulary=['account','balance','solde','date','operation','valeur','value','libelle','label','montant','amount','debit','credit','category','categorie','parent','currency','devise','reference','transaction','booking','posting','description','supplier','found','comment'];

function splitGlued(word:string):string[]{
 if(word.length<7)return [word];
 for(const head of vocabulary)if(word.startsWith(head)&&word.length>head.length){const rest=word.slice(head.length);return [head,...splitGlued(rest)]}
 return [word];
}

/** Lower-case words of a header, with camelCase, glued words and abbreviations expanded. */
export function headerWords(raw:string):string[]{
 const spaced=raw.replace(/([a-z])([A-Z])/g,'$1 $2').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/€/g,' eur ').replace(/[^a-z0-9]+/g,' ').trim();
 return spaced.split(' ').filter(Boolean).flatMap(splitGlued).map(word=>abbreviations[word]||word).filter(word=>!stopWords.has(word));
}

const has=(words:string[],...options:string[])=>options.some(option=>option.includes(' ')?words.join(' ').includes(option):words.includes(option));

/** Best guess of what a header means, or null when it carries no recognisable meaning. */
export function guessHeaderRole(raw:string):ColumnRole|null{
 const text=raw.trim();
 // Values, not titles: dates, amounts and long sentences are never treated as headers.
 if(!text||text.length>48||/^[+−-]?\s*[\d\s.,]+\s*(€|eur)?$/i.test(text)||/^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}/.test(text))return null;
 const words=headerWords(text);
 if(!words.length)return null;
 const dateWord=has(words,'date','jour','day','posted','booking','posting','comptabilisation','execution');
 if(has(words,'solde','balance','cumul','cumule','running'))return dateWord&&!has(words,'montant','amount')?null:'balance';
 if(has(words,'valeur','value','valuta')&&(dateWord||words.length===1&&words[0]==='valuta'))return 'valueDate';
 if(dateWord)return 'date';
 if(has(words,'debit','sortie','sorties','depense','depenses','withdrawal','withdrawals','outflow','retrait','paid out','money out'))return 'debit';
 if(has(words,'credit','entree','entrees','recette','recettes','deposit','deposits','inflow','paid in','money in'))return 'credit';
 if(has(words,'montant','amount','somme','valeur','value','prix','net'))return 'amount';
 if(has(words,'devise','currency','monnaie'))return 'currency';
 if(has(words,'reference','fitid','identifiant','id','numero transaction','transaction id'))return 'reference';
 if(has(words,'categorie','category','rubrique','poste','type'))return has(words,'parent','principale','main','groupe')?'parentCategory':'category';
 if(strongLabel(words)||has(words,'tiers','contrepartie','nature','operation','transaction','nom','name'))return 'label';
 return null;
}
const strongLabel=(words:string[])=>has(words,'libelle','label','description','intitule','detail','details','motif','communication','beneficiaire','payee','merchant','commercant','marchand','memo');

/** Assigns roles to headers without reusing a column; earlier columns win ties, as banks list the main date first. */
export function guessHeaderRoles(headers:string[]):Partial<Record<ColumnRole,number>>{
 const roles:Partial<Record<ColumnRole,number>>={};
 headers.forEach((header,index)=>{const role=guessHeaderRole(header);if(!role)return;
  if(roles[role]===undefined){roles[role]=index;return}
  // An explicit "libellé" beats a vague "opération" or "nom" seen earlier.
  if(role==='label'&&strongLabel(headerWords(header))&&!strongLabel(headerWords(headers[roles.label??-1]??''))){roles.label=index;return}
  // A second date column without "valeur" is still most often the value date.
  if(role==='date'&&roles.valueDate===undefined)roles.valueDate=index;
  // Several balance columns: the last one is the running balance.
  if(role==='balance')roles.balance=index;
 });
 return roles;
}
