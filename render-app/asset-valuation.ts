export type AssetValuation={kind:'investment';asOf:string;currency:'EUR';grossCents:number;estimatedNetCents:number|null;gainLossCents:number|null;lockedCents:number|null;plan:string;source:string;releaseNotes:string[]};
export function assetValuation(value:unknown):AssetValuation|null{
 if(!value||typeof value!=='object')return null;const v=value as AssetValuation;
 if(v.kind!=='investment'||v.currency!=='EUR'||!/^\d{4}-\d{2}-\d{2}$/.test(v.asOf)||!Number.isSafeInteger(v.grossCents)||v.grossCents<0)return null;
 for(const n of [v.estimatedNetCents,v.lockedCents])if(n!==null&&(!Number.isSafeInteger(n)||n<0))return null;
 if(v.lockedCents!==null&&v.lockedCents>v.grossCents||v.gainLossCents!==null&&!Number.isSafeInteger(v.gainLossCents))return null;
 if(typeof v.plan!=='string'||typeof v.source!=='string'||!Array.isArray(v.releaseNotes)||v.releaseNotes.some(n=>typeof n!=='string'))return null;
 return v;
}
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function cents(s:string){const clean=s.replace(/[ €\u00a0\u202f]/g,'');const n=Number(clean.includes('.')?clean.replace(/,/g,''):clean.replace(',','.'));return Number.isFinite(n)?Math.round(n*100):null}
export function investmentStatement(lines:string[]):AssetValuation|null{
 const text=lines.join('\n'),normalized=fold(text);
 if(!/company savings|epargne (?:salariale|entreprise)|savings plans|investment vehicles|plan d.epargne|assurance.vie|compte.titres|\b(?:pee|pereco|perco|pea)\b/.test(normalized))return null;
 const total=text.match(/(?:gross total amount|montant total brut|total brut|valorisation totale|valeur totale)\s*([\d ,.\u00a0\u202f]+)\s*€/i);
 if(!total)return null;
 const date=text.match(/(?:as of|au|date du|issued on)\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(!date)return null;
 const gross=cents(total[1]);if(gross===null)return null;
 const net=text.match(/(?:estimated net amount|montant net estime)\s*(?:(?:PEE|PERECO|PERCO|PER|PEA)\s*)?([\d ,.\u00a0\u202f]+)\s*€/i);
 const gain=text.match(/(?:global gain\/loss|plus.value globale|plus ou moins.value|gain.perte global)(?:\s*\(\d+\))?\s*([+−-]?[\d ,.\u00a0\u202f]+)\s*€/i);
 const locked=text.match(/(?:unavailable savings|epargne indisponible|montant bloque)\s*([\d ,.\u00a0\u202f]+)\s*€/i);
 const plans=[...new Set([...text.matchAll(/\b(PEE|PERECO|PERCO|PEA|PERO)\s+[\d ,.\u00a0\u202f]+\s*€/g)].map(m=>m[1]))];
 return assetValuation({kind:'investment',asOf:`${date[3]}-${date[2]}-${date[1]}`,currency:'EUR',grossCents:gross,estimatedNetCents:net&&plans.length<=1?cents(net[1]):null,gainLossCents:gain?cents(gain[1].replace('−','-')):null,lockedCents:locked?cents(locked[1]):null,plan:plans.length===1?plans[0]:'Placement',source:/BNP\s*PARIBAS/i.test(text)?'BNP Paribas Épargne et Retraite Entreprises':'Organisme à préciser',releaseNotes:lines.filter(l=>/^(?:until|jusqu.au)\s+\d/i.test(l.trim())).slice(0,30)});
}
