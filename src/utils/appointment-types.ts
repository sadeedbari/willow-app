// Client self-booking only offers these four types (no "group" -- a client
// can't self-book a group session). Durations here are for rendering the
// slot grid only -- the real enforcement lives in the book_appointment_as_client
// Postgres function, which has its own copy of this same mapping and must be
// kept in sync with it.
export const SELF_BOOKABLE_TYPES = ["individual", "couples", "family", "intake"] as const;
export type SelfBookableType = (typeof SELF_BOOKABLE_TYPES)[number];

export const APPOINTMENT_TYPE_LABEL: Record<SelfBookableType, string> = {
  individual: "Individual therapy",
  couples: "Couples therapy",
  family: "Family therapy",
  intake: "Intake session",
};

export const APPOINTMENT_TYPE_DURATION_MINUTES: Record<SelfBookableType, number> = {
  individual: 50,
  couples: 80,
  family: 80,
  intake: 80,
};
