import {ArrowDownLeft,ArrowUpRight,CalendarDays,ClipboardList,FileText,FolderOpen,Landmark,LayoutDashboard,Sparkles,Tags,Target,Wallet} from 'lucide-react';

export const pageRegistry=[
 {name:'Vue d’ensemble',section:'ACCUEIL',icon:LayoutDashboard},
 {name:'Budget',section:'ACCUEIL',icon:Wallet},
 {name:'Revenus',section:'OPÉRATIONS',icon:ArrowDownLeft},
 {name:'Dépenses',section:'OPÉRATIONS',icon:ArrowUpRight},
 {name:'Banque',section:'OPÉRATIONS',icon:Landmark},
 {name:'Échéances',section:'OPÉRATIONS',icon:CalendarDays},
 {name:'Bilan',section:'OUTILS',icon:ClipboardList},
 {name:'Catégories',section:'OUTILS',icon:Tags},
 {name:'Objectifs',section:'OUTILS',icon:Target},
 {name:'Documents',section:'OUTILS',icon:FolderOpen},
 {name:'Astuces',section:'OUTILS',icon:Sparkles},
] as const;
export const navigationSections=[...new Set(pageRegistry.map(page=>page.section))].map(label=>({label,pages:pageRegistry.filter(page=>page.section===label).map(page=>page.name)}));
export const defaultNavigation:string[]=pageRegistry.map(page=>page.name);
export const pageDescriptions:Record<string,string>={
 'Budget':'Planifiez vos dépenses et votre épargne.',
 'Revenus':'Suivez les revenus du foyer.',
 'Dépenses':'Suivez et classez les dépenses du foyer.',
 'Catégories':'Organisez les catégories du foyer.',
 'Astuces':'Des conseils fondés sur vos opérations.',
};
export function normalizeNavigation(value:unknown):string[]{const seen=new Set<string>();const saved=Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'&&defaultNavigation.includes(x)&&!seen.has(x)&&!!seen.add(x)):[];return [...saved,...defaultNavigation.filter(x=>!seen.has(x))]}
export function moveNavigation(items:string[],from:string,to:string):string[]{const a=items.indexOf(from),b=items.indexOf(to);if(a<0||b<0||a===b)return items;const next=[...items];next.splice(a,1);next.splice(b,0,from);return next}
