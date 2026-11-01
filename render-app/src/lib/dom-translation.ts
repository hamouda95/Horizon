// Translates whatever interface text reaches the screen, whatever built it: JSX, data files, messages
// composed with values ("Reste 12 €" from the key "Reste {0}"). The page keeps writing French; this
// layer swaps the displayed text and puts the French back when the language returns to French.
// Form values and anything inside [data-i18n-skip] are never touched.
import {uiMessages} from './ui-messages';
import {uiLanguage,withCurrency,type UiLanguage} from './i18n';

type Pattern={regex:RegExp;key:string;weight:number};
let patterns:Pattern[]|null=null;
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function compiledPatterns(){
 if(patterns)return patterns;
 patterns=Object.keys(uiMessages).filter(key=>/\{\d\}/.test(key)).flatMap(key=>{
  const literal=key.replace(/\{\d\}/g,'');if((literal.match(/\p{L}/gu)||[]).length<3)return [];
  const source='^'+key.split(/\{\d\}/).map(escape).join('(.+?)')+'$';
  return [{regex:new RegExp(source,'s'),key,weight:literal.length}];
 }).sort((a,b)=>b.weight-a.weight);
 return patterns;
}

// Names are sometimes re-cased for display ("Livres, Cd/Dvd"): fall back on a case-insensitive match.
let lower:Map<string,string>|null=null;
const lowerKeys=()=>lower||(lower=new Map(Object.keys(uiMessages).map(k=>[k.toLocaleLowerCase('fr-FR'),k])));
const cache:Record<string,Map<string,string>>={};
/** Translation of a displayed text, or the text itself when nothing is known for it. */
export function translateDisplayed(text:string,language:UiLanguage=uiLanguage(),depth=0):string{
 if(!/\p{L}/u.test(text))return text;
 if(language==='fr')return withCurrency(text);
 const memo=cache[language]||(cache[language]=new Map());const hit=memo.get(text);if(hit!==undefined)return hit;
 const lead=text.match(/^\s*/)![0],trail=text.match(/\s*$/)![0],core=text.trim();let result=core;
 const known=uiMessages[core]?core:lowerKeys().get(core.toLocaleLowerCase('fr-FR'));
 if(known)result=uiMessages[known][language];
 else if(depth<4){
  for(const p of compiledPatterns()){const m=core.match(p.regex);if(!m)continue;
   const template=uiMessages[p.key][language];const order=[...p.key.matchAll(/\{(\d)\}/g)].map(x=>Number(x[1]));
   const values=new Map(order.map((n,i)=>[n,translateDisplayed(m[i+1],language,depth+1)]));
   result=template.replace(/\{(\d)\}/g,(_,n)=>values.get(Number(n))??'');break}
  if(result===core&&core.includes(' · '))result=core.split(' · ').map(part=>translateDisplayed(part,language,depth+1)).join(' · ');
  if(result===core&&core.startsWith('· '))result='· '+translateDisplayed(core.slice(2),language,depth+1);
  const aside=result===core?core.match(/^(.+?) \(([^()]+)\)$/):null;
  if(aside)result=translateDisplayed(aside[1],language,depth+1)+' ('+aside[2].split(', ').map(part=>translateDisplayed(part,language,depth+1)).join(', ')+')';
  // Composed without a template: "Épargne · Livret A", "Somme des enveloppes 2 280 €", "Solde :".
  const labelled=result===core?core.match(/^(.*?\p{L}[^\d€$£\u200e\u200f]*?)([\s\u200e\u200f]*:?[\s\u200e\u200f]*[-−+]?[\s\u200e\u200f]*[\d€$£].*)$/u):null;
  if(labelled&&uiMessages[labelled[1].trim()])result=uiMessages[labelled[1].trim()][language]+labelled[2];
  // Bank labels stay as written, only the operation type in front is translated.
  const prefix=result===core?core.match(/^(Virement instantané|Virement sepa|Prélèvement sepa|Virement|Prélèvement|Carte)(\s.*)$/i):null;
  if(prefix&&uiMessages[prefix[1]])result=uiMessages[prefix[1]][language]+prefix[2];
  const path=result===core?core.match(/^(\/\s*)(.+)$/):null;
  if(path)result=path[1]+translateDisplayed(path[2],language,depth+1);
  const colon=result===core?core.match(/^(.+?)\s*:$/):null;
  if(colon&&uiMessages[colon[1]])result=uiMessages[colon[1]][language]+':';
 }
 result=withCurrency(result);
 const out=lead+result+trail;if(memo.size>20000)memo.clear();memo.set(text,out);return out;
}

const ATTRIBUTES=['placeholder','title','aria-label'];
const originals=new WeakMap<Node,string>(),shown=new WeakMap<Node,string>();
const attrOriginals=new WeakMap<Element,Map<string,string>>(),attrShown=new WeakMap<Element,Map<string,string>>();
let current:UiLanguage='fr',observer:MutationObserver|null=null;
const skipped=(el:Element|null)=>!el||Boolean(el.closest('script,style,textarea,[contenteditable="true"],[data-i18n-skip]'));

function textNode(node:Text){
 if(skipped(node.parentElement))return;const value=node.nodeValue||'';
 const french=shown.get(node)===value?originals.get(node)!:value;originals.set(node,french);
 const next=translateDisplayed(french,current);if(next!==value){shown.set(node,next);node.nodeValue=next}else shown.set(node,value);
}
function attributes(el:Element){
 if(skipped(el))return;
 for(const name of ATTRIBUTES){const value=el.getAttribute(name);if(value===null)continue;
  const orig=attrOriginals.get(el)||new Map<string,string>(),seen=attrShown.get(el)||new Map<string,string>();attrOriginals.set(el,orig);attrShown.set(el,seen);
  const french=seen.get(name)===value?orig.get(name)!:value;orig.set(name,french);
  const next=translateDisplayed(french,current);seen.set(name,next);if(next!==value)el.setAttribute(name,next)}
}
function subtree(root:Node){
 if(root.nodeType===Node.TEXT_NODE){textNode(root as Text);return}
 if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
 if(root.nodeType===Node.ELEMENT_NODE)attributes(root as Element);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
 for(let n=walker.nextNode();n;n=walker.nextNode()){if(n.nodeType===Node.TEXT_NODE)textNode(n as Text);else attributes(n as Element)}
}

/** Starts (or switches) on-screen translation; French restores the original texts, with the household currency symbol. */
export function translateScreen(language:UiLanguage){
 if(typeof document==='undefined')return;current=language;
 subtree(document.body);
 if(observer)return;
 observer=new MutationObserver(records=>{for(const r of records){
  if(r.type==='characterData')textNode(r.target as Text);
  else if(r.type==='attributes')attributes(r.target as Element);
  else r.addedNodes.forEach(subtree)}});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRIBUTES});
}
