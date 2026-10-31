import {displayText} from '../../lib/text';
import {appLocale} from '../../lib/locale';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {Copy,RefreshCw,Trash2,UserRoundPlus} from 'lucide-react';
import {supabase} from '../../lib/client';

type Member={user_id:string;email:string;role:string;joined_at:string};
type Invite={id:string;invited_email:string|null;created_at:string;expires_at:string;accepted_at:string|null};

export default function HouseholdSharingDialog({householdId,householdName,role}:{householdId:string;householdName:string;role:'owner'|'member'}){
 const [email,setEmail]=useState(''),[inviteUrl,setInviteUrl]=useState(''),[qr,setQr]=useState(''),[members,setMembers]=useState<Member[]>([]),[invites,setInvites]=useState<Invite[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function refresh(){
  if(role!=='owner')return;
  const [memberResult,inviteResult]=await Promise.all([
   supabase.rpc('list_household_members',{p_household_id:householdId}),
   supabase.from('household_invites').select('id,invited_email,created_at,expires_at,accepted_at').eq('household_id',householdId).order('created_at',{ascending:false})
  ]);
  if(memberResult.error)throw memberResult.error;
  if(inviteResult.error)throw inviteResult.error;
  setMembers(memberResult.data||[]);setInvites((inviteResult.data||[]) as Invite[]);
 }
 useEffect(()=>{void refresh().catch(e=>setError((e as Error).message||'Impossible de charger les invitations.'))},[householdId,role]);
 async function createInvite(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const {data,error:inviteError}=await supabase.rpc('create_household_invite',{p_household_id:householdId,p_invited_email:email.trim()||undefined});
   if(inviteError)throw inviteError;
   const result=Array.isArray(data)?data[0]:data;
   if(!result?.invite_token)throw Error('Le lien d’invitation n’a pas été créé.');
   const url=new URL(window.location.href);url.searchParams.set('invite',result.invite_token);
   const href=url.toString();setInviteUrl(href);setQr(await QRCode.toDataURL(href,{width:240,margin:2,errorCorrectionLevel:'M'}));
   setEmail('');setNotice('Lien créé. Il expire dans 7 jours.');await refresh();
  }catch(e){setError((e as Error).message||'Impossible de créer cette invitation.')}
  finally{setBusy(false)}
 }
 async function copyLink(){try{await navigator.clipboard.writeText(inviteUrl);setNotice('Lien copié.')}catch{setError('La copie automatique est indisponible. Sélectionnez le lien pour le copier.')}}
 async function revokeInvite(id:string){if(!window.confirm('Révoquer cette invitation ?'))return;setBusy(true);setError('');try{const {error:deleteError}=await supabase.from('household_invites').delete().eq('id',id);if(deleteError)throw deleteError;await refresh()}catch(e){setError((e as Error).message||'Impossible de révoquer cette invitation.')}finally{setBusy(false)}}
 async function removeMember(member:Member){if(!window.confirm(`Retirer ${member.email} du foyer ?`))return;setBusy(true);setError('');try{const {error:removeError}=await supabase.rpc('remove_household_member',{p_household_id:householdId,p_user_id:member.user_id});if(removeError)throw removeError;await refresh();setNotice('Accès retiré.')}catch(e){setError((e as Error).message||'Impossible de retirer ce membre.')}finally{setBusy(false)}}
 return <div className="sharing-dialog"><span className="overline">Partage du foyer</span><h2>Inviter un proche</h2><p>Ajoutez un adulte au budget « {householdName} ». Si cette personne possède déjà un foyer, il reste intact : elle pourra passer de l’un à l’autre avec l’icône du foyer.</p>{error&&<div className="error" role="alert">{displayText(error)}</div>}{notice&&<div className="sharing-notice" role="status">{displayText(notice)}</div>}{role!=='owner'?<div className="field-help">Seul le propriétaire du foyer peut créer des invitations ou gérer les accès.</div>:<><form onSubmit={createInvite}><label>Adresse e-mail <span className="optional">(facultative)</span><input type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Personne@exemple.fr"/></label><p className="field-help">Avec une adresse, seul ce compte peut accepter. Sans adresse, toute personne connectée qui reçoit le lien peut rejoindre ce foyer. L’acceptation ne fusionne pas les foyers existants.</p><button className="primary wide" disabled={busy}><UserRoundPlus size={17}/>{busy?'Création…':'Créer une invitation'}</button></form>{inviteUrl&&<section className="invite-result"><h3>Votre lien d’invitation</h3><p>Transmettez-le uniquement à la personne concernée. Il donne accès aux opérations et au budget du foyer.</p><div className="invite-link"><input aria-label="Lien d’invitation" readOnly value={inviteUrl}/><button className="secondary" type="button" onClick={()=>void copyLink()} aria-label="Copier le lien"><Copy size={16}/></button></div>{qr&&<img src={qr} width="200" height="200" alt="QR code du lien d’invitation"/>}</section>}<section className="sharing-list"><div className="sectionhead"><h3>Membres</h3><button className="textbtn" type="button" onClick={()=>void refresh().catch(e=>setError((e as Error).message))}><RefreshCw size={15}/> Actualiser</button></div>{members.map(member=><div className="sharing-row" key={member.user_id}><div><b>{member.email||'Compte Horizon'}</b><small>{member.role==='owner'?'Propriétaire':'Membre'} · depuis {new Date(member.joined_at).toLocaleDateString(appLocale())}</small></div>{member.role!=='owner'&&<button type="button" className="delete" disabled={busy} onClick={()=>void removeMember(member)} aria-label={displayText(`Retirer ${member.email}`)}><Trash2 size={16}/></button>}</div>)}</section><section className="sharing-list"><h3>Invitations</h3>{invites.length===0?<p>Aucune invitation en cours.</p>:invites.map(invite=><div className="sharing-row" key={invite.id}><div><b>{invite.invited_email||'Lien partageable'}</b><small>{invite.accepted_at?`Acceptée le ${new Date(invite.accepted_at).toLocaleDateString(appLocale())}`:`Expire le ${new Date(invite.expires_at).toLocaleDateString(appLocale())}`}</small></div>{!invite.accepted_at&&<button type="button" className="delete" disabled={busy} onClick={()=>void revokeInvite(invite.id)} aria-label="Révoquer l’invitation"><Trash2 size={16}/></button>}</div>)}</section></>}</div>;
}
