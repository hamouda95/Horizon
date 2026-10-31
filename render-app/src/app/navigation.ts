import {ArrowDownLeft,ArrowUpRight,CalendarDays,ClipboardList,FolderOpen,Landmark,LayoutDashboard,Sparkles,Tags,Target,Wallet} from 'lucide-react';

export const pageRegistry=[
 {name:'Vue d’ensemble',section:'ACCUEIL',icon:LayoutDashboard},
 {name:'Budget',section:'ACCUEIL',icon:Wallet},
 {name:'Entrées d’argent',section:'OPÉRATIONS',icon:ArrowDownLeft},
 {name:'Sorties d’argent',section:'OPÉRATIONS',icon:ArrowUpRight},
 {name:'Banque',section:'OPÉRATIONS',icon:Landmark},
 {name:'Prêts et créances',section:'OPÉRATIONS',icon:Wallet},
 {name:'Échéances',section:'OPÉRATIONS',icon:CalendarDays},
 {name:'Bilan',section:'ACCUEIL',icon:ClipboardList},
 {name:'Catégories',section:'OUTILS',icon:Tags},
 {name:'Objectifs',section:'OUTILS',icon:Target},
 {name:'Documents',section:'OUTILS',icon:FolderOpen},
 {name:'Astuces',section:'OUTILS',icon:Sparkles},
] as const;
export const navigationSections=[...new Set(pageRegistry.map(page=>page.section))].map(label=>({label,pages:pageRegistry.filter(page=>page.section===label).map(page=>page.name)}));
export const defaultNavigation:string[]=pageRegistry.map(page=>page.name);
export const pageDescriptions:Record<string,string>={
 'Budget':'Planifiez vos dépenses et votre épargne.',
 'Entrées d’argent':'Suivez les revenus du foyer.',
 'Sorties d’argent':'Suivez et classez les dépenses du foyer.',
 'Catégories':'Organisez les catégories du foyer.',
 'Astuces':'Des conseils fondés sur vos opérations.',
};
export function normalizeNavigation(value:unknown):string[]{const seen=new Set<string>();const saved=Array.isArray(value)?value.map(x=>x==='Revenus'?'Entrées d’argent':x==='Dépenses'?'Sorties d’argent':x).filter((x):x is string=>typeof x==='string'&&defaultNavigation.includes(x)&&!seen.has(x)&&!!seen.add(x)):[];return [...saved,...defaultNavigation.filter(x=>!seen.has(x))]}
export function moveNavigation(items:string[],from:string,to:string):string[]{const a=items.indexOf(from),b=items.indexOf(to);if(a<0||b<0||a===b)return items;const next=[...items];next.splice(a,1);next.splice(b,0,from);return next}

export const pageRoutes:Record<string,string>={'Vue d’ensemble':'overview','Budget':'budget','Entrées d’argent':'income','Sorties d’argent':'expenses','Banque':'accounts','Prêts et créances':'loans','Échéances':'bills','Bilan':'reports','Catégories':'categories','Objectifs':'goals','Documents':'documents','Astuces':'insights'};
export function pageFromHash(hash:string){const route=hash.replace(/^#\/?/,'').split('?')[0];return Object.keys(pageRoutes).find(page=>pageRoutes[page]===route)||'Vue d’ensemble'}
export function hashForPage(page:string){return '#/'+(pageRoutes[page]||'overview')}
