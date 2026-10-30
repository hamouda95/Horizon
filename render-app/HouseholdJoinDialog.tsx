import {displayText} from './text';
import {useState} from 'react';
import {ArrowRight, Link2} from 'lucide-react';
import {supabase} from './client';

export default function HouseholdJoinDialog({onJoined}:{onJoined:(householdId:string,name:string)=>Promise<void>}){
 const [value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function join(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');
  try{
   let token=value.trim();
   if(token.includes('://')){const url=new URL(token);token=url.searchParams.get('invite')||''}
   token=token.replace(/^invite\s*[:=]\s*/i,'').trim();
   if(!/^[0-9a-f]{64}$/i.test(token))throw Error('Collez le lien d’invitation complet ou son code valide.');
   const {data,error:joinError}=await supabase.rpc('accept_household_invite',{p_token:token});
   if(joinError)throw joinError;
   const result=Array.isArray(data)?data[0]:data;
   if(!result?.household_id)throw Error('Cette invitation n’est pas valide ou a expiré. Demandez un nouveau lien au propriétaire du foyer.');
   await onJoined(result.household_id,result.household_name);
  }catch(caught){setError((caught as Error).message||'Impossible de rejoindre ce foyer. Vérifiez le lien et réessayez.')}finally{setBusy(false)}
 }
 return <form onSubmit={join}><span className="overline">Rejoindre un foyer</span><h2>Votre place vous attend</h2><p>Collez le lien reçu d’un proche pour accéder à son budget partagé. Votre foyer actuel reste inchangé ; vous pourrez choisir entre les foyers depuis l’icône du foyer.</p><label>Lien ou code d’invitation<div className="join-link-field"><Link2 size={17}/><input autoFocus required value={value} onChange={event=>setValue(event.target.value)} placeholder="Https://…?invite=…" autoComplete="off"/></div></label>{error&&<div className="error" role="alert">{displayText(error)}</div>}<p className="field-help">Une invitation est personnelle si l’expéditeur a indiqué votre adresse. Chaque lien expire après 7 jours.</p><button className="primary wide" disabled={busy||!value.trim()}>{busy?'Vérification…':'Rejoindre ce foyer'} <ArrowRight size={17}/></button></form>;
}
