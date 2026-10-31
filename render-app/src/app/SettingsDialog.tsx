import {displayText} from '../lib/text';
import {useState} from 'react';
import {Check, Monitor, Moon, Sun} from 'lucide-react';
import {supabase} from '../lib/client';

export type ThemePreference='light'|'dark'|'system';
export type LanguagePreference='fr'|'en'|'ar'|'tr'|'es'|'it'|'de';
const languages:{id:LanguagePreference;label:string;native:string;dir:'ltr'|'rtl'}[]=[
 {id:'fr',label:'Français',native:'Français',dir:'ltr'},
 {id:'en',label:'Anglais',native:'English',dir:'ltr'},
 {id:'ar',label:'Arabe',native:'العربية',dir:'rtl'},
 {id:'tr',label:'Turque',native:'Türkçe',dir:'ltr'},
 {id:'es',label:'Espagnol',native:'Español',dir:'ltr'},
 {id:'it',label:'Italien',native:'Italiano',dir:'ltr'},
 {id:'de',label:'Allemand',native:'Deutsch',dir:'ltr'},
];
export default function SettingsDialog({initialTheme,initialLanguage,onApply}:{initialTheme:ThemePreference;initialLanguage:LanguagePreference;onApply:(theme:ThemePreference,language:LanguagePreference)=>void}){
 const [theme,setTheme]=useState<ThemePreference>(initialTheme),[language,setLanguage]=useState<LanguagePreference>(initialLanguage),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const {error:saveError}=await supabase.auth.updateUser({data:{theme_preference:theme,language_preference:language}});if(saveError)throw saveError;try{localStorage.setItem('horizon.preferences',JSON.stringify({theme,language}))}catch{/* les préférences du compte restent enregistrées */}onApply(theme,language)}catch(caught){setError((caught as Error).message||'Impossible d’enregistrer vos préférences.')}finally{setBusy(false)}}
 return <form onSubmit={save}><span className="overline">Votre espace</span><h2>Préférences</h2><p>Adaptez Horizon à vos habitudes. Vos choix sont enregistrés sur votre compte.</p><fieldset className="settings-fieldset"><legend>Apparence</legend><div className="theme-options">{([{id:'light',label:'Clair',Icon:Sun},{id:'dark',label:'Sombre',Icon:Moon},{id:'system',label:'Système',Icon:Monitor}] as const).map(option=><button type="button" key={option.id} className={'theme-option '+(theme===option.id?'selected':'')} aria-pressed={theme===option.id} onClick={()=>setTheme(option.id)}><option.Icon size={18}/><span>{displayText(option.label)}</span>{theme===option.id&&<Check size={14}/>}</button>)}</div></fieldset><label>Langue préférée<select value={language} onChange={event=>setLanguage(event.target.value as LanguagePreference)}>{languages.map(item=><option key={item.id} value={item.id}>{displayText(item.label)} · {item.native}</option>)}</select></label><p className="field-help">La langue choisie s’applique aux formats de date, de nombre et au sens de lecture. Vous pouvez la modifier à tout moment.</p>{error&&<div className="error" role="alert">{displayText(error)}</div>}<button className="primary wide" disabled={busy}>{busy?'Enregistrement…':'Enregistrer mes préférences'}</button></form>;
}
