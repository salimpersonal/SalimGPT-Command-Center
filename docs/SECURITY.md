# Security and data handling

- No secrets are embedded in the delivered application or deployment workflow.
- The optional Supabase client accepts only HTTPS Supabase project URLs and publishable/legacy anonymous keys; never provide elevated keys.
- SQL RLS grants authenticated users access **only to their own snapshot row**.
- Cloud sign-in tokens live in sessionStorage, not git history, and are cleared on Sign Out or browser session close. They are still subject to normal browser/session and XSS threats; secure the computer and account.
- User-generated HTML is escaped; external links require http/https and use `rel="noopener noreferrer"`. This does not constitute a formal security audit.
- Offline data resides in origin-scoped IndexedDB (localStorage fallback). It is not device-encrypted by the app. Anyone with access to an unlocked browser profile may see it.
- The private GitHub repository stores **SQL migrations and manuals**, not operational data or secrets. A private GitHub repo is not a database or secret manager.
- Cloud sync is manual, uses optimistic `revision` checks and refuses stale uploads. There is no live multi-device merging. Export/import and cloud downloads replace the local workspace; download a backup first.
- Deleting a network profile from Recycle Bin does not delete historical publication records; history uses publication snapshot fields. Permanently deleting a documentary removes its tasks and publication records.
- Browser storage can be cleared by the user or OS; preserve backups outside the browser. Backup JSON is unencrypted and should be stored securely.
- No analytics, third-party social API integration or automatic posting is implemented.
