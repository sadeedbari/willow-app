import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { logout } from "@/app/(app)/actions";
import { startCheckout } from "@/app/(app)/settings/billing/actions";
import { PLANS } from "@/utils/plans";

export default async function TrialExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staffRow } = (await supabase.rpc("get_my_staff_row").maybeSingle()) as {
    data: {
      role: "practice_admin" | "clinician" | "front_desk" | "billing_admin";
      practice_id: string;
      practice_name: string;
      subscription_status: string | null;
      trial_ends_at: string | null;
    } | null;
  };

  if (!staffRow) redirect("/onboarding");

  const trialExpired =
    staffRow.subscription_status === "trialing" &&
    !!staffRow.trial_ends_at &&
    new Date(staffRow.trial_ends_at) < new Date();
  const subscriptionCanceled = staffRow.subscription_status === "canceled";

  // Access restored (they subscribed, or this got fixed some other way) --
  // send them on rather than showing a stale "blocked" screen.
  if (!trialExpired && !subscriptionCanceled) redirect("/dashboard");

  let adminContacts: { full_name: string; email: string | null }[] = [];
  if (staffRow.role !== "practice_admin") {
    const { data } = await supabase
      .from("staff")
      .select("full_name, email")
      .eq("practice_id", staffRow.practice_id)
      .eq("role", "practice_admin")
      .eq("active", true);
    adminContacts = data ?? [];
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            {subscriptionCanceled ? "Subscription ended" : "Your trial has ended"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            {subscriptionCanceled
              ? `${staffRow.practice_name}'s subscription has ended. Your data is safe — subscribe again to pick up right where you left off.`
              : `${staffRow.practice_name}'s 14-day trial is over. Subscribe to keep using Willow.`}
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          {staffRow.role === "practice_admin" ? (
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div>
                    <div className="text-[13.4px] font-semibold text-foreground">
                      Willow {plan.name}
                    </div>
                    <div className="text-[12px] text-text-3">
                      {plan.price}/month CAD · {plan.detail}
                    </div>
                  </div>
                  <form action={startCheckout}>
                    <input type="hidden" name="plan" value={plan.key} />
                    <button
                      type="submit"
                      className="flex-none rounded-lg bg-brand px-3.5 py-2 text-[12.8px] font-semibold text-white transition hover:bg-brand-ink"
                    >
                      Subscribe
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13.4px] text-text-2">
              Only a practice admin can subscribe.{" "}
              {adminContacts.length > 0 ? (
                <>
                  Ask{" "}
                  {adminContacts
                    .map((a) => (a.email ? `${a.full_name} (${a.email})` : a.full_name))
                    .join(" or ")}{" "}
                  to sign in and subscribe to restore access.
                </>
              ) : (
                "Ask your practice admin to sign in and subscribe to restore access."
              )}
            </p>
          )}
        </div>

        <form action={logout} className="mt-6 text-center">
          <button type="submit" className="text-[13px] font-semibold text-text-2 hover:text-foreground">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
