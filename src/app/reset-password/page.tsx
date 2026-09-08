import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=confirmation_failed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Set a new password
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            Choose a new password for {user.email}.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={updatePassword} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              New password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Confirm password
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Set new password
          </button>
        </form>
      </div>
    </div>
  );
}
