import {expect,it,vi} from 'vitest';
vi.mock('../../lib/client',()=>({supabase:{}}));
import {entryStatus,isProvisional,reconcileCandidates,statementCoverage,type ReconcileEntry} from './reconcile';

const today='2026-11-10';
const accounts:Record<string,{id:string;account_type:string}>={bourso:{id:'bourso',account_type:'checking'},cash:{id:'cash',account_type:'cash'},revolut:{id:'revolut',account_type:'checking'}};
type Row=ReconcileEntry&{account?:string};
const accountOf=(e:ReconcileEntry)=>accounts[(e as Row).account||''];
const manual=(id:string,date:string,amount:number,extra:Partial<Row>={}):Row=>({id,kind:'expense',amount,date,bankTransactionId:null,paymentMethod:'card',flowType:'standard',...extra});
const bank=(id:string,date:string,amount:number,account='bourso',extra:Partial<Row>={}):Row=>({id,kind:'expense',amount,date,bankTransactionId:'bt-'+id,paymentMethod:null,flowType:'standard',account,...extra});

it('une saisie par carte attend la banque, une saisie en espèces est confirmée',()=>{
 expect(isProvisional(manual('m','2026-11-02',935),accountOf,today)).toBe(true);
 expect(isProvisional(manual('m','2026-11-02',3000,{paymentMethod:'cash'}),accountOf,today)).toBe(false);
 expect(isProvisional(manual('m','2026-11-02',3000,{paymentMethod:null,account:'cash'}),accountOf,today)).toBe(false);
 expect(isProvisional(bank('b','2026-11-02',935),accountOf,today)).toBe(false);
 expect(isProvisional(manual('m','2026-11-02',50000,{flowType:'loan'}),accountOf,today)).toBe(false);
});

it('rapproche une saisie de sa ligne bancaire arrivée quelques jours plus tard',()=>{
 const m=manual('franprix','2026-11-02',935),b=bank('cb-franprix','2026-11-04',935);
 const r=reconcileCandidates([m,b,bank('autre','2026-11-04',1200)],accountOf,today);
 expect(r.certain).toEqual([{manual:m,imported:b}]);expect(r.uncertain).toEqual([]);
});

it('ne rapproche pas hors de la fenêtre, d’un autre compte, de l’autre sens ou d’un autre montant',()=>{
 const m=manual('m','2026-11-02',935,{account:'bourso'});
 for(const b of [bank('tard','2026-11-08',935),bank('tot','2026-10-29',935),bank('revolut','2026-11-03',935,'revolut'),bank('sens','2026-11-03',935,'bourso',{kind:'income'}),bank('montant','2026-11-03',1100)])
  expect(reconcileCandidates([m,b],accountOf,today).certain).toEqual([]);
 expect(reconcileCandidates([m,bank('veille','2026-10-30',935)],accountOf,today).certain).toHaveLength(1);
});

it('deux saisies identiques la même semaine : le choix revient à l’utilisateur',()=>{
 const a=manual('a','2026-11-02',2000),b=manual('b','2026-11-03',2000),i=bank('i','2026-11-03',2000);
 const r=reconcileCandidates([a,b,i],accountOf,today);
 expect(r.certain).toEqual([]);expect(r.uncertain).toEqual([{imported:i,candidates:[b,a]}]);
});

it('saisie à confirmer, puis introuvable une fois le relevé du compte passé',()=>{
 const m=manual('m','2026-11-02',4500,{account:'bourso'});
 expect(entryStatus(m,accountOf,statementCoverage([m,bank('x','2026-11-05',100)],accountOf),today)).toBe('pending');
 expect(entryStatus(m,accountOf,statementCoverage([m,bank('x','2026-11-09',100)],accountOf),today)).toBe('missing');
 expect(entryStatus(m,accountOf,statementCoverage([m,bank('x','2026-11-09',100,'revolut')],accountOf),today)).toBe('pending');
 expect(entryStatus(m,accountOf,statementCoverage([m,bank('x','2026-11-09',100)],accountOf),today,true)).toBe('confirmed');
 expect(entryStatus(manual('f','2026-11-20',100),accountOf,statementCoverage([],accountOf),today)).toBe('planned');
});

it('un montant arrondi à la saisie se rapproche, le montant exact reste prioritaire',()=>{
 const loyer=manual('loyer','2026-11-02',140200,{paymentMethod:null}),inli=bank('inli','2026-11-05',140273);
 expect(reconcileCandidates([loyer,inli],accountOf,today).certain).toEqual([{manual:loyer,imported:inli}]);
 expect(reconcileCandidates([manual('m','2026-11-02',4000),bank('b','2026-11-02',4200)],accountOf,today).certain).toEqual([]);
 const exact=manual('exact','2026-11-02',2000),rounded=manual('rounded','2026-11-02',2050),i=bank('i','2026-11-03',2000);
 expect(reconcileCandidates([exact,rounded,i],accountOf,today).certain).toEqual([{manual:exact,imported:i}]);
});
