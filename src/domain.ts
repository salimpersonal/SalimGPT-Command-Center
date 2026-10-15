export const SCHEMA_VERSION = 2;
export const STAGES = ['idea','scheduled','research','script','voice','visuals','editing','review','ready','publishing','published'] as const;
export type Stage = typeof STAGES[number];
export type Priority = 'normal'|'high'|'urgent'|'low';
export type Language = 'bn'|'en';
export type PublishingStatus = 'published'|'not_published'|'not_applicable';
export const PRODUCTION_STAGES: Stage[] = ['research','script','voice','visuals','editing','review'];
export const DEFAULT_STEPS: Array<{stage:Stage, bn:string, en:string}> = [
 {stage:'research',bn:'তথ্য সংগ্রহ ও উৎস যাচাই',en:'Research & source verification'},
 {stage:'script',bn:'স্ক্রিপ্ট লেখা ও সংশোধন',en:'Script writing & revision'},
 {stage:'voice',bn:'ভয়েস রেকর্ডিং',en:'Voice recording'},
 {stage:'visuals',bn:'ভিডিও, ছবি ও গ্রাফিক্স সংগ্রহ',en:'Visuals & media collection'},
 {stage:'editing',bn:'ভিডিও এডিটিং',en:'Video editing'},
 {stage:'review',bn:'ফ্যাক্ট চেক ও ফাইনাল রিভিউ',en:'Final review & fact-check'}
];
export type PhaseDate = {start?:string;due?:string};
export type PhaseDates = Partial<Record<Stage,PhaseDate>>;
export interface Documentary {id:string;title:string;description:string;stage:Stage;language:'bn'|'en'|'multi';priority:Priority;targetDate:string;notes:string;tags:string[];phaseDates:PhaseDates;createdAt:string;updatedAt:string;archivedAt:string|null;deletedAt:string|null}
export interface StepTask {id:string;documentaryId:string;stage:Stage;title:string;done:boolean;dueDate:string;createdAt:string;updatedAt:string;deletedAt:string|null}
export interface NetworkProfile {id:string;platform:string;name:string;url:string;active:boolean;createdAt:string;updatedAt:string;deletedAt:string|null}
export interface Publication {id:string;documentaryId:string;profileId:string;profileNameSnapshot:string;platformSnapshot:string;status:PublishingStatus;publishedAt:string;postUrl:string;note:string;updatedAt:string}
export interface Activity {id:string;at:string;type:string;message:string;documentaryId?:string}
export interface AppSettings {language:Language;theme:'dark'|'light';weeklyTarget:number}
export interface AppState {schemaVersion:number;documentaries:Documentary[];steps:StepTask[];profiles:NetworkProfile[];publications:Publication[];activity:Activity[];settings:AppSettings}
export interface DocInput {title:string;description?:string;stage?:Stage;language?:'bn'|'en'|'multi';priority?:Priority;targetDate?:string;notes?:string;tags?:string[];phaseDates?:PhaseDates}
export interface ProfileInput {name:string;platform:string;url:string;active?:boolean}
export interface PublishingRow {profile:NetworkProfile|null;record:Publication|null;profileId:string;name:string;platform:string;active:boolean;historic:boolean;status:PublishingStatus}
export const todayISO = (date=new Date()):string=>localISO(date);
export function localISO(date:Date):string {
  const offset = date.getTimezoneOffset()*60000;
  return new Date(date.getTime()-offset).toISOString().slice(0,10);
}
export function newId():string { return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `sg-${Date.now()}-${Math.random().toString(36).slice(2,12)}`; }
export function initialState():AppState {return {schemaVersion:SCHEMA_VERSION,documentaries:[],steps:[],profiles:[],publications:[],activity:[],settings:{language:'bn',theme:'dark',weeklyTarget:1}};}
function now():string{return new Date().toISOString();}
export function logAction(state:AppState,type:string,message:string,documentaryId?:string):void {state.activity.unshift({id:newId(),at:now(),type,message,...documentaryId?{documentaryId}:{}});if(state.activity.length>2000)state.activity.length=2000;}
export function createDocumentary(state:AppState,input:DocInput):Documentary {
 const title = input.title.trim(); if(!title)throw Error('Documentary title is required');
 const at=now();const doc:Documentary={id:newId(),title,description:input.description?.trim()||'',stage:input.stage||'idea',language:input.language||'bn',priority:input.priority||'normal',targetDate:input.targetDate||'',notes:input.notes||'',tags:input.tags||[],phaseDates:input.phaseDates||{},createdAt:at,updatedAt:at,archivedAt:null,deletedAt:null};
 state.documentaries.unshift(doc);
 for(const step of DEFAULT_STEPS){state.steps.push({id:newId(),documentaryId:doc.id,stage:step.stage,title:input.language==='en'?step.en:step.bn,done:false,dueDate:'',createdAt:at,updatedAt:at,deletedAt:null});}
 logAction(state,'documentary.created',`নতুন ডকুমেন্টারি: ${title}`,doc.id);return doc;
}
export function editDocumentary(state:AppState,id:string,patch:Partial<DocInput>):Documentary {
 const doc=state.documentaries.find(d=>d.id===id&&!d.deletedAt);if(!doc)throw Error('Documentary not found');
 if(patch.title!==undefined){if(!patch.title.trim())throw Error('Title cannot be empty');doc.title=patch.title.trim();}
 if(patch.description!==undefined)doc.description=patch.description.trim();
 if(patch.stage!==undefined){if(!STAGES.includes(patch.stage))throw Error('Invalid stage');doc.stage=patch.stage;}
 if(patch.language!==undefined)doc.language=patch.language;
 if(patch.priority!==undefined)doc.priority=patch.priority;
 if(patch.targetDate!==undefined)doc.targetDate=patch.targetDate;
 if(patch.notes!==undefined)doc.notes=patch.notes;
 if(patch.tags!==undefined)doc.tags=patch.tags;
 if(patch.phaseDates!==undefined)doc.phaseDates=patch.phaseDates;
 doc.updatedAt=now();logAction(state,'documentary.updated',`ডকুমেন্টারি আপডেট: ${doc.title}`,id);return doc;
}
export function createProfile(state:AppState,input:ProfileInput):NetworkProfile {
 if(!input.name.trim())throw Error('Profile name is required');
 const at=now();const profile:NetworkProfile={id:newId(),platform:input.platform.trim()||'Other',name:input.name.trim(),url:input.url.trim(),active:input.active??true,createdAt:at,updatedAt:at,deletedAt:null};
 state.profiles.push(profile);logAction(state,'profile.created',`SalimGPT Network-এ যুক্ত: ${profile.name}`);return profile;
}
export function editProfile(state:AppState,id:string,patch:Partial<ProfileInput>):NetworkProfile {
 const p=state.profiles.find(x=>x.id===id&&!x.deletedAt);if(!p)throw Error('Profile not found');
 if(patch.name!==undefined){if(!patch.name.trim())throw Error('Name cannot be empty');p.name=patch.name.trim();}
 if(patch.url!==undefined)p.url=patch.url.trim();
 if(patch.platform!==undefined)p.platform=patch.platform.trim()||'Other';
 if(patch.active!==undefined)p.active=patch.active;
 p.updatedAt=now();logAction(state,'profile.updated',`নেটওয়ার্ক প্রোফাইল আপডেট: ${p.name}`);return p;
}
export function activeDocumentaries(state:AppState):Documentary[]{return state.documentaries.filter(d=>!d.deletedAt&&!d.archivedAt);}
export function allDocumentaries(state:AppState):Documentary[]{return state.documentaries.filter(d=>!d.deletedAt);}
export function progressOf(state:AppState,id:string):number {
 const steps=state.steps.filter(s=>s.documentaryId===id&&!s.deletedAt);
 return steps.length?Math.round((steps.filter(s=>s.done).length/steps.length)*100):0;
}
export function toggleStep(state:AppState,id:string,done:boolean):void {
 const step=state.steps.find(s=>s.id===id&&!s.deletedAt);if(!step)throw Error('Task not found');
 step.done=done;step.updatedAt=now();const doc=state.documentaries.find(d=>d.id===step.documentaryId);if(doc)doc.updatedAt=now();
 logAction(state,'task.updated',`${done?'সম্পন্ন':'অসম্পন্ন'}: ${step.title}`,step.documentaryId);
}
export function addStep(state:AppState,docId:string,stage:Stage,title:string,dueDate=''):void {
 if(!title.trim())throw Error('Task title is required');
 const at=now();state.steps.push({id:newId(),documentaryId:docId,stage,title:title.trim(),done:false,dueDate,createdAt:at,updatedAt:at,deletedAt:null});
 logAction(state,'task.created',`নতুন কাজ: ${title}`,docId);
}
export function editStep(state:AppState,id:string,patch:{title?:string;stage?:Stage;dueDate?:string}):void {
 const s=state.steps.find(x=>x.id===id&&!x.deletedAt);if(!s)throw Error('Task not found');
 if(patch.title!==undefined){if(!patch.title.trim())throw Error('Title is required');s.title=patch.title.trim();}
 if(patch.stage!==undefined)s.stage=patch.stage;
 if(patch.dueDate!==undefined)s.dueDate=patch.dueDate;
 s.updatedAt=now();logAction(state,'task.updated',`কাজ সংশোধন: ${s.title}`,s.documentaryId);
}
export function publishingRows(state:AppState,docId:string):PublishingRow[] {
 const recs=state.publications.filter(p=>p.documentaryId===docId);
 const live=state.profiles.filter(p=>!p.deletedAt&&p.active);
 const visibleIds=new Set([...live.map(p=>p.id),...recs.map(r=>r.profileId)]);
 const rows:Array<PublishingRow>=[];
 for(const profileId of visibleIds){
  const profile=state.profiles.find(p=>p.id===profileId)||null;
  const record=recs.find(r=>r.profileId===profileId)||null;
  rows.push({profile,record,profileId,name:profile?.name||record?.profileNameSnapshot||'Deleted profile',platform:profile?.platform||record?.platformSnapshot||'Other',active:!!profile?.active&&!profile.deletedAt,historic:!!profile?.deletedAt||!profile?.active||!profile,status:record?.status||'not_published'});
 }
 return rows.sort((a,b)=>Number(b.active)-Number(a.active)||a.platform.localeCompare(b.platform)||a.name.localeCompare(b.name));
}
export function setPublication(state:AppState,docId:string,profileId:string,patch:{status:PublishingStatus;publishedAt?:string;postUrl?:string;note?:string}):Publication {
 const doc=state.documentaries.find(d=>d.id===docId&&!d.deletedAt);if(!doc)throw Error('Documentary not found');
 const profile=state.profiles.find(p=>p.id===profileId);
 let record=state.publications.find(r=>r.documentaryId===docId&&r.profileId===profileId);
 if(!profile&&!record)throw Error('Network profile not found');
 if(!record){record={id:newId(),documentaryId:docId,profileId,profileNameSnapshot:profile?.name||'',platformSnapshot:profile?.platform||'',status:'not_published',publishedAt:'',postUrl:'',note:'',updatedAt:now()};state.publications.push(record);}
 record.status=patch.status;
 record.publishedAt=patch.status==='published'?(patch.publishedAt||record.publishedAt||todayISO()):'';
 record.postUrl=patch.status==='published'?(patch.postUrl??record.postUrl):'';
 record.note=patch.note??record.note;
 record.updatedAt=now();doc.updatedAt=now();
 logAction(state,'publication.updated',`${doc.title} • ${profile?.name||record.profileNameSnapshot}: ${record.status}`,docId);
 return record;
}
export function publicationProgress(state:AppState,docId:string):{done:number,total:number,excluded:number}{
 const rows=publishingRows(state,docId).filter(r=>r.active);
 return {done:rows.filter(r=>r.status==='published').length,total:rows.filter(r=>r.status!=='not_applicable').length,excluded:rows.filter(r=>r.status==='not_applicable').length};
}
export function weekStart(date:Date):Date {const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()-((d.getDay()+6)%7));return d;}
export function weekRows(state:AppState,start=new Date(),count=8):Array<{start:string;end:string;docs:Documentary[];published:number}> {
 const current=weekStart(start);const result=[];
 for(let i=0;i<count;i++){const a=new Date(current);a.setDate(a.getDate()+7*i);const b=new Date(a);b.setDate(a.getDate()+6);
 const from=localISO(a),to=localISO(b);
 const docs=activeDocumentaries(state).filter(d=>d.targetDate>=from&&d.targetDate<=to).sort((x,y)=>x.targetDate.localeCompare(y.targetDate));
 result.push({start:from,end:to,docs,published:docs.filter(d=>d.stage==='published').length});
 }return result;
}
export function softDelete(state:AppState,kind:'documentary'|'profile'|'step',id:string):void {
 const arr=kind==='documentary'?state.documentaries:kind==='profile'?state.profiles:state.steps;
 const item=arr.find(x=>x.id===id);if(!item)throw Error('Item not found');
 item.deletedAt=now();logAction(state,`${kind}.deleted`,`ডিলিট: ${'title' in item?item.title:item.name}`,'documentaryId' in item?item.documentaryId:kind==='documentary'?item.id:undefined);
}
export function restoreItem(state:AppState,kind:'documentary'|'profile'|'step',id:string):void {
 const arr=kind==='documentary'?state.documentaries:kind==='profile'?state.profiles:state.steps;
 const item=arr.find(x=>x.id===id);if(!item)throw Error('Item not found');item.deletedAt=null;
 logAction(state,`${kind}.restored`,`রিস্টোর: ${'title' in item?item.title:'name' in item?item.name:'Task'}`);
}
export function removeForever(state:AppState,kind:'documentary'|'profile'|'step',id:string):void {
 if(kind==='documentary'){
  const d=state.documentaries.find(x=>x.id===id&&x.deletedAt);if(!d)throw Error('Delete from trash first');
  state.documentaries=state.documentaries.filter(x=>x.id!==id);
  state.steps=state.steps.filter(x=>x.documentaryId!==id);
  state.publications=state.publications.filter(x=>x.documentaryId!==id);
 }else if(kind==='profile'){
  const p=state.profiles.find(x=>x.id===id&&x.deletedAt);if(!p)throw Error('Delete from trash first');
  state.profiles=state.profiles.filter(x=>x.id!==id);
  // Publication rows retain profile name/platform snapshots.
 }else{
  const s=state.steps.find(x=>x.id===id&&x.deletedAt);if(!s)throw Error('Delete from trash first');
  state.steps=state.steps.filter(x=>x.id!==id);
 }logAction(state,`${kind}.purged`,'Recycle Bin থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে');
}
export function validateImport(value:unknown):AppState {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid backup file');
 const obj=value as Partial<AppState>;
 if(obj.schemaVersion!==SCHEMA_VERSION)throw Error(`Expected schema version ${SCHEMA_VERSION}`);
 if(!Array.isArray(obj.documentaries)||!Array.isArray(obj.profiles)||!Array.isArray(obj.steps)||!Array.isArray(obj.publications)||!Array.isArray(obj.activity))throw Error('Invalid data structure');
 if(!obj.settings||!['bn','en'].includes(obj.settings.language)||!['dark','light'].includes(obj.settings.theme)||!Number.isInteger(obj.settings.weeklyTarget)||obj.settings.weeklyTarget<1||obj.settings.weeklyTarget>50)throw Error('Invalid settings');
 const text=(x:unknown)=>typeof x==='string';
 const strOrNull=(x:unknown)=>x===null||text(x);
 const unique=(values:string[])=>new Set(values).size===values.length;
 if(!unique(obj.documentaries.map(d=>d.id))||!unique(obj.profiles.map(p=>p.id))||!unique(obj.steps.map(s=>s.id))||!unique(obj.publications.map(p=>p.id)))throw Error('Invalid duplicate IDs');
 if(obj.documentaries.some(d=>!text(d.id)||!text(d.title)||!d.title.trim()||!text(d.description)||!STAGES.includes(d.stage)||!['bn','en','multi'].includes(d.language)||!['low','normal','high','urgent'].includes(d.priority)||!text(d.targetDate)||!text(d.notes)||!Array.isArray(d.tags)||d.tags.some(x=>!text(x))||!d.phaseDates||typeof d.phaseDates!=='object'||!text(d.createdAt)||!text(d.updatedAt)||!strOrNull(d.archivedAt)||!strOrNull(d.deletedAt)))throw Error('Invalid documentary');
 if(obj.profiles.some(p=>!text(p.id)||!text(p.name)||!text(p.platform)||!text(p.url)||typeof p.active!=='boolean'||!text(p.createdAt)||!text(p.updatedAt)||!strOrNull(p.deletedAt)))throw Error('Invalid network profile');
 if(obj.steps.some(s=>!text(s.id)||!text(s.documentaryId)||!STAGES.includes(s.stage)||!text(s.title)||typeof s.done!=='boolean'||!text(s.dueDate)||!text(s.createdAt)||!text(s.updatedAt)||!strOrNull(s.deletedAt)))throw Error('Invalid production task');
 if(obj.publications.some(p=>!text(p.id)||!text(p.documentaryId)||!text(p.profileId)||!text(p.profileNameSnapshot)||!text(p.platformSnapshot)||!['published','not_published','not_applicable'].includes(p.status)||!text(p.publishedAt)||!text(p.postUrl)||!text(p.note)||!text(p.updatedAt)))throw Error('Invalid publication');
 if(obj.activity.some(a=>!text(a.id)||!text(a.at)||!text(a.type)||!text(a.message)))throw Error('Invalid activity history');
 const docIDs=new Set(obj.documentaries.map(x=>x.id));
 if(obj.steps.some(x=>!docIDs.has(x.documentaryId))||obj.publications.some(x=>!docIDs.has(x.documentaryId)))throw Error('Invalid orphan records');
 const keys=obj.publications.map(x=>`${x.documentaryId}:${x.profileId}`);
 if(!unique(keys))throw Error('Invalid duplicate publication entries');
 return obj as AppState;
}
