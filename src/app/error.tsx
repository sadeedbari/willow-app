"use client";

// Root error boundary -- catches any otherwise-unhandled exception thrown
// while rendering a Server or Client Component anywhere below this segment
// (every route in the app except the root layout itself, which needs
// global-error.tsx instead since it wraps <html>/<body>). Without this,
// an uncaught error anywhere just shows Next's generic, unbranded error
// screen instead of something a real user can recover from.
import { useEffect } from "react";
import { BrandMark } from "@/components/brand-mark";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <BrandMark size={48} />
        </div>
        <h1 className="mt-5 text-[20px] font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-[13.5px] text-text-2">
          This wasn&apos;t supposed to happen. You can try again, or head back to what you were
          doing.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-[13.6px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
