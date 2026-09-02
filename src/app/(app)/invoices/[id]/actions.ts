"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { buildInvoicePdf } from "./pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";

function requireBillingRole(role: string, invoiceId: string) {
  if (role !== "practice_admin" && role !== "billing_admin") {
    redirect(`/invoices/${invoiceId}`);
  }
}

function dollarsToCents(value: FormDataEntryValue | null) {
  const n = parseFloat((value as string) ?? "0");
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

export async function addLineItem(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();
  const { error } = await supabase.from("invoice_line_items").insert({
    invoice_id: invoiceId,
    service_date: formData.get("serviceDate") as string,
    description: formData.get("description") as string,
    service_code: (formData.get("serviceCode") as string) || null,
    quantity: Number(formData.get("quantity")) || 1,
    unit_amount_cents: dollarsToCents(formData.get("unitAmount")),
  });

  if (error) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function removeLineItem(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();
  await supabase.from("invoice_line_items").delete().eq("id", formData.get("lineItemId") as string);

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function markSent(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "sent" }).eq("id", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function recordPayment(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total_cents, amount_paid_cents")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    redirect(`/invoices/${invoiceId}`);
  }

  const additionalPaid = dollarsToCents(formData.get("amountPaid"));
  const newAmountPaid = invoice.amount_paid_cents + additionalPaid;
  const isPaidInFull = newAmountPaid >= invoice.total_cents;

  await supabase
    .from("invoices")
    .update({
      amount_paid_cents: newAmountPaid,
      payment_method: formData.get("paymentMethod") as string,
      status: isPaidInFull ? "paid" : "sent",
      paid_at: isPaidInFull ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function voidInvoice(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "void" }).eq("id", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

// Available regardless of invoice status (draft/sent/paid/void) -- unlike
// markSent, this never changes the invoice's own status. It just emails the
// client a copy of the current PDF; a practitioner might resend a receipt
// for a paid invoice, or nudge a client who lost the original email.
export async function resendInvoice(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();
  const built = await buildInvoicePdf(supabase, invoiceId);

  if (!built) {
    redirect(`/invoices/${invoiceId}`);
  }

  if (!built.clientEmail) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent("This client has no email on file — add one to their profile first.")}`);
  }

  const sent = await sendInvoiceEmail({
    clientEmail: built.clientEmail,
    clientName: built.clientFullName,
    practiceName: built.practiceName,
    invoiceNumber: built.invoiceNumber,
    status: built.status,
    totalCents: built.totalCents,
    balanceCents: built.totalCents - built.amountPaidCents,
    pdfBuffer: built.pdfBuffer,
  });

  if (!sent) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent("Could not send the email — please try again.")}`);
  }

  redirect(`/invoices/${invoiceId}?resent=1`);
}
