import test from 'node:test';
import assert from 'node:assert/strict';
import {stable,signature,remoteRecord,conflictsWithRemote,mergeForCommit} from '../js/sync-core.js';

test('stable content signatures ignore property-order changes',()=>{
 const a={data:{id:'abc',title:'SalimGPT',tags:['a','b']},deleted:false};
 const b={deleted:false,data:{tags:['a','b'],title:'SalimGPT',id:'abc'}};
 assert.equal(signature(a),signature(b));
 assert.equal(stable({a:1,b:2}),stable({b:2,a:1}));
});
test('detect remote changes and protect dirty local edits',()=>{
 const old={data:{id:'x',title:'Old'},deleted:false};
 const local={remoteSignature:signature(old),dirty:true};
 assert.equal(conflictsWithRemote(local,old),false);
 assert.equal(conflictsWithRemote(local,{data:{id:'x',title:'Edited elsewhere'},deleted:false}),true);
 assert.equal(conflictsWithRemote({remoteSignature:null},old),true);
 assert.equal(conflictsWithRemote({remoteSignature:null},null),false);
 assert.equal(conflictsWithRemote(local,null),true);
});
test('commit merges other devices records without losing them',()=>{
 const combined=mergeForCommit({a:{data:{id:'a'},deleted:false}},[{id:'b',data:{id:'b',title:'Hello'},deleted:false,updatedAt:'2026-10-14'}]);
 assert.ok(combined.a);
 assert.equal(combined.b.data.title,'Hello');
 assert.equal(remoteRecord(combined.b,'ideas','b').key,'ideas/b');
});
test('tombstones are preserved for cross-device deletions',()=>{
 const records=mergeForCommit({},[{id:'one',data:{id:'one'},deleted:true,updatedAt:'2026-10-14'}]);
 assert.equal(records.one.deleted,true);
 assert.equal(remoteRecord(records.one,'ideas','one').deleted,true);
});
