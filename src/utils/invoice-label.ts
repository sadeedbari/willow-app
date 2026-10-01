// Every practice's invoice_number keeps auto-incrementing exactly as
// before (set_invoice_number() in the DB) -- invoice_label is purely an
// optional display override, only ever set by practices with
// allow_custom_invoice_number turned on (an operator-only flag, not a
// practice-facing setting -- see onboarding/page.tsx-era memory for the
// reasoning). Every call site should use this instead of inlining
// `INV-${pad}` so the override is never missed.
export function formatInvoiceLabel(invoiceNumber: number, invoiceLabel?: string | null): string {
  return invoiceLabel?.trim() || `INV-${String(invoiceNumber).padStart(4, "0")}`;
}
