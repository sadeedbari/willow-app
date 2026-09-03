// Short calendar-block label per appointment_type, covering all 5 enum
// values (including "group", which the client-portal self-booking flow
// deliberately excludes). Distinct from appointment-types.ts's
// APPOINTMENT_TYPE_LABEL, which only covers the self-bookable subset with
// longer client-facing phrasing ("Individual therapy") -- that one is a
// different lookup for a different audience, not a duplicate of this one.
export const APPOINTMENT_TYPE_SHORT_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples",
  family: "Family",
  intake: "Intake",
  group: "Group",
};
