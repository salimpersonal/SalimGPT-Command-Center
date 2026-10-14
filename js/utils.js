export const uid=()=>globalThis.crypto?.randomUUID?.() || ('sg-'+Date.now()+'-'+Math.random().toString(36).slice(2));
export const now=()=>new Date().toISOString();
export function escapeHTML(v='') {return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
export const e=escapeHTML;
export function safeURL(v) {try {const u=new URL(String(v||'').trim()); return ['http:','https:'].includes(u.protocol)?u.toString():'';}catch{return '';}}
export const href=v=>escapeHTML(safeURL(v)||'#');
export const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
export const dateLocal=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return '';const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;};
export const datetimeLocal=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return '';return dateLocal(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
export const humanDate=(value,withTime=false)=>{if(!value)return 'নির্ধারিত নয়';const d=new Date(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00':value);if(Number.isNaN(d.getTime()))return 'নির্ধারিত নয়';return d.toLocaleString('bn-BD',{day:'numeric',month:'short',year:'numeric',...(withTime?{hour:'numeric',minute:'2-digit'}:{})});};
export const shortDate=(v)=>humanDate(v,false);
export const isOverdue=(v)=>!!v && new Date(v).getTime()<Date.now();
export const daysLeft=(v)=>v?Math.ceil((new Date(v).getTime()-Date.now())/86400000):null;
export const neatNumber=(n)=>new Intl.NumberFormat('en-US').format(Number(n)||0);
export const initials=(s)=>String(s||'SG').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
export const crop=(s,max=110)=>String(s||'').length>max?String(s).slice(0,max-1)+'…':String(s||'');
export const fmtPercent=n=>Math.round(clamp(n))+'%';
export const unique=arr=>[...new Set(arr)];
export function formData(form){return Object.fromEntries(new FormData(form).entries());}
export function downloadFile(name,content,type='application/json'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
export function progressByStage(project,tasks,stages){const arr=stages.filter(s=>!project.skippedStages?.includes(s.id));const sum=arr.reduce((a,x)=>a+x.weight,0)||1;const values=arr.map(s=>{const t=tasks.filter(x=>x.projectId===project.id&&x.stage===s.id);return {...s,total:t.length,done:t.filter(x=>x.status==='done').length,progress:t.length?100*t.filter(x=>x.status==='done').length/t.length:0};});return {stages:values,overall:values.reduce((a,x)=>a+x.progress*x.weight/sum,0)};}
export function groupBy(items,key){return items.reduce((acc,x)=>{const k=x[key]||'Other';(acc[k]??=[]).push(x);return acc;},{});}
export function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}
export function parseValidJSON(str){const v=JSON.parse(str);if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid backup format');return v;}
export function toast(msg,kind='ok'){const parent=document.getElementById('toast-root');if(!parent)return;const n=document.createElement('div');n.className='toast '+(kind==='error'?'toast-error':'');n.setAttribute('role','status');n.textContent=msg;parent.append(n);setTimeout(()=>{n.classList.add('fade');setTimeout(()=>n.remove(),350);},4000);}
export const prettySyncTime=v=>v?humanDate(v,true):'Never';
export function nextRepeat(date,recurrence){const d=new Date(date);if(Number.isNaN(d.getTime()))return '';const previous=d.getTime();while(d.getTime()<=Date.now()){if(recurrence==='daily')d.setDate(d.getDate()+1);else if(recurrence==='weekly')d.setDate(d.getDate()+7);else if(recurrence==='monthly')d.setMonth(d.getMonth()+1);else return '';if(d.getTime()<=previous)break;}return datetimeLocal(d);}

// Derived from the *central* registry on every project view, not copied at project creation.
export function derivePublicationRows(profiles,publications,projectId){
 const map=new Map(publications.filter(p=>p.projectId===projectId).map(p=>[p.profileId,p]));
 return profiles.filter(p=>p.status!=='archived'||map.has(p.id)).map(profile=>({profile,record:map.get(profile.id)||null,status:map.get(profile.id)?.status||'not_published'}));
}
