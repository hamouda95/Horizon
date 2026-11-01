import {expect,it} from 'vitest';
import {donutSlices} from './CategoryDonut';

it('additionne par catégorie, trie et regroupe le reste au-delà de huit parts',()=>{
 const items=[{name:'Courses',amount:300},{name:'Courses',amount:200},{name:'Logement',amount:900},{name:'Vide',amount:0}];
 expect(donutSlices(items)).toEqual([{name:'Logement',amount:900},{name:'Courses',amount:500}]);
 const many=Array.from({length:10},(_,i)=>({name:'C'+i,amount:100-i}));
 const slices=donutSlices(many);
 expect(slices).toHaveLength(8);expect(slices[7]).toEqual({name:'Autres catégories',amount:93+92+91});
});
