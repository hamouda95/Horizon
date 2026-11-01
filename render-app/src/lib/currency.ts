// Main currency of the household. Amounts are integer hundredths in this currency and are never converted.
export const mainCurrencies:{code:string;label:string}[]=[
 {code:'EUR',label:'Euro'},{code:'TND',label:'Dinar tunisien'},{code:'USD',label:'Dollar américain'},{code:'GBP',label:'Livre sterling'},
 {code:'CHF',label:'Franc suisse'},{code:'CAD',label:'Dollar canadien'},{code:'MAD',label:'Dirham marocain'},{code:'DZD',label:'Dinar algérien'},
 {code:'LYD',label:'Dinar libyen'},{code:'EGP',label:'Livre égyptienne'},{code:'SAR',label:'Riyal saoudien'},{code:'AED',label:'Dirham des Émirats'},
 {code:'QAR',label:'Riyal qatari'},{code:'TRY',label:'Livre turque'},{code:'XOF',label:'Franc CFA (UEMOA)'},{code:'XAF',label:'Franc CFA (CEMAC)'},
 {code:'JPY',label:'Yen'},{code:'CNY',label:'Yuan'},
];
let current='EUR';
export function setAppCurrency(code:string|null|undefined){current=code&&/^[A-Z]{3}$/.test(code)?code:'EUR'}
export function appCurrency(){return current}
/** Short symbol used in form labels, e.g. « Montant (DT) ». */
export function currencySymbol(code=current){
 if(code==='TND')return 'DT';
 try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:code,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency')?.value||code}catch{return code}
}
