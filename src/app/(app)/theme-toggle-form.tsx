"use client";

import { usePathname } from "next/navigation";

export function ThemeToggleForm({
  theme,
  toggleTheme,
}: {
  theme: string;
  toggleTheme: (formData: FormData) => void;
}) {
  const pathname = usePathname();

  return (
    <form
      action={toggleTheme}
      onSubmit={() => {
        // The root layout no longer reads the theme cookie itself (that
        // would block static generation of every page) -- it only seeds
        // data-theme from an inline script on a hard page load. The
        // action below redirects via the router, which is usually a soft
        // client-side navigation and wouldn't re-run that script, so set
        // the attribute here too for an instant, flash-free toggle.
        document.documentElement.setAttribute("data-theme", theme === "dark" ? "light" : "dark");
      }}
    >
      <input type="hidden" name="current" value={theme} />
      <input type="hidden" name="returnTo" value={pathname || "/dashboard"} />
      <button
        type="submit"
        title="Toggle appearance"
        className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px] border border-border bg-surface text-text-2 transition hover:bg-surface-2 hover:text-foreground"
      >
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 12.4A9 9 0 1 1 11.6 3a7 7 0 0 0 9.4 9.4Z" />
          </svg>
        )}
      </button>
    </form>
  );
}
