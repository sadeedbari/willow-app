export type FaqItem = {
  question: string;
  steps: string[];
  category: string;
};

export const FAQ_CATEGORIES = [
  "Getting Started",
  "Clients",
  "Calendar & Appointments",
  "Session Notes",
  "Forms & Consent",
  "Billing & Invoices",
  "Messages",
  "Staff & Roles",
  "Settings & Integrations",
  "Client Portal",
  "Mobile Access",
  "Account & Security",
] as const;

export const FAQS: FaqItem[] = [
  // Getting Started
  {
    category: "Getting Started",
    question: "How do I add a new client?",
    steps: [
      "Go to Clients in the sidebar.",
      "Click + Add Client.",
      "Fill in their name, contact info, and (if you have more than one clinician) which clinician they're assigned to.",
      "Click Save. You'll land on their new client page.",
    ],
  },
  {
    category: "Getting Started",
    question: "How do I add a staff member?",
    steps: [
      "Go to Settings → Staff.",
      "Click + Invite team member.",
      "Enter their full name, email, and role (Clinician, Front Desk, Billing Admin, or Practice Admin).",
      "Click Send invite — they'll get an email with a link to set their password and join your practice.",
    ],
  },
  {
    category: "Getting Started",
    question: "What do the different staff roles mean?",
    steps: [
      "Practice Admin — full access: manages staff, billing, integrations, and can see everything practice-wide.",
      "Clinician — sees only their own assigned clients, notes, messages, and schedule.",
      "Front Desk — manages clients, appointments, and forms, but can't see clinical session notes.",
      "Billing Admin — manages invoices and billing, without clinical or scheduling access.",
    ],
  },
  {
    category: "Getting Started",
    question: "How do I schedule my first appointment?",
    steps: [
      "Go to Calendar.",
      "Click + New (or New Appointment from the top bar).",
      "Choose the client, date, time, duration, and appointment type.",
      "Choose Telehealth or Office as the location.",
      "Click Schedule. If it's telehealth, a video link is created automatically and emailed to the client.",
    ],
  },

  // Clients
  {
    category: "Clients",
    question: "How do I edit a client's information?",
    steps: [
      "Go to Clients and open the client's page.",
      "Click Edit near their name.",
      "Update their details, including which clinician they're assigned to.",
      "Click Save.",
    ],
  },
  {
    category: "Clients",
    question: "How do I invite a client to the client portal?",
    steps: [
      "Open the client's page.",
      "Make sure they have an email address on file.",
      "Click Invite to client portal.",
      "They'll get an email with a link to set a password and log in at the portal.",
    ],
  },
  {
    category: "Clients",
    question: "A client never got their portal invite email — what do I do?",
    steps: [
      "Open the client's page.",
      "If they already clicked the first invite once, the button now reads Resend portal invite — click it to send a new link.",
      "Ask them to check their spam/junk folder if it still doesn't arrive.",
    ],
  },
  {
    category: "Clients",
    question: "How do I upload a document to a client's file?",
    steps: [
      "Open the client's page and go to the Documents section.",
      "Click Upload document and choose the file.",
      "It's now attached to that client's record for staff with access to view.",
    ],
  },
  {
    category: "Clients",
    question: "Can I see only the clients assigned to me?",
    steps: [
      "If you're a Clinician, your Clients list and dashboard already only show your own assigned caseload automatically.",
      "Practice Admin, Front Desk, and Billing Admin see all clients practice-wide.",
    ],
  },
  {
    category: "Clients",
    question: "Can I turn off appointment reminder emails for one specific client?",
    steps: [
      "Open the client's page and click Edit.",
      "Uncheck Email this client a reminder 24 hours before their appointments, then Save changes.",
      "This only affects that one client — it doesn't change your practice-wide reminder setting, and the client can also control this themselves from their client portal.",
    ],
  },

  // Calendar & Appointments
  {
    category: "Calendar & Appointments",
    question: "How do I set my weekly availability?",
    steps: [
      "Go to Practitioner Profile (My Account in the sidebar).",
      "Under Weekly availability, click Add block for each day/time range you're available.",
      "Clients booking through the portal will only see time slots inside these blocks.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "How do I block off a vacation day or holiday?",
    steps: [
      "Go to Practitioner Profile.",
      "Under Custom dates, add the specific date.",
      "Mark it Unavailable, or set different hours just for that day — it overrides your normal weekly hours.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "How do I get a public booking link for my own website?",
    steps: [
      "Go to Practitioner Profile (My Account in the sidebar).",
      "Set your Weekly availability first, if you haven't already — the link only shows times inside those hours.",
      "Under Public booking link, click Enable to get a link like willow.sulosystems.com/book/your-name.",
      "Copy it onto your own website, email signature, or social profile so new clients can request a time with you directly.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "What happens when someone requests an appointment through my public booking link?",
    steps: [
      "It doesn't book anything automatically — it creates a request for you to review under Requests in the sidebar.",
      "Approving a request creates the client and a real appointment (an 80-minute Intake session, held by telehealth) on your calendar.",
      "Declining a request lets you add an optional reason, which is emailed to the person who requested it.",
      "You can turn off email notifications for new requests under Practitioner Profile → Notifications if you'd rather just check the Requests page.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "How do I rename or turn off my public booking link?",
    steps: [
      "Go to Practitioner Profile → Public booking link.",
      "Edit Link name and click Save link name to change the URL.",
      "Click Disable to take the link offline — your link name is kept, so re-enabling brings back the same URL.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "How do I cancel or reschedule an appointment?",
    steps: [
      "Go to Calendar and click the appointment.",
      "Use Cancel to cancel it, or edit the date/time to reschedule.",
      "The client is notified by email of the change.",
      "This works regardless of your practice's cancellation/reschedule notice window — that window only limits what a client can do themselves from their portal, not staff.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "Do clients get an email reminder before their appointment?",
    steps: [
      "Yes, by default — clients get a reminder email 24 hours before each upcoming appointment.",
      "Your practice can turn this off entirely under Settings → Practice Profile → Notifications.",
      "A client can also turn reminders off just for themselves from the Notifications tab in their client portal, and you can do the same for one specific client from their client page.",
      "The reminder email just says an appointment is coming up — it doesn't mention the session type, to keep it discreet in an inbox or notification preview.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "How does telehealth video calling work?",
    steps: [
      "Set the appointment's location to Telehealth when scheduling.",
      "A unique video room is created automatically for that session.",
      "Both you and the client get a link — yours from the appointment details, theirs by email (or from the client portal).",
      "This requires a Daily.co API key to be connected under Settings → Integrations.",
    ],
  },
  {
    category: "Calendar & Appointments",
    question: "Why does the clinician dropdown show a note when scheduling an appointment?",
    steps: [
      "When you pick a client, the Clinician field defaults to whoever that client is normally assigned to.",
      "If you manually pick a different clinician, a note reminds you who the client is usually seen by — this is just a heads-up, not a block, in case you're covering for a colleague.",
    ],
  },

  // Session Notes
  {
    category: "Session Notes",
    question: "How do I write a session note?",
    steps: [
      "Go to Session Notes and click Write a note, or start one from a client's page.",
      "Fill in the SOAP fields (Subjective, Objective, Assessment, Plan).",
      "Click Save draft to keep working on it later, or Sign to finalize it.",
      "Once signed, a note can't be edited — only addended.",
    ],
  },
  {
    category: "Session Notes",
    question: "Who can see a client's session notes?",
    steps: [
      "Only the assigned clinician (and Practice Admin, for authoring) can see the actual clinical content.",
      "Other roles can see that a note exists and its status (draft/signed), but not its contents — this is intentional, to keep clinical notes minimum-necessary-access.",
    ],
  },
  {
    category: "Session Notes",
    question: "I signed a note by mistake — can I fix it?",
    steps: [
      "Signed notes can't be edited directly.",
      "Open the note and use Add addendum to attach a correction or additional note, timestamped separately from the original.",
    ],
  },

  // Forms & Consent
  {
    category: "Forms & Consent",
    question: "How do I send a consent form to a client?",
    steps: [
      "Open the client's page, go to the Forms/Consent tab.",
      "Choose a template from Send a form and click Send.",
      "The client gets an emailed link to review and sign it electronically — no login required.",
    ],
  },
  {
    category: "Forms & Consent",
    question: "How do I create or edit a form template?",
    steps: [
      "Go to Forms (Practice Admin only).",
      "If you have no templates yet, click Load starter templates for common ones (informed consent, telehealth, cancellation policy, etc.) as a starting point.",
      "Click + New Form to write your own, or click an existing template to edit it.",
      "Review any template with your regulatory college or legal counsel before relying on it.",
    ],
  },
  {
    category: "Forms & Consent",
    question: "How do I check which consent forms are still waiting on a signature?",
    steps: [
      "Go to Forms → Pending Signatures.",
      "You'll see every form sent and awaiting a client's signature, with options to Resend or Cancel request.",
    ],
  },

  // Billing & Invoices
  {
    category: "Billing & Invoices",
    question: "How do I create an invoice for a client?",
    steps: [
      "Open the client's page → Billing tab, and click + New invoice (or go to Billing → + New invoice).",
      "Add line items for the session(s) or service.",
      "Click Save, then Send to email it to the client.",
    ],
  },
  {
    category: "Billing & Invoices",
    question: "Can invoices send automatically?",
    steps: [
      "Yes — check Automatically send invoice at the end of the appointment when scheduling a session.",
      "You can also set this as the default for all new appointments under Settings → Services.",
    ],
  },
  {
    category: "Billing & Invoices",
    question: "Can a client pay their invoice online?",
    steps: [
      "This requires your practice's own Stripe account to be connected first (Settings → Integrations → Connect Stripe).",
      "Once connected, every invoice includes a payment link the client can use to pay by card — money goes directly to your practice's own Stripe account, not through Willow.",
      "You can also open View payment page from an invoice to get that link directly.",
    ],
  },
  {
    category: "Billing & Invoices",
    question: "How do I mark an invoice as paid manually (e.g. cash or e-transfer)?",
    steps: [
      "Open the invoice.",
      "Click Record payment and enter the amount and method.",
      "The invoice's status and balance update automatically.",
    ],
  },

  // Messages
  {
    category: "Messages",
    question: "How do I message a client?",
    steps: [
      "Go to Messages and click + New message (or message them directly from their client page).",
      "Type your message and send — if they have portal access, they'll see it there and get an email notification.",
    ],
  },
  {
    category: "Messages",
    question: "Can clients reply by email instead of logging into the portal?",
    steps: [
      "Yes — when a client replies directly to a message notification email, their reply is automatically routed back into that conversation in Messages.",
    ],
  },

  // Staff & Roles
  {
    category: "Staff & Roles",
    question: "How do I change a staff member's role?",
    steps: [
      "Go to Settings → Staff.",
      "Use the role dropdown on their card and click Save.",
      "You can't change your own role from this page, and the practice's last remaining Practice Admin can't be changed away from that role.",
    ],
  },
  {
    category: "Staff & Roles",
    question: "How do I offboard a staff member who's leaving?",
    steps: [
      "Go to Settings → Staff and click Offboard on their card.",
      "If they have clients assigned to them, choose who to reassign those clients to.",
      "Click Offboard — this deactivates their account (they can no longer log in) but keeps their past appointments, notes, and messages on record.",
      "You can Reactivate them later from the Offboarded section if needed.",
    ],
  },
  {
    category: "Staff & Roles",
    question: "How do I revoke a pending staff invitation?",
    steps: [
      "Go to Settings → Staff.",
      "Under Pending invitations, click Revoke next to the invite you want to cancel.",
    ],
  },

  // Settings & Integrations
  {
    category: "Settings & Integrations",
    question: "How do I update my practice's name, logo, or profile?",
    steps: [
      "Go to Settings → Practice Profile.",
      "Update the details and click Save.",
    ],
  },
  {
    category: "Settings & Integrations",
    question: "How do I set how far in advance clients can cancel or reschedule online?",
    steps: [
      "Go to Settings → Practice Profile → Booking.",
      "Set Cancellation & reschedule notice (hours) to however many hours' notice you require — 24 by default.",
      "Inside that window, a client can no longer cancel or reschedule an appointment themselves from the client portal — they'll see a note asking them to contact your practice directly, and the Cancel/Reschedule options disappear from their Appointments tab.",
      "This never limits what staff can do — you can always cancel or reschedule any appointment from Calendar.",
    ],
  },
  {
    category: "Settings & Integrations",
    question: "How do I set up service codes and pricing?",
    steps: [
      "Go to Settings → Services.",
      "Click Load starter service codes for common ones, or add your own with a rate.",
      "Set a default service code per appointment type so new invoices are pre-filled correctly.",
    ],
  },
  {
    category: "Settings & Integrations",
    question: "How do I connect Stripe so clients can pay online?",
    steps: [
      "Go to Settings → Integrations.",
      "Click Connect Stripe and complete Stripe's onboarding (business details, bank account).",
      "Once it shows Connected · ready to accept payments, invoices will include a working payment link.",
    ],
  },
  {
    category: "Settings & Integrations",
    question: "How do I set up telehealth video calls?",
    steps: [
      "Create a Daily.co account and get an API key from their dashboard.",
      "Go to Settings → Integrations and paste it under Daily.co video account.",
      "Click Save key — telehealth appointments will now get real video links automatically.",
    ],
  },
  {
    category: "Settings & Integrations",
    question: "How do I manage or cancel my Willow subscription?",
    steps: [
      "Go to Settings → Subscription.",
      "Choose Solo ($15.90/month, 1 staff account) or Team ($49/month, up to 6 staff accounts) to start a paid plan.",
      "Once subscribed, click Manage billing to update your card, switch plans, or view past invoices.",
      "Click Cancel subscription to stop auto-renewal — you'll keep access until the end of the current billing period. Resume subscription undoes a scheduled cancellation.",
    ],
  },
  {
    category: "Settings & Integrations",
    question: "How many staff accounts can I have?",
    steps: [
      "The Solo plan ($15.90/month) supports 1 staff account — you.",
      "The Team plan ($49/month) supports up to 6 staff accounts.",
      "Trying to invite past your plan's limit shows a message instead of sending the invite — upgrade to Team from Settings → Subscription, or if you're already on Team and need more than 6, contact Sulo Systems at info@sulosystems.com.",
    ],
  },

  // Client Portal
  {
    category: "Client Portal",
    question: "How does a client book their own appointment?",
    steps: [
      "They log in at the client portal and go to Book Appointment.",
      "The first time, they'll choose a session type (Individual, Couples, Family, or Intake).",
      "They pick an open time slot from their assigned practitioner's real availability (weekly hours, minus any custom dates blocked off).",
      "They'll see a summary of the date, time, and duration and need to click Confirm booking — picking a time doesn't book it immediately.",
      "A returning client can also get here straight from your public booking page — it has a \"Log in to book a return visit\" button that takes them to their portal instead of the new-client request form.",
    ],
  },
  {
    category: "Client Portal",
    question: "Can a client cancel or reschedule their own appointment?",
    steps: [
      "Yes, from their Appointments tab — as long as it's outside your practice's cancellation/reschedule notice window (24 hours by default, set under Settings → Practice Profile → Booking).",
      "Reschedule opens the same kind of time picker as booking, keeping the same session type and duration, and asks them to confirm the new time before it moves.",
      "Once an appointment is inside that notice window, both Cancel and Reschedule disappear from their portal and they're told to contact your practice directly instead.",
    ],
  },
  {
    category: "Client Portal",
    question: "Can clients pay invoices themselves?",
    steps: [
      "Yes, if your practice has Stripe connected (Settings → Integrations).",
      "Clients get a payment link on their invoice emails, or can pay directly from their portal account.",
    ],
  },
  {
    category: "Client Portal",
    question: "Can clients control their own appointment reminder emails?",
    steps: [
      "Yes — from the Notifications tab in their client portal, they can turn off the 24-hour reminder email just for themselves.",
      "This works independently of your practice-wide reminder setting — a client can opt out even if reminders are on for everyone else.",
    ],
  },
  {
    category: "Client Portal",
    question: "What if a client forgets their portal password?",
    steps: [
      "They can click Forgot password? on the client portal login page and follow the emailed reset link.",
    ],
  },

  // Mobile Access
  {
    category: "Mobile Access",
    question: "How do I add Willow to my iPhone or iPad home screen?",
    steps: [
      "Open Safari (this only works in Safari, not Chrome or another browser on iOS) and go to your Willow dashboard, or the client portal if you're a client.",
      "Log in so the shortcut opens straight into your account.",
      "Tap the Share icon in the toolbar — the square with an arrow pointing up.",
      "Scroll down in the share sheet and tap Add to Home Screen.",
      "Tap Add in the top-right corner. A Willow icon now appears on your home screen for quick, one-tap access.",
    ],
  },
  {
    category: "Mobile Access",
    question: "How do I add Willow to my Android home screen?",
    steps: [
      "Open Chrome and go to your Willow dashboard, or the client portal if you're a client.",
      "Log in so the shortcut opens straight into your account.",
      "Tap the three-dot menu in the top-right corner.",
      "Tap Add to Home screen (some versions of Chrome show this as Install app).",
      "Tap Add (or Install) to confirm. A Willow icon now appears on your home screen for quick, one-tap access.",
    ],
  },

  // Account & Security
  {
    category: "Account & Security",
    question: "I forgot my staff login password — how do I reset it?",
    steps: [
      "On the login page, click Forgot password?.",
      "Enter your email and check your inbox for a reset link.",
      "Follow the link to set a new password.",
    ],
  },
  {
    category: "Account & Security",
    question: "How do I change my password while logged in?",
    steps: [
      "Go to Practitioner Profile → Security.",
      "Under Password, enter your current password, then your new password twice.",
      "Click Change password. You'll need your current password to confirm the change, even if you're already logged in.",
    ],
  },
  {
    category: "Account & Security",
    question: "How do I reset my two-factor authenticator (new phone, lost access, etc.)?",
    steps: [
      "Go to Practitioner Profile → Security.",
      "Under Authenticator app, enter your current password and click Disable / Reset.",
      "You'll be asked to set up a new authenticator the next time two-factor authentication is required.",
    ],
  },
  {
    category: "Account & Security",
    question: "How do I switch between light and dark mode?",
    steps: [
      "Click the sun/moon icon in the top-right corner of the app to toggle the appearance.",
    ],
  },
  {
    category: "Account & Security",
    question: "Where can I see practice-wide stats and export reports?",
    steps: [
      "Go to Practice Overview (Practice Admin only) for revenue trends and session mix.",
      "Click Export report to download a CSV for your own records.",
    ],
  },
  {
    category: "Account & Security",
    question: "Is my clients' health information private and secure?",
    steps: [
      "Yes — clinicians only ever see their own assigned clients' clinical content; other roles see only what they need for their job.",
      "See our Privacy Policy for the full details on how data is handled.",
    ],
  },
];
