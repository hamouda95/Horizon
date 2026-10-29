export const navigationSections=[
 {label:'ACCUEIL',pages:['Vue d’ensemble','Budget']},
 {label:'OPÉRATIONS',pages:['Revenus','Dépenses','Banque','Échéances']},
 {label:'OUTILS',pages:['Bilan','Catégories','Objectifs','Documents','Astuces']},
] as const;
export const defaultNavigation=navigationSections.flatMap(section=>section.pages);
export const pageDescriptions:Record<string,string>={
 'Budget':'Planifiez vos dépenses et votre épargne.',
 'Revenus':'Suivez les revenus du foyer.',
 'Dépenses':'Suivez et classez les dépenses du foyer.',
 'Catégories':'Organisez les catégories du foyer.',
 'Astuces':'Des conseils fondés sur vos opérations.',
};
export function normalizeNavigation(value:unknown):string[]{const seen=new Set<string>();const saved=Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'&&defaultNavigation.includes(x)&&!seen.has(x)&&!!seen.add(x)):[];return [...saved,...defaultNavigation.filter(x=>!seen.has(x))]}
export function moveNavigation(items:string[],from:string,to:string):string[]{const a=items.indexOf(from),b=items.indexOf(to);if(a<0||b<0||a===b)return items;const next=[...items];next.splice(a,1);next.splice(b,0,from);return next}
