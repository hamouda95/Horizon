import {describe,expect,it} from 'vitest';
import {createHouseholdClassifier} from './local-classifier';

describe('same merchant with conflicting household corrections',()=>{
 it('leaves Souk Al Charq unresolved when it has been a grocery and a restaurant',()=>{
  const classifier=createHouseholdClassifier(
   [{id:'courses',kind:'expense',active:true},{id:'loisirs',kind:'expense',active:true}],
   [
    {label:'CB SOUK AL CHARQ ANTONY',kind:'expense',categoryId:'courses'},
    {label:'CB SOUK AL CHARQ ANTONY',kind:'expense',categoryId:'loisirs'},
   ],
  );
  expect(classifier.isAmbiguous?.('CB SOUK AL CHARQ ANTONY','expense')).toBe(true);
  expect(classifier('CB SOUK AL CHARQ ANTONY','expense')).toBeNull();
 });
});
