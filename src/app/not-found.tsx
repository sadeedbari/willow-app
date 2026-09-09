import { BrandMark } from "@/components/brand-mark";

// Root not-found boundary -- covers both a URL that matches no route at all,
// and any page that calls next/navigation's notFound() (e.g. a detail page
// given an id that doesn't exist). Replaces Next's generic 404 with
// something on-brand and a way back in.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <BrandMark size={48} />
        </div>
        <h1 className="mt-5 text-[20px] font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-[13.5px] text-text-2">
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>

        <div className="mt-6">
          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
