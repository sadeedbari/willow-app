"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import sharp from "sharp";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function updatePracticeSettings(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings");
  }

  const supabase = await createClient();

  const logo = formData.get("logo");
  let logoUrl: string | undefined;

  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) {
      redirect(`/settings?error=${encodeURIComponent("Logo must be 2 MB or smaller.")}`);
    }
    if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
      redirect(`/settings?error=${encodeURIComponent("Logo must be a PNG, JPEG, WEBP, or SVG image.")}`);
    }

    // Re-encode to a clean, standard PNG regardless of the source format --
    // this normalizes SVGs (which the invoice/consent-form PDF renderer
    // can't display) and strips ICC/gamma metadata that some encoders
    // (e.g. exports from design tools) include and that the PDF renderer's
    // PNG decoder can choke on with a generic "corrupt PNG" error.
    //
    // 300x300 is deliberately small -- the logo is only ever displayed at
    // 40-64px (invoice header, consent page, settings preview). This also
    // doubles as a hard size cap: a 300x300 RGBA bitmap is at most
    // 300*300*4 = 352,800 bytes raw, and PNG compression never expands
    // that, so the stored file mathematically can't exceed ~350 KB
    // regardless of what gets uploaded -- no separate "shrink if still too
    // big" pass is needed.
    let pngBuffer: Buffer;
    try {
      const isVector = logo.type === "image/svg+xml";
      pngBuffer = await sharp(Buffer.from(await logo.arrayBuffer()), isVector ? { density: 300 } : {})
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } catch {
      redirect(`/settings?error=${encodeURIComponent("Could not read that image — please try a different file.")}`);
    }

    const { error: uploadError } = await supabase.storage
      .from("practice-logos")
      .upload(`${staff.practiceId}/logo`, pngBuffer, { upsert: true, contentType: "image/png" });

    if (uploadError) {
      redirect(`/settings?error=${encodeURIComponent(friendlyErrorMessage(uploadError, "Could not upload logo"))}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("practice-logos").getPublicUrl(`${staff.practiceId}/logo`);
    // Cache-bust so the new logo shows immediately instead of a stale cached image at the same URL.
    logoUrl = `${publicUrl}?v=${Date.now()}`;
  }

  const rescheduleNoticeHoursRaw = formData.get("rescheduleNoticeHours") as string;
  const rescheduleNoticeHours = Number.parseInt(rescheduleNoticeHoursRaw, 10);
  if (!Number.isInteger(rescheduleNoticeHours) || rescheduleNoticeHours < 0) {
    redirect(`/settings?error=${encodeURIComponent("Reschedule notice must be a whole number of hours, 0 or more.")}`);
  }

  const { error } = await supabase
    .from("practices")
    .update({
      name: formData.get("name") as string,
      address: (formData.get("address") as string)?.trim() || null,
      business_number: (formData.get("businessNumber") as string) || null,
      primary_contact_email: (formData.get("contactEmail") as string) || null,
      primary_contact_phone: (formData.get("contactPhone") as string) || null,
      appointment_reminders_enabled: formData.get("appointmentRemindersEnabled") === "on",
      reschedule_notice_hours: rescheduleNoticeHours,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .eq("id", staff.practiceId);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  // The profile-completion ring lives in the shared (app) layout, which
  // Next.js otherwise keeps cached across this redirect -- without this the
  // ring would show stale data until an unrelated full page load.
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

export async function removePracticeLogo() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings");
  }

  const supabase = await createClient();
  await supabase.storage.from("practice-logos").remove([`${staff.practiceId}/logo`]);
  await supabase.from("practices").update({ logo_url: null }).eq("id", staff.practiceId);

  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
