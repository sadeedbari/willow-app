import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { acceptInvite } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  practice_admin: "Practice Admin",
  clinician: "Clinician",
  front_desk: "Front Desk",
  billing_admin: "Billing Admin",
};

export default async function AcceptInvitePage({
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
    redirect("/login");
  }

  const { data: invitationRow } = await supabase.rpc("get_my_pending_invitation").maybeSingle();
  const invitation = invitationRow as
    | { practice_name: string; role: string; full_name: string }
    | null;

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            No pending invitation
          </h1>
          <p className="mt-2 text-[13.5px] text-text-2">
            We couldn&apos;t find an invitation for {user.email}. Ask your
            practice admin to send you a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Join {invitation.practice_name}
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {invitation.full_name} · {ROLE_LABEL[invitation.role]}
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {error}
          </p>
        )}

        <form action={acceptInvite} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Set a password
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
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Accept & join
          </button>
        </form>
      </div>
    </div>
  );
}
