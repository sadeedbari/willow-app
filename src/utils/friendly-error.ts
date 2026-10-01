// Supabase/PostgREST errors carry raw Postgres text ("duplicate key value
// violates unique constraint...") that isn't fit for a user-facing screen.
// This maps known constraint names/error codes to plain language, falling
// back to a generic message by error class rather than ever showing raw SQL.
type PostgrestLikeError = { code?: string; message?: string } | null | undefined;

const CONSTRAINT_MESSAGES: Record<string, string> = {
  appointments_no_overlap: "That time was just taken by another appointment — please pick a different time.",
  staff_availability_no_dupe: "You already have that exact availability block.",
  "service_codes_practice_id_code_key": "You already have a service code with that CPT code.",
  "consent_form_templates_practice_id_slug_key": "You already have a template with that name.",
  "clients_practice_id_email_key": "A client with this email already exists in your practice.",
  "invoices_practice_id_invoice_label_key": "This invoice ID already exists. Duplicate Invoice IDs are not allowed.",
};

export function friendlyErrorMessage(error: PostgrestLikeError, fallback = "That didn't work — please try again."): string {
  const message = error?.message ?? "";

  for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (message.includes(constraint)) return friendly;
  }

  switch (error?.code) {
    case "23505": // unique_violation
      return "That already exists.";
    case "23P01": // exclusion_violation
      return "That conflicts with an existing record — please try a different time.";
    case "23503": // foreign_key_violation
      return "That record couldn't be found — it may have been removed.";
    case "23502": // not_null_violation
    case "23514": // check_violation
      return "Please check the values you entered and try again.";
    default:
      return message && !/[A-Z_]{3,}\(|violates|constraint|column|relation/i.test(message)
        ? message
        : fallback;
  }
}

// supabase.functions.invoke() throws a FunctionsHttpError on any non-2xx
// response WITHOUT reading its body -- error.message is always the generic
// "Edge Function returned a non-2xx status code", and the edge function's
// actual {error: "..."} JSON is left unread on error.context (the raw
// Response). This reads it so the real message reaches the user.
export async function edgeFunctionErrorMessage(
  error: unknown,
  fallback = "That didn't work — please try again."
): Promise<string> {
  const context = (error as { context?: unknown } | null | undefined)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // Body wasn't JSON -- fall through to fallback.
    }
  }
  return fallback;
}
