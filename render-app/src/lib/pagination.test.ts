import {test} from 'vitest';import {strict as assert} from 'node:assert';import {collectPages} from './pagination.ts';
test('collecte toutes les pages même si le serveur limite chaque page',async()=>{const rows=Array.from({length:1201},(_,i)=>({id:String(i).padStart(5,'0')}));let calls=0;const result=await collectPages(async after=>{calls++;return rows.filter(r=>after===null||r.id>after).slice(0,127)});assert.deepEqual(result,rows);assert.ok(calls>2)});
test('remonte une erreur et ne retourne pas une liste partielle',async()=>{await assert.rejects(()=>collectPages(async after=>{if(after)throw Error('réseau');return [{id:'01'}]}),/réseau/)});
test('rejette les pages qui ne progressent pas',async()=>{await assert.rejects(()=>collectPages(async()=>[{id:'01'}]),/progressé/)});
