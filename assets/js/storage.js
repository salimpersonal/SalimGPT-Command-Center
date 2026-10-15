import { initialState, validateImport } from './domain.js';
const DB_NAME = 'salimgpt-command-center-v2';
const STORE = 'workspaces';
const FALLBACK = 'salimgpt-v2-fallback';
let dbPromise = null;
function database() {
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE))
            request.result.createObjectStore(STORE); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || Error('IndexedDB could not open'));
    });
    return dbPromise;
}
async function loadFromIDB() {
    const db = await database();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get('primary');
        req.onsuccess = () => resolve(req.result ? validateImport(req.result) : null);
        req.onerror = () => reject(req.error);
    });
}
async function saveToIDB(state) {
    const db = await database();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(state, 'primary');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export let storageMode = 'indexeddb';
export async function loadWorkspace() {
    try {
        return (await loadFromIDB()) || initialState();
    }
    catch (error) {
        // A malformed existing workspace must not silently become a new empty workspace.
        if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Expected schema')))
            throw error;
        console.warn('IndexedDB unavailable; localStorage fallback', error);
        storageMode = 'localstorage';
        try {
            const raw = localStorage.getItem(FALLBACK);
            return raw ? validateImport(JSON.parse(raw)) : initialState();
        }
        catch {
            return initialState();
        }
    }
}
export async function saveWorkspace(state) {
    if (storageMode === 'indexeddb')
        return saveToIDB(state);
    localStorage.setItem(FALLBACK, JSON.stringify(state));
}
export function exportWorkspace(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SalimGPT-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
