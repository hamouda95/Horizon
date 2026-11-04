import {expect,it} from 'vitest';
import {ariaSort,nextSort,sortRows} from './SortHeader';

it('un clic trie, un second clic inverse, une autre colonne repart de son sens naturel',()=>{
 expect(nextSort({key:'date',dir:'desc'},'date')).toEqual({key:'date',dir:'asc'});
 expect(nextSort({key:'date',dir:'asc'},'label')).toEqual({key:'label',dir:'asc'});
 expect(nextSort({key:'label',dir:'asc'},'amount','desc')).toEqual({key:'amount',dir:'desc'});
 expect(ariaSort({key:'date',dir:'desc'},'date')).toBe('descending');expect(ariaSort({key:'date',dir:'desc'},'label')).toBe('none');
});

it('trie les nombres par valeur, le texte sans tenir compte des accents, et met les vides à la fin',()=>{
 const rows=[{n:'Épicerie',v:12},{n:'courses',v:2},{n:'',v:null},{n:'Banque',v:100}];
 expect(sortRows(rows,{key:'n',dir:'asc'},(r,k)=>r[k as 'n']).map(r=>r.n)).toEqual(['Banque','courses','Épicerie','']);
 expect(sortRows(rows,{key:'v',dir:'desc'},(r,k)=>r[k as 'v']).map(r=>r.v)).toEqual([100,12,2,null]);
 expect(sortRows(rows,{key:'v',dir:'asc'},(r,k)=>r[k as 'v']).map(r=>r.v)).toEqual([2,12,100,null]);
});
