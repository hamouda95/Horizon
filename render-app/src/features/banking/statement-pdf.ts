import {investmentStatement} from './asset-valuation';
import {type StatementPreview,type StatementTransaction,parseDelimitedStatement,reconcileStatementBalances} from './bank-import';
export type PdfTextItem={str:string;x:number;y:number};
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function pdfStatementPreview(pages:PdfTextItem[][]):StatementPreview{
 const textLines=pages.flatMap(items=>{const rows=new Map<number,PdfTextItem[]>();for(const item of items){const y=Math.round(item.y/3)*3;rows.set(y,[...(rows.get(y)||[]),item])}return [...rows].sort((a,b)=>b[0]-a[0]).map(([,r])=>r.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').trim())});
 const valuation=investmentStatement(textLines);if(valuation){const empty=parseDelimitedStatement('Date;Libellé;Montant','empty.csv');return {...empty,format:'pdf',transactions:[],assetValuation:valuation}}
 const records:string[][]=[],snapshots:BalanceSnapshot[]=[];let debitX:number|undefined,creditX:number|undefined;
 for(const items of pages){
  if(items.some(i=>/\b(?:USD|GBP|CHF|CAD|JPY)\b|[$£]/.test(i.str)))throw Error('Ce relevé PDF semble être dans une autre devise. Importez un export bancaire indiquant la devise.');
  const lines:Array<{y:number;items:PdfTextItem[]}>=[];
  for(const item of items.filter(i=>i.str.trim()).sort((a,b)=>b.y-a.y||a.x-b.x)){
   let line=lines.find(l=>Math.abs(l.y-item.y)<2.5);if(!line){line={y:item.y,items:[]};lines.push(line)}line.items.push(item);
  }
  for(const line of lines){
   const cells=line.items.sort((a,b)=>a.x-b.x),text=cells.map(i=>i.str).join(' ').trim();
   const debit=cells.find(i=>/\bdebit\b/.test(fold(i.str))),credit=cells.find(i=>/\bcredit\b/.test(fold(i.str)));
   if(debit&&credit&&debit.x!==credit.x){debitX=debit.x;creditX=credit.x;continue}
   // Balance and total rows never become transactions; balance lines are kept as statement snapshots.
   const summary=summaryKind(text);
   if(summary){if(summary!=='total'){const snapshot=balanceSnapshot(text,summary,cells,debitX,creditX);if(snapshot)snapshots.push(snapshot)}continue}
   const date=text.match(/^(\d{2}[/.\-]\d{2}[/.\-]\d{4})\s+/);if(!date)continue;
   const rest=text.slice(date[0].length),valueDate=rest.match(/^(\d{2}[/.\-]\d{2}[/.\-]\d{4})\s+/);
   const body=valueDate?rest.slice(valueDate[0].length):rest;
   const amount=body.match(/([+−-]?\s*\d[\d \u00a0\u202f]*[,.]\d{2})(?:\s*€|\s*EUR)?\s*$/i);
   if(!amount)continue;
   const label=body.slice(0,amount.index).trim();if(!label)continue;
   let signed=amount[1].replace(/−/g,'-').replace(/\s/g,'');
   const amountCell=[...cells].reverse().find(c=>/[,.]\d{2}/.test(c.str));
   let ambiguous=false;
   if(!/^[+-]/.test(signed)){
    if(debitX!==undefined&&creditX!==undefined&&amountCell){if(Math.abs(amountCell.x-debitX)<Math.abs(amountCell.x-creditX))signed='-'+signed}
    else ambiguous=true;
   }
   records.push([date[1],valueDate?.[1]||'',label,signed,ambiguous?'Sens débit/crédit à vérifier':'']);
  }
 }
 if(!records.length)throw Error('Aucune transaction lisible avec date complète et montant. Ce PDF peut être scanné ou avoir une présentation non reconnue. Utilisez un export CSV, OFX ou QIF.');
 const csv='Date;Date valeur;Libellé;Montant\n'+records.map(r=>r.slice(0,4).map(c=>'"'+c.replace(/"/g,'""')+'"').join(';')).join('\n');
 const preview=parseDelimitedStatement(csv,'statement.csv');
 const transactions=preview.transactions.map((r,i)=>({...r,error:/\d[,.]\d{2}/.test(records[i][2])?'Plusieurs montants sur la même ligne : vérifiez le relevé':records[i][4]||r.error}));
 return {...preview,format:'pdf',transactions:attachStatementBalances(transactions,snapshots)};
}
export async function readPdfStatement(bytes:Uint8Array):Promise<StatementPreview>{
 const pdfjs=await import('pdfjs-dist');
 const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
 pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
 const task=pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true});
 try{
  const pdf=await task.promise;if(pdf.numPages>100)throw Error('PDF limité à 100 pages.');
  const pages:PdfTextItem[][]=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();
   pages.push(content.items.flatMap(i=>'str' in i?[{str:i.str,x:i.transform[4],y:i.transform[5]}]:[]));page.cleanup();
  }
  return pdfStatementPreview(pages);
 }finally{await task.destroy()}
}

type BalanceSnapshot={date:string|null;cents:number;opening:boolean};
const leadingDates=/^(?:\d{2}[/.\-]\d{2}[/.\-]\d{2,4}\s+){1,2}/;
/** Recognises summary lines by their first words only, so a shop named "Total…" or "Report…" stays a transaction. */
function summaryKind(text:string):'opening'|'closing'|'total'|null{
 const body=fold(text).replace(leadingDates,'').trim();
 if(/^(ancien solde|solde (precedent|initial|anterieur|reporte|d ouverture|de debut|en debut|au debut)|report a nouveau|report\s*[:\d+−-])/.test(body))return 'opening';
 if(/^(nouveau solde|solde\b|balance\b)/.test(body))return 'closing';
 if(/^(totaux\b|sous[- ]total\b|total\s+(des|du|de|general|mouvements?|operations?|debits?|credits?|periode)\b|total\s*[:\d+−-])/.test(body))return 'total';
 return null;
}
function isoDate(raw:string){const m=raw.match(/(\d{2})[/.\-](\d{2})[/.\-](\d{2,4})/);if(!m)return null;const year=m[3].length===2?'20'+m[3]:m[3];return `${year}-${m[2]}-${m[1]}`}
function balanceSnapshot(text:string,kind:'opening'|'closing',cells:PdfTextItem[],debitX?:number,creditX?:number):BalanceSnapshot|null{
 const amounts=[...text.replace(/\d{2}[/.\-]\d{2}[/.\-]\d{2,4}/g,' ').matchAll(/([+−-]?\s?\d{1,3}(?:[   .]\d{3})*[,.]\d{2})(?!\d)/g)];
 // Several amounts on a balance line (e.g. debit and credit totals) cannot be read safely.
 if(amounts.length!==1)return null;
 const raw=amounts[0][1].replace(/−/g,'-').replace(/[\s  ]/g,''),decimal=raw.slice(-3,-2),digits=raw.replace(/^[+-]/,'').slice(0,-3).replace(/[.,]/g,'');
 let cents=Number(digits)*100+Number(raw.slice(-2));
 const folded=fold(text);
 // Column position decides the sign only when the amount sits alone in its own cell.
 const amountCell=[...cells].reverse().find(c=>/^[+−-]?[\d\s  .,]+(?:€|eur)?$/i.test(c.str.trim())&&/[,.]\d{2}/.test(c.str));
 const negative=raw.startsWith('-')||/\bdebiteur\b/.test(folded)||(!/\bcrediteur\b/.test(folded)&&debitX!==undefined&&creditX!==undefined&&amountCell!==undefined&&Math.abs(amountCell.x-debitX)<Math.abs(amountCell.x-creditX));
 if(!Number.isFinite(cents)||decimal!==','&&decimal!=='.')return null;
 if(negative)cents=-cents;
 const dates=[...text.matchAll(/\d{2}[/.\-]\d{2}[/.\-]\d{2,4}/g)].map(m=>isoDate(m[0])).filter((d):d is string=>Boolean(d));
 return {date:dates.at(-1)??null,cents,opening:kind==='opening'};
}
const dayBefore=(date:string)=>new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
/** Places statement balances on the operation rows they follow; drops them all when they contradict the operations. */
export function attachStatementBalances(transactions:StatementTransaction[],snapshots:BalanceSnapshot[]):StatementTransaction[]{
 const valid=transactions.filter(t=>t.transactionDate&&!t.error);
 if(!valid.length||!snapshots.length)return transactions;
 const dates=valid.map(t=>t.transactionDate).sort(),first=dates[0],last=dates.at(-1)!;
 const placed=snapshots.map(s=>({cents:s.cents,date:s.date??(s.opening?dayBefore(first):last)}));
 // An opening balance alone still gives the closing one: opening plus every operation of the statement.
 if(placed.every(s=>s.date<first)){const opening=placed.sort((a,b)=>b.date.localeCompare(a.date))[0];placed.push({date:last,cents:opening.cents+valid.filter(t=>t.transactionDate>opening.date).reduce((n,t)=>n+t.amountCents,0)})}
 const result=transactions.map(t=>({...t}));
 for(const snapshot of placed.filter(s=>s.date>=first)){
  // The row carrying a balance is the last operation dated on or before it.
  const index=result.map((t,i)=>({t,i})).filter(({t})=>t.transactionDate&&!t.error&&t.transactionDate<=snapshot.date&&t.balanceCents===undefined).sort((a,b)=>a.t.transactionDate.localeCompare(b.t.transactionDate)||a.i-b.i).at(-1)?.i;
  if(index!==undefined)result[index]={...result[index],balanceCents:snapshot.cents,balanceDate:snapshot.date};
 }
 const check=reconcileStatementBalances(result);
 if(check&&(check.conflictingSnapshots.length||check.checkedIntervals>0&&check.matchedIntervals<check.checkedIntervals))return transactions;
 return result;
}
