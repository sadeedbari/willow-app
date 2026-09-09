import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { approveBookingRequest, declineBookingRequest } from "./actions";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";

export default async function BookingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; approved?: string; declined?: string }>;
}) {
  const { error, approved, declined } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // A clinician sees their own requests; practice_admin sees every request
  // in the practice (RLS already scopes this the same way).
  const query = supabase
    .from("booking_requests")
    .select("id, full_name, email, phone, message, starts_at, status, staff:staff_id(full_name)")
    .order("starts_at");

  const { data: requests } = staff.role === "clinician" ? await query.eq("staff_id", staff.id) : await query;

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const decided = (requests ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[26px] font-bold tracking-tight text-foreground">Booking Requests</h1>
      <p className="mt-1 text-[13.5px] text-text-2">
        Requests submitted through your public booking link. Approving one creates a real client and
        appointment.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {approved && (
        <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Request approved — appointment added to the calendar.
        </p>
      )}
      {declined && (
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-text-2">Request declined.</p>
      )}

      <div className="mt-6 space-y-3">
        {pending.length ? (
          pending.map((r) => {
            const color = avatarColorFor(r.id);
            const staffName = (r.staff as unknown as { full_name: string } | null)?.full_name;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-bold ${color.bg} ${color.text}`}
                  >
                    {initialsOf(r.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.6px] font-semibold text-foreground">{r.full_name}</div>
                    <div className="text-[12px] text-text-3">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </div>
                    <div className="mt-1 text-[12.5px] text-text-2">
                      {new Date(r.starts_at).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {staff.role !== "clinician" && staffName ? ` · with ${staffName}` : ""}
                    </div>
                    {r.message && <p className="mt-2 text-[12.8px] leading-relaxed text-text-2">&ldquo;{r.message}&rdquo;</p>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <form action={approveBookingRequest.bind(null, r.id)}>
                    <button
                      type="submit"
                      className="rounded-lg bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-ink"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={declineBookingRequest.bind(null, r.id)} className="flex flex-1 items-center gap-2">
                    <input
                      name="reason"
                      placeholder="Decline reason (optional)"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                    <button
                      type="submit"
                      className="flex-none rounded-lg border border-border px-3.5 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            No pending requests.
          </p>
        )}
      </div>

      {decided.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 text-[13px] font-bold text-foreground">Past requests</div>
          <div className="space-y-2">
            {decided.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 opacity-70"
              >
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{r.full_name}</div>
                  <div className="text-[11.5px] text-text-3">
                    {new Date(r.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    r.status === "approved" ? "bg-ok-tint text-ok" : "bg-surface-2 text-text-3"
                  }`}
                >
                  {r.status === "approved" ? "Approved" : "Declined"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
