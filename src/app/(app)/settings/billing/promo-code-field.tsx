// The shared "Promo code" box above the plan cards (used on Settings >
// Subscription and on /trial-expired). It lives inside the plan-picker
// <form action={startCheckout}>, so its value reaches whichever Subscribe
// button is pressed. The Apply button comes first in the form on purpose: it
// is the form's default submit button, so pressing Enter in the box applies
// the code instead of picking a plan.
export function PromoCodeField({
  defaultValue,
  applyAction,
}: {
  defaultValue?: string;
  applyAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <label htmlFor="promoCode" className="block text-[12.5px] font-semibold text-text-2">
        Have a promo code?
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="promoCode"
          name="promoCode"
          type="text"
          defaultValue={(defaultValue ?? "").slice(0, 32)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] uppercase text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          formAction={applyAction}
          className="flex-none rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink"
        >
          Apply
        </button>
      </div>
      <p className="mt-1.5 text-[11.5px] text-text-3">
        Free-trial codes apply right away. A discount code is applied when you click Subscribe on a plan.
      </p>
    </div>
  );
}
