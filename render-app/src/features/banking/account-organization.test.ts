import {it,expect} from 'vitest';import{accountGroups,accountsOfPerson,bankName,SHARED_OWNER,sharedOwnerLabel}from'./account-organization';
const accounts=[{name:'Compte joint',source_name:'BNP',account_type:'checking',currency:'EUR',balance_cents:10000},{name:'Épargne entreprise',source_name:'BNP Paribas Épargne et Retraite',account_type:'investment',currency:'EUR',balance_cents:20000},{name:'Livret',source_name:'Autre banque',account_type:'savings',currency:'EUR',balance_cents:null}];
it('regroupe la banque sans fusionner ses comptes et garde leurs natures',()=>{const g=accountGroups(accounts,'bank');const b=g.find(g=>g.label==='BNP Paribas')!;expect(b.accounts).toHaveLength(2);expect(b.totals[0]).toMatchObject({known:30000,knownCount:2,missing:0});expect(g.find(g=>g.label==='Autre banque')!.totals[0]).toMatchObject({knownCount:0,missing:1})});
it('permet une seconde lecture par nature et une recherche sans accents',()=>{expect(accountGroups(accounts,'type')).toHaveLength(3);expect(accountGroups(accounts,'bank','epargne')[0].accounts[0].name).toBe('Épargne entreprise');expect(bankName('LDDS')).toBe('Banque ou source à préciser')});
it('sépare les devises et conserve deux comptes de même nature dans une banque',()=>{const g=accountGroups([...accounts,{...accounts[0],name:'Autre compte courant',currency:'USD',balance_cents:5000}],'bank').find(g=>g.label==='BNP Paribas')!;expect(g.accounts).toHaveLength(3);expect(g.totals).toHaveLength(2)});

it('sépare les comptes par personne et filtre ceux d’une personne ou communs',()=>{
 const owned=[{name:'Courant Mohamed',source_name:'BNP',account_type:'checking',currency:'EUR',balance_cents:1000,owner_person_id:'m'},{name:'Livret Lynda',source_name:'BNP',account_type:'savings',currency:'EUR',balance_cents:500,owner_person_id:'l'},{name:'Joint',source_name:'Bourso',account_type:'checking',currency:'EUR',balance_cents:200,owner_person_id:null},{name:'Ancien',source_name:'Bourso',account_type:'checking',currency:'EUR',balance_cents:50,owner_person_id:'gone'}];
 const names:Record<string,string>={m:'Mohamed',l:'Lynda'};
 const g=accountGroups(owned,'person','',t=>t,id=>names[id]);
 expect(g.map(x=>[x.label,x.totals[0].known])).toEqual([['Lynda',500],['Mohamed',1000],[sharedOwnerLabel,250]]);
 expect(accountsOfPerson(owned,'m').map(a=>a.name)).toEqual(['Courant Mohamed']);
 expect(accountsOfPerson(owned,SHARED_OWNER,id=>id in names).map(a=>a.name)).toEqual(['Joint','Ancien']);
 expect(accountsOfPerson(owned,'')).toHaveLength(4);
});
