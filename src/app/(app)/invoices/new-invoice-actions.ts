"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { buildInvoicePdf } from "./[id]/pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";

function dollarsToCents(value: FormDataEntryValue | null) {
  const n = parseFloat((value as string) ?? "");
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function createInvoiceWithLineItems(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin" && staff.role !== "billing_admin") {
    redirect("/invoices");
  }

  const clientId = formData.get("clientId") as string;
  if (!clientId) {
    redirect(`/invoices?new=1&error=${encodeURIComponent("Select a client to create an invoice.")}`);
  }

  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      practice_id: staff.practiceId,
      client_id: clientId,
      issued_by_staff_id: staff.id,
      due_date: (formData.get("dueDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    redirect(`/invoices?new=1&clientId=${clientId}&error=${encodeURIComponent(friendlyErrorMessage(error, "Could not create invoice"))}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: serviceCodes } = await supabase
    .from("service_codes")
    .select("id, code, description, default_rate_cents")
    .eq("active", true);

  const lineItems: {
    invoice_id: string;
    service_date: string;
    description: string;
    service_code: string | null;
    quantity: number;
    unit_amount_cents: number;
  }[] = [];

  for (const sc of serviceCodes ?? []) {
    if (!formData.get(`service_${sc.id}`)) continue;
    const quantity = Number(formData.get(`qty_${sc.id}`)) || 1;
    lineItems.push({
      invoice_id: invoice.id,
      service_date: today,
      description: sc.description,
      service_code: sc.code,
      quantity,
      unit_amount_cents: sc.default_rate_cents,
    });
  }

  const customDescription = (formData.get("customDescription") as string)?.trim();
  if (customDescription) {
    lineItems.push({
      invoice_id: invoice.id,
      service_date: today,
      description: customDescription,
      service_code: null,
      quantity: Number(formData.get("customQuantity")) || 1,
      unit_amount_cents: dollarsToCents(formData.get("customRate")),
    });
  }

  if (lineItems.length) {
    await supabase.from("invoice_line_items").insert(lineItems);
  }

  if (formData.get("intent") !== "send") {
    redirect(`/invoices/${invoice.id}`);
  }

  const { data: client } = await supabase.from("clients").select("email").eq("id", clientId).single();
  if (!client?.email) {
    redirect(
      `/invoices/${invoice.id}?error=${encodeURIComponent("Invoice created, but this client has no email on file — add one to their profile to send it.")}`,
    );
  }

  await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id);

  const built = await buildInvoicePdf(supabase, invoice.id);
  const sent = built
    ? await sendInvoiceEmail({
        clientEmail: built.clientEmail,
        clientName: built.clientFullName,
        practiceName: built.practiceName,
        invoiceNumber: built.invoiceNumber,
        status: built.status,
        totalCents: built.totalCents,
        balanceCents: built.totalCents - built.amountPaidCents,
        pdfBuffer: built.pdfBuffer,
        paymentToken: built.paymentToken,
      })
    : false;

  if (!sent) {
    await supabase.from("invoices").update({ status: "draft" }).eq("id", invoice.id);
    redirect(`/invoices/${invoice.id}?error=${encodeURIComponent("Invoice created, but the email could not be sent — please try again from the invoice page.")}`);
  }

  redirect(`/invoices/${invoice.id}?resent=1`);
}
