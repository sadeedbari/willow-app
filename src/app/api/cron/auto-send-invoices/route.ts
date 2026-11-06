import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { buildInvoicePdf } from "@/app/(app)/invoices/[id]/pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/utils/stripe/server";
import { chargeSavedCardOffSession } from "@/utils/auto-charge";
import { formatInvoiceLabel } from "@/utils/invoice-label";

// A backlog that couldn't be auto-invoiced (e.g. no default service code
// configured yet) must never surface once the missing setting is fixed --
// a setting change is only ever meant to affect behavior going forward.
// Anything that ended more than this long ago is treated as stale and
// permanently skipped, with a one-time notice for the admin to invoice it
// manually if it still needs billing.
const STALE_HOURS = 24;

type DueAppointment = {
  id: string;
  practice_id: string;
  client_id: string;
  staff_id: string;
  type: string;
  starts_at: string;
  ends_at: string;
  auto_send_invoice: boolean;
  auto_invoice_notice_sent_at: string | null;
};

const APPOINTMENT_COLUMNS =
  "id, practice_id, client_id, staff_id, type, starts_at, ends_at, auto_send_invoice, auto_invoice_notice_sent_at";

type AutoChargeResult = "charged" | "failed" | "skipped";

// Automatic payment for a client who signed the card-on-file authorization:
// charge the saved card for the appointment's invoice the moment the
// appointment has ended. Never throws, and never charges more than once per
// invoice (the attempt is claimed with an atomic update BEFORE any Stripe
// call, and the Stripe request itself is idempotent). "skipped" means nothing
// was attempted (no consent / no card / no Stripe account / already tried);
// "failed" means a charge was attempted and didn't go through.
async function tryAutoCharge(supabase: SupabaseClient, appt: DueAppointment, invoiceId: string): Promise<AutoChargeResult> {
  const { data: client } = await supabase
    .from("clients")
    .select("auto_charge_enabled, auto_charge_consented_at, stripe_customer_id")
    .eq("id", appt.client_id)
    .single();

  if (!client?.auto_charge_enabled || !client.auto_charge_consented_at || !client.stripe_customer_id) return "skipped";
  // Only sessions that ended AFTER the client agreed -- turning this on never
  // reaches back and charges for earlier appointments.
  if (new Date(appt.ends_at) < new Date(client.auto_charge_consented_at)) return "skipped";

  const [{ data: practice }, { data: invoice }] = await Promise.all([
    supabase
      .from("practices")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", appt.practice_id)
      .single(),
    supabase
      .from("invoices")
      .select("status, invoice_number, invoice_label, total_cents, amount_paid_cents, auto_charge_attempted_at, issued_by_staff_id")
      .eq("id", invoiceId)
      .single(),
  ]);

  if (!practice?.stripe_connect_account_id || !practice.stripe_connect_charges_enabled) return "skipped";
  if (!invoice || invoice.status !== "draft" || invoice.auto_charge_attempted_at) return "skipped";

  const balanceCents = invoice.total_cents - invoice.amount_paid_cents;
  if (balanceCents <= 0) return "skipped";

  // Claim the one attempt. If another run got here first, this updates 0 rows.
  const { data: claimed } = await supabase
    .from("invoices")
    .update({ auto_charge_attempted_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .is("auto_charge_attempted_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return "skipped";

  const label = formatInvoiceLabel(invoice.invoice_number, invoice.invoice_label);
  const outcome = await chargeSavedCardOffSession(stripe, {
    stripeAccount: practice.stripe_connect_account_id,
    customerId: client.stripe_customer_id,
    invoiceId,
    amountCents: balanceCents,
    description: `${label} — automatic payment`,
  });

  if (outcome.kind === "charged") {
    await supabase.from("invoices").update({ auto_charge_result: "charged" }).eq("id", invoiceId);
    // The Stripe webhook marks it paid (and emails the receipt). Only move a
    // still-draft invoice to "sent" -- never overwrite "paid" if the webhook
    // already got there first.
    await supabase.from("invoices").update({ status: "sent" }).eq("id", invoiceId).eq("status", "draft");
    return "charged";
  }

  const reason = outcome.kind === "no_card" ? "No card is saved for this client anymore." : outcome.reason;
  await supabase.from("invoices").update({ auto_charge_result: `failed: ${reason}` }).eq("id", invoiceId);
  await supabase.from("notifications").insert({
    practice_id: appt.practice_id,
    staff_id: invoice.issued_by_staff_id ?? appt.staff_id,
    type: "payment_failed",
    title: "Automatic payment didn't go through",
    body: `${label}: ${reason}`,
    link: `/invoices/${invoiceId}`,
  });
  return "failed";
}

// Fires an admin notification for this appointment at most once -- without
// this, an unresolved condition (missing service code, a stale backlog)
// re-notified on every 5-minute cron tick forever, flooding the practice's
// notifications with duplicates of the same message.
async function notifyOnce(
  supabase: SupabaseClient,
  appt: DueAppointment,
  title: string,
  body: string,
  link: string
) {
  if (appt.auto_invoice_notice_sent_at) return;

  const { data: admin } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", appt.practice_id)
    .eq("role", "practice_admin")
    .limit(1)
    .maybeSingle();

  if (admin) {
    await supabase.from("notifications").insert({
      practice_id: appt.practice_id,
      staff_id: admin.id,
      type: "auto_invoice_failed",
      title,
      body,
      link,
    });
  }

  await supabase
    .from("appointments")
    .update({ auto_invoice_notice_sent_at: new Date().toISOString() })
    .eq("id", appt.id);
}

// Triggered on a schedule (pg_cron + pg_net -> HTTP POST here) rather than by
// any user action -- there is no click that corresponds to "an appointment's
// scheduled end time has passed." Auth is a shared secret rather than a user
// session, since the caller is Postgres, not a browser.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_HOURS * 60 * 60 * 1000);

  const { data: autoSendAppointments } = await supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("auto_send_invoice", true)
    .neq("status", "cancelled")
    .lte("ends_at", now.toISOString());

  // Appointments for clients with automatic payment on, even when the
  // appointment itself isn't set to auto-send its invoice. Recently ended
  // only: this never sweeps up old sessions.
  const { data: autoChargeAppointments } = await supabase
    .from("appointments")
    .select(`${APPOINTMENT_COLUMNS}, clients!inner(auto_charge_enabled)`)
    .eq("clients.auto_charge_enabled", true)
    .neq("status", "cancelled")
    .lte("ends_at", now.toISOString())
    .gte("ends_at", staleCutoff.toISOString());

  const dueById = new Map<string, DueAppointment>();
  for (const a of [...(autoSendAppointments ?? []), ...(autoChargeAppointments ?? [])] as DueAppointment[]) {
    dueById.set(a.id, a);
  }
  const dueAppointments = [...dueById.values()];

  let invoiced = 0;
  let autoCharged = 0;
  let autoChargeFailed = 0;
  let skippedNoDefault = 0;
  let skippedStale = 0;

  for (const appt of (dueAppointments ?? []) as DueAppointment[]) {
    // Every appointment now gets a draft invoice at booking time (see the
    // create_invoice_and_note_for_appointment() DB trigger) -- this cron's
    // job has narrowed to just sending it once the appointment's end time
    // has passed. A line item already linked to this appointment means
    // that already happened; finish the send rather than skip entirely,
    // unless it's already past draft (sent/paid/void -- nothing to do).
    const { data: existingLineItem } = await supabase
      .from("invoice_line_items")
      .select("id, invoice_id, invoices(status)")
      .eq("appointment_id", appt.id)
      .limit(1)
      .maybeSingle();

    if (existingLineItem) {
      const invoiceStatus = (existingLineItem.invoices as unknown as { status: string } | null)?.status;
      if (invoiceStatus !== "draft") continue;

      // Clients on automatic payment are charged first; the paid receipt is
      // emailed by the Stripe webhook, so there's no separate invoice email.
      const autoResult = await tryAutoCharge(supabase, appt, existingLineItem.invoice_id);
      if (autoResult === "charged") {
        autoCharged++;
        continue;
      }
      if (autoResult === "failed") autoChargeFailed++;

      // Not charged (no card yet, or the charge didn't go through): fall back
      // to the normal invoice email -- but only where this appointment was set
      // to auto-send; otherwise leave the draft for the practice.
      if (!appt.auto_send_invoice) continue;

      const built = await buildInvoicePdf(supabase, existingLineItem.invoice_id);
      if (built?.clientEmail) {
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
        if (sent) {
          await supabase.from("invoices").update({ status: "sent" }).eq("id", existingLineItem.invoice_id);
          invoiced++;
        }
      }
      continue;
    }

    // Everything below is the pre-existing fallback for an appointment
    // created before the trigger above existed (so it never got a line
    // item at booking time) -- unchanged so old backlogs keep working.
    if (new Date(appt.ends_at) < staleCutoff) {
      skippedStale++;
      await notifyOnce(
        supabase,
        appt,
        "Skipped auto-invoicing an old appointment",
        `An appointment from ${appt.starts_at.slice(0, 10)} is too old to auto-invoice now — create the invoice manually from the client's page if it still needs billing.`,
        `/calendar/${appt.id}`
      );
      continue;
    }

    const { data: serviceCode } = await supabase
      .from("service_codes")
      .select("code, description, default_rate_cents")
      .eq("practice_id", appt.practice_id)
      .eq("default_for_type", appt.type)
      .eq("active", true)
      .maybeSingle();

    if (!serviceCode) {
      skippedNoDefault++;
      await notifyOnce(
        supabase,
        appt,
        "Could not auto-send an invoice",
        `No default service is set for ${appt.type} sessions — set one under Settings → Services.`,
        "/settings/services"
      );
      continue;
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        practice_id: appt.practice_id,
        client_id: appt.client_id,
        issued_by_staff_id: appt.staff_id,
        status: "sent",
      })
      .select("id")
      .single();
    if (!invoice) continue;

    await supabase.from("invoice_line_items").insert({
      invoice_id: invoice.id,
      appointment_id: appt.id,
      service_date: appt.starts_at.slice(0, 10),
      description: serviceCode.description,
      service_code: serviceCode.code,
      quantity: 1,
      unit_amount_cents: serviceCode.default_rate_cents,
    });

    const built = await buildInvoicePdf(supabase, invoice.id);
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
    invoiced++;
  }

  return Response.json({ checked: dueAppointments.length, invoiced, autoCharged, autoChargeFailed, skippedNoDefault, skippedStale });
}
