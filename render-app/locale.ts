const localeByLanguage:Record<string,string>={fr:'fr-FR',en:'en-GB',ar:'ar',tr:'tr-TR',es:'es-ES',it:'it-IT',de:'de-DE'};
export function appLocale(){
 if(typeof document!=='undefined')return localeByLanguage[document.documentElement.lang]||'fr-FR';
 return 'fr-FR';
}
