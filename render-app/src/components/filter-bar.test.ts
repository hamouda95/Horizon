import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import FilterBar from './FilterBar';

it('affiche une recherche, le nombre de filtres actifs et une pastille retirable par filtre',()=>{
 const html=renderToStaticMarkup(createElement(FilterBar,{query:'',onQuery:()=>{},placeholder:'Rechercher',onChange:()=>{},onReset:()=>{},count:12,
  values:{period:'all',person:'p1',flow:''},
  fields:[{key:'period',label:'Période',type:'select',neutral:'month',options:[{value:'month',label:'Mois sélectionné'},{value:'all',label:'Tout l’historique'}]},{key:'person',label:'Personne',type:'select',options:[{value:'',label:'Tout le foyer'},{value:'p1',label:'Lynda'}]},{key:'flow',label:'Nature',type:'select',options:[{value:'',label:'Toutes'}]}]}));
 expect(html).toContain('placeholder="Rechercher"');
 expect(html).toContain('<b>2</b>');
 expect(html).toContain('Tout l’historique');expect(html).toContain('Lynda');
 expect(html).not.toContain('Toutes');
 expect(html).toContain('>12<');
});
