import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { buildInvoicePdf } from "@/app/(app)/invoices/[id]/pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  auto_invoice_notice_sent_at: string | null;
};

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

  const { data: dueAppointments } = await supabase
    .from("appointments")
    .select("id, practice_id, client_id, staff_id, type, starts_at, ends_at, auto_invoice_notice_sent_at")
    .eq("auto_send_invoice", true)
    .neq("status", "cancelled")
    .lte("ends_at", now.toISOString());

  let invoiced = 0;
  let skippedNoDefault = 0;
  let skippedStale = 0;

  for (const appt of (dueAppointments ?? []) as DueAppointment[]) {
    // Idempotency: a line item already linked to this appointment means a
    // previous run (or a manual invoice) already covered it.
    const { data: existingLineItem } = await supabase
      .from("invoice_line_items")
      .select("id")
      .eq("appointment_id", appt.id)
      .limit(1)
      .maybeSingle();
    if (existingLineItem) continue;

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
        invoiceNumber: built.invoiceNumber,
        status: built.status,
        totalCents: built.totalCents,
        balanceCents: built.totalCents - built.amountPaidCents,
        pdfBuffer: built.pdfBuffer,
        paymentToken: built.paymentToken,
      });
    }
    invoiced++;
  }

  return Response.json({ checked: dueAppointments?.length ?? 0, invoiced, skippedNoDefault, skippedStale });
}
