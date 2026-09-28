"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentRescheduledEmail, sendAppointmentCancelledEmail } from "@/utils/appointment-email";

type AppointmentEmailRow = {
  type: string;
  location_type: string;
  video_client_url: string | null;
  clients: { full_name: string; email: string | null } | null;
  staff: { full_name: string } | null;
  practices: { name: string } | null;
};

export async function rescheduleAppointment(formData: FormData) {
  const staff = await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
  const returnTo = formData.get("returnTo") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMinutes = Number(formData.get("duration"));
  const startsAt = new Date(`${date}T${time}`);

  // A malformed/missing date, time, or duration produces an Invalid Date --
  // toISOString() throws on that rather than returning an error, so this
  // must be caught before it ever reaches the database call.
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || Number.isNaN(startsAt.getTime())) {
    redirect(`${returnTo}&error=${encodeURIComponent("Please provide a valid date, time, and duration")}`);
  }

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const supabase = await createClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("type, location_type, video_client_url, clients(full_name, email), staff(full_name), practices(name)")
    .eq("id", appointmentId)
    .single<AppointmentEmailRow>();

  const { error } = await supabase
    .from("appointments")
    .update({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
    .eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  if (appt) {
    await sendAppointmentRescheduledEmail({
      clientEmail: appt.clients?.email ?? null,
      clientName: appt.clients?.full_name ?? "there",
      staffName: appt.staff?.full_name ?? null,
      practiceName: appt.practices?.name ?? staff.practiceName,
      startsAt: startsAt.toISOString(),
      type: appt.type,
      locationType: appt.location_type,
      videoClientUrl: appt.video_client_url,
    });
  }

  redirect(returnTo);
}

export async function updateAutoSendInvoice(formData: FormData) {
  await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
  const returnTo = formData.get("returnTo") as string;
  const enabled = formData.get("enabled") === "true";

  const supabase = await createClient();

  const { data: appt } = await supabase.from("appointments").select("ends_at").eq("id", appointmentId).single();
  if (appt && new Date(appt.ends_at) < new Date()) {
    redirect(`${returnTo}&error=${encodeURIComponent("This appointment has already ended — the setting can no longer be changed.")}`);
  }

  const { error } = await supabase.from("appointments").update({ auto_send_invoice: enabled }).eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(returnTo);
}

export async function setAppointmentStatus(formData: FormData) {
  const staff = await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
  const returnTo = formData.get("returnTo") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();

  // Only fetched when the transition is to "cancelled" -- completed/no_show
  // are record-keeping states, not something a client needs an email about.
  const { data: appt } =
    status === "cancelled"
      ? await supabase
          .from("appointments")
          .select("starts_at, type, location_type, video_client_url, clients(full_name, email), staff(full_name), practices(name)")
          .eq("id", appointmentId)
          .single<AppointmentEmailRow & { starts_at: string }>()
      : { data: null };

  const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  if (status === "cancelled" && appt) {
    await sendAppointmentCancelledEmail({
      clientEmail: appt.clients?.email ?? null,
      clientName: appt.clients?.full_name ?? "there",
      staffName: appt.staff?.full_name ?? null,
      practiceName: appt.practices?.name ?? staff.practiceName,
      startsAt: appt.starts_at,
      type: appt.type,
      locationType: appt.location_type,
      videoClientUrl: appt.video_client_url,
    });
  }

  redirect(returnTo);
}
