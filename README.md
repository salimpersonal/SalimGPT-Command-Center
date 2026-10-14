# SalimGPT Command Center — GitHub Native Edition v2.0.0

**ডকুমেন্টারি পরিকল্পনা, অগ্রগতি, কেন্দ্রীয় প্রকাশনা মনিটরিং ও ব্যক্তিগত রিমাইন্ডারের জন্য একটি GitHub Pages PWA।**

> **Monitoring only.** This application DOES NOT create/publish/upload posts or videos to social networks or websites. Adding profile links DOES NOT authorize social APIs, scraping, account sign-in, or public analytics retrieval.

## Two-repository deployment

| Repository | Visibility | Purpose |
| --- | --- | --- |
| `salimpersonal/SalimGPT-Command-Center` | **Public** | This application's code + GitHub Pages static PWA |
| `salimpersonal/SalimGPT-Private-Data` | **Private** | GitHub-native JSON data files written with the Contents API |

**This ZIP goes only to the first/public repository.** Never upload passwords, private user data or access tokens to that repository. The second/private repository is kept private and populated only after an authorized user connects through Settings.

## First deployment (GitHub Pages)

1. Extract `SalimGPT-Command-Center-PRO-GitHub-v2.0.0.zip` on your device. Upload its **contents**, including `index.html`, `js/`, `css/`, `assets/`, `.github/workflows/pages.yml`, `manifest.webmanifest`, and `sw.js`, to the **root of the public repo**. Do not simply upload the ZIP.
2. Open `https://github.com/salimpersonal/SalimGPT-Command-Center/settings/pages`; under **Build and deployment → Source**, choose **GitHub Actions**.
3. In the Actions tab, wait for `Deploy SalimGPT Command Center` to finish successfully. Your site address will normally be `https://salimpersonal.github.io/SalimGPT-Command-Center/`.
4. In the private repo check **Settings → General → Danger Zone / Visibility** confirms **Private**. Do **not** make it public.
5. Open the site → **Settings & Recovery**, enter repository owner `salimpersonal` and repository name `SalimGPT-Private-Data`, and save the address.
6. Generate a **fine-grained personal access token** on GitHub (`https://github.com/settings/personal-access-tokens/new`) with **only** `SalimGPT-Private-Data` selected and repository permission **Contents: Read and write**. Set an expiration date, use 2FA and keep the token secret.
7. Paste the token into the **Verify & Connect GitHub** field. The app checks the repository is PRIVATE. Press **Sync Now**; first successful sync creates `data/<collection>.json` as needed.
8. Check **Pending GitHub = 0** and **Sync status: Safely saved to GitHub** before clearing local browser data.

GitHub Docs: [Pages custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Fine-grained PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [Contents API](https://docs.github.com/en/rest/repos/contents).

## A crucial distinction: local save vs private GitHub save

- Every change is immediately stored in the browser's IndexedDB, so the app can work **offline** in an already loaded/installable PWA.
- When **online + connected with a valid token + app open**, pending changes are saved to the private GitHub repo after a short debounce, and a periodic sync checks remote changes.
- **A token is kept in JavaScript memory only; it is NOT stored in files, localStorage or IndexedDB.** You must reconnect each new browser session / after a reload. This reduces durable credential exposure at the cost of convenience.
- Browser data deletion wipes unsynced changes. Previously GitHub-synced records can be restored by reconnecting and syncing again.
- On overlapping edits from two devices, record-level conflicts are displayed for manual `Keep Local` or `Keep GitHub` resolution.
- GitHub API / repository size and abuse limits apply. Collections have a conservative ~900 KB write limit each; larger datasets require a future sharded storage layout.
- No server operates continuously while the app is closed. GitHub Pages **cannot** provide reliable server-side timed notifications or automatic continuous social monitoring by itself.

## Where the data goes

`SalimGPT-Private-Data/data/ideas.json`, `projects.json`, `tasks.json`, `profiles.json`, `publications.json`, `reminders.json`, `goals.json`, `contacts.json`, `resources.json`, `activity.json` (created on demand). The data is persisted as standard JSON with tombstones for deletions. Avoid manually editing these files without taking a backup first.

## Key features

- Quick Idea Vault, conversion to a documentary, seven weighted production stages, custom tasks and deadlines.
- Global Social/Website Profile Registry. **Every active account or website automatically becomes a destination** for every documentary's manual publishing checklist. Previously recorded Done flags remain unchanged when new destinations are added.
- Publishing Tracker separates **Production completed** from **Externally published Done**. Published URL, date and notes are optional and manually entered. Archived destinations keep historical records.
- Calendar, recurring personal reminders while the app is running, ICS calendar export, goal tracking, research sources, contacts/follow-ups, analytics and activity journal.
- JSON export/import, offline PWA shell, automatic online resync during open authenticated sessions, conflict review, GitHub-only recovery.

## Pages and screens

See [docs/PAGES_BN.md](docs/PAGES_BN.md) for the **15 main pages** and **3 documentary detail tabs**, plus their purposes. This is a single-page app: the 15 screens are navigation views within `index.html`, not 15 separate HTML files.

## Testing

Requires Node.js 20+. No npm dependencies are needed:

```sh
npm run check
npm test
```

Automated tests cover page rendering, link validation, the central checklist, Unicode GitHub JSON transport, GitHub recovery, conflict handling and multi-device disjoint merge. The bundled `tests/browser_smoke.py` is an optional Chromium/Playwright interactive smoke test; it requires an unrestricted local browser and Python Playwright.

## Limitations / release classification

This is a **production-oriented single-owner GitHub Pages release** and not a claim of enterprise certification. Browser end-to-end validation and a real authenticated GitHub private repository live write are still required on the target account after deployment. The token must be supplied by its owner. See [docs/SECURITY_AND_LIMITATIONS.md](docs/SECURITY_AND_LIMITATIONS.md).

**Made for SalimGPT — a research-based documentary media platform, not an AI model.**
