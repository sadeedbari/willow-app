import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change";

// Handles email confirmation/invite links via token_hash + verifyOtp instead
// of the PKCE code+exchangeCodeForSession flow (see /auth/callback) -- that
// flow's server-side flow_state expires within minutes, which broke real
// users who don't click the email right away. verifyOtp has no such window;
// it's bounded only by the link's own (much longer) OTP expiry.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(next.startsWith("http") ? next : `${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
