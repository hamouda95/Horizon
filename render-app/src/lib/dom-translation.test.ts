import {afterEach,expect,it} from 'vitest';
import {translateDisplayed} from './dom-translation';
import {setUiLanguage} from './i18n';
import {uiMessages} from './ui-messages';
afterEach(()=>setUiLanguage('fr'));

it('traduit un texte connu en gardant ses espaces et laisse le reste tel quel',()=>{
 expect(translateDisplayed(' Budget ','en')).toBe(' Budget ');
 expect(translateDisplayed('Vue d’ensemble','en')).toBe('Overview');
 expect(translateDisplayed('VIR INST DUPONT','en')).toBe('VIR INST DUPONT');
 expect(translateDisplayed('Vue d’ensemble','fr')).toBe('Vue d’ensemble');
});

it('traduit un message composé à partir de son modèle',()=>{
 const key=Object.keys(uiMessages).find(k=>/^[^{]{4,}\{0\}$/.test(k))!;
 const sample=key.replace('{0}','42');
 expect(translateDisplayed(sample,'en')).toBe(uiMessages[key].en.replace('{0}','42'));
});

it('traduit les listes, les précisions entre parenthèses et le libellé devant un montant',()=>{
 expect(translateDisplayed('Courses · Logement','en')).toBe('Groceries · Housing');
 expect(translateDisplayed('Logement (Courses, 12)','en')).toBe('Housing (Groceries, 12)');
 expect(translateDisplayed('Somme des enveloppes \u200f2.280,00 €','en')).toBe(uiMessages['Somme des enveloppes'].en+' \u200f2.280,00 €');
 expect(translateDisplayed('Carte 29/10 BOULANGERIE','en')).toBe('Card 29/10 BOULANGERIE');
});
