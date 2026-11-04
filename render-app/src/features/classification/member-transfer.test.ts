import {expect,it} from 'vitest';
import {isMemberTransfer} from './member-transfer';
import {createHouseholdClassifier} from './local-classifier';
import {cardMerchantKey,matchMerchantRule,transactionMerchantKey,type MerchantKnowledgeRule} from './merchant-knowledge';

const people=[{name:'Sarah',relationship:'self' as const,active:true},{name:'Karim Ben Ali',relationship:'partner' as const,active:true},{name:'Léo',relationship:'child' as const,active:true}];

it('reconnaît un virement vers ou depuis un adulte du foyer, quel que soit l’ordre du nom',()=>{
 expect(isMemberTransfer('To Sarah Durand',people)).toBe(true);
 expect(isMemberTransfer('Paiement envoyé par Durand Sarah',people)).toBe(true);
 expect(isMemberTransfer('Virement instantané Ben Ali Karim',people)).toBe(true);
});

it('ne confond pas un tiers qui partage un nom de famille, un prénom seul ou un enfant',()=>{
 expect(isMemberTransfer('To Nina Durand',people)).toBe(false);
 expect(isMemberTransfer('To Karim Petit',people)).toBe(false);
 expect(isMemberTransfer('Virement à Léo',people)).toBe(false);
 expect(isMemberTransfer('Carte Sarah Boutique Paris',people)).toBe(false);
});

it('n’apprend rien d’un libellé bancaire sans contrepartie ni d’un intermédiaire de paiement seul',()=>{
 const categories=[{id:'logement',kind:'expense',active:true,name:'Logement'},{id:'factures',kind:'expense',active:true,name:'Factures'}];
 const classifier=createHouseholdClassifier(categories,[{label:'Virement sepa inst Emis',kind:'expense',categoryId:'logement'},{label:'Facture Carte',kind:'expense',categoryId:'factures'}]);
 expect(classifier('Virement sepa inst Emis','expense')).toBeNull();
 expect(classifier('Facture Carte','expense')).toBeNull();
 expect(transactionMerchantKey('Virement sepa inst Emis')).toBeNull();
 expect(cardMerchantKey('Carte 26/09/26 Paypal *Paiement cb*1333')).toBeNull();
 const rule=(merchant_key:string):MerchantKnowledgeRule=>({merchant_key,merchant_label:merchant_key,kind:'expense',category_id:'factures',subcategory_id:null,sample_count:1});
 expect(matchMerchantRule('Carte 25/09/26 Paypal *Paiement cb*1333','expense',[rule('paypal')])).toBeNull();
 expect(matchMerchantRule('Carte 06/10/26 Paypal *Lebara le cb*1333','expense',[rule('paypal lebara')])?.merchant_key).toBe('paypal lebara');
});
