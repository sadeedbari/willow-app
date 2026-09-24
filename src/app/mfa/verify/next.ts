// Where to send the user once their MFA challenge clears aal2. Normal login
// (utils/supabase/current-staff.ts) sends them here with no `next` at all and
// expects /dashboard; password recovery is the one other caller, since
// Supabase requires aal2 to update a password when MFA is enabled, and a
// recovery-token verification only ever grants aal1. Validated against an
// allowlist rather than trusted outright, so the param can't be used to
// redirect somewhere off this set.
const ALLOWED = ["/dashboard", "/reset-password", "/portal/reset-password"];

export function resolveMfaNext(next: string | null | undefined) {
  return next && ALLOWED.includes(next) ? next : "/dashboard";
}
