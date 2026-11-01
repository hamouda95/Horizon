import {expect,it} from 'vitest';
import {classificationReference,referenceMatch,resolveReferenceCategory} from './classification-reference';

it('couvre un large éventail de libellés bancaires français',()=>{
 const cases:Array<[string,'income'|'expense',string]>=[
  ['CB LIDL 4362 12/10','expense','Courses'],['PRLV SEPA NETFLIX.COM','expense','Loisirs'],['CB UBEREATSPARIS','expense','Loisirs'],
  ['CB SNCF CONNECT','expense','Transport'],['CB TOTALENERGIES RELAIS','expense','Transport'],['PRLV APRR AUTOROUTE','expense','Transport'],
  ['PRLV SEPA EDF CLIENTS','expense','Factures'],['PRLV FREE MOBILE','expense','Factures'],['PRLV MAIF ASSURANCE','expense','Factures'],
  ['CB PHARMACIE DU CENTRE','expense','Santé'],['PRLV HARMONIE MUTUELLE','expense','Santé'],['PRLV DGFIP IMPOT','expense','Impôts et taxes'],
  ['CB AMAZON PAYMENTS','expense','Shopping'],['CB IKEA PARIS','expense','Logement'],['PRLV FONCIA LOYER','expense','Logement'],
  ['CB BOOKING.COM HOTEL','expense','Voyages'],['RETRAIT DAB 12/10','expense','Retraits d’espèces'],['FRAIS CB VISA','expense','Banque et frais'],
  ['VIR SEPA SALAIRE OCTOBRE','income','Salaire'],['VIR CAF ALLOCATIONS','income','Aides'],['VIR CARSAT RETRAITE','income','Retraite'],
  ['VIR CPAM REMBOURSEMENT','income','Remboursements'],['VIR VINTED','income','Ventes'],['INTERETS CREDITES LIVRET','income','Revenus de placements'],
 ];
 for(const [label,kind,category] of cases)expect([label,referenceMatch(label,kind)?.category]).toEqual([label,category]);
});

it('donne la nature des mouvements qui ne sont pas des dépenses',()=>{
 expect(referenceMatch('RETRAIT DAB PARIS','expense')?.flowType).toBe('transfer');
 expect(referenceMatch('VIR VERS LIVRET A','expense')?.flowType).toBe('savings');
 expect(referenceMatch('VIR ASSURANCE VIE LINXEA','expense')?.flowType).toBe('investment');
});

it('évite les faux positifs connus',()=>{
 expect(referenceMatch('PRLV CAISSE D EPARGNE','expense')?.flowType).not.toBe('savings');
 expect(referenceMatch('VIR M PAUL DURAND','expense')).toBeNull();
 expect(referenceMatch('AVIS D IMPOSITION','income')).toBeNull();
 expect(referenceMatch('CB BOULANGER','expense')).toBeNull();
});

it('garde un dictionnaire volumineux et sans doublon de clé',()=>{
 const keys=classificationReference.map(rule=>rule.key);
 expect(new Set(keys).size).toBe(keys.length);
 expect(classificationReference.reduce((n,rule)=>n+rule.terms.length,0)).toBeGreaterThan(700);
});

it('retombe sur une catégorie existante du foyer grâce aux alias',()=>{
 const categories=[{id:'other',name:'Autres dépenses',kind:'expense',active:true},{id:'trip',name:'Voyage',kind:'expense',active:true}];
 expect(resolveReferenceCategory({category:'Shopping',kind:'expense'},categories)?.id).toBe('other');
 expect(resolveReferenceCategory({category:'Voyages',kind:'expense'},categories)?.id).toBe('trip');
 expect(resolveReferenceCategory({category:'Salaire',kind:'income'},categories)).toBeNull();
});
