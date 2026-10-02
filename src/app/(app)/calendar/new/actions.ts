"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentConfirmationEmail } from "@/utils/appointment-email";
import { createDailyRoomWithAccessLinks } from "@/utils/daily/create-room";

function dollarsToCents(value: FormDataEntryValue | null) {
  const n = parseFloat((value as string) ?? "");
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function createAppointment(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMinutes = Number(formData.get("duration"));
  const startsAt = new Date(`${date}T${time}`);
  const type = formData.get("type") as string;
  const locationType = formData.get("locationType") as string;
  const clientId = formData.get("clientId") as string;
  const returnTo = (formData.get("returnTo") as string) || "/calendar";
  const reopenHref = (formData.get("reopenHref") as string) || "/calendar/new";

  // A malformed/missing date, time, or duration produces an Invalid Date --
  // toISOString() throws on that rather than returning an error, so this
  // must be caught before it ever reaches the database call.
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || Number.isNaN(startsAt.getTime())) {
    redirect(`${reopenHref}&error=${encodeURIComponent("Please provide a valid date, time, and duration")}`);
  }

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const staffId =
    staff.role === "clinician" ? staff.id : (formData.get("staffId") as string);

  // Every appointment gets a real (draft) invoice line item -- see the
  // create_invoice_and_note_for_appointment() DB trigger -- so it always
  // needs billing info: either a real service code, or a custom
  // description + rate typed directly on the form (service-fields.tsx
  // only renders one of the two at a time via the "Custom line item…"
  // option in the same select).
  const serviceCodeIdRaw = formData.get("serviceCodeId") as string;
  const serviceCodeId = serviceCodeIdRaw && serviceCodeIdRaw !== "custom" ? serviceCodeIdRaw : null;
  const customDescription = !serviceCodeId ? ((formData.get("customDescription") as string)?.trim() || null) : null;
  if (!serviceCodeId && !customDescription) {
    redirect(`${reopenHref}&error=${encodeURIComponent("Select a service or enter a custom line item")}`);
  }
  const customRateCents = !serviceCodeId ? dollarsToCents(formData.get("customRate")) : null;

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      practice_id: staff.practiceId,
      client_id: clientId,
      staff_id: staffId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      type,
      location_type: locationType,
      auto_send_invoice: formData.get("autoSendInvoice") === "on",
      service_code_id: serviceCodeId,
      custom_description: customDescription,
      custom_rate_cents: customRateCents,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(`${reopenHref}&error=${encodeURIComponent(friendlyErrorMessage(error, "Could not create appointment"))}`);
  }

  let videoClientUrl: string | null = null;

  if (locationType === "telehealth") {
    const { data: apiKey } = await supabase.rpc("get_my_practice_daily_api_key");
    const video = await createDailyRoomWithAccessLinks({
      apiKey,
      name: appointment.id,
      endsAt,
    });
    if (video) {
      videoClientUrl = video.clientUrl;
      await supabase
        .from("appointments")
        .update({
          video_room_url: video.roomUrl,
          video_practitioner_url: video.practitionerUrl,
          video_client_url: video.clientUrl,
        })
        .eq("id", appointment.id);
    }
  }

  const [{ data: client }, { data: clinician }] = await Promise.all([
    supabase.from("clients").select("full_name, email").eq("id", clientId).single(),
    supabase.from("staff").select("full_name").eq("id", staffId).single(),
  ]);

  if (client) {
    await sendAppointmentConfirmationEmail({
      clientEmail: client.email,
      clientName: client.full_name,
      staffName: clinician?.full_name ?? null,
      practiceName: staff.practiceName,
      startsAt: startsAt.toISOString(),
      type,
      locationType,
      videoClientUrl,
    });
  }

  redirect(returnTo);
}
