# Phase & Module Breakdown Document
## CSR & Corporate Training Management ERP

**Version:** 1.0
**Status:** Draft for Sprint Planning
**Companion documents:** CSR_Training_ERP_PRD.md, CSR_Training_ERP_TRD.md
**Date:** June 21, 2026

---

## 1. Purpose

This document breaks each development phase (as defined in the PRD/TRD) into small, independently buildable modules, and each module into granular sub-modules/tickets suitable for sprint planning and effort estimation. Complexity ratings (S/M/L) are indicative and should be re-estimated by the engineering team during sprint planning.

**Complexity legend:** S = ~1–3 days, M = ~4–7 days, L = ~8–14 days (single developer, indicative only)

---

## PHASE 1 — MVP Foundation

**Goal:** Get a usable end-to-end flow live: create a project, run an event, register participants, track attendance, see basic progress — without trainer/venue/asset/financial depth yet.

### Module 1.1 — Platform Foundation & Auth
| Sub-module | Description | Complexity |
|---|---|---|
| 1.1.1 User & Role schema | DB schema for `user`, `role`, permissions mapping | S |
| 1.1.2 Authentication | Login, JWT issue/refresh, logout, password reset | M |
| 1.1.3 RBAC middleware | Central permission check on every API route | M |
| 1.1.4 Company management | CRUD for companies (multi-company support) | S |
| 1.1.5 User management UI | Admin screens to create/edit users, assign roles | M |
| 1.1.6 Audit log infrastructure | `audit_log` table + write hooks on key actions | S |

### Module 1.2 — Company & Project Management
| Sub-module | Description | Complexity |
|---|---|---|
| 1.2.1 Client master | CRUD for client companies (e.g., Havells, Crompton) | S |
| 1.2.2 Project creation | Create project: target, trade category, dates, cities, budget shell | M |
| 1.2.3 Work order/document upload | File upload + storage for work orders/agreements | S |
| 1.2.4 Project status workflow | Draft → Active → On Hold → Completed → Cancelled | S |
| 1.2.5 Project-city sub-targets | City-wise target breakdown under a project | S |
| 1.2.6 Project progress calculation | Real-time trained-vs-target % computation | M |

### Module 1.3 — Event & Batch Management
| Sub-module | Description | Complexity |
|---|---|---|
| 1.3.1 Event/batch CRUD | Create event under project-city with dates, target headcount | M |
| 1.3.2 Manager assignment | Assign Ops Manager to event | S |
| 1.3.3 Event status tracking | Scheduled / In Progress / Completed / Behind Target flags | S |
| 1.3.4 Event calendar view | Calendar UI across projects/cities | M |
| 1.3.5 City/batch target dashboard | Achieved vs. target rollup per city/event | M |

### Module 1.4 — Participant Management (Core)
| Sub-module | Description | Complexity |
|---|---|---|
| 1.4.1 Participant schema | Core fields: name, Aadhaar (encrypted), mobile, address, trade, experience | M |
| 1.4.2 Participant CRUD + linking | Link participant to project/event/manager/trainer | M |
| 1.4.3 PII encryption & masking | Encrypt Aadhaar at rest, mask in UI, unmask permission + audit | M |
| 1.4.4 Duplicate detection (basic) | Match on Aadhaar/mobile at entry time | M |
| 1.4.5 Participant search/filter | Filter by project, city, trade, status | S |

### Module 1.5 — Registration & Attendance (Core)
| Sub-module | Description | Complexity |
|---|---|---|
| 1.5.1 Registration form (online) | Web form for participant capture at events | M |
| 1.5.2 Document upload | Upload ID/photo documents per participant | S |
| 1.5.3 QR-based check-in/out | Generate/scan QR for attendance | M |
| 1.5.4 Offline-first capture (PWA) | Local storage + sync queue for registration/attendance | L |
| 1.5.5 Attendance register export | Export attendance per event (CSV/PDF) | S |

### Module 1.6 — Basic Reporting
| Sub-module | Description | Complexity |
|---|---|---|
| 1.6.1 Project summary dashboard | Target vs. achieved, by project/city/event | M |
| 1.6.2 Attendance report | Per-event attendance summary | S |
| 1.6.3 Export to PDF/Excel | Generic export utility used across reports | M |

**Phase 1 exit criteria:** A project can be created, broken into city/event batches, participants registered and checked in/out (online or offline), and progress viewed on a dashboard.

---

## PHASE 2 — Trainers, Venues, Assessment, Certification

**Goal:** Add the resourcing and outcome-certification layer on top of the Phase 1 foundation.

### Module 2.1 — Trainer Management
| Sub-module | Description | Complexity |
|---|---|---|
| 2.1.1 Trainer master | CRUD: skills, certifications, fee structure | M |
| 2.1.2 Trainer-event assignment | Assign trainer(s) to events, prevent double-booking | M |
| 2.1.3 Trainer availability calendar | View/manage trainer availability | M |
| 2.1.4 Trainer rating & feedback | Post-event rating capture, history view | S |
| 2.1.5 Trainer portal (view-only) | Trainer login: view assigned schedule | M |

### Module 2.2 — Venue Management
| Sub-module | Description | Complexity |
|---|---|---|
| 2.2.1 Venue master | CRUD: address, contact, capacity, facilities, rate card | S |
| 2.2.2 Venue booking log | Record booking per event with cost incurred | S |
| 2.2.3 Venue history surfacing | Show past bookings/cost/capacity when selecting venue for new event | M |
| 2.2.4 Venue search/filter | Filter by city, capacity, prior usage | S |

### Module 2.3 — Assessment Management
| Sub-module | Description | Complexity |
|---|---|---|
| 2.3.1 Question bank | CRUD for MCQ questions per trade/category | M |
| 2.3.2 Assessment definition | Define assessment: pass mark, total marks, linked trade | S |
| 2.3.3 Online assessment UI | Participant-facing or proctor-entry test screen | M |
| 2.3.4 Offline assessment entry | Manual score entry for paper-based tests | S |
| 2.3.5 Auto-scoring engine | Score calculation + pass/fail determination | M |
| 2.3.6 Result repository | Searchable result history per participant/event | S |



**Phase 2 exit criteria:** Trainers and venues are fully manageable with historical reuse; participants can be assessed and automatically certified with verifiable QR codes.

---

## PHASE 3 — Financials, Vendors, Assets, Client Portal

**Goal:** Close the operational loop with cost tracking and give clients real-time visibility.

### Module 3.1 — Financial & Budget Management
| Sub-module | Description | Complexity |
|---|---|---|
| 3.1.1 Budget allocation | Set budget per project, by category | S |
| 3.1.2 Expense entry & approval | Expense capture workflow with approval step | M |
| 3.1.3 Budget-vs-actual tracking | Real-time comparison + overrun alerts | M |
| 3.1.4 P&L computation | Per-project profit/loss (billing vs. actual cost) | M |

### Module 3.2 — Vendor Management
| Sub-module | Description | Complexity |
|---|---|---|
| 3.2.1 Vendor master | CRUD: hotels, caterers, transport, printing, other | S |
| 3.2.2 Vendor transaction log | Link vendor payments to events/projects | S |
| 3.2.3 Vendor pricing history & performance | Historical rate/performance notes | S |

### Module 3.3 — Asset Management
| Sub-module | Description | Complexity |
|---|---|---|
| 3.3.1 Asset register | CRUD: projectors, laptops, sound systems, kits, etc. | S |
| 3.3.2 Asset allocation tracking | Check-out/check-in per event | M |
| 3.3.3 Maintenance/return alerts | Overdue return / maintenance-due notifications | S |

### Module 3.4 — Client Reporting Portal
| Sub-module | Description | Complexity |
|---|---|---|
| 3.4.1 Client login & scoping | Client role with access restricted to own project(s) | M |
| 3.4.2 Client dashboard | Progress, attendance, assessment, certificate summary | M |
| 3.4.3 Photo/document gallery | Event photo/document visibility for client | S |
| 3.4.4 Scheduled report delivery | Automated periodic report email/export | M |

**Phase 3 exit criteria:** Full cost visibility per project, vendor/asset tracking integrated into event execution, and clients can self-serve their own project status.

---

## PHASE 4 — AI-Powered Enhancements

**Goal:** Layer intelligence on top of the now-mature operational dataset. Each module below should start with a deterministic/rules-based baseline before introducing ML, per TRD Section 13.

### Module 4.1 — Advanced Duplicate & Fraud Detection
| Sub-module | Description | Complexity |
|---|---|---|
| 4.1.1 Fuzzy matching engine | Name/DOB/address fuzzy match beyond exact Aadhaar/mobile | M |
| 4.1.2 Review queue UI | Flagged-duplicate review and resolution workflow | M |
| 4.1.3 Fraud pattern alerts | Rule-based anomaly flags (e.g., one trainer signing impossible attendance volumes) | M |

### Module 4.2 — Smart Trainer Recommendations
| Sub-module | Description | Complexity |
|---|---|---|
| 4.2.1 Rules-based scoring | Skill match + distance + rating + cost scoring function | M |
| 4.2.2 Recommendation UI | Suggested trainer list when assigning to an event | S |
| 4.2.3 ML-based refinement (optional) | Model trained on historical assignment/rating data | L |

### Module 4.3 — Venue Recommendations
| Sub-module | Description | Complexity |
|---|---|---|
| 4.3.1 Rules-based scoring | Cost/capacity/history-based venue scoring per new event | M |
| 4.3.2 Recommendation UI | Suggested venue list during event creation | S |

### Module 4.4 — Automated CSR Report Generation
| Sub-module | Description | Complexity |
|---|---|---|
| 4.4.1 Structured data aggregation | Pull existing reporting-table data into a generation pipeline | M |
| 4.4.2 LLM-assisted narrative summary | Generate client-ready narrative report from structured data | M |
| 4.4.3 Review & edit workflow | Human review/edit before client delivery | S |

### Module 4.5 — Impact & Outcome Tracking
| Sub-module | Description | Complexity |
|---|---|---|
| 4.5.1 Post-training survey module | New data collection mechanism (separate scoping needed) | L |
| 4.5.2 Outcome dashboard | Employment/income impact visualization | M |

**Phase 4 exit criteria:** Operational efficiency gains (faster sourcing, fewer duplicates) and richer client-facing impact storytelling, built on the data foundation from Phases 1–3.

---

## 2. Cross-Phase Dependencies

```
Phase 1 (Foundation: Auth, Project, Event, Participant, Attendance, Basic Reporting)
        │
        ▼
Phase 2 (Trainer, Venue, Assessment, Certificate)
   — depends on Event & Participant modules from Phase 1
        │
        ▼
Phase 3 (Financial, Vendor, Asset, Client Portal)
   — Financial depends on Event/Project (1) and Vendor costs feed in;
     Client Portal depends on Reporting (1) + Certificate (2) data
        │
        ▼
Phase 4 (AI Features)
   — depends on a mature dataset from Phases 1–3 (attendance, assessment,
     trainer ratings, venue history, financials)
```

## 3. Suggested Sprint Grouping (indicative, 2-week sprints)

| Sprint | Modules |
|---|---|
| Sprint 1 | 1.1 Platform Foundation & Auth |
| Sprint 2 | 1.2 Company & Project Management |
| Sprint 3 | 1.3 Event & Batch Management |
| Sprint 4 | 1.4 Participant Management |
| Sprint 5–6 | 1.5 Registration & Attendance (incl. offline PWA — largest single module) |
| Sprint 7 | 1.6 Basic Reporting → **Phase 1 release** |
| Sprint 8 | 2.1 Trainer Management |
| Sprint 9 | 2.2 Venue Management |
| Sprint 10 | 2.3 Assessment Management |
| Sprint 11 | 2.4 Certificate Management → **Phase 2 release** |
| Sprint 12 | 3.1 Financial & Budget Management |
| Sprint 13 | 3.2 Vendor Management + 3.3 Asset Management |
| Sprint 14 | 3.4 Client Reporting Portal → **Phase 3 release** |
| Sprint 15+ | Phase 4 modules, prioritized by business value (recommend starting with 4.1 Duplicate/Fraud Detection given compliance value) |

*Sprint count assumes one full-stack developer per module track in parallel where dependencies allow; actual velocity depends on final team size, confirmed during engineering kickoff.*

## 4. Notes for Planning

- Module 1.5 (Registration & Attendance with offline PWA) is the single largest and highest-risk module in Phase 1 — recommend prototyping the offline sync approach early (even before Module 1.4 is fully complete) to de-risk it.
- Certificate Management (2.4) and Assessment Management (2.3) are tightly coupled — plan them in adjacent sprints with the same developer(s) where possible.
- Client Portal (3.4) should not start until Reporting (1.6) and Certificate (2.4) data structures are stable, since it primarily surfaces their data read-only.
- Phase 4 modules are independent of each other and can be parallelized or reprioritized based on business value once Phase 3 ships.

---

*This document should be treated as a living backlog seed — module/sub-module granularity is intended to map roughly to 1–2 sprint tickets each, to be refined by the engineering team during backlog grooming.*
