/**
 * GitHub-only private repository transport for SGCC.
 * No credential is persisted to browser storage or included in deployed assets.
 * The user enters a fine-grained PAT during each new app session.
 */
const CONFIG_KEY='sgcc_github_repo_v2';
const DEFAULT_CONFIG={owner:'salimpersonal',repo:'SalimGPT-Private-Data'};
let token='';
let account=null;
let connection=null;
// Do not add X-GitHub-Api-Version in browser requests: the REST API CORS
// allow-headers list may reject that header during OPTIONS preflight.
const API='https://api.github.com';
const ALLOWED=/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/;

export function getCloudConfig(){try{const raw=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');return raw?.owner&&raw?.repo?raw:DEFAULT_CONFIG;}catch{return DEFAULT_CONFIG;}}
export function isCloudConfigured(){return !!getCloudConfig();}
export function isSignedIn(){return !!token&&!!account&&!!connection;}
export function getCloudSession(){return account?{user:{login:account.login},repo:{full_name:connection.full_name,private:connection.private}}:null;}
export function setCloudConfig(owner,repo){const a=String(owner||'').trim(),b=String(repo||'').trim();if(!ALLOWED.test(a)||!ALLOWED.test(b))throw new Error('সঠিক GitHub username ও repository name দিন।');const cfg={owner:a,repo:b};localStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));signOut();return cfg;}
export function signOut(){token='';account=null;connection=null;}
export function clearCloudConfig(){localStorage.removeItem(CONFIG_KEY);signOut();}
function root(){const {owner,repo}=getCloudConfig();return '/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo);}
const hexError=(res,data)=>{
 let msg=typeof data?.message==='string'?data.message:`GitHub API HTTP ${res.status}`;
 if(res.status===401)msg='GitHub token অকার্যকর বা মেয়াদোত্তীর্ণ। নতুন token দিয়ে Connect করুন।';
 if(res.status===403||res.status===429)msg='GitHub API অনুমতি বা rate-limit সমস্যা। Token permissions ও API limit যাচাই করুন।';
 if(res.status===404)msg='Repository পাওয়া যায়নি অথবা এই token-এ অ্যাক্সেস নেই।';
 const err=new Error(msg);err.status=res.status;return err;
};
async function api(path,{method='GET',body,authToken=token}={}){
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),20000);
 try{
  const res=await fetch(API+path,{method,headers:{'Accept':'application/vnd.github+json',...(authToken?{'Authorization':'Bearer '+authToken}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:ctl.signal,cache:'no-store'});
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null;}catch{throw new Error('GitHub returned unreadable JSON.');}
  if(!res.ok)throw hexError(res,data);
  return data;
 }catch(err){if(err.name==='AbortError')throw new Error('GitHub সংযোগের সময় শেষ হয়েছে; আবার চেষ্টা করুন।');throw err;}
 finally{clearTimeout(timeout);}
}
export async function signIn(personalAccessToken){
 const t=String(personalAccessToken||'').trim();if(t.length<25||!/^([a-zA-Z0-9_]+)$/.test(t))throw new Error('সঠিক fine-grained GitHub token দিন।');
 const me=await api('/user',{authToken:t});
 const repository=await api(root(),{authToken:t});
 if(repository.private!==true)throw new Error('নিরাপত্তার জন্য Data Repository অবশ্যই PRIVATE হতে হবে। GitHub-এ এটি Private করুন।');
 if(repository.archived||repository.disabled)throw new Error('Data Repository archived/disabled; এতে লেখা যাবে না।');
 token=t;account={login:me.login};connection={full_name:repository.full_name,private:true};
 return getCloudSession();
}
export async function signUp(){throw new Error('GitHub-এ আলাদা Sign-up দরকার নেই; Settings থেকে token দিয়ে Connect করুন।');}
function ensureConnected(){if(!isSignedIn())throw new Error('GitHub Private Data-তে সংযোগ দিন (Settings)।');}
function decodeUnicodeBase64(input){const raw=atob(String(input).replace(/\s/g,''));const bytes=Uint8Array.from(raw,ch=>ch.charCodeAt(0));return new TextDecoder().decode(bytes);}
function encodeUnicodeBase64(input){const bytes=new TextEncoder().encode(input);if(bytes.length>900000)throw new Error('এই collection 900 KB ছাড়িয়েছে। একাধিক ফাইলের sharding ছাড়া আর লেখা নিরাপদ নয়।');let raw='';for(let i=0;i<bytes.length;i+=16000)raw+=String.fromCharCode(...bytes.subarray(i,i+16000));return btoa(raw);}
const ALLOWED_COLLECTION=/^[a-z]+$/;
function pathFor(collection){if(!ALLOWED_COLLECTION.test(collection))throw new Error('Invalid collection identifier');return root()+'/contents/data/'+encodeURIComponent(collection)+'.json';}
export async function getRemoteCollection(collection){ensureConnected();let data;
 try{data=await api(pathFor(collection));}catch(err){if(err.status===404)return {sha:null,records:{}};throw err;}
 if(data.type!=='file'||typeof data.content!=='string')throw new Error('GitHub Data file বড় বা অসামঞ্জস্যপূর্ণ। 1MB সীমা পরীক্ষা করুন।');
 let document;try{document=JSON.parse(decodeUnicodeBase64(data.content));}catch{throw new Error('GitHub-এ সংরক্ষিত '+collection+'.json ফাইলটি বৈধ JSON নয়।')}
 if(document.app!=='salimgpt-command-center'||document.schema!==2||document.collection!==collection||!document.records||Array.isArray(document.records)||typeof document.records!=='object')throw new Error('Private Data Repository-তে অসামঞ্জস্যপূর্ণ ডেটা: '+collection);
 return {sha:data.sha,records:document.records};
}
export async function putRemoteCollection(collection,records,sha){ensureConnected();
 const document={app:'salimgpt-command-center',schema:2,collection,updatedAt:new Date().toISOString(),records};
 const content=encodeUnicodeBase64(JSON.stringify(document));
 const body={message:'SGCC: sync '+collection+' ('+new Date().toISOString()+')',content,...(sha?{sha}:{})};
 const data=await api(pathFor(collection),{method:'PUT',body});
 return {sha:data?.content?.sha||null};
}
