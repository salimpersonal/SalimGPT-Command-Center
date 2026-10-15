import { validateImport } from './domain.js';
const CONFIG_KEY = 'sgv2-cloud-config';
const SESSION_KEY = 'sgv2-cloud-session';
let knownRevision = null;
export function getCloudConfig() { try {
    const v = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
    return typeof v?.url === 'string' && typeof v?.publishableKey === 'string' && v.url && v.publishableKey ? v : null;
}
catch {
    return null;
} }
export function saveCloudConfig(conf) {
    const url = conf.url.trim().replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url))
        throw Error('Use a valid https://…supabase.co project URL');
    const publishableKey = conf.publishableKey.trim();
    if (!/^(sb_publishable_[a-zA-Z0-9_-]+|eyJ[a-zA-Z0-9._-]+)$/.test(publishableKey))
        throw Error('Use the Supabase publishable key (not a secret key)');
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, publishableKey }));
    knownRevision = null;
}
export function signOut() { sessionStorage.removeItem(SESSION_KEY); knownRevision = null; }
function readSession() { try {
    const v = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return v && v.access_token && v.refresh_token && v.user?.id ? v : null;
}
catch {
    return null;
} }
export function cloudAccount() { const s = readSession(); return s ? { email: s.user.email || 'Logged in', userId: s.user.id } : null; }
function saveSession(token) {
    if (!token.access_token || !token.refresh_token || !token.user?.id)
        throw Error('No active session. Please check email confirmation or sign in.');
    const session = { access_token: token.access_token, refresh_token: token.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(token.expires_in || 3600), user: { id: token.user.id, email: token.user.email } };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}
async function request(path, options = {}, jwt) {
    const config = getCloudConfig();
    if (!config)
        throw Error('Configure the Supabase URL and publishable key first');
    const headers = { 'apikey': config.publishableKey, 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (jwt)
        headers.Authorization = `Bearer ${jwt}`;
    let resp;
    try {
        resp = await fetch(`${config.url}${path}`, { ...options, headers });
    }
    catch {
        throw Error('Could not contact Supabase. Check your internet connection and project URL.');
    }
    const raw = await resp.text();
    let data;
    try {
        data = raw ? JSON.parse(raw) : null;
    }
    catch {
        data = raw;
    }
    if (!resp.ok)
        throw Error(typeof data === 'object' ? (data?.msg || data?.message || data?.error_description || data?.error || `Server error ${resp.status}`) : `Server error ${resp.status}`);
    return data;
}
async function accessSession() {
    let s = readSession();
    if (!s)
        throw Error('Please sign in to Supabase first');
    if (s.expires_at > Math.floor(Date.now() / 1000) + 45)
        return s;
    const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) });
    s = saveSession(refreshed);
    return s;
}
export async function cloudSignIn(email, password) {
    const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
    saveSession(result);
    knownRevision = null;
}
export async function cloudSignUp(email, password) {
    const result = await request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (result?.access_token) {
        saveSession(result);
        return true;
    }
    return false;
}
export async function cloudRead() {
    const sess = await accessSession();
    const row = await request('/rest/v1/workspace_snapshots?select=payload,revision,updated_at&limit=1', { method: 'GET' }, sess.access_token);
    if (!Array.isArray(row))
        throw Error('Unexpected database response');
    if (!row.length) {
        knownRevision = 0;
        return null;
    }
    const item = row[0];
    const snapshot = { payload: validateImport(item.payload), revision: Number(item.revision), updated_at: item.updated_at };
    knownRevision = snapshot.revision;
    return snapshot;
}
export async function cloudUpload(state) {
    const session = await accessSession();
    // Always recheck revision before overwrite; two-device changes are never silently discarded.
    const prev = knownRevision;
    const cloud = await cloudRead();
    if (cloud && prev !== null && cloud.revision !== prev)
        throw Error('Cloud data changed on another device. Download it or resolve the conflict before uploading.');
    if (cloud && prev === null)
        throw Error('Cloud data already exists. Download it first or sign in again after making a backup.');
    if (!cloud) {
        const items = await request('/rest/v1/workspace_snapshots?select=revision', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: session.user.id, payload: state }) }, session.access_token);
        if (!Array.isArray(items) || !items[0])
            throw Error('Cloud upload was not confirmed');
        knownRevision = Number(items[0].revision);
        return { revision: knownRevision, created: true };
    }
    const items = await request(`/rest/v1/workspace_snapshots?user_id=eq.${encodeURIComponent(session.user.id)}&revision=eq.${cloud.revision}&select=revision`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ payload: state }) }, session.access_token);
    if (!Array.isArray(items) || !items.length)
        throw Error('Cloud revision conflict. Nothing was overwritten.');
    knownRevision = Number(items[0].revision);
    return { revision: knownRevision, created: false };
}
