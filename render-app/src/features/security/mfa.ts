// Two-step sign-in with an authenticator app (TOTP), on top of Supabase Auth MFA.
import {supabase} from '../../lib/client';

/** True when the account has a verified authenticator but this session has not passed it yet. */
export async function needsSecondStep(){
 const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error||!data)return false;
 return data.nextLevel==='aal2'&&data.currentLevel!=='aal2';
}

export async function verifiedTotp(){
 const {data,error}=await supabase.auth.mfa.listFactors();
 if(error)throw error;
 return data.totp.filter(f=>f.status==='verified');
}

export async function verifyCode(factorId:string,code:string){
 const {data:challenge,error}=await supabase.auth.mfa.challenge({factorId});
 if(error)throw error;
 const {error:verifyError}=await supabase.auth.mfa.verify({factorId,challengeId:challenge.id,code:code.replace(/\s/g,'')});
 if(verifyError)throw Error(/invalid|expired/i.test(verifyError.message)?'Code incorrect ou expiré. Saisissez le code affiché maintenant dans votre application.':verifyError.message);
}
