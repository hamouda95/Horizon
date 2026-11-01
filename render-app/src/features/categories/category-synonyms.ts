// Synonym referential for category and subcategory names, so "Péage" and "Péages" or the variants of
// "Restaurants" are recognised as the same thing and never created twice.

const stopWords=new Set(['de','du','des','et','la','le','les','l','d','a','au','aux','en','pour','sur','par','avec','dont']);
const fold=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/&/g,' et ').replace(/[^a-z0-9]+/g,' ').trim();
const singular=(word:string)=>word.length>3&&/[sx]$/.test(word)&&!/(ss|us|is)$/.test(word)?word.slice(0,-1):word;
const tokens=(value:string)=>fold(value).split(' ').filter(word=>word&&!stopWords.has(word)).map(singular);

// Each group lists names meaning the same thing; the first one is the canonical key.
const synonymGroups:string[][]=[
 ['restaurant','restaurants','restauration','resto','restos','restaurants et livraison','restaurant et livraison','restaurants bars discotheques','restaurants bars','repas exterieurs','sorties restaurants'],
 ['peage','peages','autoroute','autoroutes','peages autoroute'],
 ['loyer','loyers','loyer charges','loyers charges','loyer et charges'],
 ['telephonie internet','telephonie','telephone','telephonie fixe et mobile','telephonie et internet','internet','box internet','mobile','forfait mobile','multimedia a domicile tv internet telephonie','abonnements telephonie autres','puce'],
 ['energie','electricite','gaz','electricite gaz','electricite et gaz'],
 ['supermarche','supermarches','supermarches et alimentation','alimentation','epicerie','courses alimentaires'],
 ['carburant','essence','gazole','gasoil','carburants'],
 ['assurance','assurances','assurance habitation','assurance habitation et rc'],
 ['abonnement','abonnements','streaming'],
 ['pharmacie','pharmacie et laboratoire','soins et pharmacie','medicaments'],
 ['voyage','voyages','vacances','sejours'],
 ['salaire','salaires','paie','salaire net','remuneration'],
 ['impot','impots','impots et taxes','taxes'],
 ['virement interne','virements emis','virements emis de comptes a comptes','mouvements internes debiteurs','virements internes','transferts'],
 ['vetement','vetements','vetements et accessoires','habillement'],
 ['transport quotidien','transports quotidiens','transports quotidiens metro bus','transports en commun','metro bus'],
 ['parking','stationnement'],
 ['reparation','reparations','entretien vehicule','reparation vehicule'],
];
const synonymIndex=new Map<string,string>();
for(const group of synonymGroups){const key=tokens(group[0]).join(' ');for(const name of group)synonymIndex.set(tokens(name).join(' '),key)}

/** Canonical form of a name: accents, case, punctuation, plurals and small words ignored, synonyms merged. */
export function canonicalName(name:string):string{
 const key=tokens(name).join(' ');
 return synonymIndex.get(key)??key;
}

export type NamedItem={id:string;name:string;active:boolean;category_id?:string};
/** Groups of items sharing a canonical name (active items only), most used first when usage is given. */
export function duplicateGroups<T extends NamedItem>(items:T[],usage:(id:string)=>number=()=>0):T[][]{
 const groups=new Map<string,T[]>();
 for(const item of items.filter(i=>i.active)){const key=canonicalName(item.name);if(!key)continue;groups.set(key,[...(groups.get(key)||[]),item])}
 return [...groups.values()].filter(group=>group.length>1).map(group=>[...group].sort((a,b)=>usage(b.id)-usage(a.id)||a.name.length-b.name.length));
}

/** The existing active item a new name would duplicate, if any. */
export function existingSynonym<T extends NamedItem>(name:string,items:T[]):T|undefined{
 const key=canonicalName(name);
 return key?items.find(item=>item.active&&canonicalName(item.name)===key):undefined;
}

type TaxonomyGroup={kind:string;name:string;subcategories:string[]};
/** Renames reference categories and subcategories to the household's synonymous ones, so installing the reference never duplicates them. */
export function alignTaxonomy(taxonomy:TaxonomyGroup[],categories:Array<NamedItem&{kind:string}>,subcategories:Array<NamedItem&{category_id:string}>):TaxonomyGroup[]{
 return taxonomy.map(group=>{
  const category=categories.find(c=>c.active&&c.kind===group.kind&&canonicalName(c.name)===canonicalName(group.name));
  const subs=category?subcategories.filter(s=>s.active&&s.category_id===category.id):[];
  return {...group,name:category?.name??group.name,subcategories:[...new Set(group.subcategories.map(name=>subs.find(s=>canonicalName(s.name)===canonicalName(name))?.name??name))]};
 });
}
