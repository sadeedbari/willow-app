import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { SettingsTabs } from "../tabs";
import {
  addServiceCode,
  loadStarterServiceCodes,
  toggleServiceCodeActive,
  toggleAutoSendInvoiceDefault,
  updateDefaultServicesForTypes,
  updateServiceCodeRate,
} from "./actions";
import { APPOINTMENT_TYPE_SHORT_LABEL } from "@/utils/appointment-type-label";

const APPOINTMENT_TYPES = ["individual", "couples", "family", "intake", "group"] as const;

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function ServiceCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const staff = await getCurrentStaff();
  const canEdit = staff.role === "practice_admin";

  const supabase = await createClient();
  const [{ data: codes }, { data: practice }] = await Promise.all([
    supabase
      .from("service_codes")
      .select("id, code, description, default_rate_cents, active, default_for_type")
      .order("active", { ascending: false })
      .order("code"),
    supabase.from("practices").select("auto_send_invoice_default").eq("id", staff.practiceId).single(),
  ]);

  const activeCodes = codes?.filter((c) => c.active) ?? [];
  const defaultForType = new Map(activeCodes.filter((c) => c.default_for_type).map((c) => [c.default_for_type, c.id]));

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Service codes &amp; rates</p>
      </div>

      <SettingsTabs active="/settings/services" />

      {error && (
        <p className="mt-4 mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      <p className="mb-4 text-[12.5px] text-text-2">
        These CPT/service codes and their default rates show up as quick-add buttons when adding line
        items to an invoice.
      </p>

      <div className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[13px] font-bold text-foreground">
              Automatically send invoice at the end of the appointment
            </div>
            <p className="mt-1 text-[12px] text-text-2">
              New appointments will default to this. It can still be overridden per appointment.
            </p>
          </div>
          {canEdit && (
            <form action={toggleAutoSendInvoiceDefault}>
              <input type="hidden" name="nextEnabled" value={(!practice?.auto_send_invoice_default).toString()} />
              <button
                type="submit"
                className={`relative h-6 w-11 flex-none rounded-full transition ${
                  practice?.auto_send_invoice_default ? "bg-brand" : "bg-surface-3"
                }`}
                aria-pressed={!!practice?.auto_send_invoice_default}
                aria-label="Automatically send invoice at the end of the appointment"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    practice?.auto_send_invoice_default ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </form>
          )}
        </div>

        {!!activeCodes.length && (
          <form action={updateDefaultServicesForTypes} className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-[12.5px] font-semibold text-text-2">
              Default service per session type
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {APPOINTMENT_TYPES.map((type) => (
                <div key={type}>
                  <label className="block text-[11px] font-semibold text-text-3">
                    {APPOINTMENT_TYPE_SHORT_LABEL[type]}
                  </label>
                  <select
                    name={`default_${type}`}
                    defaultValue={defaultForType.get(type) ?? ""}
                    disabled={!canEdit}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60"
                  >
                    <option value="">None</option>
                    {activeCodes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.description}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {canEdit && (
              <button
                type="submit"
                className="mt-3 rounded-lg bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Save defaults
              </button>
            )}
          </form>
        )}
      </div>

      {!codes?.length && canEdit && (
        <form action={loadStarterServiceCodes} className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="text-[13px] font-bold text-foreground">Start with common codes</div>
          <p className="mt-1 text-[12.5px] text-text-2">
            Adds diagnostic intake, 45/60-minute individual psychotherapy, and family/couples therapy —
            edit the rates below to match your own fee schedule.
          </p>
          <button
            type="submit"
            className="mt-3 rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-text-2 transition hover:bg-surface-2"
          >
            Load starter codes
          </button>
        </form>
      )}

      <div className="space-y-2">
        {codes?.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl border border-border bg-surface p-4 shadow-sm ${!c.active ? "opacity-60" : ""}`}
          >
            {canEdit ? (
              <form action={updateServiceCodeRate} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="serviceCodeId" value={c.id} />
                <div>
                  <label className="block text-[11px] font-semibold text-text-3">Code</label>
                  <div className="mt-1 text-[13.4px] font-semibold text-foreground">{c.code}</div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-semibold text-text-3">Description</label>
                  <input
                    name="description"
                    required
                    defaultValue={c.description}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-3">Rate ($ CAD)</label>
                  <input
                    name="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={(c.default_rate_cents / 100).toFixed(2)}
                    className="mt-1 w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-ink"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13.4px] font-semibold text-foreground">{c.code}</span>
                  <span className="ml-2 text-[13px] text-text-2">{c.description}</span>
                </div>
                <div className="text-[13.4px] font-semibold text-foreground">
                  {formatMoney(c.default_rate_cents)}
                </div>
              </div>
            )}

            {canEdit && (
              <form action={toggleServiceCodeActive} className="mt-2">
                <input type="hidden" name="serviceCodeId" value={c.id} />
                <input type="hidden" name="nextActive" value={(!c.active).toString()} />
                <button
                  type="submit"
                  className={`text-[11.5px] font-semibold ${c.active ? "text-bad" : "text-ok"}`}
                >
                  {c.active ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            )}
          </div>
        ))}
        {!codes?.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No service codes yet.
          </p>
        )}
      </div>

      {canEdit && (
        <form action={addServiceCode} className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">Add a service code</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Code</label>
              <input
                name="code"
                required
                placeholder="90837"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-text-2">Description</label>
              <input
                name="description"
                required
                placeholder="Individual psychotherapy, 60 min"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[12px] font-semibold text-text-2">Rate ($ CAD)</label>
            <input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="180.00"
              className="mt-1 w-40 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Add service code
          </button>
        </form>
      )}
    </div>
  );
}
