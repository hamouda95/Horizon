import {test} from 'vitest';
import {strict as assert} from 'node:assert';
import {filterEntriesByCategory} from './category-filter.ts';

const entries=[
 {id:'1',kind:'income' as const,category:'Salaire'},
 {id:'2',kind:'expense' as const,category:'Courses'},
 {id:'3',kind:'expense' as const,category:'Loyer'},
 {id:'4',kind:'expense' as const,category:'Courses'},
];

test('le détail catégorie conserve les revenus et filtre les autres dépenses',()=>{
 assert.deepEqual(filterEntriesByCategory(entries,'Courses'),[entries[0],entries[1],entries[3]]);
});

test('effacer le détail affiche de nouveau toutes les opérations',()=>{
 assert.equal(filterEntriesByCategory(entries,null),entries);
});
