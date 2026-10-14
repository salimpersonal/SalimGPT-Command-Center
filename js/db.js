const DB_NAME='salimgpt-command-center';
const STORE='records';
let dbPromise=null;
function connect(){
 if(!('indexedDB' in globalThis))return Promise.reject(new Error('IndexedDB unavailable'));
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB_NAME,2);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('collection','collection',{unique:false});}};
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error);
 });
 return dbPromise;
}
function transaction(mode,fn){return connect().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),s=tx.objectStore(STORE);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Database transaction aborted'));fn(s,v=>{result=v;});}));}
export const getAllRows=()=>transaction('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result);});
export const putRow=row=>transaction('readwrite',(s)=>{s.put(row);});
export const clearRows=()=>transaction('readwrite',(s)=>{s.clear();});
export const deleteRow=key=>transaction('readwrite',(s)=>{s.delete(key);});
export const closeDatabase=async()=>{const db=await connect();db.close();dbPromise=null;};
