import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { redirect } from "next/navigation";
import { SettingsTabs } from "../tabs";
import { saveEmergencyContact, removeEmergencyContact } from "./actions";
import { PROCEDURE_STEPS, PROCEDURE_DISCLAIMERS, PROCEDURE_VERSION } from "./procedure";

const INPUT =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export default async function EmergencyAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; removed?: string }>;
}) {
  const { error, saved, removed } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("practice_emergency_contacts")
    .select("full_name, email, phone, relationship, agreed_at, procedure_version")
    .eq("practice_id", staff.practiceId)
    .maybeSingle();

  const outdated = !!contact && contact.procedure_version !== PROCEDURE_VERSION;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Practice defaults</p>
      </div>

      <SettingsTabs active="/settings/emergency-access" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Emergency contact saved.</p>
      )}
      {removed && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Emergency contact removed.</p>
      )}

      <div className="mb-5">
        <h2 className="text-[15px] font-bold text-foreground">Emergency access</h2>
        <p className="mt-1 text-[13px] text-text-2">
          As a health information custodian you need someone who can handle your clients&apos; records if you die or
          can&apos;t practise. Name that person here. They get no access to Willow unless the procedure below is
          followed.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-[13.5px] font-bold text-foreground">Procedure</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[12.8px] leading-relaxed text-text-2">
          {PROCEDURE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3 className="mt-4 text-[13.5px] font-bold text-foreground">Terms</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12.8px] leading-relaxed text-text-2">
          {PROCEDURE_DISCLAIMERS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      {contact && (
        <div className="mb-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-[13.5px] font-bold text-foreground">Current emergency contact</h3>
          <dl className="mt-2 space-y-1.5 text-[13.2px]">
            <div className="flex justify-between gap-4">
              <dt className="text-text-3">Name</dt>
              <dd className="text-foreground">{contact.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-3">Relationship</dt>
              <dd className="text-foreground">{contact.relationship}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-3">Email</dt>
              <dd className="text-foreground">{contact.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-3">Phone</dt>
              <dd className="text-foreground">{contact.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-3">Terms agreed</dt>
              <dd className="text-foreground">
                {new Date(contact.agreed_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
          {outdated && (
            <p className="mt-3 rounded-lg bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
              The procedure has been updated since you agreed to it. Re-save below to agree to the current version.
            </p>
          )}
        </div>
      )}

      <form action={saveEmergencyContact} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 text-[13px] font-bold text-foreground">
          {contact ? "Change emergency contact" : "Add emergency contact"}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Full name (as on their ID)</label>
            <input name="fullName" required defaultValue={contact?.full_name ?? ""} className={INPUT} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Relationship to you</label>
            <input
              name="relationship"
              required
              defaultValue={contact?.relationship ?? ""}
              placeholder="e.g. Spouse, colleague, lawyer"
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Email</label>
            <input name="email" type="email" required defaultValue={contact?.email ?? ""} className={INPUT} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Phone</label>
            <input name="phone" type="tel" required defaultValue={contact?.phone ?? ""} className={INPUT} />
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-[13px] text-text-2">
          <input type="checkbox" name="agree" required className="mt-0.5" />
          <span>
            I have read the emergency access procedure and terms above and understand them. By checking this box I
            agree, and I authorize Sulo Systems to grant this person Practice Admin access to my practice&apos;s
            account once the procedure has been followed. I have told this person they are my emergency contact.
          </span>
        </label>

        <div className="mt-4">
          <label className="block text-[12px] font-semibold text-text-2">Your current password</label>
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={`${INPUT} sm:max-w-xs`}
          />
          <p className="mt-1 text-[11.5px] text-text-3">Required to add or change emergency contact details.</p>
        </div>

        <button
          type="submit"
          className="mt-5 rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          {contact ? "Save changes" : "Save emergency contact"}
        </button>
      </form>

      {contact && (
        <form action={removeEmergencyContact} className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-[13px] font-bold text-foreground">Remove emergency contact</div>
          <p className="mt-1 text-[12.5px] text-text-2">
            Without an emergency contact on file, we won&apos;t be able to grant anyone access on your behalf.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Your current password</label>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-56 rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button type="submit" className="pb-2 text-[12.5px] font-semibold text-bad">
              Remove
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
