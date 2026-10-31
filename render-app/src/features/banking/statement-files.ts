import {unzipSync} from 'fflate';
import {decodeStatementText,parseDelimitedStatement,parseXlsxStatement,type StatementPreview} from './bank-import';
export type ArchiveStatement={name:string;bytes:Uint8Array};
const supported=/\.(csv|tsv|txt|xlsx|xml|ofx|qfx|qif|pdf)$/i;
export function archiveStatements(bytes:Uint8Array):ArchiveStatement[]{
 if(bytes.byteLength>10*1024*1024)throw Error('Archive limitée à 10 Mo.');
 let count=0,expanded=0;
 const files=unzipSync(bytes,{filter:f=>{
  if(++count>100)throw Error('Archive limitée à 100 fichiers.');
  if(f.name.startsWith('__MACOSX/')||f.name.split('/').some(p=>p.startsWith('.'))||!supported.test(f.name))return false;
  expanded+=f.originalSize;
  if(f.originalSize>10*1024*1024||expanded>25*1024*1024)throw Error('Archive trop volumineuse après décompression.');
  return true;
 }});
 const entries=Object.entries(files).map(([name,bytes])=>({name,bytes}));
 if(!entries.length)throw Error('Aucun relevé pris en charge dans cette archive. Les archives imbriquées et chiffrées ne sont pas prises en charge.');
 return entries;
}
export async function readStatementFile(name:string,bytes:Uint8Array):Promise<StatementPreview>{
 if(bytes.byteLength>10*1024*1024)throw Error('Fichier limité à 10 Mo.');
 if(/\.pdf$/i.test(name)){const {readPdfStatement}=await import('./statement-pdf');return readPdfStatement(bytes)}
 if(/\.xlsx$/i.test(name))return parseXlsxStatement(bytes);
 if(!supported.test(name))throw Error('Choisissez un relevé CSV, Excel, OFX, QIF, CAMT ou PDF.');
 return parseDelimitedStatement(decodeStatementText(bytes.slice().buffer as ArrayBuffer),name);
}
