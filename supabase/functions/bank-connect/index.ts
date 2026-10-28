import {bridgeRequest,corsPreflight,getBridgeAccessToken,getBridgeUserId,jsonResponse,requireHouseholdAccess,requireUser} from '../_shared/banking.ts';

Deno.serve(async request=>{
 const preflight=await corsPreflight(request);if(preflight)return preflight;const origin=request.headers.get('Origin');
 if(request.method!=='POST')return jsonResponse({error:'Méthode non autorisée.'},405,origin);
 try{
  const {user,admin}=await requireUser(request);const input=await request.json();const householdId=String(input.householdId||'');const mode=input.mode==='manage'?'manage':'connect';
  await requireHouseholdAccess(admin,householdId,user.id);if(!user.email) return jsonResponse({error:'Une adresse e-mail vérifiée est nécessaire pour ouvrir la connexion bancaire.'},400,origin);
  const providerUserId=await getBridgeUserId(admin,user.id,user.email||'');const accessToken=await getBridgeAccessToken(providerUserId);
  const appUrl=Deno.env.get('BANK_APP_URL')||'https://horizon-foyer.onrender.com/';const callbackUrl=new URL(appUrl);callbackUrl.searchParams.set('bank','connected');
  const endpoint=mode==='manage'?'/v3/aggregation/user-management-sessions':'/v3/aggregation/connect-sessions';
  const body:Record<string,unknown>={user_email:user.email,callback_url:callbackUrl.toString()};if(mode==='connect')body.account_types='all';
  const session=await bridgeRequest<{url:string}>(endpoint,accessToken,'POST',body);return jsonResponse({url:session.url},200,origin);
 }catch(error){
  const message=error instanceof Error?error.message:'';if(message==='AUTH_REQUIRED')return jsonResponse({error:'Votre session a expiré. Reconnectez-vous puis réessayez.'},401,origin);
  if(message==='HOUSEHOLD_ACCESS_DENIED')return jsonResponse({error:'Vous n’avez pas accès à ce foyer.'},403,origin);
  if(message==='BANK_PROVIDER_NOT_CONFIGURED')return jsonResponse({error:'La connexion bancaire sera disponible dès que le fournisseur Bridge sera configuré pour l’application.'},503,origin);
  return jsonResponse({error:'Impossible de préparer la connexion bancaire. Réessayez dans quelques instants.'},502,origin);
 }
});
