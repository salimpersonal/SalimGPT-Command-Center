# Security model & limitations — v2.0.0

### GitHub-only design

- The *public* static app is hosted by GitHub Pages. All private records are stored only in the selected *private* GitHub repository as JSON via GitHub's REST API, after explicit user authorization.
- GitHub is versioned file storage, not a transactional SQL database. The app uses one small JSON file per collection and conditional SHA writes, plus per-record signatures and conflict prompts. It is suitable for a personal/limited-operator workflow, not high-frequency collaborative workloads.
- Each collection write is capped around 900KB to avoid unhandled GitHub Contents API limits. Large media files should **not** be stored inside JSON. A larger system would need sharding or a real DB.
- OAuth callbacks and unattended background sync are **not** implemented because GitHub Pages cannot keep backend secrets. Instead a least-privilege **fine-grained PAT** is provided to the client for each new app session; it resides **only in page memory** (not source code, localStorage or IndexedDB).
- A user can read browser-local data on the same unlocked device. For sensitive personal notes, protect your device and GitHub account (2FA); do not open the app on a shared browser. GitHub private repos are encrypted/secured by GitHub under its own service policies, not end-to-end encryption controlled by this app.

### Data durability

- `Saved locally` ≠ `Safely saved to GitHub`. Wait for Pending=0 and successful Sync status before clearing browser data.
- During offline periods, writes remain in IndexedDB until an authenticated online session reconnects; if local browser storage is cleared before they are uploaded, they cannot be recovered from GitHub.
- Github repository contents can be restored manually from git history where GitHub retains revisions; users should additionally export JSON backups periodically.
- Each app reload forgets the token, so offline data can still be accessed locally but cannot automatically sync remote until reconnection.
- New private repo initialization and GitHub API write must be confirmed on your actual account after deployment; automated mock testing is not proof of production credentials or real network behavior.

### Social and scheduling

- No publishing endpoints, no post/video uploads, no Facebook/YouTube login, no scraping, no service-side monitoring of hundreds of accounts. Social/website registry is URL + **manually entered** data only.
- Publishing is a manually edited checklist for external work. `Published` is a record of your claim, NOT verification by the platform.
- Browser reminders are checked while the app is open/visible and Notification permission is granted. Browsers may throttle or suppress; closing the page stops the timer. Use ICS export and device/calendar notifications when reliability is critical.

### Privacy & content

- Public repo must never contain user data, API tokens, or credentials. The source `.gitignore` excludes common secrets but cannot protect against manual uploads.
- Basic HTML escaping, safe http(s) URL checks and restrictive CSP mitigate content injection. Do not import backups from strangers.
- Only users authorized for the specific private repository should be given fine-grained tokens. The app rejects public data repositories.

### Quality statement

- Pure Node unit tests and GitHub transport/integration mock tests are bundled and pass during automated checks.
- A browser-level interactive smoke test is provided but requires an unrestricted Chromium/Playwright environment, and successful private-repository live operations remain an acceptance criterion before relying on the app for irreplaceable data.
