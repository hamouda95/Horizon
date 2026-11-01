// Search over categories and subcategories as one list: "resto" finds "Loisirs › Restaurants",
// a category name brings its subcategories, synonyms ("péages", "autoroute") meet the same entry.
import {canonicalName} from '../features/categories/category-synonyms';

export type PickerCategory={id:string;name:string;active:boolean};
export type PickerSubcategory={id:string;name:string;category_id:string;active:boolean};
export type PickerOption={categoryId:string;subcategoryId:string|null;category:string;sub:string|null};

const fold=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/** Every category followed by its active subcategories, in the household order. */
export function pickerOptions(categories:PickerCategory[],subcategories:PickerSubcategory[],keep:{categoryId?:string|null;subcategoryId?:string|null}={}):PickerOption[]{
 const out:PickerOption[]=[];
 for(const c of categories.filter(c=>c.active||c.id===keep.categoryId)){
  out.push({categoryId:c.id,subcategoryId:null,category:c.name,sub:null});
  for(const s of subcategories.filter(s=>s.category_id===c.id&&(s.active||s.id===keep.subcategoryId)))out.push({categoryId:c.id,subcategoryId:s.id,category:c.name,sub:s.name});
 }
 return out;
}

/** Options matching the text, best matches first: name start, word start, then anywhere or synonym. */
export function searchOptions(options:PickerOption[],query:string):PickerOption[]{
 const q=fold(query);if(!q)return options;
 const synonym=canonicalName(query);
 const score=(o:PickerOption)=>{const own=fold(o.sub??o.category),parent=fold(o.category);
  if(own.startsWith(q))return 0;
  if(own.split(' ').some(w=>w.startsWith(q)))return 1;
  if(own.includes(q))return 2;
  if(synonym&&canonicalName(o.sub??o.category)===synonym)return 2;
  if(o.sub&&(parent.startsWith(q)||parent.split(' ').some(w=>w.startsWith(q))))return 3;
  return -1};
 return options.map((o,i)=>({o,i,s:score(o)})).filter(x=>x.s>=0).sort((a,b)=>a.s-b.s||a.i-b.i).map(x=>x.o);
}

export const optionText=(o:Pick<PickerOption,'category'|'sub'>)=>o.sub?`${o.category} › ${o.sub}`:o.category;
