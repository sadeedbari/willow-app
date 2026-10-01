import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { sendAppointmentReminderEmail } from "@/utils/appointment-email";
import { sendPushToStaff } from "@/utils/push/send";

// Triggered on a schedule (pg_cron + pg_net -> HTTP POST here), same pattern
// as /api/cron/auto-send-invoices. Auth is a shared secret rather than a
// user session, since the caller is Postgres, not a browser.
//
// Fires once per appointment, ~24 hours ahead of it: rather than a narrow
// time window (which would miss anything if a run is skipped), this just
// asks "is this appointment now within the next 24 hours, and have we not
// already reminded about it" -- reminder_sent_at is the only guard needed,
// so a late run (or one that starts catching up after downtime) still only
// ever sends once per appointment, just later than ideal instead of not at
// all.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: dueAppointments } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, type, location_type, video_client_url, client_id, staff_id, practice_id, clients(full_name, email, appointment_reminders_enabled), staff(full_name), practices(name, logo_url, appointment_reminders_enabled)"
    )
    .neq("status", "cancelled")
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", in24Hours.toISOString());

  let sent = 0;
  let skipped = 0;

  for (const appt of dueAppointments ?? []) {
    const client = appt.clients as unknown as { full_name: string; email: string | null; appointment_reminders_enabled: boolean } | null;
    const staff = appt.staff as unknown as { full_name: string } | null;
    const practice = appt.practices as unknown as { name: string; logo_url: string | null; appointment_reminders_enabled: boolean } | null;

    // Staff gets reminded regardless of the client-facing email preferences
    // checked below -- those only control whether the *client* gets emailed,
    // and a practitioner's own push reminder is a separate, unconditional
    // feature (never sent to the client portal).
    if (client) {
      await supabase.from("notifications").insert({
        practice_id: appt.practice_id,
        staff_id: appt.staff_id,
        type: "appointment_reminder",
        title: "Upcoming session",
        body: `${client.full_name} in the next 24 hours`,
        link: `/calendar/${appt.id}`,
      });
      await sendPushToStaff(appt.staff_id, {
        title: "Upcoming session",
        body: `${client.full_name} in the next 24 hours`,
        url: `/calendar/${appt.id}`,
      });
    }

    if (!practice?.appointment_reminders_enabled || !client?.appointment_reminders_enabled || !client.email) {
      skipped++;
      // Still marked sent -- "not eligible right now" shouldn't be
      // re-evaluated every 15 minutes until the appointment starts. If a
      // practice or client turns reminders back on later, that's for their
      // *next* appointment, not a resurrected one already inside this window.
      await supabase.from("appointments").update({ reminder_sent_at: now.toISOString() }).eq("id", appt.id);
      continue;
    }

    await sendAppointmentReminderEmail({
      clientEmail: client.email,
      clientName: client.full_name,
      staffName: staff?.full_name ?? null,
      practiceName: practice.name,
      practiceLogoUrl: practice.logo_url,
      startsAt: appt.starts_at,
      type: appt.type,
      locationType: appt.location_type,
      videoClientUrl: appt.video_client_url,
    });

    await supabase.from("appointments").update({ reminder_sent_at: now.toISOString() }).eq("id", appt.id);
    sent++;
  }

  return Response.json({ checked: dueAppointments?.length ?? 0, sent, skipped });
}
