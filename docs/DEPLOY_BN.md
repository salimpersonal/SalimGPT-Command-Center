# GitHub-এ ডেপ্লয় করার বাংলা নির্দেশিকা

## আপনি ইতিমধ্যে দুটি Repository তৈরি করেছেন

1. **Public app:** `https://github.com/salimpersonal/SalimGPT-Command-Center`
2. **Private data:** `https://github.com/salimpersonal/SalimGPT-Private-Data`

আর Repository তৈরি করতে হবে না। ZIP-টি **শুধু Public app Repository**-তে আপলোড করতে হবে। Private Data Repository-তে কোন ZIP বা অ্যাপের কোড আপলোড করবেন না।

## ১. ZIP Extract করুন

ZIP-এর ভেতরে পাবেন `index.html`, `js`, `css`, `assets`, `.github`, `docs`, `tests` ইত্যাদি। ZIP-এর সব Extract করা ফাইল ও সাবফোল্ডার **Public Repository-এর root**-এ একই কাঠামোতে রাখতে হবে।

**গুরুত্বপূর্ণ:** মোবাইল GitHub Browser-এর Upload files উইন্ডো অনেক সময় পুরো folder tree ধরে রাখতে পারে না। এরকম হলে কম্পিউটারে GitHub web upload ব্যবহার করুন অথবা Git Client দিয়ে root structure intact রেখে push করুন। শুধুমাত্র ZIP আপলোড করলে অ্যাপ চলবে না।

## ২. GitHub Pages

Public Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions** নির্বাচন করুন। তারপর **Actions → Deploy SalimGPT Command Center** থেকে `checks` ও `pages` সফল হয়েছে দেখুন। সাধারণত Live URL:

`https://salimpersonal.github.io/SalimGPT-Command-Center/`

GitHub Pages আপডেট হতে কিছু বিলম্ব হতে পারে; Apps Install করলে Service Worker-এর নতুন সংস্করণও refresh হতে পারে।

## ৩. Private Repository প্রস্তুতি

- `SalimGPT-Private-Data` অবশ্যই Private রাখবেন।
- এখানে কোনো Secret বা Token ফাইল আপলোড করবেন না।
- ইচ্ছা করলে শুধু README থাকতে পারে; অ্যাপ `data/*.json` ফাইল তৈরি করবে যখন প্রথম সফল GitHub Sync হয়।

## ৪. Fine-grained Token তৈরি

GitHub → `Settings → Developer settings → Personal access tokens → Fine-grained tokens` → **Generate new token**।

- Resource owner: `salimpersonal`
- Repository access: **Only select repositories** → `SalimGPT-Private-Data`
- Repository permissions → **Contents: Read and write**
- একটি বাস্তবসম্মত Expiration নির্বাচন করুন।

Token **কখনো** ChatGPT, screenshot, public Repository বা অন্য কারও কাছে পাঠাবেন না। প্রকাশ হলে GitHub থেকে সঙ্গে সঙ্গে Revoke করবেন।

## ৫. অ্যাপে সংযোগ

Live app → **Settings & Recovery** → Owner `salimpersonal`, Repo `SalimGPT-Private-Data` → Save Address → Token Paste → **Verify & Connect GitHub**।

Successful Sync হলে `Pending GitHub: 0` এবং `Safely saved to GitHub` দেখা উচিত।

## ৬. ব্রাউজার Data Clear করার পরে

আবার Live App খুলুন → Settings → Token দিয়ে Connect → Sync Now। সফলভাবে GitHub-এ পূর্বে Sync করা তথ্য চলে আসবে। Token নতুন সেশনে আবার দিতে হয়; এটি ব্যক্তিগত নিরাপত্তার জন্য ডিজাইন সিদ্ধান্ত।

## ৭. কাজের প্রবাহ

New Idea → Convert to Documentary → Production Workflow-তে Done → Central Registry-তে সকল social/websites যুক্ত → Documentary Publishing Monitor-এ বাইরের প্রকাশনার Done → Reports।

## ৮. সমস্যা হলে

| সমস্যা | কী করবেন |
| --- | --- |
| `404` | Token-এ Repo access নেই, Repo ভুল অথবা Private repo access মেলেনি |
| `403` | API rate-limit বা Contents permission পরীক্ষা করুন |
| `409/422` | Concurrent change; অ্যাপের Conflict Review ব্যবহার করুন |
| GitHub Pages 404 | Workflow-এর `pages` job সফল হয়েছে কি না দেখুন; Source হিসেবে GitHub Actions নির্বাচন করুন |
| Pending > 0 | ডেটা এখনো GitHub-এ নিরাপদে সেভ হয়নি; নেট/Token/Repo পরীক্ষা করুন |
| Browser Clear-এর পরে কিছু অনুপস্থিত | সম্ভবত ডেটা GitHub-এ সফল Sync হয়নি; পুরোনো JSON Backup থাকলে Import করুন |
