import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { describePromo, isPromoUsable, type PromoCode } from "@/utils/promo";
import { createPromoCode, setPromoCodeActive } from "./actions";

const INPUT =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const LABEL = "block text-[12.5px] font-semibold text-text-2";

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type RedemptionRow = {
  id: string;
  code: string;
  practice_name: string;
  context: string;
  redeemed_at: string;
};

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  await getCurrentStaff();
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) notFound();

  const [{ data: codes }, { data: redemptions }] = await Promise.all([
    supabase
      .from("promo_codes")
      .select(
        "id, code, description, kind, trial_days, percent_off, discount_months, max_redemptions, redeemed_count, expires_at, active",
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("list_promo_redemptions", { p_limit: 25 }),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Promo codes</h1>
        <p className="mt-1 text-[13.5px] text-text-2">
          Give away free trials or checkout discounts. Visible to Willow platform admins only.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {created && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Code <span className="font-mono font-semibold">{created}</span> created. Share it, or send people to{" "}
          <span className="font-mono">/signup?promo={created}</span> to pre-fill it.
        </p>
      )}

      <form action={createPromoCode} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-[15px] font-bold text-foreground">New code</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="code" className={LABEL}>
              Code <span className="font-normal text-text-3">(blank = generate one)</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. LAUNCH6"
              className={`${INPUT} uppercase placeholder:normal-case`}
            />
          </div>
          <div>
            <label htmlFor="kind" className={LABEL}>
              Type
            </label>
            <select id="kind" name="kind" defaultValue="trial_days" className={INPUT}>
              <option value="trial_days">Free trial (no card needed)</option>
              <option value="discount">Checkout discount (at subscribe)</option>
            </select>
          </div>

          <fieldset className="rounded-lg border border-border p-3 sm:col-span-2">
            <legend className="px-1 text-[12px] font-semibold text-text-3">Free trial settings</legend>
            <label htmlFor="trialDays" className={LABEL}>
              Trial length in days (180 is about 6 months)
            </label>
            <input id="trialDays" name="trialDays" type="number" min={1} max={730} defaultValue={180} className={INPUT} />
          </fieldset>

          <fieldset className="rounded-lg border border-border p-3 sm:col-span-2">
            <legend className="px-1 text-[12px] font-semibold text-text-3">Checkout discount settings</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="percentOff" className={LABEL}>
                  Percent off (100 = free)
                </label>
                <input id="percentOff" name="percentOff" type="number" min={1} max={100} defaultValue={100} className={INPUT} />
              </div>
              <div>
                <label htmlFor="discountMonths" className={LABEL}>
                  For how many months
                </label>
                <input id="discountMonths" name="discountMonths" type="number" min={1} max={36} defaultValue={6} className={INPUT} />
              </div>
            </div>
          </fieldset>
          <p className="-mt-2 text-[11.5px] text-text-3 sm:col-span-2">
            Only the settings for the type you chose are used; the other group is ignored.
          </p>

          <div>
            <label htmlFor="maxRedemptions" className={LABEL}>
              Max redemptions <span className="font-normal text-text-3">(blank = unlimited)</span>
            </label>
            <input id="maxRedemptions" name="maxRedemptions" type="number" min={1} className={INPUT} />
          </div>
          <div>
            <label htmlFor="expiresOn" className={LABEL}>
              Last day to use <span className="font-normal text-text-3">(blank = no expiry)</span>
            </label>
            <input id="expiresOn" name="expiresOn" type="date" className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className={LABEL}>
              Note to self <span className="font-normal text-text-3">(optional: who or what it is for)</span>
            </label>
            <input id="description" name="description" type="text" maxLength={200} className={INPUT} />
          </div>
        </div>
        <button
          type="submit"
          className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Create code
        </button>
      </form>

      <h2 className="mb-2 mt-8 text-[15px] font-bold text-foreground">Codes</h2>
      {(codes ?? []).length === 0 ? (
        <p className="text-[13px] text-text-3">No codes yet.</p>
      ) : (
        <ul className="space-y-2">
          {(codes as PromoCode[]).map((c) => {
            const usable = isPromoUsable(c);
            const status = !c.active
              ? "Paused"
              : c.expires_at && new Date(c.expires_at) <= new Date()
                ? "Expired"
                : c.max_redemptions !== null && c.redeemed_count >= c.max_redemptions
                  ? "Used up"
                  : "Active";
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[14px] font-bold text-foreground">{c.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        usable ? "bg-ok-tint text-ok" : "bg-surface-2 text-text-2"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-text-2">{describePromo(c)}</div>
                  <div className="mt-0.5 text-[11.5px] text-text-3">
                    Used {c.redeemed_count}
                    {c.max_redemptions !== null ? ` of ${c.max_redemptions}` : ""}
                    {c.expires_at ? ` · expires ${dateLabel(c.expires_at)}` : ""}
                    {c.description ? ` · ${c.description}` : ""}
                  </div>
                </div>
                <form action={setPromoCodeActive}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                  <button type="submit" className="text-[12.5px] font-semibold text-brand-ink">
                    {c.active ? "Pause" : "Resume"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-2 mt-8 text-[15px] font-bold text-foreground">Recent redemptions</h2>
      {(redemptions ?? []).length === 0 ? (
        <p className="text-[13px] text-text-3">Nothing redeemed yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {(redemptions as RedemptionRow[]).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12.8px]">
              <span className="text-foreground">
                <span className="font-mono font-semibold">{r.code}</span>{" "}
                <span className="text-text-2">to {r.practice_name}</span>
              </span>
              <span className="text-text-3">
                {r.context} · {dateLabel(r.redeemed_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
