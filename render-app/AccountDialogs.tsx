import type {Dispatch,FormEventHandler,SetStateAction} from 'react';

type Setter=Dispatch<SetStateAction<string>>;

export function SavingsDialog({saveSavings,savingsRate,setSavingsRate,saving}:{saveSavings:FormEventHandler<HTMLFormElement>;savingsRate:string;setSavingsRate:Setter;saving:boolean}){
 return <form onSubmit={saveSavings}><span className="overline">OBJECTIF DU FOYER</span><h2>Prévoir votre épargne</h2><p>Choisissez la part des revenus que vous souhaitez réserver. Le reste définit votre budget de dépenses. Cet objectif est indicatif et ne transfère pas d’argent.</p><label>Part des revenus à réserver (%)<input type="number" required min="0" max="100" step="0.01" value={savingsRate} onChange={e=>setSavingsRate(e.target.value)}/></label><p>Par exemple, avec 3 000 € et 20 %, l’objectif est de 600 € et le budget de dépenses est de 2 400 €.</p><button className="primary wide" disabled={saving}>{saving?'Enregistrement…':'Enregistrer mon objectif'}</button></form>;
}

export function ProfileDialog({saveProfile,profileFirst,setProfileFirst,profileLast,setProfileLast,profileBirth,setProfileBirth,profileBusy,email,today}:{saveProfile:FormEventHandler<HTMLFormElement>;profileFirst:string;setProfileFirst:Setter;profileLast:string;setProfileLast:Setter;profileBirth:string;setProfileBirth:Setter;profileBusy:boolean;email:string;today:string}){
 return <form onSubmit={saveProfile}><span className="overline">MON COMPTE</span><h2>Mes informations</h2><p>Modifiez votre nom et, si vous le souhaitez, votre date de naissance.</p><label>Prénom<input required maxLength={60} value={profileFirst} onChange={e=>setProfileFirst(e.target.value)}/></label><label>Nom<input maxLength={60} value={profileLast} onChange={e=>setProfileLast(e.target.value)}/></label><label>Date de naissance <span className="optional">(facultative)</span><input type="date" max={today} autoComplete="bday" value={profileBirth} onChange={e=>setProfileBirth(e.target.value)}/></label><label>Adresse e-mail<input value={email} readOnly aria-readonly="true"/></label><button className="primary wide" disabled={profileBusy}>{profileBusy?'Enregistrement…':'Enregistrer'}</button></form>;
}

export function HouseholdQrDialog({homeName,qrData}:{homeName:string|undefined;qrData:string}){
 return <div className="qr-panel"><span className="overline">MON FOYER</span><h2>QR code du foyer</h2><p>{homeName}</p>{qrData?<img src={qrData} width="200" height="200" alt="QR code contenant l’identifiant du foyer"/>:<p>Création du code…</p>}<p className="qr-note">Ce code contient l’identifiant du foyer. L’invitation et l’accès partagé ne sont pas encore disponibles.</p></div>;
}
