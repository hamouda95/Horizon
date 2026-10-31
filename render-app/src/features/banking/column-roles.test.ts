import {expect,it} from 'vitest';
import {guessHeaderRole,guessHeaderRoles,headerWords} from './column-roles';

it('découpe les en-têtes collés, en camelCase ou abrégés',()=>{
 expect(headerWords('dateOp')).toEqual(['date','operation']);
 expect(headerWords('accountbalance')).toEqual(['account','balance']);
 expect(headerWords('Mnt (€)')).toEqual(['montant','eur']);
});

it('comprend des formulations variées sans dépendre d’une banque',()=>{
 const cases:Array<[string,string|null]>=[
  ['Date de l’opération','date'],['Date opé.','date'],['Booking Date','date'],['Jour','date'],
  ['Date de valeur','valueDate'],['Value date','valueDate'],
  ['Libellé de l’opération','label'],['Description','label'],['Bénéficiaire / Émetteur','label'],['Nature de l’opération','label'],
  ['Montant en euros','amount'],['Amount (EUR)','amount'],['Somme','amount'],
  ['Débit','debit'],['Sorties','debit'],['Paid out','debit'],['Crédit (€)','credit'],['Money in','credit'],
  ['Solde','balance'],['Solde après opération','balance'],['Running balance','balance'],['accountbalance','balance'],
  ['Devise','currency'],['Référence','reference'],['Catégorie','category'],['Catégorie principale','parentCategory'],
  ['12/10/2026',null],['-45,30',null],['',null],['Commentaire libre de l’utilisateur sur cette opération bancaire',null],
 ];
 for(const [header,role] of cases)expect([header,guessHeaderRole(header)]).toEqual([header,role]);
});

it('attribue chaque rôle à une seule colonne',()=>{
 expect(guessHeaderRoles(['Date','Date','Libellé','Débit','Crédit','Solde'])).toEqual({date:0,valueDate:1,label:2,debit:3,credit:4,balance:5});
 expect(guessHeaderRoles(['Solde','Montant','Solde'])).toEqual({balance:2,amount:1});
 expect(guessHeaderRoles(['Type d’opération','Opération','Détail','Montant'])).toEqual({category:0,label:2,amount:3});
});
