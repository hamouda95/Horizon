import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import QuickAdd from './QuickAdd';

it('affiche les quatre champs, sans catégorie imposée',()=>{
 const html=renderToStaticMarkup(createElement(QuickAdd,{categories:[{name:'Factures',kind:'expense',active:true},{name:'Courses',kind:'expense',active:true},{name:'Salaire',kind:'income',active:true}],suggest:()=>null,onSave:async()=>true,onMore:()=>{},onClose:()=>{}}));
 for(const text of ['Montant','Libellé','Catégorie','Date','Plus d’options'])expect(html).toContain(text);
 expect(html).toContain('<option value="" selected="">Choisir</option>');
 expect(html).not.toContain('Salaire');
});
