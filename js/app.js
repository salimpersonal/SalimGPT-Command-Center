import {STAGES,detectPlatform} from './constants.js';
import {initializeStore,onStoreChange,all,get,save,saveMany,discard,activity,backup,restoreBackup,clearLocal,syncCloud,resolveConflict} from './store.js';
import {setCloudConfig,clearCloudConfig,signIn,signOut,isSignedIn,getCloudSession} from './cloud.js';
import {layout,renderView,icon,publicationItems} from './views.js';
import {renderModal} from './forms.js';
import {uid,e,safeURL,formData,downloadFile,parseValidJSON,datetimeLocal,dateLocal,nextRepeat,toast} from './utils.js';
const app=document.getElementById('app');
const ui={pubSearch:'',page:'dashboard',projectId:'',projectTab:'production',filter:'all',search:'',modal:null,showArchived:false,calendarMonth:dateLocal(new Date()).slice(0,7),selectedDay:dateLocal(new Date())};
let searchTimer=0,renderRequested=false;
function render(){if(!app)return;app.innerHTML=layout(ui,renderView(ui),renderModal(ui.modal));}
function scheduleRender(){if(renderRequested)return;renderRequested=true;requestAnimationFrame(()=>{renderRequested=false;render();});}
function go(page){ui.page=page;ui.search='';ui.pubSearch='';ui.filter='all';ui.projectId='';ui.modal=null;window.scrollTo({top:0,behavior:'instant'});render();}
function openModal(type,props={}){ui.modal={type,...props};render();requestAnimationFrame(()=>document.querySelector('.modal [autofocus]')?.focus());}
function closeModal(){ui.modal=null;render();}
function demandConfirm(text){return window.confirm(text);}
function hasData(form,key){return Object.hasOwn(form,key);}
function cleanURL(value,label,optional=true){if(!value&&optional)return '';const url=safeURL(value);if(!url)throw new Error(`${label} অবশ্যই সঠিক http/https URL হতে হবে।`);return url;}
async function doAction(action,el){const id=el.dataset.id,projectId=el.dataset.project,profileId=el.dataset.profile;
 switch(action){
 case 'mobile-more':return openModal('mobile-menu');
 case 'new-idea':return openModal('idea');
 case 'edit-idea':return openModal('idea',{id});
 case 'new-project':return openModal('project');
 case 'edit-project':return openModal('project',{id});
 case 'new-task':return openModal('task',{projectId:projectId||ui.projectId||'',stage:el.dataset.stage});
 case 'edit-task':return openModal('task',{id});
 case 'new-profile':return openModal('profile');
 case 'new-contact':return openModal('contact');
 case 'edit-contact':return openModal('contact',{id});
 case 'new-resource':return openModal('resource');
 case 'edit-resource':return openModal('resource',{id});
 case 'edit-profile':return openModal('profile',{id});
 case 'new-reminder':return openModal('reminder');
 case 'edit-reminder':return openModal('reminder',{id});
 case 'new-goal':return openModal('goal');
 case 'edit-goal':return openModal('goal',{id});
 case 'goal-progress':return openModal('progress',{id});
 case 'snooze-reminder':return openModal('snooze',{id});
 case 'edit-publication':return openModal('publication',{projectId,profileId});
 case 'close-modal':return closeModal();
 case 'open-project':ui.page='projects';ui.projectId=id;ui.projectTab=el.dataset.tab||'production';ui.search='';ui.filter='all';render();window.scrollTo(0,0);return;
 case 'back-projects':ui.projectId='';ui.projectTab='production';render();return;
 case 'project-tab':ui.projectTab=el.dataset.tab;render();return;
 case 'go-profiles':return go('profiles');
 case 'open-search':if(window.innerWidth<580){go('ideas');requestAnimationFrame(()=>document.querySelector('[data-search]')?.focus());}return;
 case 'toggle-task':{
  const t=get('tasks',id);if(!t)return;const newStatus=t.status==='done'?'todo':'done';await save('tasks',{...t,status:newStatus,completedAt:newStatus==='done'?new Date().toISOString():null});await activity(newStatus==='done'?'Task completed':'Task reopened',t.title,t.projectId);toast(newStatus==='done'?'কাজটি সম্পন্ন হয়েছে':'কাজটি পুনরায় চালু হয়েছে');return;
 }
 case 'done-reminder':{
  const r=get('reminders',id);if(!r)return;
  if(r.recurrence&&r.recurrence!=='none'){
   const future=nextRepeat(r.remindAt,r.recurrence);
   if(future){await save('reminders',{...r,remindAt:new Date(future).toISOString(),status:'pending',lastNotifiedAt:'',doneCount:(r.doneCount||0)+1,completedAt:new Date().toISOString()});await activity('Recurring reminder completed',r.title);toast('সম্পন্ন! পরবর্তী রিমাইন্ডার নির্ধারিত হয়েছে।');return;}
  }
  await save('reminders',{...r,status:'done',completedAt:new Date().toISOString()});await activity('Reminder completed',r.title);toast('রিমাইন্ডার সম্পন্ন হয়েছে');return;
 }
 case 'toggle-publication':{
  const existing=all('publications').find(x=>x.projectId===projectId&&x.profileId===profileId);const p=get('profiles',profileId),proj=get('projects',projectId);if(!p||!proj)return;
  const marking=existing?.status!=='published';
  await save('publications',{...(existing||{id:projectId+':'+profileId,projectId,profileId}),status:marking?'published':'not_published',publishedAt:marking?(existing?.publishedAt||new Date().toISOString()):'',postUrl:marking?(existing?.postUrl||''):'',note:existing?.note||''});
  await activity(marking?'Externally published (manual)':'Publishing status reset',`${proj.title} — ${p.label}`,projectId);
  toast(marking?'এই প্রোফাইলে Published / Done মার্ক করা হয়েছে':'Not Published হিসেবে দেখানো হচ্ছে');return;
 }
 case 'archive-profile':{
  const p=get('profiles',id);if(!p)return;const becomingArchived=p.status!=='archived';if(becomingArchived&&!demandConfirm('এই প্রোফাইল Archive করবেন? আগের Published রেকর্ড থাকবে; নতুন Publishing Checklist থেকে প্রোফাইলটি বাদ যাবে।'))return;
  await save('profiles',{...p,status:becomingArchived?'archived':'active'});await activity(becomingArchived?'Profile archived':'Profile reactivated',p.label);toast('মূল প্রোফাইল রেজিস্ট্রি আপডেট হয়েছে');return;
 }
 case 'convert-idea':return openModal('project',{ideaId:id});
 case 'calendar-prev':case 'calendar-next':ui.calendarMonth=el.dataset.month;render();return;
 case 'calendar-day':ui.selectedDay=el.dataset.date;render();return;
 case 'delete-idea':case 'delete-task':case 'delete-reminder':case 'delete-goal':case 'delete-contact':case 'delete-resource':{
  const col=action.split('-')[1]+'s';const record=get(col,id);if(!record||!demandConfirm('এই তথ্যটি মুছবেন? GitHub Sync চালু থাকলে এই পরিবর্তন অন্য ডিভাইসেও যাবে।'))return;
  await discard(col,id);ui.modal=null;await activity('Record deleted',record.title||record.label||col);render();toast('মুছে দেওয়া হয়েছে');return;
 }
 case 'delete-project':{
  const p=get('projects',id);if(!p||!demandConfirm('ডকুমেন্টারিটি Archive করবেন? টাস্ক ও Publishing History অক্ষত থাকবে।'))return;await save('projects',{...p,status:'archived'});ui.modal=null;render();toast('প্রকল্প Archive করা হয়েছে');return;
 }
 case 'enable-notifications':return enableNotifications();
 case 'export-reminder-calendar':{const r=get('reminders',id);if(!r)return;downloadFile('reminder-'+dateLocal(r.remindAt)+'-'+r.id.slice(0,8)+'.ics',toCalendarICS(r),'text/calendar;charset=utf-8');toast('ICS calendar file downloaded; import it into your device calendar for OS reminders.');return;}
 case 'export-backup':{const data=await backup();downloadFile('salimgpt-command-center-backup-'+dateLocal()+'.json',JSON.stringify(data,null,2));toast('JSON Backup ডাউনলোড হয়েছে');return;}
 case 'import-backup':document.getElementById('import-file')?.click();return;
 case 'load-demo':return seedDemo();
 case 'clear-local':if(demandConfirm('সতর্কতা: বর্তমান ব্রাউজারের সমস্ত SGCC তথ্য মুছে যাবে। GitHub-এ সফল Sync করা তথ্য আলাদা থাকবে এবং সিঙ্ক করলে আবার ডাউনলোড হতে পারে।')){await clearLocal();toast('লোকাল ডেটা পরিষ্কার করা হয়েছে');}return;
 case 'sync-cloud':if(!isSignedIn()){go('settings');toast('GitHub Sync-এর জন্য Settings থেকে Connect করুন','error');return;}try{const result=await syncCloud();toast(`GitHub Sync: ${result.uploaded} saved · ${result.downloaded} recovered · ${result.conflicts} conflicts`);}catch(err){toast(err.message,'error');}return;
 case 'signout-cloud':signOut();render();toast('GitHub disconnected; local data remains. Token was not stored.');return;
 case 'disconnect-cloud':if(demandConfirm('GitHub সংযোগ সরাবেন? স্থানীয় তথ্য অক্ষত থাকবে।')){clearCloudConfig();render();toast('GitHub সংযোগ সরানো হয়েছে');}return;
 case 'conflict-local':case 'conflict-remote':await resolveConflict(Number(el.dataset.index),action==='conflict-local'?'local':'remote');toast('Sync conflict resolved');return;
 default:console.warn('Unknown action',action);
 }
}
async function handleForm(form,ev){const type=form.dataset.form,v=formData(form),id=form.dataset.id,old=id?get(type==='snooze'?'reminders':type==='goal-progress'?'goals':type==='publication'?'publications':type+'s',id):null;
 switch(type){
 case 'quick-idea':{
  const title=String(v.title||'').trim();if(title.length<3)throw new Error('বিষয়ের নাম অন্তত ৩ অক্ষর লিখুন।');const i=await save('ideas',{title,status:'inbox',priority:'normal',description:'',tags:[]});await activity('New documentary idea',title);toast('নতুন আইডিয়া Idea Vault-এ সংরক্ষিত হয়েছে');form.reset();return;
 }
 case 'idea':{
  const title=v.title.trim();if(title.length<3)throw new Error('Documentary idea title too short');const i=await save('ideas',{...(old||{}),title,description:v.description,status:v.status,priority:v.priority,reviewDate:v.reviewDate,tags:v.tags.split(',').map(x=>x.trim()).filter(Boolean)});await activity(old?'Idea edited':'Idea captured',title);closeModal();toast('আইডিয়া সংরক্ষিত হয়েছে');return;
 }
 case 'project':{
  const title=v.title.trim();if(title.length<3)throw new Error('Documentary title too short');const p=await save('projects',{...(old||{}),title,description:v.description,language:v.language,priority:v.priority,status:v.status,startDate:v.startDate,targetDate:v.targetDate,category:v.category,notes:v.notes,ideaId:form.dataset.idea||old?.ideaId||''});
  if(!old){const todos=STAGES.flatMap(s=>s.tasks.map((name,index)=>({id:uid(),title:name,stage:s.id,projectId:p.id,priority:'normal',status:'todo',sortIndex:index,details:'',dueAt:''})));await saveMany('tasks',todos);if(form.dataset.idea){const original=get('ideas',form.dataset.idea);if(original)await save('ideas',{...original,status:'converted',projectId:p.id});}await activity('Documentary created',title,p.id);}
  else await activity('Documentary edited',title,p.id);
  ui.modal=null;ui.page='projects';ui.projectId=p.id;ui.projectTab='production';render();toast(old?'ডকুমেন্টারি আপডেট হয়েছে':'ডকুমেন্টারি ও Production Checklist তৈরি হয়েছে');return;
 }
 case 'task':{
  const title=v.title.trim();if(title.length<2)throw new Error('Task title too short');const t=await save('tasks',{...(old||{}),title,projectId:v.projectId,stage:v.projectId?v.stage:'',status:v.status,priority:v.priority,dueAt:v.dueAt?new Date(v.dueAt).toISOString():'',estimateHours:v.estimateHours?Number(v.estimateHours):null,details:v.details,completedAt:v.status==='done'?old?.completedAt||new Date().toISOString():null});await activity(old?'Task edited':'Task created',title,v.projectId);closeModal();toast('কাজ সংরক্ষিত হয়েছে');return;
 }
 case 'profile':{
  const url=cleanURL(v.url,'Profile URL',false),label=v.label.trim();if(label.length<2)throw new Error('Profile name too short');const profiles=all('profiles').filter(x=>x.id!==id);if(profiles.some(x=>x.url===url))throw new Error('এই Profile URL ইতোমধ্যে রেজিস্ট্রিতে আছে।');const platform=v.platform==='Auto'?detectPlatform(url):v.platform;
  const record=await save('profiles',{...(old||{}),url,label,platform,group:v.group,language:v.language,status:v.status,audience:v.audience?Number(v.audience):null,lastPostAt:v.lastPostAt?new Date(v.lastPostAt).toISOString():'',lastPostUrl:cleanURL(v.lastPostUrl,'Latest post URL'),notes:v.notes,monitoringMode:'link_only',metadataSource:'manual'});
  await activity(old?'Registry profile edited':'Registry profile added',label);closeModal();toast('প্রোফাইল সংরক্ষিত; সব ডকুমেন্টারির Publishing Checklist-এ এটি দেখা যাবে');return;
 }
 case 'publication':{
  const projectId=form.dataset.project,profileId=form.dataset.profile;const record=all('publications').find(x=>x.projectId===projectId&&x.profileId===profileId);const p=get('profiles',profileId),proj=get('projects',projectId);if(!p||!proj)throw new Error('Project or profile not found');
  await save('publications',{...(record||{id:projectId+':'+profileId,projectId,profileId}),status:v.status,publishedAt:v.status==='published'?(v.publishedAt?new Date(v.publishedAt).toISOString():new Date().toISOString()):'',postUrl:v.status==='published'?cleanURL(v.postUrl,'Post URL'):'',note:v.note});await activity('Publishing status edited',`${proj.title}: ${p.label} = ${v.status}`,projectId);closeModal();toast('প্রকাশনার অবস্থা সংরক্ষিত হয়েছে (কোনো আপলোড করা হয়নি)');return;
 }
 case 'reminder':{
  const title=v.title.trim();if(title.length<2)throw new Error('Reminder title too short');if(!v.remindAt||Number.isNaN(new Date(v.remindAt).getTime()))throw new Error('Valid reminder time required');const keepAlert=old?.remindAt===v.remindAt&&old?.leadMinutes===Number(v.leadMinutes)?old?.lastNotifiedAt||'':'';
  await save('reminders',{...(old||{}),title,remindAt:new Date(v.remindAt).toISOString(),category:v.category,priority:v.priority,recurrence:v.recurrence,leadMinutes:Number(v.leadMinutes),notifyEvery:Number(v.notifyEvery),details:v.details,status:old?.status==='done'?'pending':old?.status||'pending',lastNotifiedAt:keepAlert});await activity(old?'Reminder edited':'Reminder scheduled',title);closeModal();toast('রিমাইন্ডার সংরক্ষিত হয়েছে');return;
 }
 case 'snooze':{
  const r=get('reminders',id);if(!r)return;const d=new Date(Date.now()+Number(v.minutes)*60000);await save('reminders',{...r,remindAt:d.toISOString(),status:'pending',lastNotifiedAt:''});await activity('Reminder snoozed',r.title);closeModal();toast('নতুন সময় নির্ধারিত হয়েছে');return;
 }
 case 'goal':{
  const title=v.title.trim(),target=Number(v.target),current=Number(v.current);if(target<=0||!Number.isFinite(target)||current<0||!Number.isFinite(current))throw new Error('Target must be positive, progress cannot be negative');await save('goals',{...(old||{}),title,description:v.description,target,current,unit:v.unit,targetDate:v.targetDate,category:v.category});await activity(old?'Goal edited':'Goal created',title);closeModal();toast('লক্ষ্য সংরক্ষিত হয়েছে');return;
 }
 case 'goal-progress':{
  const g=get('goals',id),current=Number(v.current);if(!g||!Number.isFinite(current)||current<0)throw new Error('Invalid progress');await save('goals',{...g,current});await activity('Goal progress updated',g.title);closeModal();toast('অগ্রগতি আপডেট হয়েছে');return;
 }
 case 'cloud-config':setCloudConfig(v.owner,v.repo);render();toast('Private Data Repository-এর ঠিকানা সংরক্ষিত হয়েছে। এখন token দিয়ে Connect করুন।');return;
 case 'cloud-auth':{
  const session=await signIn(String(v.token||''));
  toast('Private GitHub Repository verified: '+session.repo.full_name);
  await syncCloud();render();return;
 }
 case 'contact':{
  if(!String(v.name||'').trim())throw new Error('Name required');
  const x=await save('contacts',{...(old||{}),name:v.name.trim(),organization:v.organization||'',role:v.role||'',phone:v.phone||'',email:v.email||'',nextFollowUp:v.nextFollowUp||'',lastContact:v.lastContact||'',priority:v.priority||'normal',notes:v.notes||'',status:v.status||'active'});
  await activity(old?'Contact updated':'Contact added',x.name);closeModal();toast('Contact saved');return;
 }
 case 'resource':{
  if(!String(v.title||'').trim())throw new Error('Research source title required');
  const x=await save('resources',{...(old||{}),title:v.title.trim(),url:cleanURL(v.url,'Source URL'),type:v.type||'Article',projectId:v.projectId||'',status:v.status||'to_read',citation:v.citation||'',notes:v.notes||'',tags:(v.tags||'').split(',').map(t=>t.trim()).filter(Boolean)});
  await activity(old?'Source updated':'Source saved',x.title,x.projectId);closeModal();toast('Research source saved');return;
 }
 default:throw new Error('Unknown form: '+type);
 }
}
app.addEventListener('click',event=>{
 const nav=event.target.closest('[data-nav]');if(nav){event.preventDefault();go(nav.dataset.nav);return;}
 const btn=event.target.closest('[data-action]');if(!btn)return;
 if(btn.tagName==='INPUT'&&btn.type==='checkbox')return; // handled on change
 if(btn.dataset.action==='open-search'&&event.target.matches('input'))return; // allow focus
 if(btn.closest('form')&&btn.type==='submit')return;
 event.preventDefault();doAction(btn.dataset.action,btn).catch(err=>{console.error(err);toast(err.message,'error');});
});
app.addEventListener('change',event=>{
 const t=event.target;
 if(t.matches('input[type="checkbox"][data-action="toggle-task"]')){doAction('toggle-task',t).catch(err=>toast(err.message,'error'));return;}
 if(t.matches('[data-filter]')){ui.filter=t.value;render();return;}
 if(t.matches('[data-archive-toggle]')){ui.showArchived=t.checked;render();return;}
 if(t.matches('#import-file')){importFile(t.files?.[0]);return;}
});
app.addEventListener('input',event=>{const t=event.target;if(t.matches('[data-pub-search]')){ui.pubSearch=t.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{render();document.querySelector('[data-pub-search]')?.focus();},250);return;}if(t.matches('[data-search]')){clearTimeout(searchTimer);const value=t.value;searchTimer=setTimeout(()=>{const start=t.selectionStart;ui.search=value;render();const selected=document.querySelector(`.content [data-search]`)||document.querySelector('.topbar [data-search]');if(selected){selected.focus();try{selected.setSelectionRange(start,start);}catch{}}},250);}});
app.addEventListener('submit',ev=>{const form=ev.target.closest('form[data-form]');if(!form)return;ev.preventDefault();const submitter=ev.submitter;for(const b of form.querySelectorAll('[type="submit"]'))b.disabled=true;handleForm(form,{submitter}).catch(err=>{console.error(err);toast(err.message,'error');}).finally(()=>{for(const b of form.querySelectorAll('[type="submit"]'))b.disabled=false;});});
app.addEventListener('mousedown',ev=>{if(ev.target.id==='modal-mask')closeModal();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ui.modal){closeModal();return;}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();go('ideas');document.querySelector('.content [data-search]')?.focus();}if(ev.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!ui.modal){ev.preventDefault();go('ideas');document.querySelector('.content [data-search]')?.focus();}});
async function importFile(file){if(!file)return;if(file.size>15*1024*1024){toast('15MB-এর বেশি Backup আমদানি সমর্থিত নয়','error');return;}try{const data=parseValidJSON(await file.text());if(!demandConfirm('Backup থেকে নতুন রেকর্ড যুক্ত করবেন? একই ID-র বর্তমান রেকর্ড পরিবর্তন হবে না। GitHub সংযুক্ত থাকলে নতুন তথ্য Private Repository-তেও Sync হবে।'))return;const count=await restoreBackup(data);toast(count+' নতুন রেকর্ড Restore করা হয়েছে');}catch(err){toast('Restore failed: '+err.message,'error');}}
function toCalendarICS(r){
 const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const icsEscape=t=>String(t||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const start=new Date(r.remindAt),end=new Date(start.getTime()+15*60000);
 const rule={daily:'FREQ=DAILY',weekly:'FREQ=WEEKLY',monthly:'FREQ=MONTHLY'}[r.recurrence];
 const lead=Math.max(0,Math.min(1440,Number(r.leadMinutes)||0));
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SalimGPT//Command Center//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
  'UID:'+r.id+'@salimgpt-command-center','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),
  'SUMMARY:'+icsEscape(r.title),'DESCRIPTION:'+icsEscape(r.details||'Saved in SalimGPT Command Center'),
  ...(rule?['RRULE:'+rule]:[]),'BEGIN:VALARM','TRIGGER:'+(!lead?'PT0M':'-PT'+lead+'M'),
  'ACTION:DISPLAY','DESCRIPTION:'+icsEscape(r.title),'END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
async function enableNotifications(){if(!('Notification'in window)){toast('এই ব্রাউজারে Notification API নেই','error');return;}if(!window.isSecureContext){toast('Notification চালু করতে HTTPS দরকার','error');return;}try{const status=await Notification.requestPermission();toast(status==='granted'?'নোটিফিকেশনের অনুমতি দেওয়া হয়েছে':'নোটিফিকেশনের অনুমতি দেওয়া হয়নি',status==='granted'?'ok':'error');}catch(err){toast(err.message,'error');}}
async function browserNotify(r){if(!('Notification' in window)||Notification.permission!=='granted')return;try{const reg=await navigator.serviceWorker?.getRegistration();if(reg){await reg.showNotification('SalimGPT Reminder',{body:r.title,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',tag:'sgcc-reminder-'+r.id,renotify:false,data:{url:location.href}});}else if(window.Notification){new Notification('SalimGPT Reminder',{body:r.title});}}catch(err){console.warn('Notification not delivered:',err);}}
let checkingReminders=false;
async function checkDueReminders(){if(checkingReminders)return;checkingReminders=true;try{const rightNow=Date.now();for(const r of all('reminders')){if(r.status==='done'||!r.remindAt)continue;const due=new Date(r.remindAt).getTime();if(Number.isNaN(due)||rightNow<due-(Number(r.leadMinutes)||0)*60000)continue;const last=r.lastNotifiedAt?new Date(r.lastNotifiedAt).getTime():0,interval=Math.max(10,Number(r.notifyEvery)||30)*60000;if(last&&rightNow-last<interval)continue;
 await save('reminders',{...r,lastNotifiedAt:new Date().toISOString()});toast('⏰ রিমাইন্ডার: '+r.title,'ok');await browserNotify(r);
 }}catch(err){console.warn('Reminder check error',err);}finally{checkingReminders=false;}}
async function seedDemo(){if(!demandConfirm('DEMO দিয়ে ২টি নমুনা ডকুমেন্টারি, ৬টি প্রোফাইল, টাস্ক, রিমাইন্ডার ও লক্ষ্য যোগ হবে। বাস্তব ডেটার সঙ্গে মিশে যেতে পারে। চালিয়ে যাবেন?'))return;
 const demoMark='[DEMO]';let generated=[];
 for(const [name,url,platform] of [['Main YouTube','https://www.youtube.com/@salimgpt-demo','YouTube'],['Facebook Official','https://www.facebook.com/salimgpt-demo','Facebook'],['Instagram English','https://www.instagram.com/salimgpt-demo/','Instagram'],['TikTok Main','https://www.tiktok.com/@salimgpt-demo','TikTok'],['Telegram Channel','https://t.me/salimgpt_demo','Telegram'],['Documentary Website','https://example.org/salimgpt-demo','Website']])generated.push(await save('profiles',{label:demoMark+' '+name,url,platform,group:'DEMO',status:'active',language:'English',monitoringMode:'link_only',metadataSource:'manual'}));
 const names=['Ancient Civilizations: Hidden Stories','Science Behind Deep Ocean Mysteries'];for(let n=0;n<names.length;n++){
 const p=await save('projects',{title:demoMark+' '+names[n],description:'DEMO only: example research and documentary workflow. Replace with your real project.',language:'English',priority:n?'normal':'high',status:'active',targetDate:dateLocal(new Date(Date.now()+(n+1)*20*86400000)),category:'DEMO',notes:'Demo project (not real source evidence).'});
 const templates=STAGES.flatMap(s=>s.tasks.map((t,i)=>({title:t,projectId:p.id,stage:s.id,status:n===0&&(s.id==='planning'||s.id==='research'&&i<2)?'done':'todo',priority:'normal',dueAt:'',details:''})));
 await saveMany('tasks',templates);if(n===0){for(const prof of generated.slice(0,2))await save('publications',{id:p.id+':'+prof.id,projectId:p.id,profileId:prof.id,status:'published',publishedAt:new Date().toISOString(),postUrl:'',note:'DEMO data; not proof of real publication'});}
 }
 await save('ideas',{title:'[DEMO] Why civilizations disappeared',description:'Save ideas instantly, then convert to a documentary.',status:'inbox',priority:'normal'});
 await save('reminders',{title:'[DEMO] Documentary research follow-up',remindAt:new Date(Date.now()+2*3600000).toISOString(),category:'Work',priority:'normal',status:'pending',recurrence:'none',leadMinutes:15,notifyEvery:30,details:'Demo reminder'});
 await save('goals',{title:'[DEMO] Complete 12 documentaries',target:12,current:2,unit:'documentaries',category:'DEMO',targetDate:dateLocal(new Date(Date.now()+180*86400000))});
 await activity('Demo data added','Sample records are explicitly marked [DEMO]');go('dashboard');toast('ডেমো ডেটা যুক্ত হয়েছে। এটি বাস্তব SalimGPT প্রকাশনার তথ্য নয়।');
}
async function initialize(){try{await initializeStore();onStoreChange(scheduleRender);render();if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('PWA offline unavailable',err));}
 if(isSignedIn()&&navigator.onLine)syncCloud().catch(err=>toast('GitHub sync: '+err.message,'error'));
 setInterval(()=>{if(document.visibilityState==='visible')checkDueReminders().catch(console.error);},60000);
 setTimeout(()=>checkDueReminders().catch(console.error),4000);
 setInterval(()=>{if(isSignedIn()&&navigator.onLine&&document.visibilityState==='visible')syncCloud().catch(err=>console.warn(err.message));},90000);
 window.addEventListener('online',()=>{if(isSignedIn())syncCloud().catch(err=>console.warn(err.message));});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkDueReminders().catch(console.error);});
 }catch(err){console.error(err);app.innerHTML=`<div style="max-width:620px;margin:15vh auto;background:#152b39;padding:35px;border:1px solid #476373;border-radius:16px;color:#fff"><h1>Storage could not initialize</h1><p>App needs a modern browser with IndexedDB enabled. ${e(err.message)}</p><button onclick="location.reload()">Retry</button></div>`;}}
initialize();
