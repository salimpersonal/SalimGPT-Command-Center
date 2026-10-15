import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,createDocumentary,createProfile,setPublication,softDelete} from '../assets/js/domain.js';

test('all application screens render safely using a lightweight DOM shell',async()=>{
 const state=initialState();
 const doc1=createDocumentary(state,{title:'বাংলাদেশের ইতিহাস <img src=x onerror=alert(1)>',stage:'research',targetDate:'2026-10-22'});
 const doc2=createDocumentary(state,{title:'Documentary B',stage:'idea'});
 const profile=createProfile(state,{name:'Channel One',platform:'YouTube',url:'https://youtube.com/test'});
 setPublication(state,doc1.id,profile.id,{status:'published',postUrl:'https://youtube.com/watch?v=abc'});
 const trashDoc=createDocumentary(state,{title:'Deleted doc'});softDelete(state,'documentary',trashDoc.id);
 const memory=new Map([['salimgpt-v2-fallback',JSON.stringify(state)]]);
 Object.defineProperty(globalThis,'indexedDB',{value:undefined,configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},configurable:true});
 Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:()=>null,removeItem:()=>{},setItem:()=>{}},configurable:true});
 const root={innerHTML:''};const listeners={};
 Object.defineProperty(globalThis,'document',{value:{getElementById:(id)=>id==='app'?root:null,documentElement:{setAttribute:()=>{}},addEventListener:(type,handler)=>listeners[`doc-${type}`]=handler},configurable:true});
 Object.defineProperty(globalThis,'window',{value:{addEventListener:(type,handler)=>listeners[type]=handler,scrollTo:()=>{}},configurable:true});
 Object.defineProperty(globalThis,'location',{value:{hash:'#/dashboard',protocol:'file:',hostname:''},configurable:true});
 const warn=console.warn;console.warn=()=>{};
 try{await import('../assets/js/main.js');await new Promise(r=>setTimeout(r,40));}finally{console.warn=warn;}
 assert.match(root.innerHTML,/Production|প্রোডাকশন/);
 for(const [route,text] of [
  ['#/documentaries','Documentary B'],
  [`#/doc/${doc1.id}`,'Channel One'],
  [`#/doc/${doc2.id}`,'Channel One'],
  ['#/network','Channel One'],
  ['#/schedule','RELEASE PLANNING'],
  ['#/activity','ডকুমেন্টারি'],
  ['#/trash','Deleted doc'],
  ['#/settings','Supabase']
 ]){
  globalThis.location.hash=route;
  listeners.hashchange();
  assert.ok(root.innerHTML.includes(text),`Expected '${text}' on ${route}`);
 }
 globalThis.location.hash=`#/doc/${doc1.id}`;listeners.hashchange();
 assert.ok(root.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'),'User HTML must be escaped');
 assert.equal(root.innerHTML.includes('<img src=x onerror=alert(1)>'),false,'No raw user HTML should render');
 assert.match(root.innerHTML,/value="published" selected/);
 globalThis.location.hash=`#/doc/${doc2.id}`;listeners.hashchange();
 assert.match(root.innerHTML,/value="not_published" selected/);
});
