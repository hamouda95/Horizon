import {type StatementPreview,parseDelimitedStatement} from './bank-import';
export type PdfTextItem={str:string;x:number;y:number};
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function pdfStatementPreview(pages:PdfTextItem[][]):StatementPreview{
 const records:string[][]=[];let debitX:number|undefined,creditX:number|undefined;
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
   // Balance and total rows must never become transactions.
   if(/\b(solde|balance|total|totaux|report)\b/.test(fold(text)))continue;
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
 return {...preview,format:'pdf',transactions:preview.transactions.map((r,i)=>({...r,error:/\d[,.]\d{2}/.test(records[i][2])?'Plusieurs montants sur la même ligne : vérifiez le relevé':records[i][4]||r.error}))};
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
