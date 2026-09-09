// Supabase Auth is configured to require an uppercase letter, lowercase
// letter, number, and symbol in every password (in addition to a minimum
// length) -- these must stay in sync with that dashboard setting so a
// password that looks valid client-side doesn't get rejected server-side.
export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.";

export const PASSWORD_PATTERN = "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}";
