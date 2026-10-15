# SalimGPT Command Center V2

A real, offline-capable documentary production and publishing checklist application built in **TypeScript + native ES Modules + IndexedDB + PWA**. No mandatory frontend framework, runtime CDN, or database is needed to use it on one device. Optional **Supabase Auth + PostgreSQL** supports manual, revision-checked backup and restore across devices.

**Founder:** Mohammad Salim  
**Primary GitHub repository:** `salimpersonal/SalimGPT-Command-Center`  
**Data/migrations repository:** `salimpersonal/SalimGPT-Private-Data`

## Product scope (deliberately restricted)

- Capture **unlimited documentary ideas**; each documentary has its own record.
- Track current stage: Idea → Scheduled → Research → Script → Voice → Visuals → Editing → Review → Ready → Publishing → Published.
- Every documentary has its **independent production tasks and independent publishing checklist**, viewable at any stage.
- Per-stage start/due dates, optional targeted release date, editable at any time. Scheduling **never auto-completes** actual production work.
- **Goal: one published documentary per week**. This is a target, not a capacity limit. The app never blocks extra simultaneous productions or releases.
- SalimGPT Network stores separate Facebook pages, YouTube channels, TikTok profiles, Instagram, X, and websites. Every active profile is automatically shown in the checklist **of every documentary**.
- Manual per-profile Published / Not Published / Not Applicable status, optional post URL and publication date.
- Change a network profile without destroying existing publication history. Removed profiles with publication records remain visible in historical checklists.
- Add / Edit / Delete (Recycle Bin) / Restore for documents, network profiles, and production tasks. Archive documents.
- Search, filter, upcoming weeks, activity timeline, Bengali/English interface, dark/light themes, installable/offline PWA, JSON backups, optional cloud snapshots.
- **NO automatic social posting, social media monitoring, engagement tracking, content scraping or analytics integration.**

## Try immediately

This ZIP already includes compiled ES Modules in `assets/js/`; no build step required to serve it. Open using a static web server, **not** by double-clicking `index.html`:

```sh
python3 -m http.server 8080
```

Visit `http://localhost:8080`. Or upload the whole folder to GitHub and enable Pages. On GitHub Pages it works with the repository subpath because links and resources are relative.

## Build and tests

```sh
npm install
npm run build
npm test
```

Only TypeScript is a development dependency. For an offline build when TypeScript 5.8+ is installed globally, run `tsc --project tsconfig.json`.

## GitHub deployment

1. In your **existing** `salimpersonal/SalimGPT-Command-Center` repository, back up and review existing files before updating.
2. Copy **contents** of this `SalimGPT-Command-Center` folder to the existing repository's root (avoid nesting the folder accidentally).
3. Commit and push to `main` (or adjust `.github/workflows/deploy.yml` for your default branch).
4. Under Repository **Settings → Pages**, select deployment via GitHub Actions.
5. Open the GitHub Pages URL once deployment succeeds. No new GitHub repositories are required.

The provided workflow builds, tests, and deploys. GitHub Pages availability depends on account/repository settings.

## Local data and backup

Uses **IndexedDB** under the exact website origin. Its data stays in that browser/device until you export/import or configure optional cloud backup. Browser storage clearing can permanently remove local data. Download JSON backups regularly from **Settings** and store them safely.

An application-level unlimited documentary count means *no artificial item quota*; physical device storage and browser quotas still apply.

## Optional cloud backup (manual, not live sync)

1. Create a Supabase project under your own account.
2. Apply `SalimGPT-Private-Data/supabase/migrations/001_workspace_snapshots.sql` in Supabase's SQL Editor. This enables row-level security and revision-based conflict protection.
3. In **Settings → Cloud configuration**, enter the project URL and **publishable** key (safe for a public client when correct RLS is enforced). Never use the **secret** or **service role** key.
4. Sign up/sign in using Supabase Auth (configure email authentication as required).
5. First click **Check cloud**, then **Upload** to save a cloud snapshot. On another device, sign into the same Supabase account, then **Download** to restore that snapshot, which first exports an offline backup of that device.
6. Sync is **manual**. Check/resolve data differences before uploading; concurrent changes from other devices are not automatically merged.

The private GitHub repository houses your SQL migrations and documentation; it is **not a place to publish real documentary data, account passwords, personal access tokens, secret keys or unencrypted JSON backups**. The app never uses a browser-embedded GitHub personal access token.

## Project files

- `src/domain.ts`: documentary/task/network logic, publishing isolation, weekly schedules, soft deletes.
- `src/storage.ts`: IndexedDB persistent state, guarded import/export.
- `src/cloud.ts`: optional Supabase Auth/REST manual backup with conflict checks.
- `src/main.ts`: SPA pages, forms, events, responsiveness, manual publishing controls.
- `src/i18n.ts`: Bengali/English labels.
- `assets/styles.css`: full responsive styling.
- `sw.js` + `manifest.webmanifest`: offline installation support.
- `tests/*.test.mjs`: executable domain tests.
- `docs/USER_GUIDE_BN.md`: Bangla usage guide.

## Security / limitations

Read `docs/SECURITY.md`. In particular, local mode is **not** private from someone who can access the unlocked device or browser profile; use your device screen lock and backups. Supabase cloud mode uses auth and RLS, but deployment credentials/account setup have to be provided by the repository owner and **are not** included in this ZIP. Do not treat this prototype as audited security software.
