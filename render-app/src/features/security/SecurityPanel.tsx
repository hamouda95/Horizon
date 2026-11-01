import {useEffect,useState} from 'react';
import {KeyRound,LogOut,ShieldCheck,Smartphone} from 'lucide-react';
import {supabase} from '../../lib/client';
import {displayText} from '../../lib/text';
import {protections} from './protections';
import {verifiedTotp} from './mfa';

type Enrollment={factorId:string;qr:string;secret:string};

export default function SecurityPanel({email}:{email:string}){
 const [factors,setFactors]=useState<{id:string}[]|null>(null),[enrollment,setEnrollment]=useState<Enrollment|null>(null),[code,setCode]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const refresh=()=>verifiedTotp().then(setFactors).catch(()=>setFactors([]));
 useEffect(()=>{void refresh()},[]);
 const run=(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');void fn().catch(err=>setError((err as Error).message||'La demande n’a pas abouti.')).finally(()=>setBusy(false))};

 const startEnrollment=()=>run(async()=>{
  // An unfinished earlier attempt would block a new one: remove it first.
  const {data:list}=await supabase.auth.mfa.listFactors();
  for(const f of list?.all.filter(f=>f.status==='unverified')||[])await supabase.auth.mfa.unenroll({factorId:f.id});
  const {data,error:enrollError}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:`Horizon ${new Date().toISOString().slice(0,10)}`});
  if(enrollError)throw enrollError;
  setEnrollment({factorId:data.id,qr:data.totp.qr_code,secret:data.totp.secret});setCode('');
 });
 const confirmEnrollment=()=>run(async()=>{
  if(!enrollment)return;
  const {error:verifyError}=await supabase.auth.mfa.challengeAndVerify({factorId:enrollment.factorId,code:code.replace(/\s/g,'')});
  if(verifyError)throw Error('Code incorrect ou expiré. Saisissez le code affiché maintenant dans votre application.');
  setEnrollment(null);setCode('');await refresh();setNotice('Double authentification activée. Le code vous sera demandé à chaque nouvelle connexion.');
 });
 const disable=()=>run(async()=>{
  if(!factors?.length||!window.confirm('Désactiver la double authentification ? Votre compte ne sera plus protégé que par votre mot de passe.'))return;
  for(const f of factors){const {error:unenrollError}=await supabase.auth.mfa.unenroll({factorId:f.id});if(unenrollError)throw unenrollError}
  await refresh();setNotice('Double authentification désactivée.');
 });
 const sendPasswordLink=()=>run(async()=>{
  const {error:resetError}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/`});
  if(resetError)throw resetError;setNotice(`Un lien pour choisir un nouveau mot de passe a été envoyé à ${email}.`);
 });
 const signOutEverywhere=()=>run(async()=>{
  if(!window.confirm('Déconnecter Horizon sur tous vos appareils, y compris celui-ci ?'))return;
  const {error:signOutError}=await supabase.auth.signOut({scope:'global'});if(signOutError)throw signOutError;
 });

 const enabled=Boolean(factors?.length);
 return <div className="security-panel"><span className="overline">Votre compte</span><h2>Sécurité</h2><p>Protégez l’accès à votre budget et voyez comment vos données sont protégées.</p>
  <section className="security-block"><div className="security-head"><Smartphone size={18}/><div><b>Double authentification</b><small className={enabled?'security-on':''}>{factors===null?'Vérification…':enabled?'Activée':'Désactivée'}</small></div></div>
   <p className="field-help">En plus du mot de passe, un code à 6 chiffres généré par une application d’authentification (Google Authenticator, Microsoft Authenticator, 1Password…) est demandé à chaque connexion.</p>
   {enrollment?<div className="security-enroll"><ol><li>Scannez ce QR code avec votre application d’authentification.</li><li>Saisissez le code à 6 chiffres qu’elle affiche.</li></ol><img src={enrollment.qr} alt={displayText('QR code de la double authentification')} width={168} height={168}/><small>Ou saisissez cette clé : <code data-i18n-skip>{enrollment.secret}</code></small><label>Code de vérification<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} value={code} onChange={e=>setCode(e.target.value)} placeholder="123456"/></label><div className="security-actions"><button type="button" className="primary" disabled={busy||code.replace(/\s/g,'').length!==6} onClick={confirmEnrollment}>Activer</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setEnrollment(null);setCode('')}}>Annuler</button></div></div>
    :<div className="security-actions">{enabled?<button type="button" className="secondary" disabled={busy} onClick={disable}>Désactiver</button>:<button type="button" className="primary" disabled={busy||factors===null} onClick={startEnrollment}>Activer la double authentification</button>}</div>}
  </section>
  <section className="security-block"><div className="security-head"><KeyRound size={18}/><div><b>Mot de passe</b><small>Lien sécurisé envoyé par e-mail</small></div></div><div className="security-actions"><button type="button" className="secondary" disabled={busy} onClick={sendPasswordLink}>Changer mon mot de passe</button></div></section>
  <section className="security-block"><div className="security-head"><LogOut size={18}/><div><b>Appareils connectés</b><small>Téléphone perdu, ordinateur partagé…</small></div></div><div className="security-actions"><button type="button" className="secondary" disabled={busy} onClick={signOutEverywhere}>Déconnecter tous mes appareils</button></div></section>
  {notice&&<div className="authnotice" role="status">{displayText(notice)}</div>}{error&&<div className="error" role="alert">{displayText(error)}</div>}
  <section className="security-block"><div className="security-head"><ShieldCheck size={18}/><div><b>Comment vos données sont protégées</b></div></div><ul className="security-list">{protections.map(p=><li key={p.title}><b>{p.title}</b> {p.text}</li>)}</ul></section>
 </div>;
}
