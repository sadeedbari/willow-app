# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-09-10

## Product Overview
**One-liner:** Practice management software that actually feels good to use — built for therapy practices.
**What it does:** Willow is an all-in-one practice-management platform for psychotherapy practices: scheduling with built-in telehealth, SOAP session notes, consent/intake forms, invoicing with real online payment collection, secure client messaging, and a client-facing portal for self-service booking, messages, forms, and payment. It replaces the spreadsheet/paper/legacy-EHR patchwork many practices run on today.
**Product category:** Practice management software / EHR for mental health & psychotherapy practices (the shelf: "therapy practice management software," "EHR for therapists," "psychotherapy billing software").
**Product type:** Vertical SaaS, multi-tenant web app.
**Business model:** Flat-fee subscription per practice (not per-seat): $49/month CAD, covering 1 practice admin, up to 90 fifty-minute sessions/month, and unlimited clients. 14-day free trial, no credit card required. Additional staff (clinicians, front desk, billing admin) can be invited under the same practice.

## Target Audience
**Target companies:** Independent psychotherapy practices in Ontario, Canada — from solo practitioners to small multi-staff practices (a handful of clinicians plus front-desk/billing support). Not currently targeting large group practices that need per-clinician oversight/analytics dashboards (not built).
**Decision-makers:** The practice owner/lead clinician (often the same person providing therapy, especially at the solo end) — the `practice_admin` role in-app. They evaluate, sign up, and hold the billing relationship.
**Primary use case:** Running the day-to-day business side of a talk-therapy practice — scheduling, clinical documentation, billing, and client communication — without fighting complicated, dated practice-management software.
**Jobs to be done:**
- Consolidate scheduling, telehealth, notes, billing, and client messaging into one tool instead of several duct-taped-together apps.
- Give clients a simple self-service way to book, message, sign forms, and pay — without adding more admin work for the practice.
- Stay confidently compliant with Ontario's PHIPA privacy requirements without becoming a compliance expert.
**Use cases:**
- A solo therapist running 100% of their practice (intake through billing) from one app.
- A small practice (2-5 clinicians) needing shared scheduling and role-based staff access (clinician, front desk, billing admin) without a dedicated IT/ops hire.
- A practice moving off Jane.app or Owl Practice because their bill crept up once they added telehealth, messaging, or booking as separate paid tiers/add-ons.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Practice admin (usually the therapist/owner) | Running the business without it eating into clinical time; predictable costs | Wearing every hat — clinician, biller, scheduler, IT support | One flat price, everything included, modern software that "just works" |
| Clinician (multi-staff practices) | Fast, unobtrusive documentation; not losing session time to admin | Clunky EHR UIs that slow down notes and scheduling | Clean SOAP note flow, calendar that's actually pleasant to use |
| Front desk / billing admin | Clear view of schedule and invoices without clinical access they don't need | Tools that give all-or-nothing access | Role-based access scoped to exactly what they need |
| Client (end user of the portal, not the buyer) | Booking and paying without phone tag or a clunky patient portal | Legacy portals feel like a hospital records system | A simple, modern portal for booking, messages, forms, and payment |

## Problems & Pain Points
**Core problem:** Running a therapy practice's admin side (scheduling, notes, billing, client comms) on software that feels like enterprise EHR — cluttered, dated, and slow to learn — or on a patchwork of disconnected tools (paper/spreadsheets + Zoom + a separate invoicing app).
**Why alternatives fall short:**
- Jane.app and Owl Practice both gate core functionality (telehealth, client portal, secure messaging, unlimited appointments) behind higher-priced tiers or metered add-ons, so the advertised entry price isn't the real price once a practice needs those basics.
- Generic/patchwork setups (calendar app + Zoom + separate invoicing) mean no single source of truth, more admin time, and more room for things to fall through the cracks.
- Legacy EHR-style interfaces are dated and slow to learn, which is friction neither solo therapists nor their clients want.
**What it costs them:** Extra admin hours per week reconciling multiple tools; unpredictable/creeping monthly software costs; a less polished client experience that can undercut a practice's own brand of care.
**Emotional tension:** Anxiety about compliance (PHIPA) and client data handling; frustration at paying more than expected for "basic" features; a sense that the tools they use don't match the calm, considered environment they try to create for clients.

## Competitive Landscape
**Direct:** Jane.app — Canadian-founded (Vancouver Island), serves many allied-health verticals (physio, massage, chiro, counselling), well-known and trusted, but its entry Balance tier ($54 CAD/mo) caps at 20 appointments/month, and unlimited requires the $79/mo Practice tier; AI Scribe, group telehealth, and insurance billing are separate paid add-ons.
**Direct:** Owl Practice — Toronto-based, built specifically for Canadian mental-health professionals, strong brand recognition in Ontario specifically. Its cheap Growth tier ($60 CAD/mo) has no online booking, secure messaging, or telehealth at all; a practice needs its top Professional tier ($100 CAD/mo) to get a feature set comparable to Willow's $49/mo baseline.
**Secondary:** US-centric EHR/practice-management tools (SimplePractice, TheraNest) — same problem, different solution; less Ontario/Canada-specific positioning, potential data-residency friction for PHIPA-conscious buyers.
**Indirect:** Staying on a patchwork of general-purpose tools (Google Calendar, Zoom, a separate invoicing app, paper intake forms) or hiring administrative help instead of adopting practice-management software at all.

## Differentiation
**Key differentiators:**
- One flat price ($49/mo CAD) with scheduling, telehealth, notes, billing, client portal, and secure messaging all included — no tier-gating, no metered add-ons for the basics.
- Modern, minimal, Apple-inspired interface — a deliberate contrast to the cluttered, dated feel of the category's incumbents.
- Data hosted in Canada (`ca-central-1`), relevant to Ontario practices' PHIPA obligations.
- Built specifically around the psychotherapy workflow (SOAP notes, risk-assessment fields, superbills) rather than as one generic template across many allied-health verticals.
**How we do it differently:** Deliberately narrow scope (psychotherapy, Ontario, solo/small practices) instead of trying to serve every allied-health vertical or every practice size from day one — lets the product stay simple instead of accumulating configuration for use cases it doesn't serve.
**Why that's better:** A practice can predict its software cost, doesn't need to become a power user to get value, and isn't paying for (or navigating around) features built for other professions or larger group practices.
**Why customers choose us:** Predictable flat pricing, a genuinely pleasant day-to-day experience, and a client-facing portal clients will actually use.

## Objections
| Objection | Response |
|-----------|----------|
| "I'm already on Jane/Owl — switching sounds like a pain." | 14-day free trial, no credit card required, so there's no risk in seeing your actual week in Willow before deciding anything. |
| "Is my client data PHIPA-compliant / secure?" | Data is hosted in Canada; MFA is required for every staff account; access is role-based and audit-logged. |
| "What if I need insurance claim submission or AI note-taking?" | Honest answer: not built yet. Invoices are client-facing superbills the client self-submits for reimbursement; AI note-taking is on the roadmap, not shipped. Said plainly rather than implied. |
| "Is this just for solo practitioners?" | No — multi-staff practices are supported today (clinician, front desk, billing admin roles, staff invites); what's on hold is a dedicated group-practice analytics/oversight dashboard for larger practices. |

**Anti-persona:** Large group practices needing per-clinician utilization/compliance analytics or multi-location oversight; practices that need direct insurance-claim submission/tracking as a core requirement; practices outside Canada where the PHIPA/Canadian-hosting angle doesn't apply and no equivalent local proof point exists yet.

## Switching Dynamics
**Push:** Existing software feels cluttered/dated; the real monthly cost keeps creeping up as "basic" features (telehealth, portal, messaging) turn out to be gated behind higher tiers or add-ons.
**Pull:** One flat, predictable price with everything included; a noticeably more modern, calmer interface; a Canadian-hosted product built specifically around this profession.
**Habit:** Sunk cost in learning the current tool; client records and history already live there; the practice's own booking links/forms are already shared with existing clients.
**Anxiety:** Fear of losing or mis-migrating client history; uncertainty about whether Willow truly covers everything they currently rely on (especially insurance billing, which it doesn't do yet); general reluctance to touch a system that "already works, mostly."

## Customer Language
**How they describe the problem:** *(No verbatim customer interview data yet — only one pilot practice and no recorded interviews this session. Treat the lines below as working hypotheses to validate with real practices, not confirmed customer language.)*
- "It feels like using hospital records software, not something I'd choose."
- "I'm paying for five different tools that don't talk to each other."
**How they describe us:** *(same caveat — not yet validated)*
- "It's the first practice software that doesn't feel like a chore."
**Words to use:** simple, calm, flat price, everything included, built for therapy practices, Canadian-hosted.
**Words to avoid:** enterprise, robust, feature-rich, all-in-one platform (sounds like more of the same bloat), clinical/cold jargon.
**Glossary:**
| Term | Meaning |
|------|---------|
| Practice admin | The owner/lead role in Willow; manages billing, staff, and settings |
| Client portal | The self-service surface clients use to book, message, sign forms, and pay |
| Superbill | The client-facing invoice/receipt a client can self-submit to their insurer for reimbursement (Willow does not submit claims on the practice's behalf) |

## Brand Voice
**Tone:** Warm, confident, plain-spoken — never clinical or corporate.
**Style:** Direct, benefit-first, short sentences. Example (from the live landing page): *"Most practice software still feels like a filing cabinet. Willow doesn't."*
**Personality:** Calm, considered, human, quietly confident, unpretentious.

## Proof Points
**Metrics:** None public yet — pre-revenue beyond one real pilot practice. Do not fabricate customer counts, ratings, or "trusted by" claims.
**Customers:** Therapy by Niha (real pilot practice; not currently used as a public testimonial/logo).
**Testimonials:** None collected yet.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Flat, predictable pricing | $49/mo CAD covers scheduling, telehealth, notes, billing, portal, and messaging — verified against Jane.app's and Owl Practice's own published pricing pages |
| Modern interface | Live product screenshots used directly on the marketing site (calendar, dashboard, invoice, portal) rather than illustrations |
| Real billing, not a demo | Stripe subscription billing is live in production (verified with a real `cs_live_` checkout) |

## Goals
**Primary business goal:** Convert Ontario solo and small psychotherapy practices into paying subscribers — currently pre-revenue beyond one pilot practice, so the immediate goal is repeatable, real signups.
**Key conversion action:** Start the 14-day free trial at `/signup` (no credit card required).
**Current metrics:** 1 real pilot practice (Therapy by Niha); live production app at willow.sulosystems.com; no other paying customers recorded yet.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-09-10) — Initial context, auto-drafted from PRODUCT.md, this session's competitive research (Jane.app/Owl Practice pricing), and prior session memory.
