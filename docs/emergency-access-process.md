# Emergency access process (internal runbook)

Practices are health information custodians under PHIPA. A solo practitioner must have someone who can handle client records if they die or become incapacitated. Willow (Sulo Systems) is the processor, so it only acts on the custodian's written instruction, which the practitioner gives by naming an emergency contact and ticking the agreement box in **Settings → Emergency Access**.

The practitioner-facing wording lives in `src/app/(app)/settings/emergency-access/procedure.ts`. Bump `PROCEDURE_VERSION` when it changes materially.

Data: table `practice_emergency_contacts` (one row per practice; name, email, phone, relationship, `agreed_at`, `procedure_version`). Changes go through the `save_emergency_contact` / `remove_emergency_contact` RPCs, which write `audit_log` rows (`set_/update_/remove_emergency_contact`, no contact details in the log).

## When someone contacts us

Never grant access on an email alone. Do all of these and keep notes.

1. **Look up the practice** and its emergency contact on file. If there is none, stop. We can't act without the custodian's instruction. Refer the requester to the practitioner's estate trustee or regulatory college.
2. **Verify identity.** Government photo ID (video call or certified copy). Name must match `full_name` on file; the contact must also be reachable at the email and phone on file.
3. **Verify the event.** Death certificate, or a physician's letter or power of attorney for incapacity.
4. **Try to reach the practitioner** at the practice contact email and phone (and the owner's login email). Wait up to 3 business days from the first attempt before granting access. Skip the wait only for a death certificate plus matching ID.
5. **Grant access** with the service-role client (the normal invite flow blocks on the Solo staff cap and needs a logged-in admin). Add the contact as `practice_admin`, and write an `audit_log` row for the grant (`emergency_access_granted`, with request date and what evidence was seen, no copies of documents). Deactivate the practitioner's own staff row if they have died.
6. **Tell the new admin** that they act on the practice's behalf, that the custodian's PHIPA duties (client notification, retention, destruction) remain with the practice or its successor, and point them to **Settings → Data Retention** for the full export.
7. Keep the notes (who, when, what was checked) for as long as the practice's audit logs are kept.

## Open items

- Step 5 has no tooling yet; today it is a manual SQL/admin-API task. Write a small script before the first real request.
- Check with the college(s) your customers belong to (CRPO etc.) what they require of a designated successor.
- Never describe this to prospects as "compliant", only as a documented emergency-access process.
