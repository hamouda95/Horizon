import {expect,it} from 'vitest';
import {zipSync,strToU8} from 'fflate';
import {archiveStatements,readStatementFile} from './statement-files';
import {pdfStatementPreview} from './statement-pdf';
it('ouvre les relevés sans mélanger les autres fichiers de l’archive',async()=>{
 const files=archiveStatements(zipSync({'folder/example.qif':strToU8('!Type:Bank\nD30/10/2026\nT-12.50\nPMagasin exemple\n^'),'notes.exe':strToU8('ignored'),'__MACOSX/._example.qif':strToU8('ignored')}));
 expect(files.map(f=>f.name)).toEqual(['folder/example.qif']);
 expect((await readStatementFile(files[0].name,files[0].bytes)).transactions[0].amountCents).toBe(-1250);
});
it('refuse les archives sans relevé ou excessivement décompressées',()=>{
 expect(()=>archiveStatements(zipSync({'nested.zip':strToU8('nested')}))).toThrow();
 expect(()=>archiveStatements(zipSync({'large.csv':new Uint8Array(11*1024*1024)}))).toThrow(/volumineuse/);
});
it('extrait les colonnes débit et crédit du PDF sans importer ses totaux',()=>{
 const p=pdfStatementPreview([[{str:'Débit',x:400,y:100},{str:'Crédit',x:500,y:100},{str:'30/10/2026',x:10,y:90},{str:'Magasin exemple',x:100,y:90},{str:'12,50',x:400,y:90},{str:'31/10/2026',x:10,y:80},{str:'Virement exemple',x:100,y:80},{str:'50,00',x:500,y:80},{str:'31/10/2026 Solde 301,72',x:10,y:70}]]);
 expect(p.transactions.map(r=>r.amountCents)).toEqual([-1250,5000]);
 expect(p.transactions.every(r=>r.balanceCents===undefined&&!r.error)).toBe(true);
});
it('signale les montants ambigus et refuse un PDF sans texte exploitable',()=>{
 expect(pdfStatementPreview([[{str:'30/10/2026 Magasin exemple 12,50',x:0,y:0}]]).transactions[0].error).toMatch(/vérifier/);
 expect(()=>pdfStatementPreview([[]])).toThrow(/scanné/);
});
