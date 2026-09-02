import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { renderInvoicePdf } from "./InvoicePdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, payment_method, paid_at, notes, practice_id, clients(full_name, email), staff(full_name, credential, license_number, license_province)"
    )
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const [{ data: lineItems }, { data: practice }, { data: location }] = await Promise.all([
    supabase
      .from("invoice_line_items")
      .select("service_date, description, service_code, quantity, unit_amount_cents, amount_cents")
      .eq("invoice_id", id)
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

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="INV-${String(invoice.invoice_number).padStart(4, "0")}.pdf"`,
    },
  });
}
