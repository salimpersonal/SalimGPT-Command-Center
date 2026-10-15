import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,createDocumentary} from '../assets/js/domain.js';
import {saveCloudConfig,cloudSignIn,cloudRead,cloudUpload,signOut} from '../assets/js/cloud.js';

test('manual cloud backup creates snapshot, bumps revision and refuses stale overwrites',async()=>{
 const local=new Map(),session=new Map();
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},configurable:true});
 Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},configurable:true});
 saveCloudConfig({url:'https://example.supabase.co',publishableKey:'sb_publishable_public_test_key'});
 const user={id:'12345678-1234-1234-1234-123456789abc',email:'admin@salimgpt.test'};
 let remote=null;
 globalThis.fetch=async(url,opt)=>{
  const options=opt||{};const body=options.body?JSON.parse(options.body):null;
  if(url.includes('/auth/v1/token?grant_type=password'))return Response.json({access_token:'tokenA',refresh_token:'refreshA',expires_in:3600,user});
  if(url.includes('/rest/v1/workspace_snapshots')){
   if(options.method==='GET')return Response.json(remote?[remote]:[]);
   if(options.method==='POST'){
    remote={payload:body.payload,revision:1,updated_at:'2026-10-15'};
    return Response.json([{revision:remote.revision}]);
   }
   if(options.method==='PATCH'){
    const rev=Number(new URL(url).searchParams.get('revision')?.replace('eq.',''));
    if(!remote||rev!==remote.revision)return Response.json([]);
    remote={...remote,payload:body.payload,revision:remote.revision+1};return Response.json([{revision:remote.revision}]);
   }
  }
  throw Error(`Unexpected mocked fetch: ${url}`);
 };
 await cloudSignIn('admin@salimgpt.test','test-password');
 const s=initialState();createDocumentary(s,{title:'Test cloud sync'});
 assert.equal(await cloudRead(),null);
 let result=await cloudUpload(s);assert.equal(result.revision,1);assert.equal(result.created,true);
 result=await cloudUpload(s);assert.equal(result.revision,2);assert.equal(result.created,false);
 remote.revision=3; // update made by a different device
 await assert.rejects(()=>cloudUpload(s),/changed on another device/);
 signOut();assert.equal(session.size,0);
});
