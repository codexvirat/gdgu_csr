# Technical Requirements Document (TRD)
## CSR & Corporate Training Management ERP

**Version:** 1.0
**Status:** Draft for Engineering Review
**Companion document:** CSR_Training_ERP_PRD.md
**Date:** June 21, 2026

---

## 1. Purpose

This TRD translates the PRD's functional and business requirements into a concrete technical architecture, data model, API design, and infrastructure plan that the engineering team can use to estimate, build, and operate the platform. It assumes Phase 1–3 scope from the PRD; Phase 4 (AI features) is addressed directionally in Section 13.

## 2. Architecture Overview

### 2.1 Architecture Style
- **Pattern:** Modular monolith for v1 (single deployable backend, clearly separated modules/domains), with clean internal boundaries so individual modules (e.g., Certificate Management, Financials) can be extracted into separate services later if scale demands it.
- **Rationale:** 12 modules with shared core entities (Project, Event, Participant) benefit from transactional consistency early on; full microservices would add operational overhead not justified at MVP scale.
- **Multi-tenancy model:** Single-tenant-per-organization deployment, with **multi-company support inside each tenant** (matches PRD assumption pending stakeholder confirmation in Section 15 of PRD). Each row carrying a `company_id` for logical isolation; schema designed so a future move to per-tenant DB isolation is possible without a full rewrite.

### 2.2 High-Level Component Diagram (logical)

```
                         ┌─────────────────────────┐
                         │   Web App (React/Next)  │
                         │  Admin / Ops / Trainer / │
                         │  Client Portal (RBAC UI) │
                         └────────────┬─────────────┘
                                      │ HTTPS / REST (JSON)
                         ┌────────────▼─────────────┐
                         │       API Gateway /        │
                         │   Auth & Rate Limiting     │
                         └────────────┬─────────────┘
                                      │
        ┌─────────────────────────────┼──────────────────────────────┐
        │                             │                              │
┌───────▼────────┐   ┌────────────────▼───────────────┐   ┌──────────▼─────────┐
│  Core Service    │   │   Operations Service            │   │  Reporting Service │
│  - Company        │   │   - Events/Batches               │   │  - Dashboards        │
│  - Project          │   │   - Venue/Trainer/Vendor mgmt    │   │  - Exports (PDF/XLS) │
│  - User/Role/Auth   │   │   - Asset allocation              │   │  - Client portal data│
└───────┬────────┘   └────────────────┬───────────────┘   └──────────┬─────────┘
        │                             │                              │
┌───────▼────────┐   ┌────────────────▼───────────────┐   ┌──────────▼─────────┐
│ Participant      │   │  Assessment & Certificate       │   │  Financial Service  │
│ Service            │   │  Service                          │   │  - Budgets/Expenses  │
│ - Registration      │   │  - Question bank, scoring         │   │  - P&L                │
│ - Verification      │   │  - Certificate gen + QR           │   │                      │
│ - Attendance (QR)   │   │  - Digital signature              │   │                      │
└───────┬────────┘   └────────────────┬───────────────┘   └──────────┬─────────┘
        │                             │                              │
        └─────────────────────────────┼──────────────────────────────┘
                                      │
                         ┌────────────▼─────────────┐
                         │     PostgreSQL (primary)   │
                         │  + Object Storage (files)  │
                         │  + Redis (cache/queue)      │
                         └────────────┬─────────────┘
                                      │
                         ┌────────────▼─────────────┐
                         │  Background Jobs / Queue    │
                         │  (certs, reports, sync)     │
                         └─────────────────────────────┘
```

Each "service" above is a module within the monolith codebase (separate domain folders/packages), communicating in-process — not separate network services — except where noted (e.g., background job workers).

## 3. Technology Stack (Proposed)

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend (web) | React + TypeScript (Next.js) | SSR for dashboards/reports, CSR for forms; Tailwind for styling |
| Mobile/offline registration | PWA with IndexedDB/local storage + background sync, OR React Native if native camera/QR access proves necessary | Decision needed — see Open Question in Section 14 |
| Backend | Node.js (NestJS) or alternatively Django/DRF (Python) | NestJS chosen if team has JS/TS strength; Django if Python/data-science alignment preferred for future AI features |
| Database | PostgreSQL 15+ | Relational integrity needed across Project→Event→Participant chains |
| Cache/Queue | Redis | Session cache, rate limiting, job queue (BullMQ/Celery) |
| File/Document storage | S3-compatible object storage (AWS S3 / Cloudflare R2 / MinIO for self-hosted) | Stores documents, certificates, photos |
| Search (optional, Phase 2+) | PostgreSQL full-text search initially; Elasticsearch/OpenSearch if participant search volume grows | Avoid over-engineering at MVP |
| Authentication | JWT-based session with refresh tokens; SSO/OAuth optional for client portal (Phase 3) | RBAC enforced at API layer |
| PDF/Certificate generation | Server-side rendering (e.g., Puppeteer/wkhtmltopdf or a templating library) + QR code library | Templated per client/project |
| Hosting | Cloud VM/Kubernetes or managed PaaS (AWS/GCP/Azure) | Final choice depends on client data-residency requirements (India-based hosting likely required given Aadhaar data) |
| Monitoring | Prometheus/Grafana or hosted (Datadog/New Relic) + centralized logging (ELK/Loki) | |
| CI/CD | GitHub Actions / GitLab CI | Automated tests + staged deployments |

*Final stack to be confirmed with engineering leadership based on existing team skillset; the architecture in Section 2 is stack-agnostic.*

## 4. Data Model (Detailed)

### 4.1 Core Entities & Key Fields

**company**
`id, name, address, gstin, status, created_at`

**user**
`id, company_id, name, email, phone, password_hash, role_id, status, last_login_at`

**role**
`id, name (admin/director/exec/trainer/pa/client), permissions (JSON or join table)`

**client** (the company commissioning training, e.g., Havells)
`id, company_id, name, industry, primary_contact, address`

**project**
`id, company_id, client_id, name, target_count, trade_category, start_date, end_date, status, budget_total, created_by`

**project_city** (project may span multiple cities, each with sub-target)
`id, project_id, city, target_count, achieved_count`

**event** (a training batch)
`id, project_id, project_city_id, venue_id, event_date_start, event_date_end, target_count, status, ops_manager_id`

**event_trainer** (many-to-many)
`id, event_id, trainer_id, role_in_event, fee_amount`

**venue**
`id, name, address, city, contact_person, contact_phone, capacity, facilities (JSON), rate_card`

**venue_booking**
`id, venue_id, event_id, booking_date, cost_incurred, notes`

**trainer**
`id, user_id (nullable, if trainer has portal login), name, phone, email, skills (JSON), certifications, fee_structure, status`

**trainer_rating**
`id, trainer_id, event_id, rating, feedback_text, rated_by`

**participant**
`id, project_id, event_id, name, aadhaar_number (encrypted), mobile, address, trade_category, experience_years, status, registered_by, manager_id, trainer_id`

**participant_document**
`id, participant_id, doc_type, file_url, uploaded_at, verified_status`

**attendance**
`id, participant_id, event_id, check_in_at, check_out_at, qr_code_value`

**assessment**
`id, project_id, trade_category, title, pass_mark, total_marks`

**assessment_question**
`id, assessment_id, question_text, options (JSON), correct_option`

**assessment_result**
`id, assessment_id, participant_id, event_id, score, status (pass/fail), attempted_at, mode (online/offline)`

**certificate**
`id, participant_id, project_id, event_id, certificate_number, qr_code_value, issued_at, file_url, signed_by, status (active/revoked)`

**vendor**
`id, company_id, name, category (hotel/caterer/transport/printing/other), contact, rate_history (JSON)`

**vendor_transaction**
`id, vendor_id, event_id, amount, description, transaction_date, approved_by`

**asset**
`id, company_id, name, category, serial_number, condition, status`

**asset_allocation**
`id, asset_id, event_id, allocated_at, returned_at, condition_on_return`

**budget**
`id, project_id, category (venue/food/trainer/travel/misc), allocated_amount`

**expense**
`id, project_id, event_id, budget_category, amount, vendor_id (nullable), description, approved_by, status, created_at`

**audit_log**
`id, user_id, entity_type, entity_id, action, before_value (JSON), after_value (JSON), timestamp`

### 4.2 Key Relationships
- `client (1) → project (many)`
- `project (1) → project_city (many) → event (many)`
- `event (1) → participant (many)`, `event (many) ↔ trainer (many)` via `event_trainer`
- `participant (1) → participant_document (many), attendance (many), assessment_result (many), certificate (many)`
- `venue (1) → venue_booking (many)`
- `vendor (1) → vendor_transaction (many)`
- `asset (1) → asset_allocation (many)`
- `project (1) → budget (many) → expense (many)`

### 4.3 PII & Sensitive Data Handling
- `aadhaar_number` stored **encrypted at rest** (column-level encryption or application-level AES-256), displayed masked (e.g., `XXXX-XXXX-1234`) in UI except to roles with explicit unmask permission, with unmask actions written to `audit_log`.
- Document files (Aadhaar copies, etc.) stored in object storage with access via short-lived signed URLs, not public links.

## 5. API Design Principles

- RESTful JSON API, versioned (`/api/v1/...`).
- Authentication via Bearer JWT; refresh-token rotation.
- Authorization enforced centrally via a permissions middleware mapped to the Role-Permission matrix from the PRD (Section 4.1).
- Pagination on all list endpoints (`?page=&limit=`), filtering via query params (`?project_id=&city=&status=`).
- Idempotent write endpoints where applicable (e.g., attendance check-in) to support offline-sync retries.
- Webhooks/event hooks (internal) for: participant registered, assessment completed, certificate issued, budget threshold exceeded — feeding the Reporting Service and notification jobs.

### 5.1 Representative Endpoint Groups

```
/api/v1/auth/login, /refresh, /logout
/api/v1/companies, /companies/{id}
/api/v1/clients, /clients/{id}
/api/v1/projects, /projects/{id}, /projects/{id}/cities, /projects/{id}/progress
/api/v1/events, /events/{id}, /events/{id}/trainers, /events/{id}/participants
/api/v1/venues, /venues/{id}/bookings
/api/v1/trainers, /trainers/{id}/ratings, /trainers/{id}/availability
/api/v1/participants, /participants/{id}/documents, /participants/{id}/attendance
/api/v1/assessments, /assessments/{id}/questions, /assessments/{id}/results
/api/v1/certificates, /certificates/{id}/verify (public, QR-resolvable, no auth)
/api/v1/vendors, /vendors/{id}/transactions
/api/v1/assets, /assets/{id}/allocations
/api/v1/budgets/{project_id}, /expenses
/api/v1/reports/project/{id}, /reports/city, /reports/financial
/api/v1/client-portal/projects/{id}/summary   (scoped to client role)
```

## 6. Offline & Field-Data Capture Strategy

Given PRD's note on intermittent connectivity at training venues:

- Registration and attendance modules implemented as a **PWA with local-first storage** (IndexedDB) and a background sync queue.
- Each locally-created record gets a client-generated UUID to allow safe sync without ID collisions.
- Conflict resolution: last-write-wins at field level for non-critical fields; server-side validation rejects duplicate Aadhaar/mobile on sync, surfacing a merge/duplicate-resolution screen to the Ops Manager.
- QR-based check-in/out works offline by validating QR payload locally and queuing the attendance event for sync.

## 7. Security Requirements

- TLS 1.2+ everywhere; HSTS enabled.
- RBAC enforced at API layer, not just UI — every endpoint checks role + company/project scope.
- Aadhaar and other PII encrypted at rest (column-level), encrypted in transit, masked in UI by default.
- Password hashing via bcrypt/argon2; enforced password policy; optional MFA for Admin/Director roles.
- Rate limiting on auth and public endpoints (e.g., `/certificates/{id}/verify`).
- File upload validation (type/size limits, malware scanning recommended for production).
- Full audit logging of create/update/delete on sensitive entities (participant, certificate, expense, user/role changes).
- Data retention & deletion policy to be defined for participant PII post-project-closure (compliance requirement — flagged as open item).
- Penetration test recommended before production go-live given Aadhaar data handling.

## 8. Non-Functional Implementation Notes

| NFR (from PRD) | Technical Approach |
|---|---|
| Scalability | Stateless API layer behind load balancer; horizontal scaling of app servers; DB read replicas for reporting queries |
| Availability (99.5%) | Multi-AZ deployment, health checks, automated failover for DB, daily backups with point-in-time recovery |
| Performance (dashboard <3-5s) | Pre-aggregated reporting tables (materialized views) refreshed via background jobs rather than live heavy joins |
| Auditability | Centralized `audit_log` table + structured application logs shipped to log aggregator |
| Offline-first | PWA + sync queue (Section 6) |
| Localization (future) | i18n library from day one in frontend even if only English shipped at MVP, to avoid rework |

## 9. Background Jobs / Async Processing

| Job | Trigger | Action |
|---|---|---|
| Certificate generation | Assessment result = pass | Render PDF, generate QR, store, update certificate table |
| Report generation (scheduled) | Cron (daily/weekly) | Aggregate project/event stats into reporting tables; optionally email client |
| Offline sync reconciliation | Client sync push | Validate, dedupe, write to canonical tables |
| Budget threshold alert | Expense create/update | Compare against budget; notify if >X% utilized |
| Duplicate participant scan | Participant create/update | Match against Aadhaar/mobile; flag for review queue |

## 10. Integration Points (to be confirmed — see Open Questions)

- **SMS/WhatsApp gateway** for participant invites and certificate delivery notifications.
- **Aadhaar verification API** (UIDAI-authorized AUA/KUA or licensed third-party) — only if full verification (not just format check) is required.
- **Payment gateway / bank transfer file export** for trainer and vendor payouts.
- **Accounting software export** (e.g., Tally-compatible export) if full GST/accounting integration is later required.

## 11. Testing Strategy

- Unit tests for business logic (scoring, budget calculations, duplicate detection).
- Integration tests for API endpoints per module, especially permission boundaries (role X cannot access company Y's data).
- End-to-end tests for critical workflows: project creation → event → registration → assessment → certificate.
- Load testing for reporting endpoints and certificate verification endpoint (public-facing, must handle spikes).
- Security testing: RBAC boundary tests, PII masking verification, file upload validation.
- UAT with Ops/Trainer/PA roles using realistic field conditions (including offline mode) before go-live.

## 12. Deployment & Environments

- **Environments:** Local → Dev → Staging → Production.
- **Data residency:** Production hosting should default to an India region (e.g., AWS ap-south-1) given Aadhaar/PII handling, pending legal confirmation.
- **CI/CD:** Automated test suite gate on PR merge; staged deploy to staging, manual promotion to production.
- **Backups:** Automated daily DB backups, retained per compliance policy; object storage versioning enabled for certificates/documents.
- **Disaster recovery:** Defined RPO/RTO targets to be agreed with stakeholders (suggested starting point: RPO 24h, RTO 4h for MVP).

## 13. Phase 4 (AI Features) – Technical Direction

These are directional notes only, not committed design, since Phase 4 is post-MVP per the PRD:

- **Duplicate/fraud detection:** Start with deterministic matching (Aadhaar/mobile/name+DOB fuzzy match) before introducing ML-based similarity scoring.
- **Trainer/venue recommendation:** Can begin as a rules-based scoring function (skill match, distance, past rating, cost) before any ML model; gives a baseline to evaluate ML uplift against.
- **Automated CSR report generation:** Likely an LLM-assisted summarization layer over the structured reporting data already produced by the Reporting Service — technically straightforward once data model is in place.
- **Impact/outcome tracking:** Requires a new data collection mechanism (post-training surveys) not yet modeled — to be scoped separately.

## 14. Open Technical Questions

1. **Mobile strategy:** Is camera-based QR scanning and offline-first registration sufficient as a PWA, or does the field reality (e.g., low-end Android devices, poor PWA support) require a native app?
2. **Hosting/data residency:** Confirm legal requirement for India-only data hosting given Aadhaar data.
3. **Aadhaar verification depth:** Format-only vs. full UIDAI-integrated verification — this materially changes compliance scope, licensing, and timeline.
4. **Backend language/framework:** Confirm based on existing team skillset (Node/NestJS vs. Python/Django vs. other).
5. **Multi-tenancy model:** Confirm single-tenant-per-org (as assumed in Section 2.1) vs. shared multi-tenant SaaS model — this affects DB isolation strategy significantly.
6. **Certificate signature:** Is a simple "signed by" image/text sufficient, or is a cryptographic digital signature (e.g., PKI-based) required for legal validity in client contracts?

## 15. Estimation Inputs (for Engineering)

To support effort estimation, the following are needed from stakeholders before sprint planning:
- Confirmed answers to Section 14 open questions.
- Initial scale targets (number of concurrent projects, participants/year) — referenced in PRD Section 15.
- Design system / branding guidelines for the client-facing portal and certificates.
- List of any existing systems requiring data migration (if this replaces a current spreadsheet-based process, is historical data migration in scope?).

---

*This TRD should be reviewed alongside the PRD before sprint planning. Architecture decisions in Sections 2–3 are recommendations pending confirmation of team skillset, hosting constraints, and the open questions in Section 14.*
