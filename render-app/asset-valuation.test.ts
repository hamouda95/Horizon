import {expect,it} from 'vitest';
import {investmentStatement,assetValuation} from './asset-valuation';
it('retient une seule valorisation et sépare net estimé, disponibilité et plus-value',()=>{
 const v=investmentStatement(['Company savings as of 31/10/2026','BNP PARIBAS','Unavailable savings 1,200.00 €','Until 6/1/2029 1,200.00 €','GROSS TOTAL AMOUNT 1,200.00 €','Global gain/loss (1) +50.00 €','YOUR SAVINGS PLANS','Plan ESTIMATED NET AMOUNT','PEE 1,190.00 €','PEE 1,200.00 €','Fund A 800.00 €','Fund B 400.00 €']);
 expect(v).toMatchObject({grossCents:120000,estimatedNetCents:119000,lockedCents:120000,gainLossCents:5000,asOf:'2026-10-31'});
 expect(v?.releaseNotes).toEqual(['Until 6/1/2029 1,200.00 €']);
});
it('ne transforme pas les mouvements bancaires ni les fonds seuls en valorisation globale',()=>{
 expect(investmentStatement(['PEE','Fund A 1,200.00 €'])).toBeNull();
 expect(investmentStatement(['31/10/2026','Solde 200,00 €'])).toBeNull();
 expect(assetValuation({kind:'investment',grossCents:-100})).toBeNull();
});
it('reconnaît une valorisation française sans inventer de net ni de disponibilité',()=>{
 expect(investmentStatement(['Plan d’épargne au 31/10/2026','Montant total brut 2 500,50 €'])).toMatchObject({grossCents:250050,estimatedNetCents:null,lockedCents:null,gainLossCents:null});
});
