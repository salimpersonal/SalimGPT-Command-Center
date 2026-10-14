import test from 'node:test';
import assert from 'node:assert/strict';
import {setCloudConfig,getCloudConfig,isSignedIn,signIn,signOut,getRemoteCollection,putRemoteCollection} from '../js/cloud.js';
class Store {constructor(){this.m=new Map()}getItem(k){return this.m.get(k)||null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
globalThis.localStorage=new Store();
const requests=[];
globalThis.fetch=async(url,init={})=>{
 requests.push({url,init});
 const ok=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data)});
 if(url.endsWith('/user'))return ok({login:'salimpersonal'});
 if(url.endsWith('/repos/salimpersonal/SalimGPT-Private-Data'))return ok({private:true,full_name:'salimpersonal/SalimGPT-Private-Data'});
 if(init.method==='PUT'){const b=JSON.parse(init.body);return ok({content:{sha:'newSHA'},commit:{sha:'sha'}},201)}
 return ok({message:'Not Found'},404);
};
test('credentials only live in memory; private repo required',async()=>{
 setCloudConfig('salimpersonal','SalimGPT-Private-Data');
 const t='github_pat_abcdefghijklmnopqrstuvwxyz01234';
 await signIn(t);
 assert.ok(isSignedIn());
 assert.ok(!JSON.stringify([...localStorage.m]).includes(t),'Token must not enter LocalStorage');
 assert.equal(getCloudConfig().repo,'SalimGPT-Private-Data');
 assert.equal((await getRemoteCollection('ideas')).sha,null);
 await putRemoteCollection('ideas',{'one':{data:{id:'one',title:'বাংলা গবেষণা'},deleted:false}},null);
 assert.ok(requests.some(r=>r.init.method==='PUT'));
 assert.ok(requests.every(r=>!r.init.headers?.['X-GitHub-Api-Version']), 'browser CORS unsafe custom header is forbidden');
 assert.ok(requests.filter(r=>r.init.headers?.Authorization).every(r=>r.init.headers.Authorization==='Bearer '+t));
 signOut();assert.equal(isSignedIn(),false);
});
test('GitHub owner and repo are validated against URL injection',()=>{
 assert.throws(()=>setCloudConfig('salimpersonal','../something'));
 assert.throws(()=>setCloudConfig('https://example.com','hi'));
});
