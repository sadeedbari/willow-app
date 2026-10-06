// Bump PROCEDURE_VERSION whenever the wording below changes materially. It's
// stored with each saved emergency contact so we can prove which version of
// the procedure the practice agreed to; existing contacts stay on their old
// version until the practice re-saves.
export const PROCEDURE_VERSION = "2026-10-05";

export const SUPPORT_EMAIL = "info@sulosystems.com";

export const PROCEDURE_STEPS = [
  "You name one emergency contact below. This person is not given any access to Willow now.",
  `If you die or can no longer practise, your emergency contact must contact Sulo Systems (${SUPPORT_EMAIL}) and tell us what has happened.`,
  "We verify their identity with government-issued photo ID and check that their name, email and phone match what you entered here.",
  "We ask for proof of the event: a death certificate, or a letter from a physician or a power of attorney if you are incapacitated.",
  "Before granting access we try to reach you and your practice contact details, and we allow a short waiting period (currently up to 3 business days) in case the request is mistaken or fraudulent.",
  "Once verified, we give your emergency contact Practice Admin access to your Willow account so they can view, export and securely manage your client records. Every step is recorded in your practice's audit log.",
];

export const PROCEDURE_DISCLAIMERS = [
  "Your emergency contact acts on your practice's behalf. Under PHIPA you remain the custodian of your clients' health information, and your estate or successor keeps its legal obligations. Willow is a service provider and does not take on those obligations.",
  "This procedure is a service Sulo Systems provides. It is not legal advice and does not by itself satisfy any requirement set by your regulatory college. Confirm with your college what it requires.",
  "Sulo Systems may refuse or delay access if we can't verify the request to our satisfaction.",
];
