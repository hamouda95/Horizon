// The bulk_manage_entries RPC accepts at most 500 ids per call; larger selections are sent in sequential batches.
export const BULK_BATCH_SIZE=500;

export function chunk<T>(items:readonly T[],size=BULK_BATCH_SIZE):T[][]{
 if(size<1)throw RangeError('Batch size must be positive');
 const batches:T[][]=[];for(let i=0;i<items.length;i+=size)batches.push(items.slice(i,i+size));return batches;
}

export type BatchProgress={done:number;total:number};

// Runs batches one after another and stops at the first failure, reporting how many items were already processed.
export async function runInBatches<T>(items:readonly T[],run:(batch:T[])=>Promise<number>,onProgress?:(progress:BatchProgress)=>void,size=BULK_BATCH_SIZE):Promise<{processed:number;error?:Error}>{
 let processed=0,done=0;
 for(const batch of chunk(items,size)){
  try{processed+=await run(batch)}catch(e){return{processed,error:e instanceof Error?e:Error(String(e))}}
  done+=batch.length;onProgress?.({done,total:items.length});
 }
 return{processed};
}
