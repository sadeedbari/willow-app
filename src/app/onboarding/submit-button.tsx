"use client";

import { useFormStatus } from "react-dom";

// A plain <button type="submit"> has no built-in protection against a
// second click while the first submission is still in flight -- a Server
// Action doesn't disable it for you. On a page with a real network round
// trip (create the practice, send the admin notification email, redirect),
// that gap is long enough for an impatient real click to fire twice,
// racing two createPractice() calls: the first succeeds, the second hits
// create_practice_with_owner()'s own "already belongs to a practice" guard.
// useFormStatus (only usable from a component rendered inside the <form>)
// disables the button for the rest of that window.
export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create practice"}
    </button>
  );
}
