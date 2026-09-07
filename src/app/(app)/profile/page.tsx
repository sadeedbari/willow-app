import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { updateProfile } from "./actions";
import {
  addAvailabilityBlock,
  removeAvailabilityBlock,
  addAvailabilityOverride,
  removeAvailabilityOverride,
} from "./availability-actions";

const ROLE_LABEL: Record<string, string> = {
  practice_admin: "Practice Admin",
  clinician: "Clinician",
  front_desk: "Front Desk",
  billing_admin: "Billing Admin",
};

const DAY_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("staff")
    .select(
      "full_name, role, credential, license_number, license_province, license_expiry, specialty, bio, phone, email, notify_on_message, created_at"
    )
    .eq("id", staff.id)
    .single();

  if (!profile) return null;

  const { data: availability } = await supabase
    .from("staff_availability")
    .select("id, day_of_week, start_time, end_time")
    .eq("staff_id", staff.id)
    .order("day_of_week")
    .order("start_time");

  const { data: overrides } = await supabase
    .from("staff_availability_overrides")
    .select("id, date, is_unavailable, start_time, end_time")
    .eq("staff_id", staff.id)
    .order("date");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Practitioner Profile
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            How you appear to clients &amp; practice admin
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Profile saved.
        </p>
      )}

      <div className="grid grid-cols-[1fr_1.3fr] items-start gap-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <div className="flex h-21 w-21 items-center justify-center rounded-full bg-gradient-to-br from-brand to-hue-cal text-[26px] font-bold text-white">
              {initialsOf(profile.full_name)}
            </div>
            <div>
              <div className="text-[17px] font-bold text-foreground">{profile.full_name}</div>
              <div className="text-[12.5px] text-text-3">
                {profile.credential ? `${profile.credential} · ` : ""}
                {ROLE_LABEL[staff.role]}
              </div>
            </div>
            <div className="mt-3 w-full space-y-1.5 border-t border-border pt-3 text-left text-[12.5px] text-text-2">
              <div>{staff.practiceName}</div>
              {profile.license_number && (
                <div>
                  License #{profile.license_number}
                  {profile.license_province ? ` (${profile.license_province})` : ""}
                </div>
              )}
              <div>
                With Willow since{" "}
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        <form action={updateProfile} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">Basic info</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Full name</label>
              <input
                name="fullName"
                required
                defaultValue={profile.full_name}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Credential</label>
              <input
                name="credential"
                placeholder="e.g. RP, LMFT"
                defaultValue={profile.credential ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">License #</label>
              <input
                name="licenseNumber"
                defaultValue={profile.license_number ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Province</label>
              <input
                name="licenseProvince"
                placeholder="ON"
                defaultValue={profile.license_province ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">License expiry</label>
              <input
                name="licenseExpiry"
                type="date"
                defaultValue={profile.license_expiry ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Contact phone</label>
              <input
                name="phone"
                defaultValue={profile.phone ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Contact email</label>
              <input
                name="email"
                type="email"
                defaultValue={profile.email ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-3 text-[13px] font-bold text-foreground">Bio &amp; specialties</div>
            <label className="block text-[12px] font-semibold text-text-2">Display bio</label>
            <textarea
              name="bio"
              rows={4}
              placeholder="A short bio clients and colleagues will see…"
              defaultValue={profile.bio ?? ""}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] leading-relaxed outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <label className="mt-3 block text-[12px] font-semibold text-text-2">Specialty</label>
            <input
              name="specialty"
              placeholder="e.g. Anxiety, trauma-informed CBT"
              defaultValue={profile.specialty ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-3 text-[13px] font-bold text-foreground">Notifications</div>
            <label className="flex items-center gap-2 text-[13px] text-text-2">
              <input type="checkbox" name="notifyOnMessage" defaultChecked={profile.notify_on_message} />
              Email me when I get a new secure message
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-1 text-[13px] font-bold text-foreground">Weekly availability</div>
        <p className="mb-4 text-[12.5px] text-text-2">
          Clients can only self-book within these hours on your portal.
        </p>

        {availability?.length ? (
          <ul className="space-y-2 text-[13.4px]">
            {availability.map((block) => (
              <li
                key={block.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="text-foreground">
                  <span className="font-semibold">{DAY_LABEL[block.day_of_week]}</span>{" "}
                  {formatTime(block.start_time)} – {formatTime(block.end_time)}
                </span>
                <form action={removeAvailabilityBlock}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <button type="submit" className="text-[11.5px] font-semibold text-bad">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-border px-3 py-4 text-center text-[13px] text-text-3">
            No availability set — clients won&apos;t be able to self-book until you add hours.
          </p>
        )}

        <form action={addAvailabilityBlock} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Day</label>
            <select
              name="dayOfWeek"
              required
              defaultValue=""
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="" disabled>
                Select a day
              </option>
              {DAY_LABEL.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Start time</label>
            <input
              name="startTime"
              type="time"
              required
              defaultValue="09:00"
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">End time</label>
            <input
              name="endTime"
              type="time"
              required
              defaultValue="17:00"
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Add block
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-1 text-[13px] font-bold text-foreground">Custom dates</div>
        <p className="mb-4 text-[12.5px] text-text-2">
          Override your weekly availability for a specific date — for holidays, vacations, or a day
          with different hours. A custom date always replaces your weekly hours for that day.
        </p>

        {overrides?.length ? (
          <ul className="space-y-2 text-[13.4px]">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="text-foreground">
                  <span className="font-semibold">
                    {new Date(`${o.date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>{" "}
                  {o.is_unavailable
                    ? "— Unavailable"
                    : `— ${formatTime(o.start_time as string)} – ${formatTime(o.end_time as string)}`}
                </span>
                <form action={removeAvailabilityOverride}>
                  <input type="hidden" name="overrideId" value={o.id} />
                  <button type="submit" className="text-[11.5px] font-semibold text-bad">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-border px-3 py-4 text-center text-[13px] text-text-3">
            No custom dates set — your weekly availability applies every day.
          </p>
        )}

        <form
          action={addAvailabilityOverride}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
        >
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Date</label>
            <input
              name="date"
              type="date"
              required
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <label className="peer flex items-center gap-2 pb-2.5 text-[13px] text-text-2">
            <input type="checkbox" name="isUnavailable" defaultChecked />
            Mark as unavailable
          </label>
          <div className="flex gap-3 peer-has-[:checked]:hidden">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Start time</label>
              <input
                name="startTime"
                type="time"
                required
                defaultValue="09:00"
                className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">End time</label>
              <input
                name="endTime"
                type="time"
                required
                defaultValue="17:00"
                className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Add custom date
          </button>
        </form>
      </div>
    </div>
  );
}
