import {displayText,plural} from '../../lib/text';
import {useMemo,useState} from 'react';
import {Archive,RotateCcw,Plus,Pencil,Check,X,ChevronDown,ChevronRight,ArrowUp,ArrowDown,Merge,Search} from 'lucide-react';
import {supabase} from '../../lib/client';
import type {Entry} from '../../hooks/household-data';
import {runInBatches} from '../operations/bulk';
import {canonicalName,duplicateGroups,existingSynonym} from './category-synonyms';
import {moveInOrder} from './category-order';
type Category={id:string;name:string;kind:string;active:boolean;sort_order?:number|null};
type Subcategory={id:string;name:string;category_id:string;active:boolean;sort_order?:number|null};
const readCollapsed=(key:string)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(v)?new Set<string>(v):null}catch{return null}};

/** Categories in the household's order (most important first), foldable, reorderable, with duplicates merged through a synonym referential. */
export default function CategoryManager({householdId,categories,subcategories,entries=[],onRefresh}:{householdId:string;categories:Category[];subcategories:Subcategory[];entries?:Entry[];onRefresh:()=>Promise<void>}){
 const [kind,setKind]=useState<'expense'|'income'>('expense'),[newName,setNewName]=useState(''),[subParent,setSubParent]=useState<string|null>(null),[subName,setSubName]=useState(''),[edit,setEdit]=useState<{type:'categories'|'subcategories';id:string;name:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState('');
 const storageKey=`horizon.categories.open.${householdId}`;
 // Folded by default: only the categories the user opened stay open.
 const [open,setOpen]=useState<Set<string>>(()=>readCollapsed(storageKey)||new Set());
 const saveOpen=(next:Set<string>)=>{setOpen(next);try{localStorage.setItem(storageKey,JSON.stringify([...next]))}catch{/* préférence facultative */}};
 const usage=useMemo(()=>{const m=new Map<string,number>();for(const e of entries){m.set(e.categoryId,(m.get(e.categoryId)||0)+1);if(e.subcategoryId)m.set(e.subcategoryId,(m.get(e.subcategoryId)||0)+1)}return m},[entries]);
 const count=(id:string)=>usage.get(id)||0;

 async function action(fn:()=>Promise<void>,message:string){if(busy)return false;setError('');setNotice('');setBusy(true);try{await fn();await onRefresh();setNotice(message);return true}catch(e){const err=e as {code?:string;message?:string};setError(err.code==='23505'?'Ce nom existe déjà dans cette catégorie.':err.message||'Impossible de terminer cette action.');return false}finally{setBusy(false)}}
 function synonymError(name:string,among:{id:string;name:string;active:boolean}[],selfId?:string){const twin=existingSynonym(name,among.filter(x=>x.id!==selfId));if(twin){setError(`« ${name} » existe déjà sous le nom « ${twin.name} ». Utilisez-le, ou renommez-le.`);return true}return false}
 // A subcategory already filed under another category of the same kind would split the same spending in two.
 function elsewhereError(name:string,c:Category){const twin=existingSynonym(name,subcategories.filter(s=>s.category_id!==c.id&&categories.some(x=>x.id===s.category_id&&x.active&&x.kind===c.kind)));if(twin){setError(`« ${name} » existe déjà dans « ${categories.find(x=>x.id===twin.category_id)?.name} » (${twin.name}). Utilisez-la, ou fusionnez les deux.`);return true}return false}
 async function createCategory(e:React.FormEvent){e.preventDefault();const name=newName.trim();if(!name||synonymError(name,categories.filter(c=>c.kind===kind)))return;const ok=await action(async()=>{const {error}=await supabase.from('categories').insert({household_id:householdId,name,kind});if(error)throw error},'Catégorie ajoutée.');if(ok)setNewName('')}
 async function createSub(e:React.FormEvent,c:Category){e.preventDefault();const name=subName.trim();if(!name||synonymError(name,subcategories.filter(s=>s.category_id===c.id))||elsewhereError(name,c))return;const ok=await action(async()=>{const {error}=await supabase.from('subcategories').insert({household_id:householdId,category_id:c.id,kind:c.kind,name});if(error)throw error},'Sous-catégorie ajoutée.');if(ok){setSubName('');setSubParent(null)}}
 async function update(table:'categories'|'subcategories',id:string,values:{name?:string;active?:boolean}){
  if(values.name){const self=table==='categories'?categories.find(c=>c.id===id):subcategories.find(s=>s.id===id);const among=table==='categories'?categories.filter(c=>c.kind===kind):subcategories.filter(s=>s.category_id===(self as Subcategory|undefined)?.category_id);if(synonymError(values.name,among,id))return}
  const ok=await action(async()=>{const {data,error}=await supabase.from(table).update(values).eq('household_id',householdId).eq('id',id).select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('Modification impossible : élément introuvable ou droits insuffisants.')},values.name?'Nom modifié.':values.active?'Élément réactivé.':'Élément archivé.');if(ok)setEdit(null)}

 async function saveOrder(table:'categories'|'subcategories',changes:Array<{id:string;sort_order:number|null}>,message:string){
  if(!changes.length)return;
  await action(async()=>{for(const c of changes){const {error}=await supabase.from(table).update({sort_order:c.sort_order}).eq('household_id',householdId).eq('id',c.id);if(error)throw error.code==='42703'?Error('Le classement personnalisé demande une mise à jour de la base de données qui n’est pas encore installée.'):error}},message);
 }
 const bulk=(action:'category',value:string)=>async(batch:string[])=>{const {data,error}=await supabase.rpc('bulk_manage_entries',{p_household_id:householdId,p_entry_ids:batch,p_action:action,p_value:value});if(error)throw error;return data??batch.length};
 async function setSub(ids:string[],subId:string){for(let i=0;i<ids.length;i+=200){const {error}=await supabase.from('entries').update({subcategory_id:subId}).eq('household_id',householdId).in('id',ids.slice(i,i+200));if(error)throw error}}
 async function mergeSub(target:Subcategory,source:Subcategory){
  const ids=entries.filter(e=>e.subcategoryId===source.id).map(e=>e.id);
  if(!window.confirm(`Fusionner « ${source.name} » dans « ${target.name} » ? ${plural(ids.length,'opération sera déplacée','opérations seront déplacées')}, puis « ${source.name} » sera archivée.`))return;
  await action(async()=>{
   if(target.category_id!==source.category_id){const r=await runInBatches(ids,bulk('category',target.category_id));if(r.error)throw r.error}
   await setSub(ids,target.id);
   const {error}=await supabase.from('household_merchant_rules').update({category_id:target.category_id,subcategory_id:target.id}).eq('household_id',householdId).eq('subcategory_id',source.id);if(error)throw error;
   const {error:archiveError}=await supabase.from('subcategories').update({active:false}).eq('household_id',householdId).eq('id',source.id);if(archiveError)throw archiveError;
  },`« ${source.name} » fusionnée dans « ${target.name} ».`);
 }
 async function mergeCategory(target:Category,source:Category){
  const moved=entries.filter(e=>e.categoryId===source.id),targetSubs=subcategories.filter(s=>s.category_id===target.id&&s.active);
  if(!window.confirm(`Fusionner la catégorie « ${source.name} » dans « ${target.name} » ? ${plural(moved.length,'opération sera déplacée','opérations seront déplacées')} (avec leur sous-catégorie quand elle existe aussi dans « ${target.name} »), puis « ${source.name} » sera archivée.`))return;
  await action(async()=>{
   const r=await runInBatches(moved.map(e=>e.id),bulk('category',target.id));if(r.error)throw r.error;
   // Subcategories with an equivalent in the target keep it; the others are cleared by the move.
   for(const sub of subcategories.filter(s=>s.category_id===source.id)){const twin=targetSubs.find(t=>canonicalName(t.name)===canonicalName(sub.name));if(twin)await setSub(moved.filter(e=>e.subcategoryId===sub.id).map(e=>e.id),twin.id)}
   const {error}=await supabase.from('household_merchant_rules').update({category_id:target.id,subcategory_id:null}).eq('household_id',householdId).eq('category_id',source.id);if(error)throw error;
   const {error:archiveError}=await supabase.from('categories').update({active:false}).eq('household_id',householdId).eq('id',source.id);if(archiveError)throw archiveError;
  },`Catégorie « ${source.name} » fusionnée dans « ${target.name} ».`);
 }

 // Categories arrive already ordered (household order, then importance); archived ones last.
 const q=search.trim()?canonicalName(search):'',fq=search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const hit=(name:string)=>Boolean(fq)&&(name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(fq)||(q!==''&&canonicalName(name)===q));
 const allOfKind=categories.filter(x=>x.kind===kind);
 const list=fq?allOfKind.filter(c=>hit(c.name)||subcategories.some(s=>s.category_id===c.id&&hit(s.name))):allOfKind;
 const activeList=allOfKind.filter(c=>c.active);
 const subsOf=(id:string)=>subcategories.filter(x=>x.category_id===id&&(!fq||hit(x.name)||hit(categories.find(c=>c.id===id)?.name||'')));
 const categoryDuplicates=duplicateGroups(activeList,count);
 const subDuplicates=duplicateGroups(subcategories.filter(s=>activeList.some(c=>c.id===s.category_id)),count);
 const where=(s:Subcategory)=>categories.find(c=>c.id===s.category_id)?.name||'';

 function editor(type:'categories'|'subcategories',item:{id:string;name:string}){return edit?.type===type&&edit.id===item.id?<form className="taxonomy-edit" onSubmit={e=>{e.preventDefault();const n=edit.name.trim();if(n)void update(type,item.id,{name:n})}}><input aria-label="Nouveau nom" autoFocus required maxLength={60} value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/><button className="icon-action" aria-label="Enregistrer le nom" disabled={busy}><Check size={16}/></button><button type="button" className="icon-action" aria-label="Annuler" onClick={()=>setEdit(null)}><X size={16}/></button></form>:<><span>{displayText(item.name)}</span><button type="button" className="icon-action" aria-label={displayText('Renommer '+item.name)} title="Renommer" disabled={busy} onClick={()=>setEdit({type,id:item.id,name:item.name})}><Pencil size={15}/></button></>}
 const mover=(table:'categories'|'subcategories',siblings:{id:string}[],id:string,name:string)=><><button type="button" className="icon-action" aria-label={displayText('Monter '+name)} title="Monter" disabled={busy||siblings[0]?.id===id} onClick={()=>void saveOrder(table,moveInOrder(siblings,id,-1),'Ordre enregistré.')}><ArrowUp size={15}/></button><button type="button" className="icon-action" aria-label={displayText('Descendre '+name)} title="Descendre" disabled={busy||siblings.at(-1)?.id===id} onClick={()=>void saveOrder(table,moveInOrder(siblings,id,1),'Ordre enregistré.')}><ArrowDown size={15}/></button></>;

 return <div className="taxonomy"><div className="taxonomy-tabs" role="group" aria-label="Type de catégorie"><button type="button" aria-pressed={kind==='expense'} className={kind==='expense'?'selected':''} onClick={()=>{setKind('expense');setSubParent(null);setEdit(null)}}>Sorties courantes</button><button type="button" aria-pressed={kind==='income'} className={kind==='income'?'selected':''} onClick={()=>{setKind('income');setSubParent(null);setEdit(null)}}>Entrées courantes</button></div>
  <form className="taxonomy-create" onSubmit={createCategory}><label className="sr-only" htmlFor="new-category">Nom de la catégorie</label><input id="new-category" value={newName} onChange={e=>setNewName(e.target.value)} required maxLength={60} placeholder={displayText(kind==='expense'?'Ex. Maison, Loisirs…':'Ex. Salaire, Primes…')}/><button className="primary" disabled={busy||!newName.trim()}><Plus size={16}/> Ajouter une catégorie</button></form>
  {error&&<div className="error" role="alert">{displayText(error)}</div>}{notice&&<div className="notice" role="status">{displayText(notice)}</div>}
  {(categoryDuplicates.length>0||subDuplicates.length>0)&&<details className="card taxonomy-duplicates"><summary><Merge size={16}/> {plural(categoryDuplicates.length+subDuplicates.length,'doublon probable à fusionner','doublons probables à fusionner')}</summary><ul>
   {categoryDuplicates.map(group=><li key={group[0].id}><b>{group.map(c=>displayText(c.name)).join(' · ')}</b>{group.slice(1).map(source=><button key={source.id} type="button" className="secondary" disabled={busy} onClick={()=>void mergeCategory(group[0],source)}>Fusionner « {displayText(source.name)} » dans « {displayText(group[0].name)} »</button>)}</li>)}
   {subDuplicates.map(group=><li key={group[0].id}><b>{group.map(s=>`${displayText(s.name)} (${displayText(where(s))}, ${count(s.id)})`).join(' · ')}</b>{group.slice(1).map(source=><button key={source.id} type="button" className="secondary" disabled={busy} onClick={()=>void mergeSub(group[0],source)}>Fusionner « {displayText(source.name)} » ({displayText(where(source))}) dans « {displayText(group[0].name)} » ({displayText(where(group[0]))})</button>)}</li>)}
  </ul></details>}
  <div className="taxonomy-toolbar"><label className="filter-search taxonomy-search"><Search size={15} aria-hidden="true"/><span className="sr-only">Rechercher une catégorie</span><input type="search" placeholder="Rechercher une catégorie ou sous-catégorie" value={search} onChange={e=>setSearch(e.target.value)}/></label><button type="button" className="textbtn" onClick={()=>saveOpen(new Set(list.map(c=>c.id)))}>Tout déplier</button><button type="button" className="textbtn" onClick={()=>saveOpen(new Set())}>Tout replier</button><button type="button" className="textbtn" disabled={busy||!list.some(c=>c.sort_order!=null)} onClick={()=>void saveOrder('categories',list.map(c=>({id:c.id,sort_order:null})),'Ordre par importance rétabli.')}>Revenir à l’ordre par importance</button></div>
  {list.length===0?<div className="card taxonomy-empty">{fq?'Aucune catégorie ne correspond.':'Aucune catégorie pour le moment.'}</div>:<div className="taxonomy-list">{list.map(c=>{const children=subsOf(c.id),activeChildren=children.filter(s=>s.active),isOpen=open.has(c.id)||(Boolean(fq)&&subsOf(c.id).length>0);return <section className={'card taxonomy-card '+(!c.active?'is-archived':'')} key={c.id}><div className="taxonomy-title">
   <button type="button" className="taxonomy-toggle" aria-expanded={isOpen} aria-label={displayText((isOpen?'Replier ':'Déplier ')+c.name)} onClick={()=>{const next=new Set(open);isOpen?next.delete(c.id):next.add(c.id);saveOpen(next)}}>{isOpen?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
   <div className="taxonomy-name">{editor('categories',c)}{!c.active&&<span className="archived-badge">Archivée</span>}<small className="taxonomy-count">{plural(children.length,'sous-catégorie','sous-catégories')} · {plural(count(c.id),'opération','opérations')}</small></div>
   <div className="taxonomy-actions">{c.active&&mover('categories',activeList,c.id,c.name)}<button type="button" className="textbtn" disabled={busy||!c.active} onClick={()=>{setSubParent(subParent===c.id?null:c.id);setSubName('');if(!isOpen)saveOpen(new Set([...open,c.id]))}}><Plus size={15}/> Sous-catégorie</button><button type="button" className="icon-action" aria-label={displayText((c.active?'Archiver ':'Réactiver ')+c.name)} title={displayText(c.active?'Archiver':'Réactiver')} disabled={busy} onClick={()=>void update('categories',c.id,{active:!c.active})}>{c.active?<Archive size={16}/>:<RotateCcw size={16}/>}</button></div></div>
   {isOpen&&children.length>0&&<ul className="taxonomy-subs">{children.map(sub=><li key={sub.id}><div className="taxonomy-sub-name">{editor('subcategories',sub)}{!sub.active&&<span className="archived-badge">Archivée</span>}<small className="taxonomy-count">{count(sub.id)}</small></div><div className="taxonomy-actions">{sub.active&&mover('subcategories',activeChildren,sub.id,sub.name)}<button type="button" className="icon-action" aria-label={displayText((sub.active?'Archiver ':'Réactiver ')+sub.name)} title={displayText(sub.active?'Archiver':'Réactiver')} disabled={busy} onClick={()=>void update('subcategories',sub.id,{active:!sub.active})}>{sub.active?<Archive size={15}/>:<RotateCcw size={15}/>}</button></div></li>)}</ul>}
   {subParent===c.id&&c.active&&<form className="taxonomy-sub-create" onSubmit={e=>createSub(e,c)}><input autoFocus aria-label={displayText('Nouvelle sous-catégorie de '+c.name)} required maxLength={60} placeholder="Nom de la sous-catégorie" value={subName} onChange={e=>setSubName(e.target.value)}/><button className="secondary" disabled={busy||!subName.trim()}>Ajouter</button><button type="button" className="icon-action" aria-label="Annuler" onClick={()=>setSubParent(null)}><X size={16}/></button></form>}
  </section>})}</div>}</div>;
}
