import {uiLanguage} from './i18n';
const localeByLanguage:Record<string,string>={fr:'fr-FR',en:'en-GB',ar:'ar-TN'};
export function appLocale(){return localeByLanguage[uiLanguage()]||'fr-FR'}
