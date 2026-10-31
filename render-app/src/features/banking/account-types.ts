export const accountTypes=[['checking','Compte courant'],['cash','Espèces'],['savings','Épargne'],['investment','Placement / investissement'],['crypto','Crypto'],['credit','Dette / crédit'],['other','Autre avoir']] as const;
export type AccountType=typeof accountTypes[number][0];
export function accountTypeName(type:string){return accountTypes.find(([value])=>value===type)?.[1]||'Autre avoir'}
