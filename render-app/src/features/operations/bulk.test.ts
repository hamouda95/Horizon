import {expect,it} from 'vitest';
import {chunk,runInBatches} from './bulk';

it('découpe une sélection en lots de 500 au plus',()=>{
 const ids=Array.from({length:1201},(_,i)=>i);
 expect(chunk(ids).map(b=>b.length)).toEqual([500,500,201]);
 expect(chunk([])).toEqual([]);
});

it('traite les lots dans l’ordre et signale la progression',async()=>{
 const seen:number[]=[],progress:number[]=[];
 const result=await runInBatches([1,2,3,4,5],async batch=>{seen.push(...batch);return batch.length},p=>progress.push(p.done),2);
 expect(result).toEqual({processed:5});expect(seen).toEqual([1,2,3,4,5]);expect(progress).toEqual([2,4,5]);
});

it('s’arrête au premier lot en échec en gardant le nombre déjà traité',async()=>{
 let calls=0;
 const result=await runInBatches([1,2,3,4,5],async batch=>{calls++;if(calls===2)throw Error('refus');return batch.length},undefined,2);
 expect(result.processed).toBe(2);expect(result.error?.message).toBe('refus');expect(calls).toBe(2);
});
