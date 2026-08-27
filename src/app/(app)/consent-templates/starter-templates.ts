// Starter consent-form text. Deliberately generic and bracket-flagged where a
// practice needs to fill in its own specifics — practices are expected to
// have these reviewed by their own legal counsel or regulatory college
// before using them with real clients.
export const STARTER_TEMPLATES = [
  {
    slug: "informed_consent",
    title: "Informed Consent to Psychotherapy Treatment",
    body: `Psychotherapy is a collaborative process between you and your therapist aimed at improving your mental health and wellbeing. Treatment may involve discussing sensitive topics, and it is normal for progress to include some discomfort as well as relief.

Your participation in therapy is voluntary. You may decline any technique or exercise, ask questions about your treatment at any time, and end therapy whenever you choose, though we encourage discussing this with your therapist first.

Confidentiality: What you share in session is confidential and will not be disclosed without your written consent, except where required or permitted by law, including:
- If you disclose an intent to seriously harm yourself or another identifiable person
- If there is reasonable suspicion of abuse or neglect of a child
- If disclosure is required by a court order
- If required to coordinate care in a medical emergency

You have the right to access and request corrections to your clinical record, in accordance with Ontario's Personal Health Information Protection Act (PHIPA).

By signing below, you confirm that you have read and understood this information, have had the opportunity to ask questions, and consent to receiving psychotherapy services from this practice.`,
  },
  {
    slug: "ai_notes",
    title: "Consent for AI-Assisted Note-Taking",
    body: `Your therapist may use an AI-assisted note-taking tool to help draft clinical session notes. Here is how it works:

- With your consent, session audio may be used to generate a draft summary of the session (e.g., subjective report, observations, and plan).
- Your therapist reviews, edits, and approves every note before it becomes part of your permanent clinical record — the AI-generated draft is never saved as-is without clinician review.
- [Practice to confirm and describe the specific tool's data handling here: whether audio is retained or discarded after the note is generated, where processing occurs, and whether any data is used to train third-party models.]
- This tool is used solely to support accurate clinical documentation. It is not used for diagnosis or treatment decisions.

Declining this consent will not affect the quality of your care — your therapist will take notes manually instead. You may withdraw this consent at any time, for any single session or going forward, without needing to give a reason.

By signing below, you consent to your therapist's use of AI-assisted note-taking as described above.`,
  },
  {
    slug: "teletherapy",
    title: "Consent to Telehealth / Virtual Sessions",
    body: `Virtual sessions are conducted over a secure video platform. Please review the following before your first virtual appointment:

- You must be physically located in Ontario for the duration of any virtual session, and should provide your therapist with a current address and an emergency contact in case of a crisis during a session.
- Please join sessions from a private space where you will not be overheard, using a stable internet connection. Your therapist will do the same.
- The same confidentiality protections that apply to in-person sessions apply to virtual sessions, though no video platform can guarantee complete technical security — please let your therapist know if you have concerns about your own device or network security.
- Technical difficulties may occasionally interrupt or delay a session; your therapist will confirm a backup plan (e.g., phone call) if the connection fails.

By signing below, you consent to receiving psychotherapy services via telehealth/virtual sessions as described above.`,
  },
  {
    slug: "cancellation_policy",
    title: "Cancellation & Late Arrival Policy",
    body: `We ask for at least [X hours/days] notice if you need to cancel or reschedule an appointment. This allows us to offer the time to another client.

Cancellations made with less than [X hours/days] notice, or missed appointments without notice, may be subject to a fee of [$ amount or % of session fee], which is not covered by insurance and is your responsibility.

If you arrive late, your session will still end at the originally scheduled time so that we can stay on schedule for other clients, and the full session fee will apply.

To cancel or reschedule, please contact us at [phone/email] as early as possible.

By signing below, you acknowledge that you have read and understood this policy.`,
  },
  {
    slug: "privacy_practices",
    title: "Notice of Privacy Practices & Personal Health Information",
    body: `This notice describes how your personal health information (PHI) is collected, used, and protected by this practice, in accordance with Ontario's Personal Health Information Protection Act (PHIPA).

What we collect: contact and demographic information, presenting concerns, session notes, and billing information, collected directly from you and used only to provide assessment, treatment, and related administrative functions (scheduling, billing, insurance receipts).

Who can access it: your clinical record is accessible only to your treating clinician and the administrative staff who need it to manage scheduling and billing (on a minimum-necessary basis — administrative staff do not have access to your session note content).

When we may disclose it without your consent: only where required or permitted by law, such as a risk of serious harm, mandatory reporting obligations, or a court order.

Your rights: you may request access to your record, request corrections, and withdraw consent to future collection or use of your information (which may limit our ability to continue providing care). You may also file a complaint with the Information and Privacy Commissioner of Ontario if you believe your privacy rights have been violated.

We retain clinical records for the period required by our regulatory college and applicable law, after which they are securely destroyed.

By signing below, you acknowledge that you have received and reviewed this notice.`,
  },
];
