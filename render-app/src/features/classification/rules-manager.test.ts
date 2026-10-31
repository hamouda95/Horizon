import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import ClassificationReferenceManager from './ClassificationReferenceManager';

it('liste les règles avec actions par ligne, en lot et application aux opérations existantes',()=>{
 const html=renderToStaticMarkup(createElement(ClassificationReferenceManager,{householdId:'fixture',userId:'me',open:true,onChanged:async()=>{},
  categories:[{id:'food',name:'Courses',kind:'expense',active:true},{id:'fun',name:'Loisirs',kind:'expense',active:true}],
  subcategories:[{id:'super',name:'Supermarché',category_id:'food',active:true}],
  rules:[{merchant_key:'carrefour',merchant_label:'Carrefour',kind:'expense',category_id:'food',subcategory_id:'super',sample_count:1,flow_type:'standard'}],
  entries:[{id:'a',kind:'expense',label:'CB CARREFOUR MARKET',categoryId:'fun',flowType:'standard'}]}));
 expect(html).toContain('Carrefour');expect(html).toContain('Courses / Supermarché');
 expect(html).toContain('Supprimer toutes les règles');expect(html).toContain('Tout sélectionner');expect(html).toContain('Modifier');
 expect(html).toContain('1 opération existante ne suit pas les règles.');expect(html).toContain('Appliquer aux opérations existantes');
});
