import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { acceptPortalInvite } from "./actions";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/utils/password";

export default async function PortalAcceptInvitePage({
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
    redirect("/portal/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("full_name, practices(name)")
    .eq("portal_user_id", user.id)
    .single();

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            No invitation found
          </h1>
          <p className="mt-2 text-[13.5px] text-text-2">
            We couldn&apos;t find a portal invitation for {user.email}. Please contact your
            practice for a new link.
          </p>
        </div>
      </div>
    );
  }

  const practice = client.practices as unknown as { name: string } | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Welcome, {client.full_name}
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            Set a password to access your {practice?.name ?? "practice"} portal.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {error}
          </p>
        )}

        <form action={acceptPortalInvite} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Set a password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              pattern={PASSWORD_PATTERN}
              title={PASSWORD_REQUIREMENTS_HINT}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-[11.5px] text-text-3">{PASSWORD_REQUIREMENTS_HINT}</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Set password & continue
          </button>
        </form>
      </div>
    </div>
  );
}
