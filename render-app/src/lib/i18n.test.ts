import{it,expect,afterEach}from'vitest';import{translateUi,setUiLanguage}from'./i18n';import{uiMessages}from'./ui-messages';
afterEach(()=>setUiLanguage('fr'));
it('traduit les libellés et conserve les informations personnelles inconnues',()=>{setUiLanguage('en');expect(translateUi('Vue d’ensemble')).toBe('Overview');expect(translateUi('VIR INST personne exemple')).toBe('VIR INST personne exemple');setUiLanguage('ar');expect(translateUi('Budget')).toBe('الميزانية');expect(Object.values(uiMessages).every(m=>m.en&&m.ar)).toBe(true)});

it('adapte le symbole des libellés à la devise principale',async()=>{const {setAppCurrency}=await import('./currency');setAppCurrency('TND');try{expect(translateUi('Plafond mensuel (€)')).toBe('Plafond mensuel (DT)');setUiLanguage('en');expect(translateUi('Plafond mensuel (€)')).toContain('(DT)')}finally{setAppCurrency('EUR')}});
