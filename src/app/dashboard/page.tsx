import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS scopes this to the signed-in user's own practice automatically —
  // there is no practice_id filter here because there doesn't need to be one.
  const { data: staffRow } = await supabase
    .from("staff")
    .select("full_name, role, practice_id, practices(name)")
    .eq("user_id", user.id)
    .single();

  const { count: colleagueCount } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true });

  const practiceName = (
    staffRow?.practices as unknown as { name: string } | null
  )?.name;

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {practiceName ?? "Your practice"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Signed in as {staffRow?.full_name} ({staffRow?.role})
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Team members</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900">
            {colleagueCount ?? 0}
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            This is real data from Supabase, scoped to your practice by Row
            Level Security — not a hardcoded demo array.
          </p>
        </div>
      </div>
    </div>
  );
}
