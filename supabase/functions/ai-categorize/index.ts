// Suggests categories for a household's operations with Claude. Suggestions only: nothing is written here,
// the user validates them in the app. Requires the ANTHROPIC_API_KEY secret.
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import {jsonResponse,requireUser} from '../_shared/banking.ts';
import {MAX_OPERATIONS_PER_CALL,outputSchema,systemPrompt,userPrompt,validateSuggestions,type AiCategory,type AiOperation,type AiSubcategory} from '../_shared/ai-categorize.ts';

const MODEL='claude-opus-5-5';

Deno.serve(async(request:Request)=>{
 const origin=request.headers.get('Origin');
 if(request.method==='OPTIONS')return jsonResponse({},200,origin);
 if(request.method!=='POST')return jsonResponse({error:'Méthode non autorisée.'},405,origin);
 if(!Deno.env.get('ANTHROPIC_API_KEY'))return jsonResponse({error:'L’assistant IA n’est pas encore configuré sur ce projet.',code:'AI_NOT_CONFIGURED'},503,origin);
 try{
  const {user,userClient}=await requireUser(request);
  // Consent is checked on the server too: no label leaves the household without it.
  if(user.user_metadata?.ai_consent!==true)return jsonResponse({error:'Activez d’abord les suggestions par IA.',code:'AI_CONSENT_REQUIRED'},403,origin);
  const body=await request.json().catch(()=>null) as {householdId?:unknown;entryIds?:unknown}|null;
  const householdId=typeof body?.householdId==='string'?body.householdId:'';
  const entryIds=Array.isArray(body?.entryIds)?[...new Set(body.entryIds.filter((id):id is string=>typeof id==='string'))]:[];
  if(!householdId||!entryIds.length)return jsonResponse({error:'Aucune opération à classer.'},400,origin);
  if(entryIds.length>MAX_OPERATIONS_PER_CALL)return jsonResponse({error:`${MAX_OPERATIONS_PER_CALL} opérations au maximum par demande.`},400,origin);

  // Every read goes through the user's own session, so row-level security limits it to their households.
  const {data:membership,error:memberError}=await userClient.from('household_members').select('household_id').eq('household_id',householdId).eq('user_id',user.id).maybeSingle();
  if(memberError)throw memberError;
  if(!membership)return jsonResponse({error:'Foyer inaccessible.'},403,origin);
  const [{data:entries,error:entriesError},{data:categories,error:categoriesError},{data:subcategories,error:subError}]=await Promise.all([
   userClient.from('entries').select('id,label,amount_cents,kind,entry_date').eq('household_id',householdId).in('id',entryIds),
   userClient.from('categories').select('id,name,kind').eq('household_id',householdId).eq('active',true),
   userClient.from('subcategories').select('id,name,category_id').eq('household_id',householdId).eq('active',true),
  ]);
  if(entriesError||categoriesError||subError)throw entriesError||categoriesError||subError;
  const operations=(entries||[]) as AiOperation[],cats=(categories||[]) as AiCategory[],subs=(subcategories||[]) as AiSubcategory[];
  if(!operations.length)return jsonResponse({suggestions:[]},200,origin);

  const client=new Anthropic();
  const response=await client.beta.messages.create({
   model:MODEL,
   max_tokens:16000,
   betas:['server-side-fallback-2026-07-01'],
   // On a policy decline, the API retries on Anthropic's recommended fallback model instead of refusing.
   fallbacks:'default',
   system:[{type:'text',text:systemPrompt(cats,subs),cache_control:{type:'ephemeral'}}],
   output_config:{effort:'low',format:{type:'json_schema',schema:outputSchema}},
   messages:[{role:'user',content:userPrompt(operations)}],
  });
  if(response.stop_reason==='refusal')return jsonResponse({error:'L’IA n’a pas pu traiter ces opérations. Classez-les manuellement.',code:'AI_REFUSED'},422,origin);
  if(response.stop_reason==='max_tokens')return jsonResponse({error:'Réponse trop longue : réessayez avec moins d’opérations.',code:'AI_TRUNCATED'},422,origin);
  const text=response.content.flatMap(block=>block.type==='text'?[block.text]:[]).join('');
  let parsed:unknown=null;
  try{parsed=JSON.parse(text)}catch{return jsonResponse({error:'Réponse de l’IA illisible. Réessayez.',code:'AI_INVALID'},502,origin)}
  const suggestions=validateSuggestions(parsed,operations,cats,subs);
  return jsonResponse({suggestions,model:response.model,usage:{input:response.usage.input_tokens,output:response.usage.output_tokens,cacheRead:response.usage.cache_read_input_tokens??0}},200,origin);
 }catch(error){
  if(error instanceof Error&&error.message==='AUTH_REQUIRED')return jsonResponse({error:'Session expirée. Reconnectez-vous.'},401,origin);
  if(error instanceof Anthropic.RateLimitError)return jsonResponse({error:'Trop de demandes à l’IA pour le moment. Réessayez dans une minute.',code:'AI_RATE_LIMITED'},429,origin);
  if(error instanceof Anthropic.APIError)return jsonResponse({error:'Service IA indisponible pour le moment.',code:'AI_UNAVAILABLE'},502,origin);
  console.error('ai-categorize',error instanceof Error?error.message:error);
  return jsonResponse({error:'Suggestions IA impossibles pour le moment.'},500,origin);
 }
});
