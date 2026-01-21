# Desktop Rollout Checklist

Use this checklist before producing a field-ready Windows build.

## Build & Packaging
- Build the app: `npm run build`
- Verify installer artifacts in `src-tauri/target/release/`
- Confirm version numbers in `src-tauri/tauri.conf.json`

## Smoke Tests
- Login with admin/lead/staff/volunteer accounts
- Create a client, work order, and invoice
- Driver mode: update status and mileage for today's delivery
- Verify PII masking for non-HIPAA roles
- Check audit logs and MOTD display

## Security & Privacy
- Confirm HIPAA checklist items in Reports
- Verify change request flow for non-admin edits

## Release Notes
- Record build date and version
- Note any known issues and workarounds
