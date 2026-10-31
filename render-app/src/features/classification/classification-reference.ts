import type {FlowType} from '../../lib/flow';
export type ReferenceRule={key:string;terms:string[];kind:'income'|'expense';category:string;subcategory:string;flowType?:FlowType};
// Public starting reference. Household-confirmed rules always take precedence.
export const classificationReference:ReferenceRule[]=[
 {key:'groceries',terms:['franprix','carrefour','auchan','lidl','aldi','intermarche','leclerc','monoprix','super u','hyper u','casino','picard','supermarche','hyper market','epicerie'],kind:'expense',category:'Courses',subcategory:'Supermarchés et alimentation'},
 {key:'bakery',terms:['boulangerie','patisserie'],kind:'expense',category:'Courses',subcategory:'Boulangerie'},
 {key:'butcher',terms:['boucherie','boucher'],kind:'expense',category:'Courses',subcategory:'Boucherie'},
 {key:'restaurant',terms:['restaurant','resto','uber eats','ubereats','deliveroo','just eat','mcdonald','burger king'],kind:'expense',category:'Loisirs',subcategory:'Restaurants et livraison'},
 {key:'rent-out',terms:['loyer','loyers','quittance','bail habitation','location immobiliere'],kind:'expense',category:'Logement',subcategory:'Loyer',flowType:'standard'},
 {key:'rent-in',terms:['loyer','loyers','revenu locatif','revenus locatifs','location immobiliere'],kind:'income',category:'Revenus locatifs',subcategory:'Loyers',flowType:'standard'},
 {key:'salary',terms:['salaire','salaires','paie','payroll','remuneration'],kind:'income',category:'Salaire',subcategory:'Salaire net',flowType:'standard'},
 {key:'benefits',terms:['caf','allocations familiales','allocation logement','france travail','pole emploi'],kind:'income',category:'Aides',subcategory:'Prestations et allocations',flowType:'standard'},
 {key:'energy',terms:['edf','engie','totalenergies','electricite','gaz naturel'],kind:'expense',category:'Factures',subcategory:'Énergie'},
 {key:'telecom',terms:['free mobile','free telecom','orange','bouygues telecom','sfr','sosh','red by sfr'],kind:'expense',category:'Factures',subcategory:'Téléphonie et internet'},
 {key:'insurance',terms:['assurance','assurances','axa','maif','macif','matmut','allianz'],kind:'expense',category:'Factures',subcategory:'Assurances'},
 {key:'transport',terms:['sncf','ratp','navigo','ile de france mobilites','parking','peage','fulli','mobilis','carburant','essence','station service','uber','bolt'],kind:'expense',category:'Transport',subcategory:'Déplacements'},
 {key:'health',terms:['pharmacie','pharmacy','medecin','dentiste','medical','hopital','laboratoire analyses'],kind:'expense',category:'Santé',subcategory:'Soins et pharmacie'},
 {key:'subscription',terms:['netflix','spotify','disney','deezer','canal plus','prime video'],kind:'expense',category:'Loisirs',subcategory:'Abonnements'},
 {key:'tax',terms:['dgfip','finances publiques','impot','impots','tresor public'],kind:'expense',category:'Impôts et taxes',subcategory:'Impôts'},
 {key:'refund',terms:['remboursement','cpam','securite sociale','avoir'],kind:'income',category:'Remboursements',subcategory:'Remboursements reçus',flowType:'refund'},
 {key:'interest',terms:['interets credites','interets livret','dividendes','dividende'],kind:'income',category:'Revenus de placements',subcategory:'Intérêts et dividendes',flowType:'standard'},
];
export const normalizeReference=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function referenceMatch(label:string,kind:'income'|'expense'){
 const text=' '+normalizeReference(label)+' ';
 const matches=classificationReference.filter(r=>r.kind===kind).flatMap(rule=>rule.terms.filter(term=>text.includes(' '+normalizeReference(term)+' ')).map(term=>({rule,length:term.length})));
 return matches.sort((a,b)=>b.length-a.length)[0]?.rule||null;
}
export function referenceTaxonomy(){
 const groups=new Map<string,{kind:string;name:string;subcategories:string[]}>();
 for(const rule of classificationReference){const key=rule.kind+'|'+rule.category,g=groups.get(key)||{kind:rule.kind,name:rule.category,subcategories:[]};if(!g.subcategories.includes(rule.subcategory))g.subcategories.push(rule.subcategory);groups.set(key,g)}
 return [...groups.values()];
}
