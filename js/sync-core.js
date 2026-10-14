/** Pure conflict logic, independent of browser and network. */
export const stable=(value)=>{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(v=>stable(v)).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
};
export const signature=record=>stable({deleted:!!record.deleted,data:record.data});
export function remoteRecord(record,collection,id){if(!record||!record.data||typeof record.data!=='object'||Array.isArray(record.data))throw new Error('Invalid remote record '+collection+'/'+id);return {key:collection+'/'+id,collection,id,data:{...record.data,id},deleted:!!record.deleted,updatedAt:record.updatedAt||record.data.updatedAt||'',dirty:false,remoteSignature:signature(record),changeId:''};}
export function conflictsWithRemote(local,remote){const baseline=local.remoteSignature||null;return remote?(!baseline||baseline!==signature(remote)):(!!baseline);}
export function mergeForCommit(remoteRecords,updates){const combined=Object.assign(Object.create(null),remoteRecords);for(const rec of updates)combined[rec.id]={data:rec.data,deleted:!!rec.deleted,updatedAt:rec.updatedAt};return combined;}
