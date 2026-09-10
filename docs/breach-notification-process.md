# Willow Data Breach / Security Incident Response Process

**Owner:** Sulo Systems Inc. (operator of Willow)
**Last updated:** September 10, 2026
**Applies to:** any suspected or confirmed security incident affecting Willow or the data it processes.

## 1. Where this fits: custodian vs. processor

Under PHIPA, each **Practice** using Willow is the health information custodian for its own clients' personal health information — it decides what's collected and why, and it holds the legal duty to notify affected individuals and, in the circumstances described below, the Information and Privacy Commissioner of Ontario (IPC).

Sulo Systems is a **service provider / processor**: we operate the infrastructure a Practice's data lives on, but we don't independently notify a Practice's clients or the IPC on a Practice's behalf. Our job in a breach is to:

1. Contain and investigate quickly,
2. Tell the affected Practice(s) everything they need to know, fast, and
3. Help them fulfill their own notification duties (not decide those duties for them).

This document is Sulo Systems' internal runbook for that job. It follows the IPC's own four-step breach-response framework — **Contain, Notify, Investigate, Prevent** — adapted to our role as processor.

A companion, one-paragraph commitment for Practices and their clients lives in the public [Privacy Policy](https://willow.sulosystems.com/privacy) (Section 7, "Data breach notification").

## 2. What counts as an incident

Treat any of the following as a security incident and start this process, even if it turns out afterward to be a false alarm:

- Unauthorized access to the Supabase database, dashboard, or service-role/API keys.
- A misconfigured RLS policy or application bug that exposes one Practice's (or one client's) data to someone not entitled to see it — including cross-practice exposure.
- A compromised staff or admin account (Willow login, Supabase, Vercel, or Resend/Stripe/Daily.co account).
- A lost or stolen device with access to Willow, Supabase, or Vercel.
- A confirmed breach at one of our sub-processors (Supabase, Vercel, Stripe, Resend, Daily.co) that plausibly affected Willow data.
- Any credible report from a Practice, a client, a security researcher, or automated monitoring (e.g., Supabase security advisors) suggesting one of the above.

If in doubt, treat it as an incident. It's much cheaper to stand down after a contained false alarm than to discover a real breach late.

## 3. Step 1 — Contain

Move fast, before anything else:

- **Stop ongoing exposure.** Rotate or revoke the specific credential/key involved (Supabase service-role key, API keys, staff/admin sessions). Supabase keys can be rotated from Project Settings → API; forcing a password/MFA reset for a compromised staff account uses the existing "Reset MFA" / offboard tooling in Settings → Staff.
- **Preserve evidence before cleaning up.** Where possible, capture logs (Supabase logs, Vercel logs, `audit_log` table rows, the relevant `get_advisors` output) before rotating keys or restarting services — you'll need this for the investigation and for what you tell affected Practices.
- **Scope the blast radius fast, even roughly.** Which practice_id(s)? Which tables/rows? Was clinical content (session notes) involved, or only metadata (names, appointment times)? An approximate answer now beats a precise one next week — refine it in Step 5.
- **Don't over-communicate before you have facts.** Contain first; a rushed, wrong notification is worse than a slightly-delayed accurate one. But don't let "getting a perfect answer" delay Step 4 past what's reasonable — see the timing note there.

## 4. Step 2 — Classify severity

Before notifying anyone, work out which of these applies (this also drives whether an affected Practice will have their own mandatory-IPC-reporting duty under O. Reg. 329/04):

- **Confirmed unauthorized use/disclosure or theft of personal health information (PHI).**
- **Repeat/pattern** — similar to a previous incident (same root cause recurring).
- **"Significant" by any other measure** — consider sensitivity of the data (clinical notes vs. an appointment time), number of individuals affected, number of practices affected, whether the exposure was actually viewed/exfiltrated vs. merely technically reachable, and risk of harm to affected clients.
- **Contained technical exposure, no evidence of actual access** — still worth documenting and telling the Practice about, but a materially different conversation than confirmed PHI theft.

Write this down. It's the first thing an affected Practice's own PHIPA counsel will ask about, and it's what the annual IPC statistical report (Section 7) will eventually need.

## 5. Step 3 — Notify affected Practices

**Timing:** PHIPA's own standard for custodian-to-individual notification is "at the first reasonable opportunity" — there's no fixed number of hours in the statute. As an internal target (not a legal deadline, but a discipline for us), aim to send an initial notification to every affected Practice **within 72 hours** of confirming an incident meets the bar in Section 2, even if the investigation isn't finished — a "here's what we know so far, here's what we're doing, more to follow" message beats silence.

**Who to notify:** every Practice whose `practice_id` appears in the affected scope from Step 1/2. If a Practice's own login (a specific staff account) was compromised, notify that Practice's practice_admin(s) specifically.

**How:** email the Practice's registered contact (the `primary_contact_email` on file, plus every `practice_admin` for that practice) from `sulosystems@gmail.com` (or successor security contact). For anything above the "contained, no evidence of access" tier, follow up with a real-time conversation (call or video), not email alone.

**What the notification must cover** (template below):

1. What happened and when it was discovered.
2. What data was involved — be specific about whether clinical content was exposed, not just "client data."
3. What we've done to contain it.
4. What we don't know yet, and when we'll follow up with more.
5. A clear statement that **the Practice, as the health information custodian, is responsible for deciding whether and how to notify its own affected clients and whether this meets the threshold for mandatory IPC reporting under PHIPA s.12(3)** — and that we're available to support that (data for their notification letter, technical detail for an IPC report, etc.).
6. A named contact for follow-up questions.

<details>
<summary>Template: initial notification to a Practice</summary>

```
Subject: [Action needed] Security incident affecting your Willow account — [date]

Hi [Practice contact name],

We're writing to let you know about a security incident affecting your practice's
data in Willow, discovered on [date/time].

What happened: [plain-language description].

What data was involved: [be specific — e.g., "client names, appointment times,
and email addresses for approximately N clients" or "session note content for
N clients" — do not understate].

What we've done: [containment actions already taken].

What we don't know yet: [open questions] — we expect to have more detail by
[date/time] and will follow up then.

Because [Practice name] is the health information custodian for this data under
PHIPA, this incident may trigger your own obligations to notify affected clients
and, in some circumstances, the Information and Privacy Commissioner of Ontario.
We're glad to provide any technical detail, logs, or documentation you need for
that. You can reach us directly at [contact] — we'd also welcome a call to walk
through this together.

[Name], Sulo Systems
```

</details>

## 6. Step 4 — Investigate

- Find and document the root cause — not just "what happened" but "why our safeguards didn't catch it," since that's what Step 8 (Prevent) has to fix.
- Re-run `get_advisors` (security) against the Supabase project as part of this — confirm the specific gap is closed and no related gap exists.
- If a Practice's own compliance process or the IPC opens a formal investigation into an affected Practice, cooperate fully and promptly with reasonable requests for logs, timelines, or technical explanation. We are a witness/data source in that investigation, not the subject of it (the Practice is) — but a slow or incomplete response from us becomes their problem too.
- Keep a written incident record (Section 7) throughout — don't reconstruct this from memory afterward.

## 7. Step 5 — Prevent, and keep a record

- **Fix the root cause**, not just the symptom (e.g., a missing RLS policy gets a policy *and* a check for the same gap on related tables, matching how this session's own session-notes and access-log fixes were verified against every affected page, not just the one that was reported).
- **Update this document** if the incident revealed a gap in the process itself (a notification channel that didn't work, a step that took too long).
- **Log every incident** — including ones that turned out to be false alarms after containment — in an internal incident log with at minimum: date discovered, date contained, practices/clients affected (count, not names, in the log itself), data types involved, root cause, and whether it met the "prescribed circumstances" bar in Section 4. Practices are responsible for their *own* annual statistical report to the IPC (due March 1 for the prior calendar year) — this log is what lets us answer their questions quickly when they're compiling that report, and it's also useful evidence that we take this seriously if we're ever asked.

## 8. Contacts

- **Security/incident contact (external, for Practices and researchers):** `sulosystems@gmail.com`
- **IPC breach reporting (for Practices' own use, not ours):** https://www.ipc.on.ca/en/health-organizations/report-a-privacy-breach
- **Supabase support** (for a suspected platform-level incident): via the Supabase dashboard support channel.

## 9. What this document is not

This is an internal operational runbook, not legal advice, and not a substitute for a Practice's own privacy breach policy or legal counsel. It should be reviewed by a lawyer familiar with Ontario health-privacy law, especially the severity thresholds in Section 4 and the notification-content requirements in Section 5, before being relied on in an actual incident.
