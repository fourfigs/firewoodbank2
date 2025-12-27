Notable Gaps / Changes Needed for Stages 1–5.1d (updated)
- Stage 2: Add update/delete commands to UI for clients/inventory (backend exists).
- Stage 3: Add missing onboarding fields (mailing address, referral/how-heard, denial reason, onboarding date, createdBy) and an edit/update flow in Clients.
- Stage 4: Add “needs restock” filtered view and auto-order messaging (currently highlight only).
- Stage 5.1b: Add user CRUD (availability, vehicle, DL, HIPAA flag) in Worker Directory + commands.
- Stage 5.1c: Town derivation for volunteer view; add audit log viewer/export (audit persisted). Driver PII to assigned work is enforced.
- Minor/preview: Worker Directory HIPAA flag UI; users are read-only until CRUD added.
- Inventory creation gating to be enforced with user CRUD/users stage.

Prompt for the next agent:
- Finish Stage 2/3/4/5.1b/5.1c items above.
- MOTD is surfaced on login (newest first) via list_motd/create_motd.
- Audit logs now persist to audit_logs.