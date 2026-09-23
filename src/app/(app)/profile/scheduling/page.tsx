import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import {
  addAvailabilityBlock,
  removeAvailabilityBlock,
  addAvailabilityOverride,
  removeAvailabilityOverride,
} from "../availability-actions";
import { enableBookingLink, disableBookingLink, updateBookingSlug } from "../booking-link-actions";
import { ProfileTabs } from "../tabs";

const DAY_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("staff")
    .select("booking_enabled, booking_slug")
    .eq("id", staff.id)
    .single();

  if (!profile) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Practitioner Profile
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            How you appear to clients &amp; practice admin
          </p>
        </div>
      </div>

      <ProfileTabs active="/profile/scheduling" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Saved.
        </p>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-bold text-foreground">Public booking link</div>
            <p className="mt-1 text-[12.5px] text-text-2">
              Share this link on your own website so new clients can request an intake session —
              nothing is added to your calendar until you approve it.
            </p>
          </div>
          <form action={profile.booking_enabled ? disableBookingLink : enableBookingLink}>
            <button
              type="submit"
              className={`flex-none rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition ${
                profile.booking_enabled
                  ? "border border-border text-text-2 hover:bg-surface-2"
                  : "bg-brand text-white hover:bg-brand-ink"
              }`}
            >
              {profile.booking_enabled ? "Disable" : "Enable"}
            </button>
          </form>
        </div>

        {profile.booking_enabled && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="select-all break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-foreground">
              {siteUrl}/book/{profile.booking_slug}
            </div>
            <form action={updateBookingSlug} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Link name</label>
                <input
                  name="slug"
                  defaultValue={profile.booking_slug ?? ""}
                  className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
              >
                Save link name
              </button>
            </form>
          </div>
        )}
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
