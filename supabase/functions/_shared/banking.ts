import {createClient} from 'npm:@supabase/supabase-js@2.97.0';

export const BRIDGE_BASE='https://api.bridgeapi.io';
export const BRIDGE_VERSION='2025-01-15';
const origins=new Set(['https://horizon-foyer.onrender.com','http://localhost:5173']);
export function corsHeaders(origin:string|null){return {'Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:'https://horizon-foyer.onrender.com','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}}
export function jsonResponse(payload:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(payload),{status,headers:{...corsHeaders(origin),'Content-Type':'application/json'}})}
export function getSupabaseKeys(){
 const url=Deno.env.get('SUPABASE_URL');const publishables=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');const secrets=Deno.env.get('SUPABASE_SECRET_KEYS');
 const publishable=publishables?JSON.parse(publishables).default:Deno.env.get('SUPABASE_ANON_KEY');const secret=secrets?JSON.parse(secrets).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!publishable||!secret)throw new Error('Supabase server configuration is incomplete');return {url,publishable,secret};
}
export async function requireUser(request:Request){
 const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))throw new Error('AUTH_REQUIRED');
 const {url,publishable,secret}=getSupabaseKeys();const userClient=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
 const {data,error}=await userClient.auth.getUser();if(error||!data.user)throw new Error('AUTH_REQUIRED');
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});return {user:data.user,userClient,admin};
}
export async function hasHouseholdAccess(admin:ReturnType<typeof createClient>,householdId:string,userId:string){
 const {data,error}=await admin.from('household_members').select('household_id').eq('household_id',householdId).eq('user_id',userId).maybeSingle();if(error)throw error;return Boolean(data);
}
export function bridgeCredentials(){const clientId=Deno.env.get('BRIDGE_CLIENT_ID'),clientSecret=Deno.env.get('BRIDGE_CLIENT_SECRET');if(!clientId||!clientSecret)throw new Error('BANK_PROVIDER_NOT_CONFIGURED');return {clientId,clientSecret}}
export async function bridgeRequest<T>(path:string,token:string,method='GET',body?:unknown):Promise<T>{
 const {clientId,clientSecret}=bridgeCredentials();const url=path.startsWith('https://')?new URL(path):new URL(path,BRIDGE_BASE);if(url.origin!==BRIDGE_BASE)throw new Error('BANK_PROVIDER_INVALID_URL');
 const response=await fetch(url,{method,headers:{'Bridge-Version':BRIDGE_VERSION,'Accept':'application/json','Content-Type':'application/json','Client-Id':clientId,'Client-Secret':clientSecret,...(token?{'Authorization':`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
 if(!response.ok)throw new Error(`BANK_PROVIDER_HTTP_${response.status}`);return await response.json() as T;
}
export async function getBridgeUserId(admin:ReturnType<typeof createClient>,userId:string,userEmail:string){
 const {data:known,error}=await admin.from('bank_provider_users').select('provider_user_id').eq('user_id',userId).eq('provider','bridge').maybeSingle();if(error)throw error;if(known?.provider_user_id)return known.provider_user_id;
 const created=await bridgeRequest<{uuid:string}>('/v3/aggregation/users','', 'POST',{external_user_id:userId,user_email:userEmail});
 const {error:insertError}=await admin.from('bank_provider_users').insert({user_id:userId,provider:'bridge',provider_user_id:created.uuid});if(insertError&&insertError.code!=='23505')throw insertError;
 if(insertError?.code==='23505'){const {data:race}=await admin.from('bank_provider_users').select('provider_user_id').eq('user_id',userId).single();if(race?.provider_user_id)return race.provider_user_id;throw insertError}
 return created.uuid;
}
export async function getBridgeAccessToken(providerUserId:string){const result=await bridgeRequest<{access_token:string}>('/v3/aggregation/authorization/token','', 'POST',{user_uuid:providerUserId});return result.access_token}
export async function requireHouseholdAccess(admin:ReturnType<typeof createClient>,householdId:string,userId:string){if(!/^[0-9a-f-]{36}$/i.test(householdId)||!await hasHouseholdAccess(admin,householdId,userId))throw new Error('HOUSEHOLD_ACCESS_DENIED')}
export async function corsPreflight(request:Request){if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(request.headers.get('Origin'))});return null}
