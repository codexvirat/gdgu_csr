# CSR & Corporate Training Management ERP

Implements the multi-company CSR/training ERP originally scoped in
[`data/CSR_Training_ERP_PRD.md`](data/CSR_Training_ERP_PRD.md) and
[`data/CSR_Training_ERP_TRD.md`](data/CSR_Training_ERP_TRD.md) (see
[`data/Phase_Module_Document.md`](data/Phase_Module_Document.md) for the
original phase breakdown), since adjusted by the client to a custom role
model (below) that supersedes the PRD's role matrix in places.

- **Company & Project management**, **Event/Batch management**, **Participant
  management**, **Registration & Attendance** (offline-capable QR check-in/out,
  plus bulk CSV/Excel participant import), and **Reporting**.
- **Trainer management** (event assignment with double-booking prevention, a
  view-only trainer portal) and **Venue management** (booking-history surfacing).
- **Assessment management**: question bank, online (proctor-entry, auto-graded)
  and offline (manual score) results — plus **trainee self-service**: a trainee
  can log in with just their mobile number + a PIN and take their own MCQ test.
- **Volunteer**: a lightweight, event-locked role a Manager creates from an
  event's page — scoped to attendance/registration for that one event only.

Certificate management (auto-issue, QR verification) was built then removed —
this client gives certificates as hardcopies outside the system. Phase 3
entities (Budget, Vendor, Asset, Client Portal) are modeled in the Prisma
schema but have no UI/business logic yet.

## Roles

| Role | Scope | Can do |
|---|---|---|
| Admin | Company-wide (all companies) | Everything |
| Director | Company-wide | Manage clients/projects/events/trainers/venues/assessments, view reports & financials, unmask Aadhaar |
| Manager | Company-wide | Same as Director, plus register/edit participants, mark attendance, score assessments |
| PA | Company-wide | Register/edit participants, mark attendance |
| Trainer | **Their assigned event(s) only** | Register/edit participants, mark attendance, score assessments — for events they're assigned to via the event's "Trainers" section |
| Volunteer | **One event, fixed at creation** | Register/edit participants, mark attendance — for that one event only |
| Client | Their own project(s) | View-only (portal not yet built) |
| *Trainee* | *Their own record only* | *Not a staff role* — logs in separately (mobile + PIN) to take their own assessment |

Trainer/Volunteer access is enforced server-side (`lib/event-access.ts`), not
just hidden from navigation — visiting another event's URL directly 404s for
those roles.

## Stack

- Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- Prisma 7 + SQLite for local dev (`@prisma/adapter-better-sqlite3`) — schema is
  Postgres-compatible; swap the datasource provider for production
- Auth: JWT session cookie (`jose`), `bcryptjs` password hashing, `proxy.ts` for
  route-level RBAC. Trainees use a separate cookie/session (`lib/trainee-auth.ts`)
  since a Participant isn't a User.
- QR codes: `qrcode` (generation) + `html5-qrcode` (camera scanning)
- Offline-first attendance queue: `idb-keyval` (IndexedDB)
- Exports: CSV (built-in) + Excel via `exceljs` (also used to read bulk-import files)

## Getting started

```bash
npm install
npm run db:seed   # only needed once, or after a migrate reset
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### Seeded logins

All seeded staff users share the password `Passw0rd!`:

| Email | Role |
|---|---|
| admin@gdgucsr.local | Admin |
| director@gdgucsr.local | Director |
| manager@gdgucsr.local | Manager |
| pa@gdgucsr.local | PA |
| trainer@gdgucsr.local | Trainer (assigned to the seeded Delhi event) |
| volunteer@gdgucsr.local | Volunteer (locked to the seeded Pune event) |

Trainees log in separately at `/trainee-login` with **mobile + PIN** — the seed
script prints a working mobile/PIN pair to the console (Ramesh Kumar's).

Seed data includes one company, one client ("Havells India Ltd."), one project
("Electrician Skill Upgradation 2026") with two cities and two events, and four
sample participants.

## Useful scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build/start
- `npm run lint` — ESLint
- `npm run db:seed` — re-run the seed script
- `npm run db:studio` — open Prisma Studio against `prisma/dev.db`
- `npx prisma migrate dev` — create/apply a new migration after editing `prisma/schema.prisma`

## Notes on simplifications

- **Single backend, not a separate REST API**: internal writes use Next.js Server
  Actions instead of a REST API; a handful of Route Handlers exist where a real
  HTTP endpoint is needed (file serving, attendance sync, CSV/Excel exports/import).
- **Password reset** is admin-set (no email-based self-service flow). Trainee PINs
  are staff-generated and shown once on screen — there's no SMS delivery wired up.
- **Aadhaar verification** is format-only (12-digit check); UIDAI-integrated
  verification is out of scope.
- **Offline support** covers the registration/attendance data path (IndexedDB
  queue + sync-on-reconnect), not a full installable PWA app-shell.
- **Bulk import** uses a deliberately simple hand-rolled CSV parser (no embedded
  newlines in cells) and reads the first worksheet only for `.xlsx`; rows are
  capped at 500 per upload and processed synchronously (no background job queue).
- **Trainer availability** is shown as a list of their assigned event date ranges
  rather than a dedicated calendar grid; there's no feature for a trainer to
  proactively block out unavailable dates.
- **PDF export** isn't implemented for reports/attendance registers (CSV/Excel only).
