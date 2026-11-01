import {expect,it} from 'vitest';
import {alignTaxonomy,canonicalName,duplicateGroups,existingSynonym} from './category-synonyms';

it('reconnaît pluriels, accents, ponctuation et synonymes',()=>{
 expect(canonicalName('Péages')).toBe(canonicalName('Péage'));
 expect(canonicalName('Restaurants, bars, discothèques…')).toBe(canonicalName('Restaurant'));
 expect(canonicalName('Restaurants et livraison')).toBe(canonicalName('Resto'));
 expect(canonicalName('Loyers, Charges')).toBe(canonicalName('Loyer'));
 expect(canonicalName('Téléphonie (fixe et mobile)')).toBe(canonicalName('Téléphonie et internet'));
 expect(canonicalName('Électricité')).toBe(canonicalName('Énergie'));
 expect(canonicalName('Courses')).not.toBe(canonicalName('Cours'));
 expect(canonicalName('Transport')).not.toBe(canonicalName('Transfert'));
});

it('regroupe les doublons actifs, le plus utilisé en premier',()=>{
 const items=[{id:'a',name:'Péage',active:true},{id:'b',name:'Péages',active:true},{id:'c',name:'Parking',active:true},{id:'d',name:'Péages autoroute',active:false}];
 expect(duplicateGroups(items,id=>id==='b'?5:1).map(g=>g.map(i=>i.id))).toEqual([['b','a']]);
});

it('signale un nom qui existe déjà sous une autre forme',()=>{
 const items=[{id:'a',name:'Restaurants, bars, discothèques…',active:true}];
 expect(existingSynonym('restaurant',items)?.id).toBe('a');
 expect(existingSynonym('Cinéma',items)).toBeUndefined();
});

it('aligne le référentiel sur les catégories déjà présentes',()=>{
 const out=alignTaxonomy([{kind:'expense',name:'Voyages',subcategories:['Hébergement et séjours']},{kind:'expense',name:'Transport',subcategories:['Péages','Parking']}],
  [{id:'v',name:'Voyage',kind:'expense',active:true},{id:'t',name:'Transport',kind:'expense',active:true}],
  [{id:'p',name:'Péage',category_id:'t',active:true}]);
 expect(out).toEqual([{kind:'expense',name:'Voyage',subcategories:['Hébergement et séjours']},{kind:'expense',name:'Transport',subcategories:['Péage','Parking']}]);
});
