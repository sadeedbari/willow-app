import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change";

// Resolves the `next` param to a same-site path. Only a relative path, or an
// absolute URL on this request's origin / the configured site origin, is
// honoured -- anything else (e.g. `next=https://evil.example`) is dropped so
// a valid token link can't be turned into an open redirect. Returns null for
// "no usable destination", including a bare site root: when the redirect URL
// isn't on Supabase's allow-list, Supabase falls back to the Site URL, which
// arrives here as just "https://<site>" with no path.
function safeNextPath(next: string | null, requestOrigin: string): string | null {
  if (!next) return null;

  let url: URL;
  try {
    url = new URL(next, requestOrigin);
  } catch {
    return null;
  }

  const allowedOrigins = new Set([requestOrigin]);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {
      // ignore a malformed env value
    }
  }
  if (!allowedOrigins.has(url.origin)) return null;
  if (url.pathname === "/") return null;

  return `${url.pathname}${url.search}`;
}

// Handles email confirmation/invite links via token_hash + verifyOtp instead
// of the PKCE code+exchangeCodeForSession flow (see /auth/callback) -- that
// flow's server-side flow_state expires within minutes, which broke real
// users who don't click the email right away. verifyOtp has no such window;
// it's bounded only by the link's own (much longer) OTP expiry.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      let destination = safeNextPath(searchParams.get("next"), origin);

      if (!destination) {
        // No usable destination in the link -- pick one from what the link
        // was for, so invites still land on the right accept screen.
        if (type === "invite") {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          destination =
            user?.user_metadata?.invite_type === "client" ? "/portal/accept-invite" : "/accept-invite";
        } else {
          destination = "/onboarding";
        }
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
