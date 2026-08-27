import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { startCheckout, openBillingPortal } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
};

const STATUS_STYLE: Record<string, string> = {
  trialing: "bg-hue-cal-tint text-hue-cal",
  active: "bg-ok-tint text-ok",
  past_due: "bg-warn-tint text-warn",
  canceled: "bg-surface-2 text-text-2",
  unpaid: "bg-bad-tint text-bad",
  incomplete: "bg-warn-tint text-warn",
  incomplete_expired: "bg-bad-tint text-bad",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { error, checkout } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: practice } = await supabase
    .from("practices")
    .select("subscription_status, stripe_customer_id, current_period_end")
    .eq("id", staff.practiceId)
    .single();

  const status = practice?.subscription_status ?? "trialing";
  const hasSubscription = !!practice?.stripe_customer_id && status !== "trialing";

  return (
    <div className="max-w-lg">
      <h1 className="text-[26px] font-bold tracking-tight text-foreground">
        Billing
      </h1>
      <p className="mt-1 text-[13.5px] text-text-2">
        Your practice&apos;s Willow subscription.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {checkout === "success" && (
        <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Subscription confirmed. Thank you!
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="mt-4 rounded-lg bg-warn-tint px-3 py-2 text-[13px] text-warn">
          Checkout was cancelled — no charge was made.
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-text-2">
              Current plan
            </div>
            <div className="mt-1 text-[17px] font-bold text-foreground">
              Willow Practice Subscription
            </div>
            <div className="text-[13px] text-text-3">$49/month CAD</div>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${STATUS_STYLE[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {practice?.current_period_end && (
          <p className="mt-4 text-[12.5px] text-text-3">
            {status === "canceled" ? "Access ends" : "Renews"}{" "}
            {new Date(practice.current_period_end).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}

        {staff.role === "practice_admin" ? (
          <div className="mt-5">
            {hasSubscription ? (
              <form action={openBillingPortal}>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
                >
                  Manage billing
                </button>
              </form>
            ) : (
              <form action={startCheckout}>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        ) : (
          <p className="mt-5 text-[12.5px] text-text-3">
            Only your practice admin can manage billing.
          </p>
        )}
      </div>
    </div>
  );
}
