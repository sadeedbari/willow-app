import { createClient } from "@/utils/supabase/server";
import { signConsentForm } from "./actions";

export default async function ConsentSigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_consent_form_by_token", { p_token: token });
  const form = data?.[0] as
    | {
        id: string;
        title: string;
        body_snapshot: string;
        status: string;
        client_full_name: string;
        practice_name: string;
        signed_at: string | null;
      }
    | undefined;

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {!form ? (
          <div>
            <h1 className="text-[20px] font-bold text-foreground">Link not found</h1>
            <p className="mt-2 text-[13.5px] text-text-2">
              This consent form link is invalid. Please contact your practice for a new link.
            </p>
          </div>
        ) : form.status === "signed" ? (
          <div>
            <div className="mb-2 inline-flex rounded-full bg-ok-tint px-2.5 py-0.5 text-[11.5px] font-semibold text-ok">
              Signed
            </div>
            <h1 className="text-[20px] font-bold text-foreground">{form.title}</h1>
            <p className="mt-1 text-[13px] text-text-3">{form.practice_name}</p>
            <p className="mt-4 text-[13.5px] text-text-2">
              This form was signed
              {form.signed_at
                ? ` on ${new Date(form.signed_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : ""}
              . No further action is needed.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-[20px] font-bold text-foreground">{form.title}</h1>
            <p className="mt-1 text-[13px] text-text-3">
              {form.practice_name} · Prepared for {form.client_full_name}
            </p>

            {error && (
              <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
                {error}
              </p>
            )}

            <div className="mt-5 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-2 p-4 text-[13.4px] leading-relaxed text-text-2">
              {form.body_snapshot}
            </div>

            <form action={signConsentForm} className="mt-5 space-y-3">
              <input type="hidden" name="token" value={token} />
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">
                  Type your full name to sign
                </label>
                <input
                  name="signerName"
                  required
                  placeholder={form.client_full_name}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <p className="text-[11.5px] text-text-3">
                By typing your name and submitting, you agree to the terms above and this
                constitutes your electronic signature.
              </p>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Sign & submit
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
