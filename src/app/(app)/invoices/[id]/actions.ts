"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { buildInvoicePdf } from "./pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";
import { stripe } from "@/utils/stripe/server";
import Stripe from "stripe";

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
    .select("status, total_cents, amount_paid_cents")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    redirect(`/invoices/${invoiceId}`);
  }

  const wasAlreadyPaid = invoice.status === "paid";
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

  // Only on the transition into "paid" -- not on a resubmit of an
  // already-paid invoice -- same as the Stripe webhook's own guard against
  // sending the receipt more than once.
  if (isPaidInFull && !wasAlreadyPaid) {
    const built = await buildInvoicePdf(supabase, invoiceId);
    if (built?.clientEmail) {
      await sendInvoiceEmail({
        clientEmail: built.clientEmail,
        clientName: built.clientFullName,
        practiceName: built.practiceName,
        practiceLogoUrl: built.practiceLogoUrl,
        invoiceNumber: built.invoiceNumber,
        invoiceLabel: built.invoiceLabel,
        status: built.status,
        totalCents: built.totalCents,
        balanceCents: built.totalCents - built.amountPaidCents,
        pdfBuffer: built.pdfBuffer,
        paymentToken: built.paymentToken,
      });
    }
  }

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

// Gated on allowCustomInvoiceNumber -- an operator-only flag (not a
// practice-facing setting), today turned on for exactly one practice with
// its own numbering scheme. Every other practice never sees the field
// this action is wired to, but the server action itself also re-checks
// the flag rather than trusting the UI alone.
export async function updateInvoiceLabel(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  if (!staff.allowCustomInvoiceNumber) {
    redirect(`/invoices/${invoiceId}`);
  }

  const invoiceLabel = (formData.get("invoiceLabel") as string)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ invoice_label: invoiceLabel }).eq("id", invoiceId);

  if (error) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

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
    practiceLogoUrl: built.practiceLogoUrl,
    invoiceNumber: built.invoiceNumber,
    invoiceLabel: built.invoiceLabel,
    status: built.status,
    totalCents: built.totalCents,
    balanceCents: built.totalCents - built.amountPaidCents,
    pdfBuffer: built.pdfBuffer,
    paymentToken: built.paymentToken,
  });

  if (!sent) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent("Could not send the email — please try again.")}`);
  }

  redirect(`/invoices/${invoiceId}?resent=1`);
}

// Charges the client's saved card directly (off-session, no client action
// needed). Does NOT mark the invoice paid itself -- exactly like the
// client-facing checkout flow, the stripe-webhook Edge Function's
// payment_intent.succeeded handler is the one source of truth for that,
// reached moments after this redirects.
export async function chargeSavedCard(formData: FormData) {
  const staff = await getCurrentStaff();
  const invoiceId = formData.get("invoiceId") as string;
  requireBillingRole(staff.role, invoiceId);

  const supabase = await createClient();

  const [{ data: invoice }, { data: practice }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, status, total_cents, amount_paid_cents, client_id, clients(stripe_customer_id)")
      .eq("id", invoiceId)
      .single(),
    supabase
      .from("practices")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", staff.practiceId)
      .single(),
  ]);

  if (!invoice) {
    redirect(`/invoices/${invoiceId}`);
  }

  const client = invoice.clients as unknown as { stripe_customer_id: string | null } | null;
  const balanceCents = invoice.total_cents - invoice.amount_paid_cents;

  if (!client?.stripe_customer_id) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent("This client has no card on file")}`);
  }
  if (invoice.status === "void" || balanceCents <= 0) {
    redirect(`/invoices/${invoiceId}`);
  }
  if (!practice?.stripe_connect_account_id || !practice.stripe_connect_charges_enabled) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent("Online payment isn't set up for your practice yet")}`);
  }

  const stripeAccount = practice.stripe_connect_account_id;

  let errorMessage: string | null = null;
  try {
    // Always live-fetch the current saved card rather than trusting a
    // cached payment-method id -- if it was removed or replaced directly in
    // Stripe, this is what notices and self-heals the local cache.
    const paymentMethods = await stripe.paymentMethods.list(
      { customer: client.stripe_customer_id, type: "card" },
      { stripeAccount }
    );
    const paymentMethod = paymentMethods.data[0];

    if (!paymentMethod) {
      // Plain clients-table RLS only allows practice_admin/front_desk to
      // write, but this action also runs for billing_admin -- the RPC
      // carries its own permission check instead (see remove_client_saved_card
      // in the migration), same as the "Remove" button on the client page.
      await supabase.rpc("remove_client_saved_card", { p_client_id: invoice.client_id });
      errorMessage = "No card on file for this client anymore — ask them to pay online to save a new one.";
    } else {
      await stripe.paymentIntents.create(
        {
          amount: balanceCents,
          currency: "cad",
          customer: client.stripe_customer_id,
          payment_method: paymentMethod.id,
          off_session: true,
          confirm: true,
          metadata: { invoice_id: invoiceId },
        },
        { stripeAccount }
      );
    }
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError && err.code === "authentication_required") {
      errorMessage = "This card needs the client to authenticate — send them a payment link instead.";
    } else {
      errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not charge the saved card");
    }
  }

  if (errorMessage) {
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(`/invoices/${invoiceId}?charged=1`);
}
