# Product Requirements Document (PRD)
## CSR & Corporate Training Management ERP

**Version:** 1.0
**Status:** Draft for Review
**Date:** June 21, 2026

---

## 1. Purpose & Background

Organizations that execute CSR (Corporate Social Responsibility) and corporate skill-training programs on behalf of large clients (e.g., Havells, Crompton, Schneider) currently manage the full project lifecycle — from work order to final certification and client reporting — using a mix of spreadsheets, manual coordination, and disconnected tools. As project volume grows (e.g., training 10,000 electricians across multiple cities), this manual approach creates risks around data accuracy, duplicate effort, budget visibility, and client reporting turnaround.

This PRD defines the requirements for a multi-company ERP platform that centralizes planning, execution, participant management, assessment, certification, financials, and client reporting into a single system.

## 2. Goals & Objectives

| Goal | Description |
|---|---|
| Centralize operations | One platform to manage multiple clients, projects, cities, and batches |
| Reduce manual effort | Automate scheduling, registration, certificate generation, and reporting |
| Improve data accuracy | Single source of truth for participants, trainers, venues, and vendors |
| Increase transparency | Real-time dashboards for internal teams and client-facing logins |
| Enable reuse of institutional knowledge | Historical data on venues, trainers, and vendors speeds up future project planning |
| Support compliance & audit | Aadhaar verification, document storage, and assessment/certification trails |

## 3. Non-Goals (Out of Scope for v1)

- Payroll/HRMS for full-time employee management (only trainer/vendor payments are in scope)
- Accounting/GST filing integration (budget tracking only, not statutory accounting)
- Native mobile apps for v1 (mobile-responsive web is in scope; native apps may be a future phase)
- Public job-marketplace features for trainers

## 4. Target Users & Roles

| Role | Description | Primary Responsibilities |
|---|---|---|
| **Admin** | System owner / super-user | Manage companies, users, roles, system configuration, master data |
| **Director** | Senior leadership | Cross-project visibility, budget approval, high-level reporting |
| **Executive / Operations Manager** | Project execution lead | Create projects/events, assign trainers, manage venues/vendors, track targets |
| **Trainer** | Delivers training | View assigned schedules, mark attendance, conduct/upload assessments |
| **PA / Data Entry Operator** | Field/back-office support | Participant registration, document upload, data entry, attendance support |
| **Client (external, view-only)** | Client stakeholder | View real-time project progress, reports, and certificates for their project(s) |

### 4.1 Role-Permission Matrix (high-level)

| Capability | Admin | Director | Exec/Ops Mgr | Trainer | PA/Data Entry | Client |
|---|---|---|---|---|---|---|
| Manage companies & users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create projects/work orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create events/batches | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign trainers/managers | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage venues/vendors | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Register participants | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Mark attendance | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Conduct/score assessments | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Generate certificates | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View financials/budget | ✅ | ✅ | ✅ (own projects) | ❌ | ❌ | ❌ |
| View client reports | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (own project only) |

*Exact permissions to be finalized during detailed design; this matrix is a starting baseline.*

## 5. Core Business Workflow (End-to-End)

1. **Client onboarding** — Add client company; capture work order/agreement details.
2. **Project creation** — Define project target (e.g., "Train 10,000 Electricians"), cities, timeline, and budget.
3. **Batch/event planning** — Break the project into city-wise and date-wise batches with sub-targets.
4. **Resourcing** — Assign Project Manager, Trainer(s); book venue; arrange food/logistics; assign assets.
5. **Participant mobilization** — Invite/register participants; verify Aadhaar; collect documents.
6. **Execution** — Conduct training; track attendance (QR-based check-in/out).
7. **Assessment** — Run MCQ/practical assessments; auto-score; determine pass/fail.
8. **Certification** — Auto-generate certificates with QR verification and digital signature.
9. **Reporting** — Compile city-wise, event-wise, attendance, and assessment reports for the client.
10. **Financial closure** — Reconcile venue/food/trainer/travel costs against budget; compute P&L per project.

## 6. Functional Requirements by Module

### 6.1 Company & Project Management
- FR-1.1: System shall support multiple companies (multi-tenant or multi-entity) within one ERP instance.
- FR-1.2: Admin/Director/Exec can create client companies and store contact details.
- FR-1.3: System shall allow creation of projects with: client, total target, trade/category, start/end dates, list of cities, and budget.
- FR-1.4: System shall store work order documents and agreements (file upload, versioning).
- FR-1.5: System shall track project completion percentage in real time (trained vs. target).
- FR-1.6: System shall support project status states (Draft, Active, On Hold, Completed, Cancelled).

### 6.2 Event & Batch Management
- FR-2.1: Users can create training events/batches under a project, each with city, venue, date(s), and target headcount.
- FR-2.2: Each event can have one or more trainers and one operations manager assigned.
- FR-2.3: System shall track city-wise and batch-wise target vs. achieved numbers.
- FR-2.4: System shall flag events that are behind schedule or under target.
- FR-2.5: Calendar view of all events across projects/cities.

### 6.3 Venue Management
- FR-3.1: Centralized venue master with: name, address, contact person, capacity, facilities, and rate card.
- FR-3.2: System shall log every booking against a venue (date, project/client, cost incurred).
- FR-3.3: When selecting a venue for a new event, system shall surface its booking history (past clients, costs, capacity) to support faster decision-making.
- FR-3.4: Venue search/filter by city, capacity, and prior usage.

### 6.4 Trainer Management
- FR-4.1: Trainer master with skills/expertise tags, certifications, availability calendar, and fee structure.
- FR-4.2: System shall maintain training history and performance ratings per trainer (e.g., post-event feedback scores).
- FR-4.3: System shall prevent double-booking a trainer for overlapping events.
- FR-4.4: Trainers shall have a portal/login to view assigned schedules and submit attendance/assessment data.

### 6.5 Participant Management
- FR-5.1: Participant master fields: Name, Aadhaar Number, Mobile, Address, Trade Category, Experience, Documents, Training History, Assessment Scores, Certificates.
- FR-5.2: Each participant record shall link to a specific Project, Event, Manager, and Trainer.
- FR-5.3: System shall detect potential duplicate participants (same Aadhaar/mobile) at entry time.
- FR-5.4: Participant search/filter by project, city, trade, status (registered/trained/certified).

### 6.6 Registration & Verification
- FR-6.1: On-site/online registration form capturing participant details and document uploads.
- FR-6.2: Aadhaar verification step (format validation at minimum; OTP/API-based verification as a configurable option, subject to compliance review).
- FR-6.3: QR-code-based check-in and check-out for attendance tracking.
- FR-6.4: Attendance register exportable per event/batch.

### 6.7 Assessment Management
- FR-7.1: Create MCQ-based question banks per trade/skill category.
- FR-7.2: Support both online (in-app) and offline (paper, with manual entry) assessment modes.
- FR-7.3: Automated scoring with configurable pass-mark thresholds.
- FR-7.4: Result repository with pass/fail status per participant per assessment attempt.

### 6.8 Certificate Management
- FR-8.1: Auto-generate certificates for participants who pass assessment, using a templated design per client/project.
- FR-8.2: Each certificate shall include a unique QR code for public verification.
- FR-8.3: Support digital signature/authorization on certificates.
- FR-8.4: Certificates downloadable by Admin/Ops and by participants (if participant self-service is enabled).
- FR-8.5: Full certificate issuance history retained and searchable.

### 6.9 Client Reporting Dashboard
- FR-9.1: Dashboard showing total participants trained, target vs. achieved, by project/city/event.
- FR-9.2: Attendance and assessment summary reports, exportable (PDF/Excel).
- FR-9.3: Photo/document gallery per event for client visibility.
- FR-9.4: Dedicated client login with access restricted to their own project(s) only.
- FR-9.5: Scheduled/automated report generation (e.g., weekly/monthly client report email).

### 6.10 Financial & Budget Management
- FR-10.1: Budget allocation per project, broken down by category (venue, food, trainer, travel, misc.).
- FR-10.2: Expense entry and approval workflow against each category.
- FR-10.3: Real-time budget-vs-actual tracking with alerts on overrun.
- FR-10.4: Profit & Loss computation per project (client billing vs. actual costs).

### 6.11 Vendor Management
- FR-11.1: Vendor master for hotels, caterers, transport, printing, and event vendors.
- FR-11.2: Pricing history and performance notes per vendor.
- FR-11.3: Link vendor transactions to specific events/projects for cost tracking.

### 6.12 Asset Management
- FR-12.1: Asset register (projectors, laptops, sound systems, banners, training kits) with condition/status.
- FR-12.2: Allocation/check-out tracking of assets to specific events.
- FR-12.3: Alert on asset return overdue or maintenance due.

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Scalability** | Must support multiple companies, hundreds of concurrent projects, and tens of thousands of participant records without performance degradation. |
| **Availability** | Target 99.5% uptime for production environment. |
| **Security** | Role-based access control; encrypted storage of Aadhaar and other PII; secure file storage for documents/certificates. |
| **Compliance** | Aadhaar data handling must comply with applicable Indian data-protection regulations (e.g., masking, restricted access, consent capture). |
| **Auditability** | All critical actions (certificate issuance, budget approval, data edits) shall be logged with user and timestamp. |
| **Usability** | Field staff (PA/Data Entry) often operate with limited connectivity — registration module should support offline-first capture with sync. |
| **Performance** | Dashboard reports should load within 3–5 seconds for standard date ranges. |
| **Localization** | Support for multiple Indian languages in participant-facing screens (future phase, but architecture should not block this). |
| **Browser/Device support** | Responsive web app usable on desktop and mobile browsers; tablet-friendly for field registration. |

## 8. High-Level Data Model (Key Entities)

- **Company** → has many **Projects**
- **Project** → belongs to a **Client**; has many **Events/Batches**; has a **Budget**
- **Event** → belongs to a **Project**; has a **Venue**; has many **Trainers**, **Participants**, **Assets**
- **Participant** → belongs to **Project**, **Event**; has **Documents**, **Assessment Results**, **Certificates**
- **Trainer** → has many **Event Assignments**; has **Ratings**, **Fee Records**
- **Venue** → has many **Booking History** records
- **Vendor** → has many **Transactions** linked to **Events**
- **Asset** → has many **Allocation** records linked to **Events**
- **User** → has a **Role**; belongs to **Company**

*(A detailed Entity-Relationship Diagram should be produced during technical design.)*

## 9. Reporting & Analytics Requirements

- Project-level: target vs. achieved, completion %, timeline adherence.
- City/event-level: attendance %, pass %, cost per participant.
- Trainer-level: utilization, average rating, events delivered.
- Venue-level: utilization, average cost, repeat usage across clients.
- Financial: budget vs. actual, P&L by project, cost-category breakdown.
- Client-facing: simplified summary view + downloadable detailed reports.

## 10. Future Enhancements (Phase 2+)

- AI-based duplicate participant detection and fraud prevention (beyond basic Aadhaar/mobile matching)
- Smart trainer recommendation engine based on skill match, availability, and rating
- Venue recommendation engine using historical cost/capacity/performance data
- Automated CSR impact report generation (narrative + data, suitable for client/board presentation)
- Outcome/impact tracking (e.g., post-training employment or income impact surveys)
- Native mobile apps for trainers and field staff

## 11. Assumptions & Dependencies

- Aadhaar verification will initially be format-based; full API-based verification (e.g., UIDAI-integrated) depends on obtaining necessary licenses/approvals and is treated as a configurable module.
- Internet connectivity at training venues may be intermittent — registration and attendance modules need offline support with later sync.
- Client-facing logins are read-only and scoped strictly to that client's own project data.
- Multi-company structure assumes data isolation between unrelated companies using the platform (if hosted as a shared/multi-tenant service).

## 12. Risks

| Risk | Mitigation |
|---|---|
| PII (Aadhaar) data breach | Encryption at rest/in transit, strict RBAC, audit logs, minimal data retention policy |
| Field connectivity issues affecting data capture | Offline-first design for registration/attendance with later sync |
| Duplicate/fraudulent participant entries inflating reported numbers | Duplicate detection at entry + periodic audit reports |
| Budget overruns going unnoticed until project close | Real-time budget-vs-actual alerts |
| Scope creep across 12 modules in one release | Phased rollout (see Section 13) |

## 13. Suggested Release Phasing

| Phase | Scope |
|---|---|
| **Phase 1 (MVP)** | Company & Project Management, Event & Batch Management, Participant Management, Registration & Attendance, basic Reporting |
| **Phase 2** | Trainer Management, Venue Management, Assessment Management, Certificate Management |
| **Phase 3** | Financial & Budget Management, Vendor Management, Asset Management, Client Portal |
| **Phase 4** | AI-powered features (recommendations, fraud detection, automated impact reporting) |

## 14. Success Metrics

- Reduction in time to generate a client report (target: from days to minutes)
- Reduction in duplicate participant records (target: <1%)
- % of projects with real-time budget visibility (target: 100% by Phase 3)
- Client satisfaction/NPS on reporting transparency
- Reduction in venue/vendor sourcing time for new projects (via historical data reuse)

## 15. Open Questions for Stakeholder Review

1. Should the platform be multi-tenant (one shared instance serving multiple unrelated organizations) or single-tenant (one instance per organization, with "multi-company" meaning multiple client companies within one org)?
2. What is the required scope for Aadhaar verification — format validation only, or full API-based government verification?
3. Should participants have self-service login to download their own certificates, or is certificate distribution handled fully by Ops/Admin?
4. What integrations are required (e.g., SMS/WhatsApp for participant invites, payment gateway for vendor/trainer payouts, accounting software)?
5. What is the expected initial scale (number of concurrent projects, participants per year) to inform infrastructure sizing?

---

*This PRD is intended as a baseline for technical design, UI/UX wireframing, and effort estimation. Sections 5–13 should be reviewed and approved by stakeholders before development begins.*
