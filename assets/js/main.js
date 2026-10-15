import { STAGES, PRODUCTION_STAGES, initialState, activeDocumentaries, allDocumentaries, createDocumentary, editDocumentary, createProfile, editProfile, publishingRows, publicationProgress, progressOf, toggleStep, addStep, editStep, setPublication, weekRows, softDelete, restoreItem, removeForever, logAction, todayISO, validateImport } from './domain.js';
import { loadWorkspace, saveWorkspace, exportWorkspace, storageMode } from './storage.js';
import { ico } from './icons.js';
import { translate as translateLabel, stageText } from './i18n.js';
import { cloudAccount, cloudRead, cloudUpload, cloudSignIn, cloudSignUp, getCloudConfig, saveCloudConfig, signOut } from './cloud.js';
let workspace = initialState();
let modal = { type: null };
let filter = 'all';
let query = '';
let sort = 'updated';
let mobileMenuOpen = false;
let saving = Promise.resolve();
let toastTimer = null;
const root = document.getElementById('app');
const t = (key) => translateLabel(workspace.settings.language, key);
const stage = (s) => stageText(workspace.settings.language, s);
const isBN = () => workspace.settings.language === 'bn';
const MILESTONE_STAGES = STAGES.filter(s => s !== 'published');
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function safeUrl(value) { try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
}
catch {
    return '';
} }
function formatDate(value) { if (!value)
    return t('unscheduled'); const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(isBN() ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtDateTime(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(isBN() ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
function stageBadge(s) { return `<span class="pill stage-${esc(s)}">${esc(stage(s))}</span>`; }
function progressBar(n) { return `<div class="progress-track" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, n))}%"></div></div>`; }
function showToast(message, error = false) {
    const existing = document.getElementById('sg-toast');
    existing?.remove();
    if (toastTimer !== null)
        window.clearTimeout(toastTimer);
    const div = document.createElement('div');
    div.id = 'sg-toast';
    div.className = `toast ${error ? 'error' : ''}`;
    div.textContent = message;
    document.body.appendChild(div);
    toastTimer = window.setTimeout(() => div.remove(), 4100);
}
function mutate(fn) {
    try {
        fn();
        render();
        saving = saving.catch(() => { }).then(() => saveWorkspace(workspace));
        saving.catch(e => showToast(`Save failed: ${String(e)}`, true));
    }
    catch (err) {
        showToast(err instanceof Error ? err.message : String(err), true);
    }
}
function navigate(route) { modal = { type: null }; mobileMenuOpen = false; if (location.hash === route) {
    render();
}
else {
    location.hash = route;
} }
function routeParts() { return decodeURIComponent(location.hash.replace(/^#\/?/, '') || 'dashboard').split('/').filter(Boolean); }
function actionButton(action, label, klass = 'btn', attrs = '') { return `<button type="button" class="${klass}" data-action="${action}" ${attrs}>${label}</button>`; }
function headerBlock(eyebrow, title, subtitle, action) { return `<div class="page-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1 class="page-title">${esc(title)}</h1><p class="page-sub">${esc(subtitle)}</p></div>${action || ''}</div>`; }
function stateLabel(doc) { return `${stage(doc.stage)} · ${doc.targetDate ? formatDate(doc.targetDate) : t('unscheduled')}`; }
function navItem(path, label, iconName, current) { return `<a class="nav-item ${current === path ? 'active' : ''}" href="#/${path}" data-nav="${path}">${ico(iconName)}<span>${esc(label)}</span></a>`; }
function layout(page, title, content) {
    const nav = [['dashboard', t('dashboard'), 'dashboard'], ['documentaries', t('documentaries'), 'film'], ['network', t('network'), 'network'], ['schedule', t('schedule'), 'calendar'], ['activity', t('activity'), 'history'], ['trash', t('trash'), 'trash'], ['settings', t('settings'), 'settings']];
    const active = page === 'doc' ? 'documentaries' : page;
    return `<div class="side-overlay ${mobileMenuOpen ? 'show' : ''}" data-action="menu-close"></div><div class="shell">
  <aside class="sidebar ${mobileMenuOpen ? 'open' : ''}"><a href="#/dashboard" class="brand"><img class="brand-mark" src="./assets/img/sg-logo.webp" alt="SalimGPT logo"/><div><div class="brand-name">SalimGPT</div><small>COMMAND CENTER</small></div></a>
    <div class="nav-caption">MAIN MENU</div>${nav.slice(0, 4).map(([p, l, i]) => navItem(p, l, i, active)).join('')}
    <div class="nav-caption">MANAGE</div>${nav.slice(4).map(([p, l, i]) => navItem(p, l, i, active)).join('')}
    <div class="nav-spacer"></div><div class="sidebar-bottom"><span class="online-dot"></span>${esc(isBN() ? 'লোকাল ওয়ার্কস্পেস সক্রিয়' : 'Local workspace active')}<div style="margin-top:7px">Research · Production · Publishing</div><div>© SalimGPT | Mohammad Salim</div></div>
  </aside>
  <main class="main"><header class="topbar"><div class="top-left"><button class="icon-btn mobile-menu" aria-label="Open menu" data-action="menu-open">${ico('menu')}</button><div><div class="top-eyebrow">SALIMGPT / ${esc(t('workspace'))}</div><div class="top-title">${esc(title)}</div></div></div>
    <div class="top-right"><label class="top-search">${ico('search', 16)}<input aria-label="Search documentary" id="global-search" placeholder="${esc(t('search'))}" value="${esc(query)}" /></label>
    <button class="icon-btn" title="${esc(t('theme'))}" data-action="theme-toggle">${ico(workspace.settings.theme === 'dark' ? 'sun' : 'moon', 18)}</button>
    <button class="btn primary" data-action="new-documentary">${ico('plus', 16)}<span>${esc(t('newIdea'))}</span></button><div class="avatar" title="SalimGPT">SG</div></div>
  </header>${content}</main></div>${modal.type ? renderModal() : ''}`;
}
function noResults(title, subtitle, button = '') { return `<div class="empty"><div class="empty-icon">${ico('film', 25)}</div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p>${button}</div>`; }
function docCard(d) {
    const percent = progressOf(workspace, d.id);
    const p = publicationProgress(workspace, d.id);
    return `<a class="card doc-card" href="#/doc/${encodeURIComponent(d.id)}"><div class="row space"><span class="doc-tag">${ico('film', 15)} ${esc(d.language.toUpperCase())}</span>${stageBadge(d.stage)}</div>
   <div class="doc-title">${esc(d.title)}</div><div class="doc-desc">${esc(d.description || (isBN() ? 'গবেষণা, স্ক্রিপ্ট ও সম্পাদনার পরিকল্পনা' : 'Plan research, script and editing'))}</div>
   <div class="doc-card-foot"><div class="row space tiny"><span class="muted">${esc(t('progress'))}</span><strong>${percent}%</strong></div>${progressBar(percent)}<div class="row space mt20">
   <span class="doc-tag">${ico('calendar', 14)} ${esc(d.targetDate ? formatDate(d.targetDate) : t('unscheduled'))}</span><span class="doc-tag">${ico('check', 13)} ${p.done}/${p.total} ${esc(isBN() ? 'পাবলিশ' : 'published')}</span></div></div></a>`;
}
function metric(iconName, value, label, foot, accent = 'var(--cyan)') { return `<div class="metric" style="--accent:${accent}"><div class="metric-label"><span class="metric-icon">${ico(iconName, 17)}</span>${esc(label)}</div><div class="metric-value">${esc(value)}</div><div class="metric-foot">${esc(foot)}</div></div>`; }
function dashboard() {
    const docs = activeDocumentaries(workspace);
    const working = docs.filter(d => ['research', 'script', 'voice', 'visuals', 'editing', 'review'].includes(d.stage)).length;
    const ready = docs.filter(d => d.stage === 'ready' || d.stage === 'publishing').length;
    const published = docs.filter(d => d.stage === 'published').length;
    const weeks = weekRows(workspace, new Date(), 1);
    const current = weeks[0];
    const next = docs.filter(d => d.targetDate && d.targetDate >= todayISO()).sort((a, b) => a.targetDate.localeCompare(b.targetDate)).slice(0, 5);
    const recent = workspace.activity.slice(0, 6);
    const stageCounts = [{ label: isBN() ? 'আইডিয়া ও শিডিউল' : 'Ideas & planned', stages: ['idea', 'scheduled'] }, { label: isBN() ? 'গবেষণা ও স্ক্রিপ্ট' : 'Research & script', stages: ['research', 'script'] }, { label: isBN() ? 'ভয়েস ও ভিজ্যুয়াল' : 'Voice & visuals', stages: ['voice', 'visuals'] }, { label: isBN() ? 'এডিটিং ও রিভিউ' : 'Editing & review', stages: ['editing', 'review'] }, { label: isBN() ? 'প্রস্তুত ও প্রকাশিত' : 'Ready & released', stages: ['ready', 'publishing', 'published'] }];
    return `${headerBlock('WORKSPACE OVERVIEW', isBN() ? 'সকল ডকুমেন্টারি, এক নজরে' : 'Your entire documentary pipeline', (isBN() ? `সাপ্তাহিক লক্ষ্য ${workspace.settings.weeklyTarget}টি প্রকাশনা — নির্মাণের কোনো সীমা নেই` : `${workspace.settings.weeklyTarget} release(s) weekly — unlimited productions`), `<button class="btn primary" data-action="new-documentary">${ico('plus', 16)}${esc(t('newIdea'))}</button>`)}
 <div class="grid metrics">${metric('film', String(docs.length), t('total'), isBN() ? 'আইডিয়া ও চলমানসহ' : 'Ideas and ongoing', 'var(--cyan)')}${metric('clock', String(working), t('inProduction'), isBN() ? 'সক্রিয় নির্মাণ পর্যায়' : 'Active production', 'var(--blue)')}${metric('check', String(ready), t('ready'), isBN() ? 'রেডি বা পাবলিশিং' : 'Ready or publishing', 'var(--yellow)')}${metric('target', String(published), t('published'), isBN() ? 'প্রকাশিত ডকুমেন্টারি' : 'Published documentaries', 'var(--green)')}</div>
 <div class="split"><div class="sidebar-grid">
  <section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(isBN() ? 'প্রোডাকশন পাইপলাইন' : 'Production pipeline')}</h2><a href="#/documentaries" class="btn text-only">${esc(t('documentaries'))} ${ico('arrow', 14)}</a></div>
   <div class="pipeline">${stageCounts.map(g => `<div class="pipeline-box"><small>${esc(g.label)}</small><strong>${docs.filter(d => g.stages.includes(d.stage)).length}</strong></div>`).join('')}</div></section>
  <section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(t('upcoming'))}</h2><a class="btn text-only" href="#/schedule">${esc(t('schedule'))} ${ico('arrow', 14)}</a></div>
   ${next.length ? next.map(d => `<a href="#/doc/${encodeURIComponent(d.id)}" class="list-row"><div class="item-circle">${ico('calendar', 18)}</div><div class="grow"><div class="main-label">${esc(d.title)}</div><div class="aux">${esc(formatDate(d.targetDate))}</div></div>${stageBadge(d.stage)}</a>`).join('') : noResults(t('unscheduled'), isBN() ? 'যে কোনো ডকুমেন্টারিতে প্রকাশের তারিখ যুক্ত করুন।' : 'Set a release date on any documentary.')}</section>
  <section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(t('recent'))}</h2><a href="#/activity" class="btn text-only">${esc(isBN() ? 'সব দেখুন' : 'View all')} ${ico('arrow', 14)}</a></div>
    ${recent.length ? recent.map(a => `<div class="list-row"><div class="item-circle">${ico('history', 18)}</div><div class="grow"><div class="main-label">${esc(a.message)}</div><div class="aux">${esc(fmtDateTime(a.at))}</div></div></div>`).join('') : noResults(t('noData'), t('emptyIdea'))}</section>
 </div><div class="sidebar-grid">
  <section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(t('weekly'))}</h2>${ico('target', 18)}</div><div class="weekly-hero"><div><small>${esc(isBN() ? 'এই সপ্তাহে প্রকাশিত' : 'Published this week')}</small><div class="row" style="align-items:baseline"><strong>${current?.published || 0}</strong><span style="font-size:17px;opacity:.7"> / ${workspace.settings.weeklyTarget}</span></div><span class="week-target">${esc(isBN() ? `প্রতি সপ্তাহে ${workspace.settings.weeklyTarget}টি লক্ষ্য` : `${workspace.settings.weeklyTarget} release(s) every week`)}</span></div>${ico('target', 55)}</div>
    <div class="row space mt20"><span class="muted smalltext">${esc(isBN() ? 'এই সপ্তাহে শিডিউল' : 'Scheduled this week')}</span><strong>${current?.docs.length || 0}</strong></div><p class="security-note">${esc(isBN() ? 'সাপ্তাহিক প্রকাশের লক্ষ্য মাত্র। আইডিয়া বা উৎপাদনের সংখ্যার কোনো সীমা নেই।' : 'This is a target, not a creation limit. Add unlimited ideas and projects.')}</p></section>
  <section class="quick-panel"><div class="eyebrow">QUICK CAPTURE</div><h3>${esc(isBN() ? 'নতুন ডকুমেন্টারি আইডিয়া?' : 'A new documentary idea?')}</h3><p>${esc(isBN() ? 'মাথায় আসামাত্র যুক্ত করুন। পরে শিডিউল ও কাজের পর্যায় ঠিক করতে পারবেন।' : 'Capture it now. Plan the schedule and production stages later.')}</p><button class="btn primary" data-action="new-documentary">${ico('plus', 16)}${esc(t('newIdea'))}</button></section>
  <section class="card card-pad"><div class="card-head"><h2 class="section-title">SalimGPT Network</h2><a href="#/network" class="btn text-only">${esc(t('manage'))} ${ico('arrow', 14)}</a></div>
    <div class="row space"><span class="muted smalltext">${esc(isBN() ? 'সক্রিয় প্রকাশনা গন্তব্য' : 'Active publishing destinations')}</span><strong class="big">${workspace.profiles.filter(p => p.active && !p.deletedAt).length}</strong></div><div class="divider"></div>
    <p class="smalltext muted">${esc(isBN() ? 'নেটওয়ার্কে নতুন প্রোফাইল যুক্ত করলেই প্রতিটি ডকুমেন্টারির প্রকাশনা চেকলিস্টে সেটি দেখা যাবে।' : 'Profiles added here automatically appear in every documentary publishing checklist.')}</p></section>
 </div></div>`;
}
function documentaryList() {
    let docs = allDocumentaries(workspace);
    if (filter === 'archived')
        docs = docs.filter(d => d.archivedAt);
    else if (filter !== 'all')
        docs = docs.filter(d => !d.archivedAt && d.stage === filter);
    else
        docs = docs.filter(d => !d.archivedAt);
    if (query.trim()) {
        const q = query.trim().toLowerCase();
        docs = docs.filter(d => [d.title, d.description, d.notes, ...d.tags].join(' ').toLowerCase().includes(q));
    }
    docs.sort((a, b) => sort === 'date' ? ((a.targetDate || '9999').localeCompare(b.targetDate || '9999')) : sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt));
    const base = activeDocumentaries(workspace);
    const counts = [['all', t('all')], ['idea', stage('idea')], ['research', stage('research')], ['editing', stage('editing')], ['ready', stage('ready')], ['publishing', stage('publishing')], ['published', stage('published')], ['archived', t('archive')]];
    return `${headerBlock('DOCUMENTARY LIBRARY', t('documentaries'), isBN() ? `${base.length}টি সক্রিয় ডকুমেন্টারি · সীমাহীন আইডিয়া ও নির্মাণ` : `${base.length} active documentaries · Unlimited ideas and productions`, `<button data-action="new-documentary" class="btn primary">${ico('plus', 16)}${esc(t('addDocumentary'))}</button>`)}
  <div class="toolbar"><div class="toolbar-left" style="gap:6px">${counts.map(([val, label]) => `<button class="filter-pill ${filter === val ? 'active' : ''}" data-action="filter" data-filter="${esc(val)}">${esc(label)}</button>`).join('')}</div>
  <div class="toolbar-right"><select class="control" data-change="sort"><option value="updated" ${sort === 'updated' ? 'selected' : ''}>${esc(isBN() ? 'সর্বশেষ পরিবর্তন' : 'Recent updates')}</option><option value="date" ${sort === 'date' ? 'selected' : ''}>${esc(isBN() ? 'প্রকাশের তারিখ' : 'Release date')}</option><option value="title" ${sort === 'title' ? 'selected' : ''}>${esc(isBN() ? 'নাম অনুসারে' : 'By title')}</option></select></div></div>
  ${docs.length ? `<div class="docs-grid">${docs.map(docCard).join('')}</div>` : noResults(t('noData'), query ? isBN() ? 'অন্য শব্দ দিয়ে খুঁজুন।' : 'Try another search term.' : t('emptyIdea'), `<button data-action="new-documentary" class="btn primary">${ico('plus', 15)}${esc(t('newIdea'))}</button>`)}`;
}
function detailPage(id) {
    const d = allDocumentaries(workspace).find(x => x.id === id);
    if (!d)
        return noResults('Documentary not found', 'This documentary may be in the Recycle Bin.', `<a href="#/documentaries" class="btn">${ico('left', 15)} ${esc(t('documentaries'))}</a>`);
    const tasks = workspace.steps.filter(s => s.documentaryId === id && !s.deletedAt);
    const publicationRows = publishingRows(workspace, id);
    const pubSummary = publicationProgress(workspace, id);
    const percent = progressOf(workspace, id);
    const stageOptions = STAGES.map(s => `<option value="${s}" ${s === d.stage ? 'selected' : ''}>${esc(stage(s))}</option>`).join('');
    const archiveBtn = d.archivedAt ? `<button class="btn" data-action="unarchive-documentary" data-id="${esc(id)}">${ico('refresh', 16)}${esc(t('restore'))}</button>` : `<button class="btn" data-action="archive-documentary" data-id="${esc(id)}">${ico('archive', 16)}${esc(t('archive'))}</button>`;
    return `<div class="breadcrumb"><a href="#/documentaries">${ico('left', 15)} ${esc(t('documentaries'))}</a><span>/</span><span>${esc(d.title)}</span></div>
 <section class="detail-banner"><div class="row space wrap"><div><div class="eyebrow">DOCUMENTARY WORKSPACE</div><h1>${esc(d.title)}</h1><p class="page-sub">${esc(d.description || (isBN() ? 'প্রতিটি ধাপ ও প্রকাশনা গন্তব্য আলাদাভাবে পরিচালনা করুন।' : 'Manage every stage and publishing destination independently.'))}</p></div>${stageBadge(d.stage)}</div>
  <div class="pills"><span class="chip">${ico('calendar', 13)} ${esc(d.targetDate ? formatDate(d.targetDate) : t('unscheduled'))}</span><span class="chip">${esc(d.language.toUpperCase())}</span><span class="chip">${esc(d.priority.toUpperCase())}</span>${d.archivedAt ? `<span class="pill stage-review">${esc(t('archive'))}</span>` : ''}</div></section>
 <div class="row wrap mb18">${actionButton('edit-documentary', `${ico('edit', 15)} ${esc(t('edit'))}`, 'btn', `data-id="${esc(id)}"`)}
  ${archiveBtn}${actionButton('delete-documentary', `${ico('trash', 15)} ${esc(t('delete'))}`, 'btn danger', `data-id="${esc(id)}"`)}
  <div class="grow"></div><select class="control" aria-label="${esc(t('stage'))}" data-change="doc-stage" data-id="${esc(id)}">${stageOptions}</select></div>
 <div class="detail-layout"><div class="sidebar-grid">
 <section class="card card-pad"><div class="card-head"><h2 class="section-title">${ico('list', 18)} ${esc(t('production'))}</h2><span class="big">${percent}%</span></div>
  ${progressBar(percent)}<p class="card-subtitle">${esc(isBN() ? 'টিক দেওয়া কাজের ভিত্তিতে অগ্রগতি গণনা হয়। বর্তমান পর্যায় আলাদাভাবে নির্ধারণ করুন।' : 'Progress is calculated from checked tasks. Choose the current stage separately.')}</p>
  ${STAGES.filter(s => PRODUCTION_STAGES.includes(s) || tasks.some(task => task.stage === s)).map(s => {
        const list = tasks.filter(task => task.stage === s);
        return `<div class="phase-heading">${esc(stage(s))} <span class="muted">(${list.filter(k => k.done).length}/${list.length})</span></div>
     ${list.length ? list.map(k => `<div class="checkrow"><input id="task-${esc(k.id)}" class="checkbox" type="checkbox" data-change="task-check" data-id="${esc(k.id)}" ${k.done ? 'checked' : ''}/><label for="task-${esc(k.id)}" class="${k.done ? 'checked' : ''}">${esc(k.title)}${k.dueDate ? `<span class="task-meta">${ico('calendar', 12)} ${esc(formatDate(k.dueDate))}</span>` : ''}</label>
      <button class="mini" aria-label="${esc(t('edit'))}" title="${esc(t('edit'))}" data-action="edit-task" data-id="${esc(k.id)}">${ico('edit', 13)}</button><button class="mini" aria-label="${esc(t('delete'))}" title="${esc(t('delete'))}" data-action="delete-task" data-id="${esc(k.id)}">${ico('trash', 13)}</button></div>`).join('') : `<div class="tiny muted" style="padding:8px 0">${esc(t('noData'))}</div>`}`;
    }).join('')}
  <button class="btn small mt20" data-action="new-task" data-doc="${esc(id)}">${ico('plus', 14)}${esc(t('newTask'))}</button>
 </section>
 <section class="card card-pad"><div class="card-head"><h2 class="section-title">${ico('calendar', 18)} ${esc(t('phaseDates'))}</h2></div>
   <p class="card-subtitle">${esc(isBN() ? 'প্রতিটি ধাপের শুরুর ও শেষের দিন পরিবর্তনযোগ্য। শিডিউল কখনো নিজে থেকে কোনো কাজকে Completed করে না।' : 'Dates are editable for each stage. A schedule never automatically marks a step complete.')}</p>
   ${MILESTONE_STAGES.map(s => { const plan = d.phaseDates[s]; return `<div class="stage-line"><strong>${esc(stage(s))}</strong><span class="date">${esc(plan?.start ? formatDate(plan.start) : '—')} → ${esc(plan?.due ? formatDate(plan.due) : '—')}</span><button class="mini" data-action="milestone" data-id="${esc(id)}" data-stage="${s}" title="${esc(t('editSchedule'))}">${ico('edit', 15)}</button></div>`; }).join('')}
 </section>
 <section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(isBN() ? 'বিবরণ ও নোট' : 'Description & notes')}</h2></div><div class="smalltext muted break">${esc(d.notes || d.description || (isBN() ? 'কোনো নোট নেই।' : 'No notes yet.'))}</div></section>
 </div><div class="sidebar-grid">
 <section class="card card-pad"><div class="card-head"><h2 class="section-title">${ico('check', 18)} ${esc(t('publishing'))}</h2><span class="pill stage-ready">${pubSummary.done}/${pubSummary.total}</span></div>
   <p class="card-subtitle">${esc(isBN() ? 'এই চেকলিস্ট শুধু এই ডকুমেন্টারির। SalimGPT Network-এর সক্রিয় সব প্রোফাইল এখানে স্বয়ংক্রিয়ভাবে আসে।' : 'This checklist belongs to this documentary only. Active network profiles appear automatically.')}</p>
  ${pubSummary.total ? progressBar(Math.round(pubSummary.done / pubSummary.total * 100)) : progressBar(0)}<div class="divider"></div>
  ${publicationRows.length ? publicationRows.map(row => {
        const statusClass = row.status === 'published' ? 'done' : row.status === 'not_applicable' ? 'skip' : 'pending';
        const url = row.record?.postUrl ? safeUrl(row.record.postUrl) : '';
        return `<div class="pub-row"><div class="platform-logo platform-${esc(row.platform.toLowerCase())}">${esc(platformAbbrev(row.platform))}</div><div class="pub-main">
   <div class="pub-name">${esc(row.name)} ${row.historic ? `<span class="archive-note">· ${esc(isBN() ? 'পুরোনো' : 'History')}</span>` : ''}</div>
   <div class="pub-meta">${esc(row.platform)}${row.record?.publishedAt ? ` · ${esc(formatDate(row.record.publishedAt))}` : ''}${url ? ` · <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan)">${esc(isBN() ? 'পোস্ট' : 'Open post')} ↗</a>` : ''}</div></div>
   <select class="pub-status ${statusClass}" aria-label="Publishing status" data-change="pub-status" data-doc="${esc(id)}" data-profile="${esc(row.profileId)}"><option value="not_published" ${row.status === 'not_published' ? 'selected' : ''}>${esc(t('notPublished'))}</option><option value="published" ${row.status === 'published' ? 'selected' : ''}>${esc(t('publishedStatus'))}</option><option value="not_applicable" ${row.status === 'not_applicable' ? 'selected' : ''}>${esc(t('notApplicable'))}</option></select>
   <button class="mini" title="${esc(t('edit'))}" data-action="edit-publication" data-doc="${esc(id)}" data-profile="${esc(row.profileId)}">${ico('edit', 14)}</button></div>`;
    }).join('') :
        noResults(t('noProfiles'), isBN() ? 'নতুন প্রোফাইল যুক্ত করা হলে এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে।' : 'Newly added network profiles will appear here automatically.', `<a href="#/network" class="btn">${ico('plus', 14)}${esc(t('addProfile'))}</a>`)}
   <div class="notice mt20">${ico('info', 15)} ${esc(t('noMonitoring'))}</div>
 </section>
 <section class="card card-pad"><div class="card-head"><h2 class="section-title">${ico('calendar', 18)} ${esc(t('planning'))}</h2></div>
   <div class="detail-meta"><div class="meta-item"><label>${esc(t('stage'))}</label><strong>${esc(stage(d.stage))}</strong></div><div class="meta-item"><label>${esc(t('date'))}</label><strong>${esc(d.targetDate ? formatDate(d.targetDate) : t('unscheduled'))}</strong></div>
   <div class="meta-item"><label>${esc(isBN() ? 'তৈরির তারিখ' : 'Created')}</label><strong>${esc(fmtDateTime(d.createdAt))}</strong></div><div class="meta-item"><label>${esc(isBN() ? 'শেষ আপডেট' : 'Updated')}</label><strong>${esc(fmtDateTime(d.updatedAt))}</strong></div></div>
  <button class="btn small mt20" data-action="edit-documentary" data-id="${esc(id)}">${ico('edit', 14)}${esc(t('editSchedule'))}</button>
 </section></div></div>`;
}
function platformAbbrev(platform) {
    const p = platform.toLowerCase();
    return { youtube: 'YT', facebook: 'f', instagram: 'IG', tiktok: 'TT', x: '𝕏', website: 'WWW', other: '↗' }[p] || platform.slice(0, 2).toUpperCase();
}
function networkPage() {
    const profiles = workspace.profiles.filter(p => !p.deletedAt).sort((a, b) => Number(b.active) - Number(a.active) || a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name));
    return `${headerBlock('DISTRIBUTION DESTINATIONS', t('network'), isBN() ? 'আপনার সব প্রকাশনা প্ল্যাটফর্ম, পেজ, চ্যানেল ও ওয়েবসাইটের কেন্দ্রীয় তালিকা।' : `Central list of publishing pages, channels and websites.`, `<button class="btn primary" data-action="new-profile">${ico('plus', 16)}${esc(t('addProfile'))}</button>`)}
 <div class="notice mb24">${ico('info', 16)} ${esc(isBN() ? 'সক্রিয় প্রোফাইল নতুন ও বিদ্যমান সব ডকুমেন্টারির পৃথক Publishing Checklist-এ নিজে থেকেই দেখা যাবে। এখানে কোনো সোশ্যাল মিডিয়া মনিটরিং নেই।' : 'All active profiles appear automatically on each separate documentary checklist. No social media monitoring occurs.')}</div>
 <div class="row wrap mb24"><span class="pill">${esc(t('total'))}: ${profiles.length}</span><span class="pill stage-ready">${esc(t('active'))}: ${profiles.filter(p => p.active).length}</span><span class="pill">${esc(t('inactive'))}: ${profiles.filter(p => !p.active).length}</span></div>
 ${profiles.length ? `<div class="network-grid">${profiles.map(p => `<div class="card profile-card"><div class="row space"><div class="platform-logo platform-${esc(p.platform.toLowerCase())}" style="width:42px;height:42px">${esc(platformAbbrev(p.platform))}</div><button class="switch ${p.active ? 'on' : ''}" data-action="profile-toggle" data-id="${esc(p.id)}" aria-label="Toggle ${esc(p.name)}" aria-pressed="${p.active}"></button></div>
 <div class="mt20"><strong>${esc(p.name)}</strong><div class="tiny muted">${esc(p.platform)} · ${esc(p.active ? t('active') : t('inactive'))}</div></div>
 ${safeUrl(p.url) ? `<a class="profile-link" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener noreferrer">${ico('external', 13)} ${esc(p.url)}</a>` : `<div class="profile-link muted">${esc(isBN() ? 'কোনো লিংক নেই' : 'No URL saved')}</div>`}
 <div class="row space"><span class="tiny muted">${esc(isBN() ? 'সব চেকলিস্টে সংযুক্ত' : 'Linked to checklists')}</span><div class="btn-group"><button class="mini" title="${esc(t('edit'))}" data-action="edit-profile" data-id="${esc(p.id)}">${ico('edit', 16)}</button><button class="mini" title="${esc(t('delete'))}" data-action="delete-profile" data-id="${esc(p.id)}">${ico('trash', 16)}</button></div></div></div>`).join('')}</div>` :
        noResults(t('noProfiles'), isBN() ? 'Facebook Page, YouTube Channel বা ওয়েবসাইটের প্রোফাইল যুক্ত করুন।' : 'Add your Facebook pages, YouTube channels or websites.', `<button class="btn primary" data-action="new-profile">${ico('plus', 15)} ${esc(t('addProfile'))}</button>`)}`;
}
function schedulePage() {
    const weeks = weekRows(workspace, new Date(), 12);
    const docs = activeDocumentaries(workspace);
    const unscheduled = docs.filter(d => !d.targetDate).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12);
    const milestones = [];
    for (const doc of docs)
        for (const phase of MILESTONE_STAGES) {
            const due = doc.phaseDates[phase]?.due;
            if (due)
                milestones.push({ doc, stage: phase, due });
        }
    milestones.sort((a, b) => a.due.localeCompare(b.due));
    const nextMilestones = milestones.filter(m => m.due >= todayISO()).slice(0, 10);
    return `${headerBlock('RELEASE PLANNING', t('schedule'), (isBN() ? `সাপ্তাহিক লক্ষ্য ${workspace.settings.weeklyTarget}টি প্রকাশনা — নির্মাণের কোনো সীমা নেই` : `${workspace.settings.weeklyTarget} release(s) weekly — unlimited productions`), `<button class="btn primary" data-action="new-documentary">${ico('plus', 16)} ${esc(t('newIdea'))}</button>`)}
 <div class="grid metrics">${metric('target', `${workspace.settings.weeklyTarget}`, t('weeklyTarget'), isBN() ? 'বাধ্যতামূলক সীমা নয়' : 'Flexible goal')}${metric('calendar', String(docs.filter(d => d.targetDate).length), isBN() ? 'শিডিউল করা' : 'Scheduled', isBN() ? 'পরিকল্পিত প্রকাশনার দিন' : 'Target release dates', 'var(--blue)')}${metric('film', String(unscheduled.length), t('unscheduled'), isBN() ? 'আইডিয়া পরে সাজানো যাবে' : 'Set a date later', 'var(--yellow)')}${metric('clock', String(nextMilestones.length), t('phaseDates'), isBN() ? 'আসন্ন সময়সীমা' : 'Upcoming milestones', 'var(--green)')}</div>
 <div class="split"><div><div class="card-head"><h2 class="section-title">${esc(isBN() ? 'আগামী ১২ সপ্তাহ' : 'Next 12 weeks')}</h2><span class="tiny muted">${esc(isBN() ? 'সোমবার থেকে রবিবার' : 'Monday–Sunday')}</span></div>
 <div class="week-grid">${weeks.map((w, i) => `<div class="card week-card ${i === 0 ? 'current' : ''}"><div class="row space"><div><div class="eyebrow">${esc(t('week'))} ${i + 1}</div><strong>${esc(formatDate(w.start))} – ${esc(formatDate(w.end))}</strong></div><span class="pill ${w.published >= workspace.settings.weeklyTarget ? 'stage-ready' : ''}">${w.published}/${workspace.settings.weeklyTarget}</span></div>
 <div class="stat-tiny">${esc(isBN() ? 'প্রকাশের জন্য শিডিউল' : 'Scheduled releases')}: ${w.docs.length}</div>${w.docs.map(d => `<div class="week-entry"><span>${esc(d.targetDate.slice(-2))}</span><a href="#/doc/${encodeURIComponent(d.id)}">${esc(d.title)}</a>${stageBadge(d.stage)}</div>`).join('')}
 ${!w.docs.length ? `<div class="tiny muted mt20">${esc(isBN() ? 'এই সপ্তাহে কোনো প্রকাশনা নির্ধারিত নেই।' : 'No documentary scheduled this week.')}</div>` : ''}
 ${w.docs.length > workspace.settings.weeklyTarget ? `<div class="week-alert">${ico('alert', 13)} ${esc(isBN() ? 'লক্ষ্যের চেয়ে বেশি নির্ধারিত — চাইলে রাখুন বা পরিবর্তন করুন।' : 'More than target — optional to reschedule.')}</div>` : ''}</div>`).join('')}</div></div>
 <div class="sidebar-grid"><section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(isBN() ? 'আসন্ন প্রোডাকশন ডেডলাইন' : 'Upcoming production deadlines')}</h2></div>
 ${nextMilestones.length ? nextMilestones.map(m => `<a href="#/doc/${encodeURIComponent(m.doc.id)}" class="list-row"><div class="item-circle">${ico('clock', 17)}</div><div class="grow"><div class="main-label">${esc(m.doc.title)}</div><div class="aux">${esc(stage(m.stage))}</div></div><span class="tiny muted">${esc(formatDate(m.due))}</span></a>`).join('') : noResults(t('noData'), isBN() ? 'প্রতিটি ডকুমেন্টারির ধাপের সময়সীমা দিতে পারবেন।' : 'Add stage deadlines inside each documentary.')}</section>
 <section class="card card-pad"><div class="card-head"><h2 class="section-title">${esc(t('unscheduled'))}</h2></div>
 ${unscheduled.length ? unscheduled.map(d => `<a class="list-row" href="#/doc/${encodeURIComponent(d.id)}"><div class="item-circle">${ico('film', 17)}</div><div class="grow"><div class="main-label">${esc(d.title)}</div><div class="aux">${esc(stage(d.stage))}</div></div>${ico('arrow', 15)}</a>`).join('') : noResults(t('noData'), isBN() ? 'সব ডকুমেন্টারির সময়সূচি দেওয়া আছে।' : 'Everything has a planned date.')}</section></div></div>`;
}
function activityPage() {
    return `${headerBlock('WORKSPACE HISTORY', t('activity'), isBN() ? 'কোন কাজ কখন পরিবর্তিত হয়েছে—তার হিসাব।' : 'History of changes to your documentaries, profiles and checklists.')}
 <section class="card card-pad">${workspace.activity.length ? workspace.activity.slice(0, 150).map(a => `<div class="list-row"><div class="item-circle">${ico('history', 17)}</div><div class="grow"><div class="main-label">${esc(a.message)}</div><div class="aux">${esc(fmtDateTime(a.at))}</div></div>${a.documentaryId && allDocumentaries(workspace).some(d => d.id === a.documentaryId) ? `<a href="#/doc/${encodeURIComponent(a.documentaryId)}" class="btn small">${ico('arrow', 14)}</a>` : ''}</div>`).join('') : noResults(t('noData'), t('emptyIdea'))}</section>`;
}
function trashPage() {
    const docs = workspace.documentaries.filter(x => x.deletedAt).map(d => ({ id: d.id, name: d.title, type: 'documentary', date: d.deletedAt || '' }));
    const profiles = workspace.profiles.filter(x => x.deletedAt).map(p => ({ id: p.id, name: p.name, type: 'profile', date: p.deletedAt || '' }));
    const tasks = workspace.steps.filter(x => x.deletedAt).map(s => ({ id: s.id, name: s.title, type: 'step', date: s.deletedAt || '' }));
    const items = [...docs, ...profiles, ...tasks].sort((a, b) => b.date.localeCompare(a.date));
    return `${headerBlock('RECYCLE BIN', t('trash'), isBN() ? 'ডিলিট করা তথ্য ফিরিয়ে আনুন অথবা নিশ্চিতভাবে স্থায়ী ডিলিট করুন।' : 'Restore deleted items or permanently remove them when you are sure.')}
 <section class="card card-pad">${items.length ? items.map(x => `<div class="list-row"><div class="item-circle">${ico('trash', 17)}</div><div class="grow"><div class="main-label">${esc(x.name)}</div><div class="aux">${esc(x.type)} · ${esc(fmtDateTime(x.date))}</div></div><div class="btn-group"><button class="btn small" data-action="restore" data-kind="${x.type}" data-id="${esc(x.id)}">${ico('refresh', 13)}${esc(t('restore'))}</button><button class="btn small danger" data-action="purge" data-kind="${x.type}" data-id="${esc(x.id)}">${ico('trash', 13)}</button></div></div>`).join('') : noResults(t('noData'), isBN() ? 'Recycle Bin খালি আছে।' : 'The Recycle Bin is empty.')}</section>`;
}
function settingsPage() {
    const account = cloudAccount();
    const conf = getCloudConfig();
    return `${headerBlock('WORKSPACE CONTROLS', t('settings'), isBN() ? 'ভাষা, ব্যাকআপ, সাপ্তাহিক লক্ষ্য এবং ঐচ্ছিক ক্লাউড সিঙ্ক।' : 'Language, backups, weekly goals and optional cloud synchronization.')}
 <div class="settings-grid"><section class="card setting-block"><h3>${ico('settings', 17)} ${esc(isBN() ? 'অ্যাপের পছন্দ' : 'App preferences')}</h3><p>${esc(isBN() ? 'SalimGPT-এর ইন্টারফেস আপনার পছন্দে সাজান।' : 'Customize your workspace.')}</p>
 <div class="field"><span>${esc(t('language'))}</span><div class="btn-group"><button class="btn ${isBN() ? 'primary' : ''}" data-action="language" data-lang="bn">বাংলা</button><button class="btn ${!isBN() ? 'primary' : ''}" data-action="language" data-lang="en">English</button></div></div>
 <div class="field"><span>${esc(t('theme'))}</span><div class="btn-group"><button class="btn ${workspace.settings.theme === 'dark' ? 'primary' : ''}" data-action="theme" data-theme="dark">${ico('moon', 15)} Dark</button><button class="btn ${workspace.settings.theme === 'light' ? 'primary' : ''}" data-action="theme" data-theme="light">${ico('sun', 15)} Light</button></div></div>
 <form data-form="weekly-target"><label class="field"><span>${esc(t('weeklyTarget'))}</span><input name="target" type="number" min="1" max="50" value="${workspace.settings.weeklyTarget}" required/></label><button class="btn" type="submit">${ico('check', 15)} ${esc(t('save'))}</button></form></section>
 <section class="card setting-block"><h3>${ico('download', 17)} ${esc(isBN() ? 'ডেটা ব্যাকআপ ও পুনরুদ্ধার' : 'Data backup and restore')}</h3>
 <p>${esc(t('settingsNote'))}</p><div class="btn-group"><button class="btn primary" data-action="export">${ico('download', 17)} ${esc(t('backup'))}</button><button class="btn" data-action="import">${ico('upload', 17)} ${esc(t('import'))}</button></div>
 <p class="security-note">${esc(isBN() ? 'ব্যাকআপ JSON ফাইল নিরাপদে রাখুন। Import করলে বর্তমান তথ্য পরিবর্তিত হবে; তার আগে অ্যাপ স্বয়ংক্রিয়ভাবে পুরোনো ব্যাকআপ ডাউনলোড করবে।' : 'Keep backup JSON files safe. Import replaces the current workspace; the current data is backed up first.')}</p>
 <div class="notice">${ico('info', 15)} ${esc(isBN() ? `স্টোরেজ মোড: ${storageMode === 'indexeddb' ? 'IndexedDB (অফলাইন)' : 'LocalStorage fallback'}` : `Storage mode: ${storageMode}`)}</div></section>
 <section class="card setting-block"><h3>${ico('globe', 17)} ${esc(t('cloud'))} <span class="pill">OPTIONAL</span></h3>
 <p>${esc(isBN() ? 'একাধিক ডিভাইসের জন্য Supabase ব্যবহার করতে পারেন। এটি ঐচ্ছিক; অ্যাপ ক্লাউড ছাড়াও কাজ করে। নিজস্ব Supabase প্রজেক্ট ও SQL migration লাগবে।' : 'Use your own Supabase project for backups across devices. Optional: the app works offline without it. Apply the included SQL migration first.')}</p>
 <div class="row space mb18"><span class="tiny muted">${esc(conf ? isBN() ? 'প্রজেক্ট কনফিগার করা' : 'Project configured' : isBN() ? 'প্রজেক্ট যুক্ত নেই' : 'Not configured')}</span>${conf ? `<span class="pill stage-ready">${ico('check', 12)} ${esc(isBN() ? 'Configured' : 'Configured')}</span>` : `<span class="pill">Not configured</span>`}</div>
 ${account ? `<div class="notice good mb18">${ico('shield', 15)} ${esc(account.email)}</div><div class="btn-group"><button class="btn" data-action="cloud-check">${ico('refresh', 15)} ${esc(isBN() ? 'ক্লাউড যাচাই' : 'Check cloud')}</button><button class="btn" data-action="cloud-upload">${ico('upload', 15)} ${esc(isBN() ? 'ক্লাউডে সংরক্ষণ' : 'Upload')}</button><button class="btn" data-action="cloud-download">${ico('download', 15)} ${esc(isBN() ? 'ক্লাউড থেকে আনুন' : 'Download')}</button><button class="btn danger" data-action="cloud-signout">${ico('logout', 15)} ${esc(isBN() ? 'সাইন আউট' : 'Sign out')}</button></div>` :
        `<div class="btn-group"><button class="btn" data-action="cloud-config">${ico('settings', 15)} ${esc(isBN() ? 'ক্লাউড কনফিগার' : 'Configure')}</button><button class="btn primary" data-action="cloud-login" ${conf ? '' : 'disabled'}>${ico('shield', 15)} ${esc(isBN() ? 'ক্লাউড লগইন' : 'Sign in')}</button></div>`}
 <p class="security-note">${esc(isBN() ? 'ক্লাউডে ম্যানুয়াল আপলোড/ডাউনলোড করতে হবে। এটি রিয়েল-টাইম অটো সিঙ্ক নয়। কোনো GitHub Private Repository-তে পাসওয়ার্ড বা ব্রাউজার টোকেন রাখা হয় না।' : 'Cloud sync is manual, not automatic real-time synchronization. Never commit passwords or tokens to GitHub.')}</p>
 ${conf ? `<button class="btn text-only" data-action="cloud-config">${ico('edit', 14)} ${esc(isBN() ? 'প্রজেক্ট পরিবর্তন' : 'Change project')}</button>` : ''}</section>
 <section class="card setting-block"><h3>${ico('info', 17)} SalimGPT Command Center V2</h3><div class="hero-stripe"></div>
 <p>${esc(isBN() ? 'এই অ্যাপ শুধু ডকুমেন্টারি আইডিয়া, উৎপাদনের পর্যায়, শিডিউল এবং নিজে চিহ্নিত করা প্রকাশনার হিসাব পরিচালনা করে।' : 'This app manages documentary ideas, stages, schedules and manually recorded publishing status.')}</p>
 <div class="notice">${ico('check', 15)} ${esc(t('noMonitoring'))}</div><p class="smalltext muted">Founder: Mohammad Salim<br/>Repositories: SalimGPT-Command-Center / SalimGPT-Private-Data</p></section></div>`;
}
function optionStage(selected) { return STAGES.map(s => `<option value="${s}" ${selected === s ? 'selected' : ''}>${esc(stage(s))}</option>`).join(''); }
function platformOptions(selected = 'YouTube') { return ['YouTube', 'Facebook', 'TikTok', 'Instagram', 'X', 'Website', 'Other'].map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`).join(''); }
function field(label, name, value = '', kind = 'text', more = '') { return `<label class="field"><span>${esc(label)}</span><input type="${esc(kind)}" name="${esc(name)}" value="${esc(value)}" ${more}/></label>`; }
function formShell(title, inner, formId, wide = false, submitText = t('save')) {
    return `<div class="modal-layer" data-action="modal-layer"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn ghost" data-action="modal-close" aria-label="${esc(t('close'))}">${ico('x', 20)}</button></div>
 <form data-form="${esc(formId)}" autocomplete="off"><div class="modal-body">${inner}</div><div class="modal-footer"><button type="button" class="btn" data-action="modal-close">${esc(t('cancel'))}</button><button class="btn primary" type="submit">${ico('check', 15)} ${esc(submitText)}</button></div></form></div></div>`;
}
function renderModal() {
    const type = modal.type;
    if (type === 'documentary') {
        const d = modal.id ? workspace.documentaries.find(x => x.id === modal.id) : undefined;
        const form = `<div class="form-grid"><div class="field full"><span>${esc(t('title'))} *</span><input name="title" required maxlength="200" value="${esc(d?.title || '')}" placeholder="${esc(isBN() ? 'নতুন ডকুমেন্টারির বিষয়' : 'New documentary topic')}"/></div>
 <label class="field full"><span>${esc(t('description'))}</span><textarea name="description">${esc(d?.description || '')}</textarea></label>
 <label class="field"><span>${esc(t('stage'))}</span><select name="stage">${optionStage(d?.stage || 'idea')}</select></label>
 <label class="field"><span>${esc(t('date'))}</span><input name="targetDate" type="date" value="${esc(d?.targetDate || '')}" /></label>
 <label class="field"><span>${esc(t('priority'))}</span><select name="priority">${['low', 'normal', 'high', 'urgent'].map(v => `<option value="${v}" ${d?.priority === v || (!d && v === 'normal') ? 'selected' : ''}>${v.toUpperCase()}</option>`).join('')}</select></label>
 <label class="field"><span>${esc(t('language'))}</span><select name="language">${['bn', 'en', 'multi'].map(v => `<option value="${v}" ${d?.language === v || (!d && v === 'bn') ? 'selected' : ''}>${v.toUpperCase()}</option>`).join('')}</select></label>
 <label class="field full"><span>${esc(isBN() ? 'ট্যাগ (কমা দিয়ে আলাদা)' : 'Tags (comma separated)')}</span><input name="tags" value="${esc(d?.tags.join(', ') || '')}" /></label>
 <label class="field full"><span>${esc(t('notes'))}</span><textarea name="notes">${esc(d?.notes || '')}</textarea></label></div>
 <div class="notice">${ico('info', 15)} ${esc(isBN() ? 'শিডিউল ফাঁকা রাখা যাবে। নতুন আইডিয়া পরেও গবেষণা, এডিটিং ও প্রকাশনার ধাপে নেওয়া যাবে।' : 'Schedule is optional. A new idea can move through production later.')}</div>`;
        return formShell(d ? t('edit') : t('addDocumentary'), form, 'documentary', true);
    }
    if (type === 'profile') {
        const p = modal.id ? workspace.profiles.find(x => x.id === modal.id) : undefined;
        return formShell(p ? t('edit') : t('addProfile'), `<label class="field"><span>${esc(isBN() ? 'প্রোফাইল / পেজ / চ্যানেলের নাম' : 'Profile / page / channel name')} *</span><input name="name" value="${esc(p?.name || '')}" required maxlength="150"/></label>
 <label class="field"><span>${esc(t('platform'))}</span><select name="platform">${platformOptions(p?.platform || 'YouTube')}</select></label>
 ${field(t('url'), 'url', p?.url || '', 'url', 'placeholder="https://..."')}
 <label class="checkrow"><input name="active" type="checkbox" class="checkbox" ${p?.active !== false ? 'checked' : ''}/>${esc(isBN() ? 'সক্রিয়: সব ডকুমেন্টারির চেকলিস্টে দেখাবে' : 'Active: visible on every documentary checklist')}</label>`, 'profile');
    }
    if (type === 'task') {
        const task = modal.id ? workspace.steps.find(x => x.id === modal.id) : undefined;
        return formShell(task ? t('edit') : t('newTask'), `<label class="field"><span>${esc(t('taskName'))} *</span><input name="title" required value="${esc(task?.title || '')}"/></label>
 <label class="field"><span>${esc(t('stage'))}</span><select name="stage">${optionStage(task?.stage || 'research')}</select></label>
 ${field(t('taskDue'), 'dueDate', task?.dueDate || '', 'date')}`, 'task');
    }
    if (type === 'publication') {
        const docId = modal.docId || '';
        const profileId = modal.profileId || '';
        const row = publishingRows(workspace, docId).find(x => x.profileId === profileId);
        const record = row?.record;
        return formShell(`${t('publishing')}: ${row?.name || ''}`, `<div class="notice mb18">${esc(isBN() ? 'এই ডকুমেন্টারির জন্য আলাদা রেকর্ড। অন্য ডকুমেন্টারিতে প্রভাব পড়বে না।' : 'A separate record for this documentary only.')}</div>
 <label class="field"><span>${esc(t('checklist'))}</span><select name="status">${[['not_published', t('notPublished')], ['published', t('publishedStatus')], ['not_applicable', t('notApplicable')]].map(([v, label]) => `<option value="${v}" ${row?.status === v ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
 ${field(t('publishedOn'), 'publishedAt', record?.publishedAt || '', 'date')}
 ${field(t('publishedLink'), 'postUrl', record?.postUrl || '', 'url', 'placeholder="https://..."')}
 <label class="field"><span>${esc(t('notes'))}</span><textarea name="note">${esc(record?.note || '')}</textarea></label>`, 'publication');
    }
    if (type === 'milestone') {
        const doc = workspace.documentaries.find(x => x.id === modal.id);
        const st = modal.stage || 'research';
        const plan = doc?.phaseDates[st];
        return formShell(`${t('milestone')}: ${stage(st)}`, `${field(t('start'), 'start', plan?.start || '', 'date')}${field(t('due'), 'due', plan?.due || '', 'date')}
 <div class="notice">${esc(isBN() ? 'তারিখ বদলালে কাজের Complete টিক নিজে থেকে বদলাবে না।' : 'Changing the schedule never automatically checks off a task.')}</div>`, 'milestone');
    }
    if (type === 'cloud-config') {
        const conf = getCloudConfig();
        return formShell('Supabase cloud configuration', `${field('Supabase project URL', 'url', conf?.url || '', 'url', 'required placeholder="https://PROJECT.supabase.co"')}${field('Publishable key', 'publishableKey', conf?.publishableKey || '', 'text', 'required placeholder="sb_publishable_..."')}
 <div class="notice alert">${ico('shield', 15)} ${esc(isBN() ? 'শুধু Publishable key যুক্ত করুন; secret বা service-role key কখনো দেবেন না।' : 'Use only the public publishable key. Never enter a secret or service-role key.')}</div>`, 'cloud-config');
    }
    if (type === 'login') {
        return formShell('Supabase sign in / sign up', `${field('Email', 'email', '', 'email', 'required autocomplete="username"')}${field('Password', 'password', '', 'password', 'required minlength="6" autocomplete="current-password"')}
 <div class="notice">${esc(isBN() ? 'নতুন অ্যাকাউন্ট হলে Sign up নির্বাচন করুন। ইমেইল ভেরিফিকেশন প্রয়োজন হতে পারে।' : 'Use Sign up for a new account. Email confirmation may be required.')}</div>
 <div class="field"><span>Action</span><select class="control" name="mode" style="width:100%"><option value="login">Sign in</option><option value="signup">Sign up</option></select></div>`, 'login');
    }
    return '';
}
function render() {
    document.documentElement.setAttribute('data-theme', workspace.settings.theme);
    document.documentElement.lang = workspace.settings.language;
    const [p, id] = routeParts();
    let content = '';
    let title = t('dashboard');
    switch (p) {
        case 'dashboard':
            title = t('dashboard');
            content = dashboard();
            break;
        case 'documentaries':
            title = t('documentaries');
            content = documentaryList();
            break;
        case 'doc':
            title = workspace.documentaries.find(d => d.id === id)?.title || t('documentaries');
            content = detailPage(id || '');
            break;
        case 'network':
            title = t('network');
            content = networkPage();
            break;
        case 'schedule':
            title = t('schedule');
            content = schedulePage();
            break;
        case 'activity':
            title = t('activity');
            content = activityPage();
            break;
        case 'trash':
            title = t('trash');
            content = trashPage();
            break;
        case 'settings':
            title = t('settings');
            content = settingsPage();
            break;
        default:
            title = t('dashboard');
            content = dashboard();
    }
    root.innerHTML = layout(p || 'dashboard', title, content);
    if (modal.type) {
        window.requestAnimationFrame(() => { const x = document.querySelector('.modal input[required]'); x?.focus(); });
    }
}
function valueOf(data, key) { return String(data.get(key) || '').trim(); }
async function handleSubmit(form) {
    const data = new FormData(form);
    const kind = form.dataset.form;
    if (kind === 'documentary') {
        const input = { title: valueOf(data, 'title'), description: valueOf(data, 'description'), stage: valueOf(data, 'stage'), targetDate: valueOf(data, 'targetDate'), priority: valueOf(data, 'priority'), language: valueOf(data, 'language'), tags: valueOf(data, 'tags').split(',').map(v => v.trim()).filter(Boolean), notes: valueOf(data, 'notes') };
        if (!input.title) {
            showToast('Title is required', true);
            return;
        }
        const id = modal.id;
        if (id) {
            mutate(() => editDocumentary(workspace, id, input));
            modal = { type: null };
            render();
        }
        else {
            let created;
            mutate(() => { created = createDocumentary(workspace, input); });
            if (created)
                navigate(`#/doc/${created.id}`);
        }
        showToast(isBN() ? 'ডকুমেন্টারি সংরক্ষিত হয়েছে' : 'Documentary saved');
        return;
    }
    if (kind === 'profile') {
        const input = { name: valueOf(data, 'name'), platform: valueOf(data, 'platform'), url: valueOf(data, 'url'), active: data.has('active') };
        if (input.url && !safeUrl(input.url)) {
            showToast('Use a valid HTTPS or HTTP URL', true);
            return;
        }
        mutate(() => { if (modal.id)
            editProfile(workspace, modal.id, input);
        else
            createProfile(workspace, input); });
        modal = { type: null };
        render();
        showToast(isBN() ? 'নেটওয়ার্ক প্রোফাইল সংরক্ষিত' : 'Network profile saved');
        return;
    }
    if (kind === 'task') {
        const input = { title: valueOf(data, 'title'), stage: valueOf(data, 'stage'), dueDate: valueOf(data, 'dueDate') };
        mutate(() => { if (modal.id)
            editStep(workspace, modal.id, input);
        else if (modal.docId)
            addStep(workspace, modal.docId, input.stage, input.title, input.dueDate); });
        modal = { type: null };
        render();
        return;
    }
    if (kind === 'publication') {
        const status = valueOf(data, 'status');
        const postUrl = valueOf(data, 'postUrl');
        if (postUrl && !safeUrl(postUrl)) {
            showToast('Use a valid HTTPS or HTTP post URL', true);
            return;
        }
        const docId = modal.docId, profileId = modal.profileId;
        mutate(() => { if (docId && profileId)
            setPublication(workspace, docId, profileId, { status, publishedAt: valueOf(data, 'publishedAt'), postUrl, note: valueOf(data, 'note') }); });
        modal = { type: null };
        render();
        return;
    }
    if (kind === 'milestone') {
        const docId = modal.id, st = modal.stage;
        const start = valueOf(data, 'start'), due = valueOf(data, 'due');
        if (start && due && start > due) {
            showToast('Start date cannot be after due date', true);
            return;
        }
        mutate(() => { if (docId && st) {
            const d = workspace.documentaries.find(x => x.id === docId);
            if (d) {
                editDocumentary(workspace, docId, { phaseDates: { ...d.phaseDates, [st]: { start, due } } });
            }
        } });
        modal = { type: null };
        render();
        return;
    }
    if (kind === 'weekly-target') {
        const n = Number(valueOf(data, 'target'));
        if (!Number.isSafeInteger(n) || n < 1 || n > 50) {
            showToast('Target must be 1–50', true);
            return;
        }
        mutate(() => { workspace.settings.weeklyTarget = n; logAction(workspace, 'settings.updated', `Weekly publication goal: ${n}`); });
        showToast('Weekly goal saved');
        return;
    }
    if (kind === 'cloud-config') {
        try {
            saveCloudConfig({ url: valueOf(data, 'url'), publishableKey: valueOf(data, 'publishableKey') });
            signOut();
            modal = { type: null };
            render();
            showToast('Supabase project configured');
        }
        catch (e) {
            showToast(e instanceof Error ? e.message : String(e), true);
        }
        return;
    }
    if (kind === 'login') {
        const email = valueOf(data, 'email'), password = valueOf(data, 'password'), mode = valueOf(data, 'mode');
        try {
            const signed = mode === 'signup' ? await cloudSignUp(email, password) : (await cloudSignIn(email, password), true);
            modal = { type: null };
            render();
            showToast(signed ? 'Signed in to Supabase' : 'Sign up requested. Check your email confirmation.');
        }
        catch (e) {
            showToast(e instanceof Error ? e.message : String(e), true);
        }
        return;
    }
}
async function handleAction(button) {
    const action = button.dataset.action || '';
    const id = button.dataset.id || '';
    switch (action) {
        case 'menu-open':
            mobileMenuOpen = true;
            render();
            break;
        case 'menu-close':
            mobileMenuOpen = false;
            render();
            break;
        case 'modal-layer':
            if (button === document.activeElement) { }
            break;
        case 'modal-close':
            modal = { type: null };
            render();
            break;
        case 'new-documentary':
            modal = { type: 'documentary' };
            render();
            break;
        case 'edit-documentary':
            modal = { type: 'documentary', id };
            render();
            break;
        case 'new-profile':
            modal = { type: 'profile' };
            render();
            break;
        case 'edit-profile':
            modal = { type: 'profile', id };
            render();
            break;
        case 'new-task':
            modal = { type: 'task', docId: button.dataset.doc || '' };
            render();
            break;
        case 'edit-task':
            modal = { type: 'task', id };
            render();
            break;
        case 'edit-publication':
            modal = { type: 'publication', docId: button.dataset.doc || '', profileId: button.dataset.profile || '' };
            render();
            break;
        case 'milestone':
            modal = { type: 'milestone', id, stage: (button.dataset.stage || 'research') };
            render();
            break;
        case 'filter':
            filter = button.dataset.filter || 'all';
            render();
            break;
        case 'delete-documentary':
            if (confirm(t('confirmDelete'))) {
                mutate(() => softDelete(workspace, 'documentary', id));
                navigate('#/documentaries');
                showToast('Moved to Recycle Bin');
            }
            break;
        case 'delete-profile':
            if (confirm(t('confirmDelete'))) {
                mutate(() => softDelete(workspace, 'profile', id));
                showToast('Moved to Recycle Bin');
            }
            break;
        case 'delete-task':
            if (confirm(t('confirmDelete'))) {
                mutate(() => softDelete(workspace, 'step', id));
            }
            break;
        case 'archive-documentary':
            mutate(() => { const d = workspace.documentaries.find(x => x.id === id); if (d) {
                d.archivedAt = new Date().toISOString();
                d.updatedAt = d.archivedAt;
                logAction(workspace, 'documentary.archived', `আর্কাইভ: ${d.title}`, d.id);
            } });
            break;
        case 'unarchive-documentary':
            mutate(() => { const d = workspace.documentaries.find(x => x.id === id); if (d) {
                d.archivedAt = null;
                d.updatedAt = new Date().toISOString();
                logAction(workspace, 'documentary.unarchived', `আর্কাইভ থেকে ফিরিয়ে আনা: ${d.title}`, d.id);
            } });
            break;
        case 'profile-toggle':
            mutate(() => { const p = workspace.profiles.find(x => x.id === id); if (p)
                editProfile(workspace, id, { active: !p.active }); });
            break;
        case 'restore':
            mutate(() => restoreItem(workspace, (button.dataset.kind || 'documentary'), id));
            showToast('Restored');
            break;
        case 'purge':
            if (confirm(t('confirmPermanent'))) {
                mutate(() => removeForever(workspace, (button.dataset.kind || 'documentary'), id));
                showToast('Permanently deleted');
            }
            break;
        case 'theme-toggle':
            mutate(() => { workspace.settings.theme = workspace.settings.theme === 'dark' ? 'light' : 'dark'; });
            break;
        case 'theme':
            mutate(() => { workspace.settings.theme = button.dataset.theme === 'light' ? 'light' : 'dark'; });
            break;
        case 'language':
            mutate(() => { workspace.settings.language = button.dataset.lang === 'en' ? 'en' : 'bn'; });
            break;
        case 'export':
            exportWorkspace(workspace);
            showToast('Backup downloaded');
            break;
        case 'import':
            await importBackup();
            break;
        case 'cloud-config':
            modal = { type: 'cloud-config' };
            render();
            break;
        case 'cloud-login':
            modal = { type: 'login' };
            render();
            break;
        case 'cloud-signout':
            signOut();
            render();
            showToast('Signed out from cloud. Local data remains intact.');
            break;
        case 'cloud-check': {
            try {
                const snapshot = await cloudRead();
                showToast(snapshot ? `Cloud backup found: revision ${snapshot.revision} (${snapshot.updated_at?.slice(0, 10)})` : 'No cloud backup yet. You can upload local data.');
            }
            catch (e) {
                showToast(e instanceof Error ? e.message : String(e), true);
            }
            break;
        }
        case 'cloud-upload': {
            if (!confirm(isBN() ? 'বর্তমান ওয়ার্কস্পেস ক্লাউডে পাঠাতে চান? অন্য ডিভাইসে পরিবর্তন থাকলে আপলোড আটকে যাবে।' : 'Upload current workspace to cloud? Conflicting revisions will be blocked.'))
                break;
            try {
                const result = await cloudUpload(workspace);
                showToast(`Cloud backup saved (revision ${result.revision})`);
            }
            catch (e) {
                showToast(e instanceof Error ? e.message : String(e), true);
            }
            break;
        }
        case 'cloud-download': {
            if (!confirm(isBN() ? 'ক্লাউডের তথ্য দিয়ে এই ডিভাইসের তথ্য বদলাতে চান? বর্তমান ডেটার JSON ব্যাকআপ ডাউনলোড হবে।' : 'Replace this device’s workspace with the cloud version? A local backup will download first.'))
                break;
            try {
                const snapshot = await cloudRead();
                if (!snapshot) {
                    showToast('No cloud backup found', true);
                    break;
                }
                exportWorkspace(workspace);
                workspace = snapshot.payload;
                modal = { type: null };
                render();
                await saveWorkspace(workspace);
                showToast('Cloud workspace downloaded and restored');
            }
            catch (e) {
                showToast(e instanceof Error ? e.message : String(e), true);
            }
            break;
        }
    }
}
async function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file)
            return;
        if (file.size > 20 * 1024 * 1024) {
            showToast('Backup exceeds 20 MB', true);
            return;
        }
        try {
            const parsed = validateImport(JSON.parse(await file.text()));
            if (!confirm(isBN() ? 'বর্তমান ওয়ার্কস্পেস বদলাবেন? আগে বর্তমান ডেটার ব্যাকআপ ডাউনলোড হবে।' : 'Replace current workspace? We will download a backup first.'))
                return;
            exportWorkspace(workspace);
            workspace = parsed;
            await saveWorkspace(workspace);
            navigate('#/dashboard');
            showToast('Backup restored');
        }
        catch (e) {
            showToast(e instanceof Error ? e.message : String(e), true);
        }
    };
    input.click();
}
function bindEvents() {
    document.addEventListener('click', e => {
        const target = e.target;
        if (!(target instanceof Element))
            return;
        if (target.classList.contains('modal-layer')) {
            modal = { type: null };
            render();
            return;
        }
        const button = target.closest('[data-action]');
        if (!button)
            return;
        e.preventDefault();
        void handleAction(button);
    });
    document.addEventListener('change', e => {
        const target = e.target;
        if (!(target instanceof HTMLElement))
            return;
        const ch = target.dataset.change || '';
        if (ch === 'task-check' && target instanceof HTMLInputElement) {
            mutate(() => toggleStep(workspace, target.dataset.id || '', target.checked));
        }
        if (ch === 'doc-stage' && target instanceof HTMLSelectElement) {
            mutate(() => editDocumentary(workspace, target.dataset.id || '', { stage: target.value }));
        }
        if (ch === 'sort' && target instanceof HTMLSelectElement) {
            sort = target.value;
            render();
        }
        if (ch === 'pub-status' && target instanceof HTMLSelectElement) {
            const docId = target.dataset.doc || '', profileId = target.dataset.profile || '';
            mutate(() => setPublication(workspace, docId, profileId, { status: target.value }));
        }
    });
    document.addEventListener('submit', e => {
        const target = e.target;
        if (!(target instanceof HTMLFormElement) || !target.dataset.form)
            return;
        e.preventDefault();
        void handleSubmit(target);
    });
    document.addEventListener('input', e => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement) || target.id !== 'global-search')
            return;
        query = target.value;
        if (routeParts()[0] !== 'documentaries') {
            filter = 'all';
            navigate('#/documentaries');
            const search = document.getElementById('global-search');
            search?.focus();
            return;
        }
        const start = target.selectionStart || 0;
        render();
        const search = document.getElementById('global-search');
        if (search) {
            search.focus();
            search.setSelectionRange(start, start);
        }
    });
    window.addEventListener('hashchange', () => { mobileMenuOpen = false; modal = { type: null }; render(); window.scrollTo({ top: 0, behavior: 'instant' }); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.type) {
            modal = { type: null };
            render();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const inp = document.getElementById('global-search');
            inp?.focus();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            modal = { type: 'documentary' };
            render();
        }
    });
}
async function init() {
    workspace = await loadWorkspace();
    bindEvents();
    render();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        const registerSW = () => { navigator.serviceWorker.register('./sw.js').catch(e => console.warn('Service worker unavailable', e)); };
        if (document.readyState === 'complete')
            registerSW();
        else
            window.addEventListener('load', registerSW, { once: true });
    }
}
void init().catch(err => { root.innerHTML = `<main style="padding:30px"><h2>SalimGPT could not start</h2><p>${esc(String(err))}</p><p>Try another browser or enable browser storage.</p></main>`; });
