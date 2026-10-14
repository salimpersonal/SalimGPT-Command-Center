import test from 'node:test';
import assert from 'node:assert/strict';
import {NAV,STAGES} from '../js/constants.js';
import {renderView,layout,publicationStats} from '../js/views.js';

class LocalStorageStub {constructor(){this.map=new Map()} getItem(k){return this.map.get(k)||null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
globalThis.localStorage=new LocalStorageStub();
Object.defineProperty(globalThis,'navigator',{value:{onLine:false},configurable:true});
const ui={page:'dashboard',projectId:'',projectTab:'production',filter:'all',search:'',pubSearch:'',showArchived:false,calendarMonth:'2026-10',selectedDay:'2026-10-14'};
test('all 15 top-level pages produce real sections and visible titles',()=>{
 assert.equal(NAV.length,15);
 for(const nav of NAV){let html=renderView({...ui,page:nav.id});assert.equal(typeof html,'string',nav.id);assert.ok(html.length>250,nav.id+' too short');assert.match(html,/<h1>/,nav.id);assert.ok(!html.includes('undefined</h1>'),nav.id);}
});
test('layout includes 15 navigable sections and separate mobile quick navigation',()=>{
 const html=layout(ui,renderView(ui),'');
 for(const nav of NAV) assert.match(html,new RegExp('data-nav="'+nav.id+'"'),nav.id);
 assert.match(html,/mobile-tabs/);assert.match(html,/Quick Idea/);
});
test('all seven documentary stages and publishing monitor exist',()=>{
 assert.equal(STAGES.length,7);
 assert.ok(STAGES.some(s=>s.id==='research'));
 assert.equal(publicationStats('missing').total,0);
});
