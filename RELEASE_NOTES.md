# v2.0.0 — GitHub Native Edition

- Replaced optional Supabase backend with direct private GitHub Contents API transport.
- Added private-repository verification, memory-only credential handling, throttled upload, SHA optimistic commits, record-level conflicts and recovery.
- Migrates legacy IndexedDB records to pending GitHub uploads without deleting existing ideas, projects, publishing logs and reminders.
- Expanded from 9 to 15 primary navigation views: Publishing Tower, Calendar, Research Library, Contacts/Follow-ups, Activity Log and User Guide added.
- Preserved the core central Profile Registry → automatic documentary-specific Publishing Checklist, including archive history.
- Added unit/integration test coverage and GitHub Actions validation.
- Deprecated `sql/` database bootstrap. No Firebase or Supabase required.

**Not part of this release:** server-side wakeup when closed, native device push, scraping or automatic social publishing, unattended Github OAuth, multi-user roles, live account statistics.
