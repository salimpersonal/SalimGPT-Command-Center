import test from 'node:test';
import assert from 'node:assert/strict';
import {signature} from '../js/sync-core.js';

class LocalStorageStub{constructor(){this.m=new Map()}getItem(k){return this.m.get(k)||null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
globalThis.localStorage=new LocalStorageStub();
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});

const database=new Map();
class FakeDb{constructor(){this.objectStoreNames={contains:x=>database.has(x)}}createObjectStore(name){database.set(name,new Map());return{createIndex(){}}}transaction(name){const data=database.get(name);const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){return{getAll(){const request={result:[],onsuccess:null};setImmediate(()=>{request.result=[...data.values()].map(structuredClone);request.onsuccess?.();setImmediate(()=>tx.oncomplete?.())});return request;},put(row){data.set(row.key,structuredClone(row));setImmediate(()=>tx.oncomplete?.())},clear(){data.clear();setImmediate(()=>tx.oncomplete?.())}}}};return tx;}close(){}}
const fakeDb=new FakeDb();
globalThis.indexedDB={open(){const r={result:fakeDb,onupgradeneeded:null,onsuccess:null,onerror:null};setImmediate(()=>{r.onupgradeneeded?.();r.onsuccess?.()});return r;}};

const remote=new Map();let counter=0;
const response=(status,data)=>({ok:status<400,status,text:async()=>JSON.stringify(data)});
globalThis.fetch=async(url,init={})=>{
 const path=new URL(url).pathname;
 if(path==='/user')return response(200,{login:'salimpersonal'});
 if(path==='/repos/salimpersonal/SalimGPT-Private-Data')return response(200,{private:true,full_name:'salimpersonal/SalimGPT-Private-Data'});
 const match=/^\/repos\/salimpersonal\/SalimGPT-Private-Data\/contents\/data\/([a-z]+)\.json$/.exec(path);
 if(!match)throw Error('Unexpected URL '+url);
 const col=match[1],record=remote.get(col);
 if(init.method==='PUT'){
  const b=JSON.parse(init.body);
  if((record?.sha||undefined)!==b.sha)return response(409,{message:'Conflict'});
  const decoded=Buffer.from(b.content,'base64').toString('utf8');const doc=JSON.parse(decoded);const sha='sha'+(++counter);
  remote.set(col,{sha,doc});return response(200,{content:{sha}});
 }
 if(!record)return response(404,{message:'Not Found'});
 return response(200,{type:'file',sha:record.sha,content:Buffer.from(JSON.stringify(record.doc)).toString('base64')});
};

test('GitHub-only end-to-end write, reload/recovery, disjoint merges and conflict protection',async()=>{
 const cloud=await import('../js/cloud.js');
 const store=await import('../js/store.js');
 cloud.setCloudConfig('salimpersonal','SalimGPT-Private-Data');
 await cloud.signIn('github_pat_'+('x'.repeat(35)));
 await store.initializeStore();
 const p=await store.save('projects',{title:'Production Documentary',status:'active'});
 const y=await store.save('profiles',{label:'YouTube',url:'https://youtube.com/@test',status:'active'});
 const t=await store.save('profiles',{label:'Telegram',url:'https://t.me/test',status:'active'});
 await store.save('publications',{id:p.id+':'+y.id,projectId:p.id,profileId:y.id,status:'published'});
 assert.equal(store.pendingCount(),4);
 let result=await store.syncCloud();
 assert.equal(result.uploaded,4);
 assert.equal(store.pendingCount(),0);
 assert.equal(remote.get('profiles').doc.records[y.id].data.label,'YouTube');
 // Clear local storage, simulate user reconnect and recover from private GitHub.
 await store.clearLocal();cloud.signOut();assert.equal(store.all('projects').length,0);
 await cloud.signIn('github_pat_'+('x'.repeat(35)));
 result=await store.syncCloud();
 assert.ok(result.downloaded>=4);
 assert.equal(store.all('profiles').length,2);
 assert.equal(store.all('publications')[0].status,'published');
 // Two devices edit DIFFERENT records in same collection: merge rather than overwrite.
 const newProfile=await store.save('profiles',{label:'Website',url:'https://example.com',status:'active'});
 const stored=remote.get('profiles');stored.doc.records['elsewhere']={data:{id:'elsewhere',label:'Elsewhere',status:'active'},deleted:false};stored.sha='shaExternal';
 result=await store.syncCloud();
 assert.equal(result.conflicts,0);
 assert.ok(remote.get('profiles').doc.records[newProfile.id]);
 assert.ok(remote.get('profiles').doc.records['elsewhere']);
 // Conflict on same ID must be preserved for user choice.
 const local=store.get('profiles',y.id);
 await store.save('profiles',{...local,label:'Locally changed'});
 const cloudDoc=remote.get('profiles');cloudDoc.doc.records[y.id]={...cloudDoc.doc.records[y.id],data:{...cloudDoc.doc.records[y.id].data,label:'Changed elsewhere'}};
 cloudDoc.sha='shaServerEdit';
 result=await store.syncCloud();
 assert.ok(result.conflicts>=1);
 assert.equal(remote.get('profiles').doc.records[y.id].data.label,'Changed elsewhere');
 const i=store.conflicts.findIndex(x=>x.id===y.id);assert.ok(i>=0);
 await store.resolveConflict(i,'remote');
 assert.equal(store.get('profiles',y.id).label,'Changed elsewhere');
 assert.equal(store.all('profiles').length,4);
 clearTimeout();cloud.signOut();
});
