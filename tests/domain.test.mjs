import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,createDocumentary,editDocumentary,createProfile,editProfile,publishingRows,setPublication,publicationProgress,toggleStep,addStep,progressOf,weekRows,softDelete,restoreItem,removeForever,validateImport,STAGES} from '../assets/js/domain.js';

const fresh=()=>initialState();
test('new documentary captures an idea and creates 6 independent production tasks',()=>{
 const s=fresh();const a=createDocumentary(s,{title:'  গবেষণা বিষয়  '});
 assert.equal(a.title,'গবেষণা বিষয়');assert.equal(a.stage,'idea');assert.equal(a.targetDate,'');
 assert.equal(s.steps.filter(x=>x.documentaryId===a.id).length,6);assert.equal(progressOf(s,a.id),0);
 assert.equal(s.documentaries.length,1);assert.ok(s.activity.length);
});
test('allows arbitrarily many ideas; weekly release target is not a production quota',()=>{
 const s=fresh();for(let i=0;i<150;i++)createDocumentary(s,{title:`Documentary ${i+1}`,targetDate:'2026-10-22'});
 assert.equal(s.documentaries.length,150);assert.equal(s.settings.weeklyTarget,1);
 assert.equal(weekRows(s,new Date(2026,9,22),1)[0].docs.length,150);
});
test('changing schedule and stage never marks tasks done',()=>{
 const s=fresh();const d=createDocumentary(s,{title:'River story'});
 editDocumentary(s,d.id,{stage:'editing',targetDate:'2026-10-29',phaseDates:{research:{start:'2026-10-01',due:'2026-10-05'}}});
 assert.equal(d.stage,'editing');assert.equal(progressOf(s,d.id),0);assert.equal(d.phaseDates.research.due,'2026-10-05');
});
test('each network profile is auto-listed on every documentary checklist',()=>{
 const s=fresh();const d1=createDocumentary(s,{title:'Documentary 1'});const d2=createDocumentary(s,{title:'Documentary 2'});
 assert.equal(publishingRows(s,d1.id).length,0);
 const p1=createProfile(s,{name:'SalimGPT Bangla',platform:'YouTube',url:'https://youtube.com/@test'});
 const p2=createProfile(s,{name:'SalimGPT Official',platform:'Facebook',url:'https://facebook.com/test'});
 for(const doc of [d1,d2])assert.deepEqual(new Set(publishingRows(s,doc.id).map(x=>x.profileId)),new Set([p1.id,p2.id]));
});
test('publication status belongs strictly to one documentary even on identical network destination',()=>{
 const s=fresh();const a=createDocumentary(s,{title:'A'}),b=createDocumentary(s,{title:'B'});
 const p=createProfile(s,{name:'Official YouTube',platform:'YouTube',url:''});
 setPublication(s,a.id,p.id,{status:'published',publishedAt:'2026-10-15',postUrl:'https://youtube.com/watch?v=abc'});
 assert.equal(publishingRows(s,a.id)[0].status,'published');
 assert.equal(publishingRows(s,b.id)[0].status,'not_published');
 assert.equal(publicationProgress(s,a.id).done,1);assert.equal(publicationProgress(s,b.id).done,0);
});
test('updates and deletes of network profiles retain historical publication records',()=>{
 const s=fresh();const doc=createDocumentary(s,{title:'Example'});const p=createProfile(s,{name:'Old name',platform:'Instagram',url:''});
 setPublication(s,doc.id,p.id,{status:'published'});
 editProfile(s,p.id,{name:'Renamed page'});
 assert.equal(publishingRows(s,doc.id)[0].name,'Renamed page');
 editProfile(s,p.id,{active:false});
 assert.equal(publishingRows(s,doc.id).length,1);assert.equal(publishingRows(s,doc.id)[0].historic,true);
 softDelete(s,'profile',p.id);removeForever(s,'profile',p.id);
 assert.equal(publishingRows(s,doc.id)[0].name,'Old name'); // snapshot captured at time of first manual publication
 assert.equal(publishingRows(s,doc.id)[0].status,'published');
});
test('disabled profiles with no saved publication do not appear, and enabled profiles return',()=>{
 const s=fresh();const doc=createDocumentary(s,{title:'A'});const p=createProfile(s,{name:'Page',platform:'Facebook',url:''});
 assert.equal(publishingRows(s,doc.id).length,1);editProfile(s,p.id,{active:false});
 assert.equal(publishingRows(s,doc.id).length,0);editProfile(s,p.id,{active:true});
 assert.equal(publishingRows(s,doc.id).length,1);
});
test('Not Applicable is excluded from publication denominator',()=>{
 const s=fresh();const d=createDocumentary(s,{title:'A'});const p1=createProfile(s,{name:'A',platform:'YouTube',url:''});const p2=createProfile(s,{name:'B',platform:'Facebook',url:''});
 setPublication(s,d.id,p1.id,{status:'published'});setPublication(s,d.id,p2.id,{status:'not_applicable'});
 assert.deepEqual(publicationProgress(s,d.id),{done:1,total:1,excluded:1});
});
test('soft-delete / restore / purge documentary cleans tasks and its publications',()=>{
 const s=fresh();const d=createDocumentary(s,{title:'A'}),p=createProfile(s,{name:'Profile',platform:'Other',url:''});setPublication(s,d.id,p.id,{status:'published'});
 softDelete(s,'documentary',d.id);assert.ok(d.deletedAt);
 restoreItem(s,'documentary',d.id);assert.equal(d.deletedAt,null);
 softDelete(s,'documentary',d.id);removeForever(s,'documentary',d.id);
 assert.equal(s.documentaries.length,0);assert.equal(s.steps.length,0);assert.equal(s.publications.length,0);
});
test('checklist progress is task based and extra tasks have no cap',()=>{
 const s=fresh();const d=createDocumentary(s,{title:'A'});const first=s.steps.find(x=>x.documentaryId===d.id);
 toggleStep(s,first.id,true);assert.equal(progressOf(s,d.id),17);
 addStep(s,d.id,'research','Extra source review');assert.equal(s.steps.length,7);
 assert.equal(progressOf(s,d.id),14);
});
test('backup schema is validated and rejects incorrect shapes',()=>{
 const s=fresh();createDocumentary(s,{title:'A'});
 assert.equal(validateImport(JSON.parse(JSON.stringify(s))).schemaVersion,2);
 assert.throws(()=>validateImport({...s,schemaVersion:999}));
 assert.throws(()=>validateImport({...s,documentaries:[{id:'x',title:'oops',stage:'unrecognized'}]}));
});
test('stage list includes all essential phases',()=>{
 for(const name of ['idea','scheduled','research','script','voice','visuals','editing','review','ready','publishing','published'])assert.ok(STAGES.includes(name));
});
