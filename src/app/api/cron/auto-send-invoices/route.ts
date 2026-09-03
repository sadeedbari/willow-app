import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { buildInvoicePdf } from "@/app/(app)/invoices/[id]/pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";

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

  const { data: dueAppointments } = await supabase
    .from("appointments")
    .select("id, practice_id, client_id, staff_id, type, starts_at, ends_at")
    .eq("auto_send_invoice", true)
    .neq("status", "cancelled")
    .lte("ends_at", new Date().toISOString());

  let invoiced = 0;
  let skippedNoDefault = 0;

  for (const appt of dueAppointments ?? []) {
    // Idempotency: a line item already linked to this appointment means a
    // previous run (or a manual invoice) already covered it.
    const { data: existingLineItem } = await supabase
      .from("invoice_line_items")
      .select("id")
      .eq("appointment_id", appt.id)
      .limit(1)
      .maybeSingle();
    if (existingLineItem) continue;

    const { data: serviceCode } = await supabase
      .from("service_codes")
      .select("code, description, default_rate_cents")
      .eq("practice_id", appt.practice_id)
      .eq("default_for_type", appt.type)
      .eq("active", true)
      .maybeSingle();

    if (!serviceCode) {
      skippedNoDefault++;
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
          title: "Could not auto-send an invoice",
          body: `No default service is set for ${appt.type} sessions — set one under Settings → Services.`,
          link: "/settings/services",
        });
      }
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
      });
    }
    invoiced++;
  }

  return Response.json({ checked: dueAppointments?.length ?? 0, invoiced, skippedNoDefault });
}
