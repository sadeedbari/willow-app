import { createClient } from "@/utils/supabase/server";
import { renderInvoicePdf } from "./InvoicePdf";

export type BuiltInvoicePdf = {
  pdfBuffer: Buffer;
  invoiceNumber: number;
  status: string;
  totalCents: number;
  amountPaidCents: number;
  clientEmail: string | null;
  clientFullName: string;
  practiceName: string;
};

// Shared by the PDF download route and the "Resend invoice" email action so
// both build the exact same document from the exact same data.
export async function buildInvoicePdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string
): Promise<BuiltInvoicePdf | null> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, payment_method, paid_at, notes, practice_id, clients(full_name, email), staff(full_name, credential, license_number, license_province)"
    )
    .eq("id", invoiceId)
    .single();

  if (!invoice) return null;

  const [{ data: lineItems }, { data: practice }, { data: location }] = await Promise.all([
    supabase
      .from("invoice_line_items")
      .select("service_date, description, service_code, quantity, unit_amount_cents, amount_cents")
      .eq("invoice_id", invoiceId)
      .order("service_date"),
    supabase
      .from("practices")
      .select("name, business_number, primary_contact_email, primary_contact_phone, logo_url")
      .eq("id", invoice.practice_id)
      .single(),
    supabase
      .from("practice_locations")
      .select("address")
      .eq("practice_id", invoice.practice_id)
      .limit(1)
      .maybeSingle(),
  ]);

  const client = invoice.clients as unknown as { full_name: string; email: string | null } | null;
  const issuer = invoice.staff as unknown as {
    full_name: string;
    credential: string | null;
    license_number: string | null;
    license_province: string | null;
  } | null;

  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    totalCents: invoice.total_cents,
    amountPaidCents: invoice.amount_paid_cents,
    paymentMethod: invoice.payment_method,
    paidAt: invoice.paid_at,
    notes: invoice.notes,
    practice: {
      name: practice?.name ?? "Practice",
      businessNumber: practice?.business_number ?? null,
      contactEmail: practice?.primary_contact_email ?? null,
      contactPhone: practice?.primary_contact_phone ?? null,
      address: location?.address ?? null,
      logoUrl: practice?.logo_url ?? null,
    },
    client: { fullName: client?.full_name ?? "Unknown client", email: client?.email ?? null },
    issuer: issuer
      ? {
          fullName: issuer.full_name,
          credential: issuer.credential,
          licenseNumber: issuer.license_number,
          licenseProvince: issuer.license_province,
        }
      : null,
    lineItems: (lineItems ?? []).map((li) => ({
      serviceDate: li.service_date,
      description: li.description,
      serviceCode: li.service_code,
      quantity: li.quantity,
      unitAmountCents: li.unit_amount_cents,
      amountCents: li.amount_cents,
    })),
  });

  return {
    pdfBuffer,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    totalCents: invoice.total_cents,
    amountPaidCents: invoice.amount_paid_cents,
    clientEmail: client?.email ?? null,
    clientFullName: client?.full_name ?? "Unknown client",
    practiceName: practice?.name ?? "Practice",
  };
}
