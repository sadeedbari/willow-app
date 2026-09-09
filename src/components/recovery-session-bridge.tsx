"use client";

// Supabase's password-recovery email link isn't customized to route through
// our own /auth/confirm (token_hash + verifyOtp) handler the way signup and
// invite links are -- it redirects straight back to our redirectTo with the
// session as a URL hash fragment (#access_token=...&refresh_token=...).
// Fragments never reach the server, so a server component has no way to see
// that session on its own. This client component reads the fragment, turns
// it into a real cookie-backed session via the browser Supabase client, then
// asks the server component to re-render -- the one thing here that
// fundamentally needs to run in the browser.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function RecoverySessionBridge({ loginHref }: { loginHref: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function bridge() {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setFailed(true);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setFailed(true);
        return;
      }
      // Drop the tokens from the address bar before refreshing so they
      // never sit there longer than the moment it took to consume them.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      router.refresh();
    }

    bridge();
  }, [router]);

  if (failed) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="text-[18px] font-bold text-foreground">Link expired or already used</h1>
        <p className="mt-2 text-[13.5px] text-text-2">
          Password reset links only work once. Please request a new one.
        </p>
        <a href={loginHref} className="mt-4 inline-block text-[13px] font-semibold text-brand-ink">
          ← Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
      <p className="text-[13.5px] text-text-2">Verifying your link…</p>
    </div>
  );
}
