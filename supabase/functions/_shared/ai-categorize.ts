// Pure logic for AI categorisation, shared by the ai-categorize Edge Function and the app's tests.
// No Deno or browser API here.

export type AiCategory={id:string;name:string;kind:'income'|'expense'};
export type AiSubcategory={id:string;name:string;category_id:string};
export type AiOperation={id:string;label:string;amount_cents:number;kind:'income'|'expense';entry_date:string};
export const FLOW_TYPES=['standard','refund','transfer','savings','investment','review'] as const;
export type AiFlowType=typeof FLOW_TYPES[number];
export type AiSuggestion={entryId:string;categoryId:string;subcategoryId:string|null;flowType:AiFlowType;confidence:'high'|'medium'|'low';reason:string};
export const MAX_OPERATIONS_PER_CALL=100;

/** Removes what identifies a person or an account before a label leaves the household: long numbers, IBANs, e-mails. */
export function maskLabel(label:string):string{
 return label
  .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/gi,'[IBAN]')
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'[e-mail]')
  .replace(/\d{6,}/g,'[n°]')
  .replace(/\s+/g,' ').trim().slice(0,160);
}

/** Stable instructions and the household's categories: identical across calls, so they are cached. */
export function systemPrompt(categories:AiCategory[],subcategories:AiSubcategory[]):string{
 const lines=[...categories].sort((a,b)=>a.id.localeCompare(b.id)).map(c=>{
  const subs=subcategories.filter(s=>s.category_id===c.id).sort((a,b)=>a.id.localeCompare(b.id)).map(s=>`    - ${s.id} : ${s.name}`).join('\n');
  return `- ${c.id} : ${c.name} (${c.kind==='income'?'revenu':'dépense'})${subs?'\n'+subs:''}`;
 });
 return [
  'Tu classes les opérations bancaires d’un foyer français dans ses propres catégories.',
  'Pour chaque opération, choisis une catégorie du même type (revenu ou dépense) parmi la liste, et une sous-catégorie de cette catégorie si l’une convient vraiment.',
  'Indique aussi sa nature : standard (revenu ou dépense courante), refund (remboursement reçu), transfer (virement entre comptes du foyer), savings (versement ou retrait d’épargne), investment (placement), review (impossible à déterminer).',
  'Un virement entre deux comptes du même titulaire est un transfer. Un salaire, une aide ou un loyer reçu est standard.',
  'Confiance : high si le libellé est sans ambiguïté, medium si probable, low sinon. Si aucune catégorie ne convient, renvoie category_id vide et confidence low.',
  'La raison tient en une phrase courte en français. N’invente aucun identifiant : utilise uniquement ceux de la liste.',
  '',
  'Catégories du foyer (identifiant : nom) :',
  ...lines,
 ].join('\n');
}

export function userPrompt(operations:AiOperation[]):string{
 const rows=operations.map((op,index)=>({n:index,libelle:maskLabel(op.label),montant_eur:(op.amount_cents/100).toFixed(2),type:op.kind==='income'?'revenu':'dépense',date:op.entry_date}));
 return `Classe ces ${rows.length} opérations. Réponds pour chacune avec son numéro n.\n${JSON.stringify(rows)}`;
}

export const outputSchema={
 type:'object',
 additionalProperties:false,
 required:['suggestions'],
 properties:{suggestions:{type:'array',items:{type:'object',additionalProperties:false,required:['n','category_id','subcategory_id','flow_type','confidence','reason'],properties:{
  n:{type:'integer'},
  category_id:{type:'string'},
  subcategory_id:{type:'string'},
  flow_type:{type:'string',enum:[...FLOW_TYPES]},
  confidence:{type:'string',enum:['high','medium','low']},
  reason:{type:'string'},
 }}}},
} as const;

type RawSuggestion={n?:unknown;category_id?:unknown;subcategory_id?:unknown;flow_type?:unknown;confidence?:unknown;reason?:unknown};

/** Keeps only suggestions that point to this household's categories, with a matching type, once per operation. */
export function validateSuggestions(raw:unknown,operations:AiOperation[],categories:AiCategory[],subcategories:AiSubcategory[]):AiSuggestion[]{
 const list=(raw as {suggestions?:unknown})?.suggestions;
 if(!Array.isArray(list))return [];
 const seen=new Set<string>(),result:AiSuggestion[]=[];
 for(const item of list as RawSuggestion[]){
  const op=typeof item?.n==='number'?operations[item.n]:undefined;
  if(!op||seen.has(op.id))continue;
  const category=categories.find(c=>c.id===item.category_id&&c.kind===op.kind);
  if(!category)continue;
  const sub=typeof item.subcategory_id==='string'&&item.subcategory_id?subcategories.find(s=>s.id===item.subcategory_id&&s.category_id===category.id):undefined;
  const flowType=(FLOW_TYPES as readonly string[]).includes(String(item.flow_type))?item.flow_type as AiFlowType:'review';
  const confidence=item.confidence==='high'||item.confidence==='medium'?item.confidence:'low';
  seen.add(op.id);
  result.push({entryId:op.id,categoryId:category.id,subcategoryId:sub?.id??null,flowType,confidence,reason:String(item.reason??'').slice(0,200)});
 }
 return result;
}
