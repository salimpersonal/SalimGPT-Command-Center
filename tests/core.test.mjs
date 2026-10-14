import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPlatform,STAGES} from '../js/constants.js';
import {derivePublicationRows,escapeHTML,safeURL,progressByStage,clamp,dateLocal,nextRepeat} from '../js/utils.js';

test('known platform hosts are recognized without false substring matches',()=>{
 assert.equal(detectPlatform('https://www.youtube.com/@foo'),'YouTube');
 assert.equal(detectPlatform('https://t.me/salimgpt'),'Telegram');
 assert.equal(detectPlatform('https://youtube.com.evil.example/something'),'Website');
 assert.equal(detectPlatform('https://www.salimgpt.example'),'Website');
});

test('javascript URLs and HTML injection never appear as safe links or raw HTML',()=>{
 assert.equal(safeURL('javascript:alert(1)'),'');
 assert.equal(safeURL('data:text/html,<p>broken</p>'),'');
 assert.match(escapeHTML('<img src=x onerror="alert(1)">'),/&lt;img/);
});

test('central profile registry auto-populates every documentary checklist',()=>{
 const profiles=[{id:'y',label:'YouTube Main',status:'active'},{id:'f',label:'FB Page',status:'active'}];
 const logs=[{profileId:'y',projectId:'docA',status:'published'}];
 const docA=derivePublicationRows(profiles,logs,'docA');
 const docB=derivePublicationRows(profiles,logs,'docB');
 assert.equal(docA.length,2);assert.equal(docB.length,2);
 assert.deepEqual(docA.map(x=>x.status),['published','not_published']);
 assert.deepEqual(docB.map(x=>x.status),['not_published','not_published']);
 profiles.push({id:'t',label:'Telegram',status:'active'});
 assert.equal(derivePublicationRows(profiles,logs,'docA').length,3);
 assert.equal(derivePublicationRows(profiles,logs,'docB').length,3);
 assert.equal(derivePublicationRows(profiles,logs,'docA')[0].status,'published');
});

test('archived profiles preserve publication history when present',()=>{
 const profiles=[{id:'y',status:'archived'},{id:'f',status:'active'}];
 const logs=[{profileId:'y',projectId:'a',status:'published'}];
 const a=derivePublicationRows(profiles,logs,'a');
 const b=derivePublicationRows(profiles,logs,'b');
 assert.equal(a.length,2);assert.equal(a[0].status,'published');
 assert.equal(b.length,1);assert.equal(b[0].profile.id,'f');
});

test('project progress is weighted by stage and respects skipped stages',()=>{
 const p={id:'p1',skippedStages:[]};
 const ts=STAGES.flatMap(s=>[{projectId:'p1',stage:s.id,status:'done'},{projectId:'p1',stage:s.id,status:'todo'}]);
 assert.equal(progressByStage(p,ts,STAGES).overall,50);
 p.skippedStages=['research'];
 assert.equal(progressByStage(p,ts,STAGES).overall,50);
 assert.equal(clamp(300),100);
});

test('date and recurrent reminder helper returns a future occurrence',()=>{
 assert.match(dateLocal(new Date(2026,9,14)),/^2026-10-14$/);
 const yesterday=new Date(Date.now()-24*60*60*1000);
 const next=nextRepeat(yesterday,'daily');
 assert.ok(new Date(next).getTime()>Date.now()-1000);
});
