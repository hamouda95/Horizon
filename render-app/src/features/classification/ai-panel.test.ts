import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import AiCategorizationPanel from './AiCategorizationPanel';
import type {Entry} from '../../hooks/household-data';

const base:Entry={id:'e1',kind:'expense',label:'CB MAGASIN',date:'2026-10-10',amount:1250,category:'Autres dépenses',categoryId:'other',frequency:'monthly',incomeAllocation:'calendar',flowType:'standard',expenseType:'one_off',personId:null,subcategoryId:null,bankTransactionId:null};
const render=(entries:Entry[])=>renderToStaticMarkup(createElement(AiCategorizationPanel,{householdId:'fixture',categories:[{id:'other',name:'Autres dépenses',kind:'expense',active:true},{id:'food',name:'Courses',kind:'expense',active:true}],subcategories:[],entries,onChanged:async()=>{}}));

it('compte les opérations à classer et propose de lancer les suggestions',()=>{
 const html=render([base,{...base,id:'e2',categoryId:'food',category:'Courses',flowType:'review'},{...base,id:'e3',categoryId:'food',category:'Courses'}]);
 expect(html).toContain('2 opérations à classer');expect(html).toContain('Proposer des catégories');
});

it('désactive le bouton quand tout est déjà classé',()=>{
 const html=render([{...base,categoryId:'food',category:'Courses'}]);
 expect(html).toContain('Aucune opération à classer.');expect(html).toMatch(/<button class="secondary" disabled="">Proposer des catégories/);
});
