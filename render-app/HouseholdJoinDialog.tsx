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
 return <form onSubmit={join}><span className="overline">REJOINDRE UN FOYER</span><h2>Votre place vous attend</h2><p>Collez ici le lien reçu d’un proche. Une invitation valide vous donnera accès au budget partagé du foyer.</p><label>Lien ou code d’invitation<div className="join-link-field"><Link2 size={17}/><input autoFocus required value={value} onChange={event=>setValue(event.target.value)} placeholder="https://…?invite=…" autoComplete="off"/></div></label>{error&&<div className="error" role="alert">{error}</div>}<p className="field-help">Le propriétaire du foyer peut créer une invitation depuis son menu de bienvenue. Chaque invitation expire après 7 jours.</p><button className="primary wide" disabled={busy||!value.trim()}>{busy?'Vérification…':'Rejoindre ce foyer'} <ArrowRight size={17}/></button></form>;
}
