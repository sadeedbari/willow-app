import { createClient } from "@/utils/supabase/server";
import { createPractice } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Set at signup (see src/app/signup/actions.ts) -- already asked once,
  // so this page only asks for the one thing it doesn't have yet.
  const practiceName = (user?.user_metadata?.practice_name as string | undefined) ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Set up your practice
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {practiceName ? (
              <>
                Creating <span className="font-semibold text-neutral-700">{practiceName}</span> — one last step.
              </>
            ) : (
              "One last step before your workspace is ready."
            )}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={createPractice} className="space-y-4">
          {practiceName ? (
            <input type="hidden" name="practiceName" value={practiceName} />
          ) : (
            <div>
              <label htmlFor="practiceName" className="block text-sm font-medium text-neutral-700">
                Practice name
              </label>
              <input
                id="practiceName"
                name="practiceName"
                type="text"
                required
                autoComplete="organization"
                placeholder="e.g. Willow Therapy Collective"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="ownerFullName" className="block text-sm font-medium text-neutral-700">
              Your name
            </label>
            <input
              id="ownerFullName"
              name="ownerFullName"
              type="text"
              required
              placeholder="e.g. Dr. Naomi Osei"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create practice
          </button>
        </form>
      </div>
    </div>
  );
}
