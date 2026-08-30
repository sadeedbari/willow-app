import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { redirect } from "next/navigation";
import { updatePracticeSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("name, business_number, primary_contact_email, primary_contact_phone")
    .eq("id", staff.practiceId)
    .single();

  if (!practice) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Practice defaults</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Settings saved.
        </p>
      )}

      <form action={updatePracticeSettings} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 text-[13px] font-bold text-foreground">Practice profile</div>
        <div>
          <label className="block text-[12px] font-semibold text-text-2">Practice name</label>
          <input
            name="name"
            required
            defaultValue={practice.name}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="mt-3">
          <label className="block text-[12px] font-semibold text-text-2">Business number</label>
          <input
            name="businessNumber"
            defaultValue={practice.business_number ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Contact email</label>
            <input
              name="contactEmail"
              type="email"
              defaultValue={practice.primary_contact_email ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Contact phone</label>
            <input
              name="contactPhone"
              defaultValue={practice.primary_contact_phone ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-5 rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Save changes
        </button>
      </form>

      <p className="mt-4 text-[12px] text-text-3">
        Per-therapist notification preferences live on your{" "}
        <a href="/profile" className="font-semibold text-brand-ink">
          Therapist Profile
        </a>
        . More practice-wide preferences (appointment reminder emails, consent re-signature policy) are on the roadmap.
      </p>
    </div>
  );
}
