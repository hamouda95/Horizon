import {expect,it} from 'vitest';
import {pickerOptions,searchOptions,optionText} from './category-search';

const categories=[{id:'loisirs',name:'Loisirs',active:true},{id:'transport',name:'Transport',active:true},{id:'old',name:'Voyages',active:false}];
const subs=[{id:'resto',name:'Restaurants et livraison',category_id:'loisirs',active:true},{id:'sport',name:'Sport et fitness',category_id:'loisirs',active:true},{id:'peage',name:'Péage',category_id:'transport',active:true},{id:'gone',name:'Taxi',category_id:'transport',active:false}];
const options=pickerOptions(categories,subs);
const texts=(q:string)=>searchOptions(options,q).map(optionText);

it('liste les catégories actives suivies de leurs sous-catégories actives',()=>{
 expect(options.map(optionText)).toEqual(['Loisirs','Loisirs › Restaurants et livraison','Loisirs › Sport et fitness','Transport','Transport › Péage']);
 expect(pickerOptions(categories,subs,{categoryId:'old'}).map(optionText)).toContain('Voyages');
});

it('trouve une sous-catégorie par début de mot, sans accents, ou par synonyme',()=>{
 expect(texts('resto')[0]).toBe('Loisirs › Restaurants et livraison');
 expect(texts('peage')).toEqual(['Transport › Péage']);
 expect(texts('péages')).toEqual(['Transport › Péage']);
 expect(texts('fit')).toEqual(['Loisirs › Sport et fitness']);
});

it('un nom de catégorie remonte la catégorie puis ses sous-catégories',()=>{
 expect(texts('loisi')).toEqual(['Loisirs','Loisirs › Restaurants et livraison','Loisirs › Sport et fitness']);
 expect(texts('zzz')).toEqual([]);
});
