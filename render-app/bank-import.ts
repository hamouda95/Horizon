import type {FlowType} from './flow';
import {strFromU8,unzipSync} from 'fflate';

export type CsvMapping={date:string;label:string;amount:string;debit:string;credit:string;valueDate:string;reference:string;currency:string;suggestedLabel:string;category:string;parentCategory:string;balance:string};
export type StatementTransaction={rowNumber:number;transactionDate:string;valueDate:string|null;label:string;suggestedLabel?:string;categoryHint?:string;parentCategoryHint?:string;amountCents:number;currency:string;externalId:string|null;fingerprint:string;possibleDuplicate?:boolean;balanceCents?:number;balanceDate?:string;error?:string};
export type StatementPreview={format:'csv'|'xlsx'|'ofx'|'qif'|'camt';headers:string[];records:string[][];mapping:CsvMapping;transactions:StatementTransaction[];hasHeaders?:boolean};
export type BalanceReconciliation={
 checkedIntervals:number;
 matchedIntervals:number;
 mismatches:Array<{fromDate:string;toDate:string;expectedBalanceCents:number;reportedBalanceCents:number;differenceCents:number}>;
 unresolvedDates:string[];
 conflictingSnapshots:Array<{date:string;candidateBalancesCents:number[];selectedBalanceCents:number|null}>;
 latestBalance:{date:string;balanceCents:number}|null;
};
export function inferStatementFlowType(row:StatementTransaction,accountType?:string):FlowType{
 const text=normalize([row.label,row.suggestedLabel,row.categoryHint,row.parentCategoryHint].filter(Boolean).join(' '));
 // Explicit interest is income even when the account itself is a savings account.
 if(/interets? (?:livret|epargne|compte)|remuneration (?:du )?(?:livret|epargne)|interets credites/.test(text))return 'standard';
 // Transfers between accounts are balance movements, never household income or spending.
 if(/virements? emis de comptes a comptes|virements? recus de comptes a comptes|transfert interne|mouvements internes/.test(text))return 'transfer';
 if(/\b(?:virement|vir|transfert)\b.*\b(?:depuis|vers)\b.*\b(?:bourso(?:bank)?|boursorama|livret|epargne|compte courant|compte epargne)\b/.test(text))return 'transfer';
 if(/\b(?:depuis|vers)\b.*\b(?:bourso|boursorama|livret|epargne|compte courant|compte epargne)\b/.test(text))return 'transfer';
 if(/livret|epargne|compte epargne/.test(text))return 'savings';
 if(/remboursement|rembourse|refund|cpam|securite sociale|complementaire sante/.test(text))return 'refund';
 if(/salaire|payroll|paie|virement employeur|remuneration|loyer|revenu locatif|rent/.test(text))return 'standard';
 // Unrecognized savings-account movements need review rather than being counted as income.
 if(accountType==='savings')return 'review';
 return row.amountCents>0?'review':'standard';
}
const emptyMapping:CsvMapping={date:'',label:'',amount:'',debit:'',credit:'',valueDate:'',reference:'',currency:'',suggestedLabel:'',category:'',parentCategory:'',balance:''};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const normalizeHeader=(value:string)=>normalize(value).replace(/\b(?:de|d|l|le|la|les|du|des)\b/g,' ').replace(/\s+/g,' ').trim();
function parseCsv(text:string):{headers:string[];records:string[][];delimiter:string;headerRow:number;hasHeaders:boolean}{
 const source=text.replace(/^\uFEFF/,'');const lines=source.split(/\r?\n/).filter(line=>line.trim());const candidates=[',',';','\t','|'];const delimiter=candidates.map(char=>({char,count:lines.slice(0,12).reduce((total,line)=>total+[...line].filter(c=>c===char).length,0)})).sort((a,b)=>b.count-a.count)[0]?.char||',';
 const records:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){const char=source[i];if(char==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(char===delimiter&&!quoted){row.push(cell);cell=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))records.push(row);row=[];cell=''}else cell+=char}
 row.push(cell);if(row.some(value=>value.trim()))records.push(row);
 let headerRow=0;let bestScore=0;for(let index=0;index<Math.min(records.length,15);index++){const score=headerScore(records[index]);if(score>bestScore){bestScore=score;headerRow=index}}
 const hasHeaders=bestScore>=2;const headers=hasHeaders?(records[headerRow]||[]).map((value,index)=>value.trim()||`Colonne ${index+1}`):[];const data=hasHeaders?records.slice(headerRow+1):records;return {headers:headers.length?headers:Array.from({length:Math.max(...records.slice(0,20).map(row=>row.length),0)},(_,i)=>`Colonne ${columnName(i)}`),records:data,delimiter,headerRow,hasHeaders};
}
export function parseCsvTable(text:string):{headers:string[];records:string[][]}{
 const parsed=parseCsv(text);if(!parsed.hasHeaders)throw Error('La base doit contenir une ligne de titre avec ses colonnes.');return {headers:parsed.headers,records:parsed.records};
}
function headerScore(row:string[]){const map=mapHeaders(row);const normalized=row.map(normalize);const merchant=normalized.some(value=>/^(marque|brand|merchant|enseigne|commercant|nom marchand)$/.test(value));return [map.date,map.label,map.amount||map.debit||map.credit,merchant?String(row.findIndex(value=>/^(marque|brand|merchant|enseigne|commercant|nom marchand)$/.test(normalize(value)))):'',map.category].filter(Boolean).length;}
function mapHeaders(headers:string[]):CsvMapping{
 const tokens=headers.map(normalizeHeader);const find=(patterns:RegExp[])=>{const index=tokens.findIndex(value=>patterns.some(pattern=>pattern.test(value)));return index<0?'':String(index)};const findLast=(patterns:RegExp[])=>{for(let index=tokens.length-1;index>=0;index--)if(patterns.some(pattern=>pattern.test(tokens[index])))return String(index);return ''};
 const mapping:CsvMapping={
  date:find([/^(date|date operation|operation date|booking date|booked date|date comptable|date comptabilisation|date de comptabilisation|transaction date|date de transaction|posting date)$/]),
  valueDate:find([/^(date valeur|value date|date val|valuta)$/]),
  label:find([/^(libelle|libelle operation|label|description|operation|transaction|nom|name|detail|details|communication|motif|merchant|payee|beneficiaire)$/]),
  amount:find([/^(montant|amount|value|valeur|transaction amount|amount eur|montant eur|montant signe|amount signed|signed amount|net amount|montant operation)$/]),
  debit:find([/^(debit|debits|sortie|withdrawal|debit eur|montant debit|debit amount|withdrawals|paid out|outflow|depense)$/]),
  credit:find([/^(credit|credits|entree|deposit|credit eur|montant credit|credit amount|deposits|paid in|inflow|recette)$/]),
  reference:find([/^(reference|ref|fitid|transaction id|id operation|id transaction|identifiant)$/]),
  currency:find([/^(devise|currency|code devise|currency code)$/]),
  suggestedLabel:find([/^(libelle suggere|suggested label|merchant label|nom suggere)$/]),
  category:find([/^(categorie|category|sous categorie|subcategory)$/]),
  parentCategory:find([/^(categorie parente|parent category|categorie principale|main category)$/]),
  balance:findLast([/^(solde|balance|balance eur|solde compte|solde apres operation)$/])
 };
 const balanceColumns=tokens.map((value,index)=>({value,index})).filter(item=>/^(solde|balance)$/.test(item.value));
 if(!mapping.amount&&!mapping.debit&&!mapping.credit&&balanceColumns.length>1){mapping.amount=String(balanceColumns[0].index);mapping.balance=String(balanceColumns[balanceColumns.length-1].index)}
 return mapping;
}
function parseDate(value:string):string|null{
 const raw=value.trim();if(!raw)return null;
 if(/^\d+(?:\.\d+)?$/.test(raw)){const serial=Number(raw);if(serial>=20000&&serial<=90000){const date=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000);return date.toISOString().slice(0,10)}}
 const iso=raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);let year:number,month:number,day:number;
 if(iso){year=Number(iso[1]);month=Number(iso[2]);day=Number(iso[3])}else{const match=raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4}|\d{2})/);if(!match)return null;day=Number(match[1]);month=Number(match[2]);year=Number(match[3]);if(year<100)year+=year>=70?1900:2000}
 if(!year||month<1||month>12||day<1||day>new Date(year,month,0).getDate())return null;return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function parseMoney(value:string):number|null{
 let raw=value.trim().replace(/[\u00a0\u202f\s'’€$£]/g,'').replace(/(EUR|USD|GBP)/gi,'');if(!raw)return null;
 if(/^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(raw)){const value=Number(raw);return Number.isFinite(value)&&Math.abs(value)<=100000000000?Math.round(value*100):null}
 const negative=/^\(.*\)$/.test(raw);raw=raw.replace(/[()]/g,'').replace(/−/g,'-');const sign=negative?-1:raw.startsWith('-')?-1:1;raw=raw.replace(/^[+-]/,'');
 const lastComma=raw.lastIndexOf(','),lastDot=raw.lastIndexOf('.');let decimal='';if(lastComma>=0&&lastDot>=0)decimal=lastComma>lastDot?',':'.';else if(lastComma>=0||lastDot>=0){const separator=lastComma>=0?',':'.';const digits=raw.length-raw.lastIndexOf(separator)-1;if(digits===1||digits===2)decimal=separator}
 if(decimal){const split=raw.lastIndexOf(decimal);raw=raw.slice(0,split).replace(/[.,]/g,'')+'.'+raw.slice(split+1).replace(/[.,]/g,'')}else raw=raw.replace(/[.,]/g,'');
 if(!/^\d+(\.\d{1,2})?$/.test(raw))return null;const amount=Number(raw);if(!Number.isFinite(amount)||amount>100000000000)return null;return sign*Math.round(amount*100);
}
export function transactionFingerprint(date:string,amountCents:number,currency:string,label:string,reference?:string|null):string{
 const external=reference?.trim();return `row:${date}|${amountCents}|${currency.toUpperCase().slice(0,3)}|${normalize(label).slice(0,400)}${external?`|id:${external.slice(0,150)}`:''}`;
}
export function parseTabularTransactions(records:string[][],mapping:CsvMapping,defaultCurrency='EUR',firstRowNumber=2):StatementTransaction[]{
 const col=(row:string[],key:string)=>key===''?'':row[Number(key)]||'';const seen=new Map<string,number>();
 return records.map((row,index)=>{
  const date=parseDate(col(row,mapping.date)),valueDate=parseDate(col(row,mapping.valueDate));const label=col(row,mapping.label).trim();const suggestedLabel=col(row,mapping.suggestedLabel).trim();const categoryHint=col(row,mapping.category).trim();const parentCategoryHint=col(row,mapping.parentCategory).trim();let amount:number|null=null;
  if(mapping.amount)amount=parseMoney(col(row,mapping.amount));else if(mapping.debit||mapping.credit){const debit=parseMoney(col(row,mapping.debit))||0,credit=parseMoney(col(row,mapping.credit))||0;amount=Math.abs(credit)-Math.abs(debit)}
  const currency=(col(row,mapping.currency).match(/[A-Za-z]{3}/)?.[0]||defaultCurrency).toUpperCase();const externalId=col(row,mapping.reference).trim()||null;const balance=mapping.balance?parseMoney(col(row,mapping.balance)):null;const error=!date?'Date illisible':!label?'Libellé manquant':amount===null?'Montant illisible':amount===0?'Montant nul':! /^[A-Z]{3}$/.test(currency)?'Devise illisible':undefined;
  const transactionDate=date||'',base=date&&amount!==null?transactionFingerprint(date,amount,currency,label):`invalid:${index}`,occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);const fingerprint=externalId?transactionFingerprint(date||'',amount||0,currency,label,externalId):`${base}|occurrence:${occurrence}`;
  return {rowNumber:index+firstRowNumber,transactionDate,valueDate,label,suggestedLabel,categoryHint,parentCategoryHint,amountCents:amount||0,currency,externalId,fingerprint,possibleDuplicate:occurrence>1,...(balance!==null?{balanceCents:balance,balanceDate:transactionDate||undefined}:{}),error};
 });
}
export function reconcileStatementBalances(transactions:StatementTransaction[]):BalanceReconciliation|null{
 const snapshots=new Map<string,Set<number>>(),totals=new Map<string,number>();
 for(const row of transactions){
  if(row.transactionDate&&!row.error)totals.set(row.transactionDate,(totals.get(row.transactionDate)||0)+row.amountCents);
  const date=row.balanceDate||row.transactionDate;
  if(row.balanceCents!==undefined&&date){const values=snapshots.get(date)||new Set<number>();values.add(row.balanceCents);snapshots.set(date,values)}
 }
 if(!snapshots.size)return null;
 const dates=[...snapshots.keys()].sort(),selected=new Map<string,number>(),mismatches:BalanceReconciliation['mismatches']=[],unresolvedDates:string[]=[],conflictingSnapshots:BalanceReconciliation['conflictingSnapshots']=[];
 const first=dates[0],firstValues=[...(snapshots.get(first)||[])].sort((a,b)=>a-b);
 if(firstValues.length===1)selected.set(first,firstValues[0]);else{unresolvedDates.push(first);conflictingSnapshots.push({date:first,candidateBalancesCents:firstValues,selectedBalanceCents:null})}
 let checkedIntervals=0,matchedIntervals=0;
 for(let index=1;index<dates.length;index++){
  const date=dates[index],previousDate=dates[index-1],previousBalance=selected.get(previousDate),candidates=[...(snapshots.get(date)||[])].sort((a,b)=>a-b);
  if(candidates.length>1)conflictingSnapshots.push({date,candidateBalancesCents:candidates,selectedBalanceCents:null});
  if(previousBalance===undefined){if(candidates.length===1)selected.set(date,candidates[0]);else unresolvedDates.push(date);continue}
  const intervalOperations=[...totals.entries()].filter(([operationDate])=>operationDate>previousDate&&operationDate<=date).reduce((sum,[,amount])=>sum+amount,0);
  const expectedBalanceCents=previousBalance+intervalOperations,matches=candidates.filter(value=>value===expectedBalanceCents);
  checkedIntervals++;
  if(matches.length===1){
   selected.set(date,matches[0]);matchedIntervals++;
   if(candidates.length>1){const conflict=conflictingSnapshots.find(item=>item.date===date);if(conflict)conflict.selectedBalanceCents=matches[0]}
  }else if(candidates.length===1){
   const reportedBalanceCents=candidates[0];selected.set(date,reportedBalanceCents);
   mismatches.push({fromDate:previousDate,toDate:date,expectedBalanceCents,reportedBalanceCents,differenceCents:reportedBalanceCents-expectedBalanceCents});
  }else{
   unresolvedDates.push(date);
  }
 }
 const latestDate=dates[dates.length-1],latestValue=selected.get(latestDate);
 return {checkedIntervals,matchedIntervals,mismatches,unresolvedDates,conflictingSnapshots,latestBalance:latestValue===undefined?null:{date:latestDate,balanceCents:latestValue}};
}
function resolveDuplicateBalanceMapping(records:string[][],headers:string[],mapping:CsvMapping):CsvMapping{
 const normalized=headers.map(normalize),balanceIndexes=normalized.map((value,index)=>({value,index})).filter(item=>/^(solde|balance|balance eur|solde compte|balance account)$/.test(item.value)).map(item=>item.index);
 const explicitAmount=normalized.some(value=>/^(montant|amount|value|valeur|transaction amount|amount eur|montant eur|montant signe|amount signed|signed amount|net amount|montant operation|debit|debits|sortie|withdrawal|montant debit|debit amount|withdrawals|paid out|outflow|depense|credit|credits|entree|deposit|montant credit|credit amount|deposits|paid in|inflow|recette)$/.test(value));
 if(explicitAmount||balanceIndexes.length<2)return mapping;
 const candidates=[{...mapping,amount:String(balanceIndexes[0]),debit:'',credit:'',balance:String(balanceIndexes[balanceIndexes.length-1])},{...mapping,amount:String(balanceIndexes[balanceIndexes.length-1]),debit:'',credit:'',balance:String(balanceIndexes[0])}];
 const scores=candidates.map(candidate=>{const checks=reconcileStatementBalances(parseTabularTransactions(records,candidate));if(!checks||checks.checkedIntervals<2)return {score:-1,checks};return {score:checks.matchedIntervals/checks.checkedIntervals,checks}});
 return scores[0].score>=0.8&&scores[0].score>scores[1].score?candidates[0]:scores[1].score>=0.8&&scores[1].score>scores[0].score?candidates[1]:mapping;
}
export function parseCsvTransactions(text:string,mapping:CsvMapping,defaultCurrency='EUR'):StatementTransaction[]{const parsed=parseCsv(text);return parseTabularTransactions(parsed.hasHeaders?parsed.records:parsed.records.slice(1),mapping,defaultCurrency,2)}
function csvRows(text:string){const parsed=parseCsv(text);const headerMapping=mapHeaders(parsed.headers);const hasHeaders=Boolean(parsed.headerRow<15&&headerScore(parsed.headers)>=2);const profiled=excelMapping(parsed.records);const inferred=Object.fromEntries((Object.keys(emptyMapping) as (keyof CsvMapping)[]).map(key=>[key,headerMapping[key]||(key==='amount'&&(headerMapping.debit||headerMapping.credit)?'':profiled[key])])) as CsvMapping;const headers=hasHeaders?parsed.headers:syntheticHeaders(Math.max(...parsed.records.slice(0,20).map(row=>row.length),0),inferred);const resolved=hasHeaders?resolveDuplicateBalanceMapping(parsed.records,headers,inferred):inferred;return {...parsed,headers,mapping:resolved,hasHeaders}}
function columnName(index:number){let n=index+1,name='';while(n){const rem=(n-1)%26;name=String.fromCharCode(65+rem)+name;n=Math.floor((n-1)/26)}return name}
function excelMapping(records:string[][]):CsvMapping{
 const width=Math.max(...records.slice(0,50).map(row=>row.length),0);const sample=records.slice(0,Math.min(records.length,50));const stats=Array.from({length:width},(_,index)=>{const values=sample.map(row=>row[index]||'').filter(value=>value.trim());const dates=values.filter(value=>parseDate(value)!==null).length;const numbers=values.filter(value=>parseMoney(value)!==null).length;const unique=new Set(values.map(normalize)).size;const averageLength=values.length?values.reduce((sum,value)=>sum+value.length,0)/values.length:0;return {index,values,dates,numbers,unique,ratio:values.length?unique/values.length:0,averageLength,filled:values.length}});
 const dateCols=stats.filter(stat=>stat.filled>=Math.min(sample.length,5)&&stat.dates/stat.filled>=.7).map(stat=>stat.index);const numberCols=stats.filter(stat=>stat.filled>=Math.min(sample.length,5)&&stat.numbers/stat.filled>=.7).map(stat=>stat.index);
 const textCols=stats.filter(stat=>stat.filled&&stat.averageLength>=5&&stat.ratio>=.45&&stat.dates===0&&stat.numbers===0).map(stat=>stat.index);
 const categoryCols=stats.filter(stat=>stat.filled>=Math.min(sample.length,5)&&stat.unique>=2&&stat.unique<=60&&stat.ratio<.45&&stat.dates===0&&stat.numbers===0).map(stat=>stat.index);
 const mapping={...emptyMapping};if(dateCols[0]!==undefined)mapping.date=String(dateCols[0]);if(dateCols[1]!==undefined)mapping.valueDate=String(dateCols[1]);if(textCols[0]!==undefined)mapping.label=String(textCols[0]);if(textCols[1]!==undefined)mapping.suggestedLabel=String(textCols[1]);if(categoryCols[0]!==undefined)mapping.category=String(categoryCols[0]);if(categoryCols[1]!==undefined)mapping.parentCategory=String(categoryCols[1]);if(numberCols[0]!==undefined)mapping.amount=String(numberCols[0]);if(numberCols[1]!==undefined)mapping.balance=String(numberCols[1]);return mapping;
}
function syntheticHeaders(width:number,mapping:CsvMapping){const labels=new Map<string,string>([[mapping.date,'Date opération'],[mapping.valueDate,'Date valeur'],[mapping.label,'Libellé'],[mapping.suggestedLabel,'Libellé suggéré'],[mapping.category,'Catégorie exportée'],[mapping.parentCategory,'Catégorie parente'],[mapping.amount,'Montant'],[mapping.debit,'Débit'],[mapping.credit,'Crédit'],[mapping.balance,'Solde'],[mapping.reference,'Référence'],[mapping.currency,'Devise']]);return Array.from({length:width},(_,index)=>labels.get(String(index))||`Colonne ${columnName(index)}`)}
function xmlDocument(data:Uint8Array){const document=new DOMParser().parseFromString(strFromU8(data),'application/xml');if(document.getElementsByTagName('parsererror').length)throw Error('Le fichier Excel contient une feuille illisible.');return document}
function firstSheetPath(workbook:Document,relationships:Document){const sheet=workbook.getElementsByTagNameNS('*','sheet')[0];if(!sheet)throw Error('Aucune feuille trouvée dans le fichier Excel.');const id=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');const relation=[...relationships.getElementsByTagNameNS('*','Relationship')].find(item=>item.getAttribute('Id')===id);if(!relation)throw Error('La première feuille du fichier Excel est introuvable.');const target=relation.getAttribute('Target')||'';const parts=(target.startsWith('/')?target.slice(1):`xl/${target}`).split('/');const normalized:string[]=[];for(const part of parts){if(part==='..')normalized.pop();else if(part!=='.'&&part)normalized.push(part)}return normalized.join('/')}
function xlsxRecords(bytes:Uint8Array){
 if(bytes.byteLength>10*1024*1024)throw Error('Le fichier ne peut pas dépasser 10 Mo.');let expanded=0;const allowed=new Set(['xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/sharedStrings.xml']);
 const metadata=unzipSync(bytes,{filter:file=>{const include=allowed.has(file.name)||/^xl\/worksheets\/sheet\d+\.xml$/.test(file.name);if(!include)return false;if(file.originalSize>8*1024*1024)throw Error('Le fichier Excel est trop volumineux après décompression.');expanded+=file.originalSize;if(expanded>24*1024*1024)throw Error('Le fichier Excel est trop volumineux après décompression.');return true}});
 const workbookFile=metadata['xl/workbook.xml'],relationshipsFile=metadata['xl/_rels/workbook.xml.rels'];if(!workbookFile||!relationshipsFile)throw Error('Ce fichier n’est pas un classeur Excel pris en charge.');const sheetPath=firstSheetPath(xmlDocument(workbookFile),xmlDocument(relationshipsFile));const files=unzipSync(bytes,{filter:file=>file.name===sheetPath||file.name==='xl/sharedStrings.xml'});const sheetBytes=files[sheetPath];if(!sheetBytes)throw Error('La première feuille Excel ne peut pas être lue.');
 const sharedStrings=files['xl/sharedStrings.xml']?[...xmlDocument(files['xl/sharedStrings.xml']).getElementsByTagNameNS('*','si')].map(item=>[...item.getElementsByTagNameNS('*','t')].map(text=>text.textContent||'').join('')):[];
 const sheet=xmlDocument(sheetBytes),rows=[...sheet.getElementsByTagNameNS('*','row')];const matrix:string[][]=[];
 for(const row of rows){const cells=[...row.getElementsByTagNameNS('*','c')];const values:string[]=[];for(const cell of cells){const ref=cell.getAttribute('r')||'';const letters=ref.match(/^[A-Z]+/i)?.[0]||'';let column=0;for(const char of letters.toUpperCase())column=column*26+char.charCodeAt(0)-64;column=Math.max(0,column-1);const type=cell.getAttribute('t');const value=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';let decoded=value;if(type==='s')decoded=sharedStrings[Number(value)]||'';else if(type==='inlineStr')decoded=[...cell.getElementsByTagNameNS('*','t')].map(text=>text.textContent||'').join('');values[column]=decoded}if(values.some(value=>value?.trim()))matrix.push(values.map(value=>value||''))}
 return matrix;
}
export function parseXlsxStatement(buffer:ArrayBuffer|Uint8Array,defaultCurrency='EUR'):StatementPreview{
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);const matrix=xlsxRecords(bytes);if(!matrix.length)throw Error('Aucune opération trouvée dans ce classeur Excel.');let headerIndex=0,score=0;for(let index=0;index<Math.min(matrix.length,15);index++){const current=headerScore(matrix[index]);if(current>score){score=current;headerIndex=index}}const hasHeaders=score>=2;const headerMapping=hasHeaders?mapHeaders(matrix[headerIndex]):emptyMapping;const records=hasHeaders?matrix.slice(headerIndex+1):matrix;const inferred=excelMapping(records);const initialMapping=Object.fromEntries((Object.keys(emptyMapping) as (keyof CsvMapping)[]).map(key=>[key,headerMapping[key]||inferred[key]])) as CsvMapping;const mapping=hasHeaders?resolveDuplicateBalanceMapping(records,matrix[headerIndex],initialMapping):initialMapping;if(!mapping.date||!mapping.label||(!mapping.amount&&!mapping.debit&&!mapping.credit))throw Error('Les colonnes de date, libellé et montant n’ont pas été reconnues. Vérifiez le format Excel ou exportez en CSV.');const width=Math.max(...matrix.map(row=>row.length),0);const headers=hasHeaders?matrix[headerIndex]:syntheticHeaders(width,mapping);return {format:'xlsx',headers,records,mapping,transactions:parseTabularTransactions(records,mapping,defaultCurrency,hasHeaders?headerIndex+2:1),hasHeaders};
}
function parseDateOfx(value:string):string|null{const raw=value.slice(0,8);return raw.length===8?parseDate(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`):null}
function xmlBlock(source:string,tag:string):string{
 const pattern=new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${tag}\\s*>`,'i');
 return source.match(pattern)?.[1]||'';
}
function xmlBlocks(source:string,tag:string):string[]{
 const pattern=new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[\\w.-]+):)?${tag}\\s*>`,'gi');
 return [...source.matchAll(pattern)].map(match=>match[0]);
}
function xmlText(source:string,tag:string):string{
 const value=xmlBlock(source,tag).replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g,' ').trim();
 return value;
}
function parseCamtStatement(text:string,defaultCurrency='EUR'):StatementPreview{
 if(!/<(?:[\w.-]+:)?(?:BkToCstmrStmt|Stmt)\b/i.test(text)||!/<(?:[\w.-]+:)?Ntry\b/i.test(text))throw Error('XML bancaire non reconnu. Choisissez un export CSV, OFX ou CAMT.053.');
 const entries=xmlBlocks(text,'Ntry'),seen=new Map<string,number>();
 const transactions:StatementTransaction[]=entries.map((entry,index)=>{
  const amountBlock=xmlBlock(entry,'Amt'),amount=parseMoney(xmlText(amountBlock,'Amt')||amountBlock.replace(/<[^>]+>/g,' ').trim());
  const currency=amountBlock.match(/\\bCcy=["']([^"']+)["']/i)?.[1]||defaultCurrency;
  const direction=xmlText(entry,'CdtDbtInd').toUpperCase();
  const amountCents=amount===null?0:Math.abs(amount)*(direction==='DBIT'?-1:1);
  const booking=xmlBlock(entry,'BookgDt'),value=xmlBlock(entry,'ValDt');
  const dateValue=xmlText(booking,'Dt')||xmlText(booking,'DtTm')||xmlText(value,'Dt')||xmlText(value,'DtTm');
  const date=parseDate(dateValue)||parseDateOfx(dateValue);
  const valueDateValue=xmlText(value,'Dt')||xmlText(value,'DtTm');
  const valueDate=parseDate(valueDateValue)||parseDateOfx(valueDateValue);
  const details=xmlBlock(entry,'NtryDtls')||entry;
  const remittance=xmlBlocks(details,'Ustrd').map(block=>block.replace(/<[^>]+>/g,' ').trim()).filter(Boolean);
  const relatedName=xmlBlocks(details,'RltdPties').map(block=>xmlText(block,'Nm')).find(Boolean)||'';
  const label=xmlText(entry,'AddtlNtryInf')||remittance.join(' · ')||xmlText(entry,'NtryRef')||'Opération bancaire';
  const externalId=xmlText(entry,'AcctSvcrRef')||xmlText(entry,'NtryRef')||null;
  const error=!date?'Date illisible':amount===null?'Montant illisible':amount===0?'Montant nul':undefined;
  const transactionDate=date||'',base=date&&amount!==null?transactionFingerprint(date,amountCents,currency,label):`invalid:${index}`,occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);
  return {rowNumber:index+1,transactionDate,valueDate:valueDate||null,label,suggestedLabel:relatedName||undefined,amountCents,currency:currency.toUpperCase(),externalId,fingerprint:externalId?transactionFingerprint(date||'',amountCents,currency,label,externalId):`${base}|occurrence:${occurrence}`,possibleDuplicate:occurrence>1,error};
 });
 const balances=xmlBlocks(text,'Bal');
 const parsedBalances=balances.map(block=>({block,type:xmlText(block,'Cd'),amountBlock:xmlBlock(block,'Amt'),dateSource:xmlBlock(block,'Dt')})).filter(balance=>balance.type==='CLBD'||balance.type==='OPBD').map(balance=>{
  const amount=parseMoney(xmlText(balance.amountBlock,'Amt')||balance.amountBlock.replace(/<[^>]+>/g,' ').trim());
  const dateValue=xmlText(balance.dateSource,'Dt')||xmlText(balance.dateSource,'DtTm');
  return {type:balance.type,amount,date:parseDate(dateValue)||parseDateOfx(dateValue),direction:xmlText(balance.block,'CdtDbtInd').toUpperCase(),currency:balance.amountBlock.match(/\\bCcy=["']([^"']+)["']/i)?.[1]||defaultCurrency};
 }).filter((balance):balance is typeof balance & {amount:number;date:string}=>balance.amount!==null&&Boolean(balance.date));
 const closing=parsedBalances.filter(balance=>balance.type==='CLBD').at(-1)||parsedBalances.at(-1);
 if(closing&&transactions.length){let index=transactions.length-1;for(let i=0;i<transactions.length;i++)if(transactions[i].transactionDate&&transactions[i].transactionDate<=closing.date)index=i;transactions[index]={...transactions[index],balanceCents:Math.round(Math.abs(closing.amount)*100)*(closing.direction==='DBIT'?-1:1),balanceDate:closing.date}}
 return {format:'camt',headers:[],records:[],mapping:emptyMapping,transactions};
}
export function parseDelimitedStatement(text:string,filename:string,defaultCurrency='EUR'):StatementPreview{
 const extension=filename.toLowerCase().split('.').pop();if(extension==='xml'||/<(?:[\w.-]+:)?Document\b/i.test(text)&&/<(?:[\w.-]+:)?Ntry\b/i.test(text))return parseCamtStatement(text,defaultCurrency);if(extension==='ofx'||extension==='qfx'||/<OFX|<STMTTRN/i.test(text)){
  const rows=[...text.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST|<\/OFX|$)/gi)],seen=new Map<string,number>();const balanceRaw=text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i)?.[1]||'',balance=parseMoney(balanceRaw),balanceDateRaw=text.match(/<LEDGERBAL>[\s\S]*?<DTASOF>(\d{8})/i)?.[1]||'',balanceDate=balanceDateRaw?parseDateOfx(balanceDateRaw)||undefined:undefined;
  const transactions=rows.map((match,index)=>{const body=match[1];const field=(name:string)=>body.match(new RegExp(`<${name}>([^<\\r\\n]+)`,'i'))?.[1].trim()||'';const date=parseDateOfx(field('DTPOSTED'));const label=field('NAME')||field('MEMO');const suggestedLabel=field('MEMO');const amount=parseMoney(field('TRNAMT'));const externalId=field('FITID')||null;const error=!date?'Date illisible':!label?'Libellé manquant':amount===null?'Montant illisible':amount===0?'Montant nul':undefined;const transactionDate=date||'';const base=date&&amount!==null?transactionFingerprint(date,amount,defaultCurrency,label):`invalid:${index}`;const occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);return {rowNumber:index+1,transactionDate,valueDate:null,label,suggestedLabel,amountCents:amount||0,currency:defaultCurrency.toUpperCase(),externalId,fingerprint:externalId?transactionFingerprint(date||'',amount||0,defaultCurrency,label,externalId):`${base}|occurrence:${occurrence}`,possibleDuplicate:occurrence>1,...(index===rows.length-1&&balance!==null?{balanceCents:balance,balanceDate}:{}),error}});return {format:'ofx',headers:[],records:[],mapping:emptyMapping,transactions};
 }
 if(extension==='qif'||/^!Type:/m.test(text)){
  const transactions:StatementTransaction[]=[],seen=new Map<string,number>();let record:Record<string,string>={};const flush=()=>{if(!Object.keys(record).length)return;const date=parseDate(record.D||''),amount=parseMoney(record.T||''),label=record.P||record.M||record.L||'',externalId=record.N||null;const categoryPath=(record.L||'').split(':').map(value=>value.trim()).filter(Boolean);const categoryHint=categoryPath.length?categoryPath.at(-1):'';const parentCategoryHint=categoryPath.length>1?categoryPath.slice(0,-1).join(':'):'';const error=!date?'Date illisible':!label?'Libellé manquant':amount===null?'Montant illisible':amount===0?'Montant nul':undefined;const transactionDate=date||'',base=date&&amount!==null?transactionFingerprint(date,amount,defaultCurrency,label):`invalid:${transactions.length}`,occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);transactions.push({rowNumber:transactions.length+1,transactionDate,valueDate:null,label,categoryHint,parentCategoryHint,amountCents:amount||0,currency:defaultCurrency.toUpperCase(),externalId,fingerprint:externalId?transactionFingerprint(date||'',amount||0,defaultCurrency,label,externalId):`${base}|occurrence:${occurrence}`,possibleDuplicate:occurrence>1,error});record={}};
  for(const line of text.split(/\r?\n/)){if(line.trim()==='^'){flush();continue}if(line.length>1)record[line[0]]=(record[line[0]]?record[line[0]]+' ':'')+line.slice(1).trim()}flush();return {format:'qif',headers:[],records:[],mapping:emptyMapping,transactions}}
 const {headers,records,mapping,hasHeaders}=csvRows(text);return {format:'csv',headers,records,mapping,transactions:parseTabularTransactions(records,mapping,defaultCurrency,hasHeaders?2:1),hasHeaders};
}

/** Decode common bank export encodings without sending statement data off-device. */
export function decodeStatementText(buffer:ArrayBuffer):string{
 const bytes=new Uint8Array(buffer);if(bytes[0]===0xff&&bytes[1]===0xfe)return new TextDecoder('utf-16le').decode(bytes.subarray(2));if(bytes[0]===0xfe&&bytes[1]===0xff)return new TextDecoder('utf-16be').decode(bytes.subarray(2));
 const start=bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf?3:0;const utf8=new TextDecoder('utf-8',{fatal:false}).decode(bytes.subarray(start));if(!utf8.includes('\uFFFD'))return utf8;
 try{return new TextDecoder('windows-1252').decode(bytes.subarray(start))}catch{return utf8}
}
