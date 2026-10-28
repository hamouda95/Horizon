export type CsvMapping={date:string;label:string;amount:string;debit:string;credit:string;valueDate:string;reference:string;currency:string};
export type StatementTransaction={rowNumber:number;transactionDate:string;valueDate:string|null;label:string;amountCents:number;currency:string;externalId:string|null;fingerprint:string;possibleDuplicate?:boolean;balanceCents?:number;balanceDate?:string;error?:string};
export type StatementPreview={format:'csv'|'ofx'|'qif';headers:string[];records:string[][];mapping:CsvMapping;transactions:StatementTransaction[]};
const emptyMapping:CsvMapping={date:'',label:'',amount:'',debit:'',credit:'',valueDate:'',reference:'',currency:''};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function parseCsv(text:string):{headers:string[];records:string[][];delimiter:string}{
 const source=text.replace(/^\uFEFF/,'');const first=source.split(/\r?\n/,1)[0]||'';const candidates=[',',';','\t'];const delimiter=candidates.map(char=>({char,count:[...first].filter(c=>c===char).length})).sort((a,b)=>b.count-a.count)[0]?.char||',';
 const records:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){const char=source[i];if(char==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(char===delimiter&&!quoted){row.push(cell);cell=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))records.push(row);row=[];cell=''}else cell+=char}
 row.push(cell);if(row.some(value=>value.trim()))records.push(row);
 const headers=(records.shift()||[]).map((value,index)=>value.trim()||`Colonne ${index+1}`);return {headers,records,delimiter};
}
function mapHeaders(headers:string[]):CsvMapping{
 const tokens=headers.map(normalize);const find=(patterns:RegExp[])=>{const index=tokens.findIndex(value=>patterns.some(pattern=>pattern.test(value)));return index<0?'':String(index)};
 const amount=find([/^(montant|amount|value|valeur|transaction amount|amount eur|montant eur)$/]);
 return {date:find([/^(date|date operation|date d operation|operation date|booking date|booked date|date comptable|date comptabilisation)$/]),valueDate:find([/^(date valeur|value date|date val|valuta)$/]),label:find([/^(libelle|label|description|operation|transaction|nom|name|detail|details|communication)$/]),amount,debit:find([/^(debit|debits|sortie|withdrawal|debit eur|montant debit)$/]),credit:find([/^(credit|credits|entree|deposit|credit eur|montant credit)$/]),reference:find([/^(reference|ref|fitid|transaction id|id operation|id transaction|identifiant)$/]),currency:find([/^(devise|currency|code devise|currency code)$/])};
}
function csvRows(text:string){const parsed=parseCsv(text);return {...parsed,mapping:mapHeaders(parsed.headers)}}
function parseDate(value:string):string|null{
 const raw=value.trim();if(!raw)return null;
 const iso=raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);let year:number,month:number,day:number;
 if(iso){year=Number(iso[1]);month=Number(iso[2]);day=Number(iso[3])}else{const match=raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})/);if(!match)return null;day=Number(match[1]);month=Number(match[2]);year=Number(match[3]);if(year<100)year+=year>=70?1900:2000}
 if(!year||month<1||month>12||day<1||day>new Date(year,month,0).getDate())return null;return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function parseMoney(value:string):number|null{
 let raw=value.trim().replace(/[\u00a0\u202f\s'’€$£]/g,'').replace(/(EUR|USD|GBP)/gi,'');if(!raw)return null;
 const negative=/^\(.*\)$/.test(raw);raw=raw.replace(/[()]/g,'').replace(/−/g,'-');const sign=negative?-1:raw.startsWith('-')?-1:1;raw=raw.replace(/^[+-]/,'');
 const lastComma=raw.lastIndexOf(','),lastDot=raw.lastIndexOf('.');let decimal='';if(lastComma>=0&&lastDot>=0)decimal=lastComma>lastDot?',':'.';else if(lastComma>=0||lastDot>=0){const separator=lastComma>=0?',':'.';const digits=raw.length-raw.lastIndexOf(separator)-1;if(digits===1||digits===2)decimal=separator}
 if(decimal){const split=raw.lastIndexOf(decimal);raw=raw.slice(0,split).replace(/[.,]/g,'')+'.'+raw.slice(split+1).replace(/[.,]/g,'')}else raw=raw.replace(/[.,]/g,'');
 if(!/^\d+(\.\d{1,2})?$/.test(raw))return null;const amount=Number(raw);if(!Number.isFinite(amount)||amount>100000000000)return null;return sign*Math.round(amount*100);
}
export function transactionFingerprint(date:string,amountCents:number,currency:string,label:string,reference?:string|null):string{
 const external=reference?.trim();return `row:${date}|${amountCents}|${currency.toUpperCase().slice(0,3)}|${normalize(label).slice(0,400)}${external?`|id:${external.slice(0,150)}`:''}`;
}
export function parseCsvTransactions(text:string,mapping:CsvMapping,defaultCurrency='EUR'):StatementTransaction[]{
 const {records}=parseCsv(text);const col=(row:string[],key:string)=>key===''?'':row[Number(key)]||'';const seen=new Map<string,number>();
 return records.map((row,index)=>{
  const date=parseDate(col(row,mapping.date)),valueDate=parseDate(col(row,mapping.valueDate));const label=col(row,mapping.label).trim();let amount:number|null=null;
  if(mapping.amount)amount=parseMoney(col(row,mapping.amount));else if(mapping.debit||mapping.credit){const debit=parseMoney(col(row,mapping.debit))||0,credit=parseMoney(col(row,mapping.credit))||0;amount=Math.abs(credit)-Math.abs(debit)}
  const currency=(col(row,mapping.currency).match(/[A-Za-z]{3}/)?.[0]||defaultCurrency).toUpperCase();const externalId=col(row,mapping.reference).trim()||null;const error=!date?'Date illisible':!label?'Libellé manquant':amount===null?'Montant illisible':amount===0?'Montant nul':! /^[A-Z]{3}$/.test(currency)?'Devise illisible':undefined;
  const transactionDate=date||'',base=date&&amount!==null?transactionFingerprint(date,amount,currency,label):`invalid:${index}`,occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);const fingerprint=date&&amount!==null?transactionFingerprint(date,amount,currency,label,externalId)||`${base}|occurrence:${occurrence}`:`invalid:${index}`;const stableFingerprint=externalId?fingerprint:`${base}|occurrence:${occurrence}`;
  return {rowNumber:index+2,transactionDate,valueDate,label,amountCents:amount||0,currency,externalId,fingerprint:stableFingerprint,possibleDuplicate:occurrence>1,error};
 });
}
export function parseDelimitedStatement(text:string,filename:string,defaultCurrency='EUR'):StatementPreview{
 const extension=filename.toLowerCase().split('.').pop();if(extension==='ofx'||extension==='qfx'||/<OFX|<STMTTRN/i.test(text)){
  const rows=[...text.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST|<\/OFX|$)/gi)],seen=new Map<string,number>();
  const balanceRaw=text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i)?.[1]||'',balance=parseMoney(balanceRaw),balanceDateRaw=text.match(/<LEDGERBAL>[\s\S]*?<DTASOF>(\d{8})/i)?.[1]||'',balanceDate=balanceDateRaw?parseDate(`${balanceDateRaw.slice(0,4)}-${balanceDateRaw.slice(4,6)}-${balanceDateRaw.slice(6,8)}`)||undefined:undefined;
  const transactions=rows.map((match,index)=>{const body=match[1];const field=(name:string)=>body.match(new RegExp(`<${name}>([^<\\r\\n]+)` ,'i'))?.[1].trim()||'';const dateRaw=field('DTPOSTED').slice(0,8);const date=dateRaw.length===8?parseDate(`${dateRaw.slice(0,4)}-${dateRaw.slice(4,6)}-${dateRaw.slice(6,8)}`):null;const label=field('NAME')||field('MEMO');const amount=parseMoney(field('TRNAMT'));const externalId=field('FITID')||null;const error=!date?'Date illisible':!label?'Libellé manquant':amount===null?'Montant illisible':amount===0?'Montant nul':undefined;const transactionDate=date||'';const base=date&&amount!==null?transactionFingerprint(date,amount,defaultCurrency,label):`invalid:${index}`;const occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);return {rowNumber:index+1,transactionDate,valueDate:null,label,amountCents:amount||0,currency:defaultCurrency.toUpperCase(),externalId,fingerprint:externalId?transactionFingerprint(date||'',amount||0,defaultCurrency,label,externalId):`${base}|occurrence:${occurrence}`,possibleDuplicate:occurrence>1,...(index===rows.length-1&&balance!==null?{balanceCents:balance,balanceDate}:{}),error}});return {format:'ofx',headers:[],records:[],mapping:emptyMapping,transactions}}
 if(extension==='qif'||/^!Type:/m.test(text)){
  const transactions:StatementTransaction[]=[],seen=new Map<string,number>();let record:Record<string,string>={};
  const flush=()=>{if(!Object.keys(record).length)return;const date=parseDate(record.D||''),amount=parseMoney(record.T||''),label=record.P||record.M||record.L||'',externalId=record.N||null;const error=!date?'Date illisible':!label?'Libellé manquant':amount===null?'Montant illisible':amount===0?'Montant nul':undefined;const transactionDate=date||'',base=date&&amount!==null?transactionFingerprint(date,amount,defaultCurrency,label):`invalid:${transactions.length}`,occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence);transactions.push({rowNumber:transactions.length+1,transactionDate,valueDate:null,label,amountCents:amount||0,currency:defaultCurrency.toUpperCase(),externalId,fingerprint:externalId?transactionFingerprint(date||'',amount||0,defaultCurrency,label,externalId):`${base}|occurrence:${occurrence}`,possibleDuplicate:occurrence>1,error});record={}};
  for(const line of text.split(/\r?\n/)){if(line.trim()==='^'){flush();continue}if(line.length>1)record[line[0]]=(record[line[0]]?record[line[0]]+' ':'')+line.slice(1).trim()}flush();return {format:'qif',headers:[],records:[],mapping:emptyMapping,transactions}}
 const {headers,records,mapping}=csvRows(text);return {format:'csv',headers,records,mapping,transactions:parseCsvTransactions(text,mapping,defaultCurrency)};
}
