import {getAllRows,putRow,clearRows} from './db.js';
import {uid,now} from './utils.js';
import {getRemoteCollection,putRemoteCollection,isSignedIn} from './cloud.js';
import {signature,remoteRecord,conflictsWithRemote,mergeForCommit} from './sync-core.js';
export const COLLECTIONS=['ideas','projects','tasks','profiles','publications','reminders','goals','contacts','resources','activity'];
let rows=new Map(),listeners=new Set(),syncInFlight=null,autoSyncTimer=null;
const tabId=Math.random().toString(36).slice(2);
const channel=typeof window!=='undefined'&&typeof BroadcastChannel!=='undefined'?new BroadcastChannel('sgcc-record-updates-v2'):null;
function announce(){try{channel?.postMessage({tabId,changedAt:Date.now()});}catch{}}
if(channel)channel.onmessage=async event=>{if(event.data?.tabId===tabId)return;try{const list=await getAllRows();rows=new Map(list.map(x=>[x.key,x]));notify();}catch(e){console.warn('Cross-tab update delayed',e);}};
export let conflicts=[];
export let lastSync=null;
export let syncing=false;
export let lastSyncError='';
export let syncStatus='Not connected';
const key=(collection,id)=>collection+'/'+id;
export async function initializeStore(){const fromDb=await getAllRows();rows=new Map();for(const old of fromDb){const legacy=old.remoteSignature===undefined;const r=legacy?{...old,dirty:true,remoteSignature:null,changeId:uid()}:old;rows.set(r.key,r);if(legacy)await putRow(r);}notify();return rows.size;}
export function onStoreChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}
function notify(){for(const fn of listeners){try{fn();}catch(err){console.error('Render failure',err);}}}
export function all(collection,{includingDeleted=false}={}){return [...rows.values()].filter(r=>r.collection===collection&&(includingDeleted||!r.deleted)).map(r=>({...r.data})).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));}
export function get(collection,id){const r=rows.get(key(collection,id));return r&&!r.deleted?{...r.data}:null;}
export function raw(collection,id){return rows.get(key(collection,id));}
export function allRows(){return [...rows.values()];}
export function pendingCount(){return [...rows.values()].filter(r=>r.dirty).length;}
export async function save(collection,data,{silent=false}={}){
 if(!COLLECTIONS.includes(collection))throw new Error('Invalid collection');
 const id=data.id||uid(),old=rows.get(key(collection,id)),n=now();
 const record={...old?.data,...data,id,updatedAt:n,createdAt:old?.data?.createdAt||data.createdAt||n};
 const r={key:key(collection,id),collection,id,data:record,deleted:false,dirty:true,remoteSignature:old?.remoteSignature||null,updatedAt:n,changeId:uid()};
 rows.set(r.key,r);await putRow(r);if(!silent)notify();announce();scheduleSync();return record;
}
export async function saveMany(collection,list){for(const data of list)await save(collection,data,{silent:true});notify();scheduleSync();}
export async function discard(collection,id){const old=rows.get(key(collection,id));if(!old)return;const n=now(),r={...old,deleted:true,dirty:true,updatedAt:n,changeId:uid(),data:{...old.data,updatedAt:n}};rows.set(r.key,r);await putRow(r);notify();announce();scheduleSync();}
export async function activity(action,detail,projectId=''){await save('activity',{action,detail,projectId},{silent:true});notify();}
export async function backup(){return {app:'salimgpt-command-center',version:2,exportedAt:now(),records:allRows().map(x=>({collection:x.collection,id:x.id,data:x.data,deleted:x.deleted}))};}
export async function restoreBackup(backupData,{replace=false}={}){
 if(backupData?.app!=='salimgpt-command-center'||![1,2].includes(backupData.version)||!Array.isArray(backupData.records))throw new Error('This is not a compatible SGCC backup');
 if(backupData.records.length>50000)throw new Error('Backup has too many records');
 if(replace){await clearRows();rows.clear();}
 let count=0;for(const item of backupData.records){if(!COLLECTIONS.includes(item.collection)||typeof item.id!=='string'||!/^[a-zA-Z0-9:_-]{1,200}$/.test(item.id)||typeof item.data!=='object'||Array.isArray(item.data)||!item.data||item.id.length>200)continue;
  const existing=rows.get(key(item.collection,item.id));if(existing&&!replace)continue;
  const n=now(),r={key:key(item.collection,item.id),collection:item.collection,id:item.id,data:{...item.data,id:item.id},deleted:!!item.deleted,dirty:true,remoteSignature:null,updatedAt:n,changeId:uid()};rows.set(r.key,r);await putRow(r);count++;
 }notify();announce();scheduleSync();return count;
}
export async function clearLocal(){await clearRows();rows.clear();conflicts=[];lastSync=null;notify();announce();}
export function getStats(){return {ideas:all('ideas'),projects:all('projects'),tasks:all('tasks'),profiles:all('profiles'),publications:all('publications'),reminders:all('reminders'),goals:all('goals'),contacts:all('contacts'),resources:all('resources')};}
export function scheduleSync(){if(!isSignedIn()||!navigator.onLine)return;clearTimeout(autoSyncTimer);autoSyncTimer=setTimeout(()=>{if(!isSignedIn()||!navigator.onLine)return;syncCloud().catch(err=>{lastSyncError=err.message;syncStatus='Sync error';notify();console.warn('Sync later:',err.message);});},6500);}
function rememberConflict(local,remote){if(conflicts.some(c=>c.key===local.key))return;conflicts.push({key:local.key,collection:local.collection,id:local.id,local:{...local},remote:remote?{...remote,payload:remote.data,modified_at:remote.updatedAt}:{data:local.data,payload:local.data,deleted:true,missing:true}});notify();}
export async function syncCloud(){if(!isSignedIn())throw new Error('GitHub Private Data-তে সংযোগ দিন');if(!navigator.onLine)throw new Error('ইন্টারনেট সংযোগ প্রয়োজন');if(syncInFlight)return syncInFlight;
 syncInFlight=(async()=>{syncing=true;syncStatus='Syncing';lastSyncError='';notify();let downloaded=0,uploaded=0;
 try{
 for(const collection of COLLECTIONS){
  let {sha,records:remote}=await getRemoteCollection(collection);
  const pending=[...rows.values()].filter(r=>r.collection===collection&&r.dirty);
  for(const [id,item] of Object.entries(remote)){
   const k=key(collection,id),local=rows.get(k);
   if(local?.dirty){if(conflictsWithRemote(local,item))rememberConflict(local,item);continue;}
   const incoming=remoteRecord(item,collection,id);
   if(!local||local.remoteSignature!==incoming.remoteSignature){rows.set(k,incoming);await putRow(incoming);downloaded++;}
  }
  // Missing formerly synced records are NOT silently reported as safely backed up.
  for(const local of [...rows.values()].filter(r=>r.collection===collection&&!r.dirty&&r.remoteSignature)){
   if(!Object.hasOwn(remote,local.id))rememberConflict(local,null);
  }
  for(const local of pending){if(!Object.hasOwn(remote,local.id)&&conflictsWithRemote(local,null))rememberConflict(local,null);}
  let remaining=pending.filter(r=>!conflicts.some(c=>c.key===r.key));
  if(!remaining.length)continue;
  for(let attempt=0;attempt<3;attempt++){
   if(!remaining.length)break;
   const payload=mergeForCommit(remote,remaining);
   try{
    await putRemoteCollection(collection,payload,sha);
    for(const item of remaining){const current=rows.get(item.key);if(current){const fresh={...current,dirty:current.changeId!==item.changeId,remoteSignature:signature(payload[item.id])};rows.set(item.key,fresh);await putRow(fresh);}uploaded++;}
    break;
   }catch(err){if(![409,422].includes(err.status)||attempt===2)throw err;
    const latest=await getRemoteCollection(collection);sha=latest.sha;remote=latest.records;
    remaining=remaining.filter(local=>{if(conflictsWithRemote(local,remote[local.id]||null)){rememberConflict(local,remote[local.id]||null);return false;}return true;});
   }
  }
 }
 lastSync=now();syncStatus=conflicts.length?'Needs conflict review':pendingCount()?'Local changes pending':'Safely saved to GitHub';notify();announce();return {downloaded,uploaded,conflicts:conflicts.length};
 }catch(err){lastSyncError=err.message;syncStatus='Sync failed';notify();throw err;}finally{syncing=false;notify();}
 })().finally(()=>{syncInFlight=null;});return syncInFlight;
}
export async function resolveConflict(index,choice){const c=conflicts[index];if(!c)throw new Error('Conflict not found');if(choice==='remote'){
 if(c.remote.missing){const r={...c.local,dirty:false,deleted:true,remoteSignature:null,changeId:uid()};rows.set(r.key,r);await putRow(r);}else{const r=remoteRecord(c.remote,c.collection,c.id);rows.set(r.key,r);await putRow(r);}
 }else{const current=rows.get(c.key);if(!current)throw new Error('Local record is missing');const r={...current,dirty:true,remoteSignature:c.remote.missing?null:signature(c.remote),changeId:uid()};rows.set(r.key,r);await putRow(r);}
 conflicts=conflicts.filter(x=>x.key!==c.key);notify();announce();if(choice==='local')scheduleSync();}
