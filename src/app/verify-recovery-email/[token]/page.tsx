import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { clientIp, rateLimit } from "@/utils/rate-limit";
import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";

export default async function VerifyRecoveryEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!(await rateLimit("token-page-ip", await clientIp(), 60, 600))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Too many requests</h1>
          <p className="mt-2 text-[13.5px] text-text-2">Please wait a few minutes and try this link again.</p>
        </div>
      </div>
    );
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("confirm_recovery_email", { p_token: token });
  const fullName = data as string | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <BrandMark size={56} />
        {error || !fullName ? (
          <>
            <h1 className="mt-5 text-[22px] font-bold tracking-tight text-foreground">Link not valid</h1>
            <p className="mt-2 text-[13.5px] text-text-2">
              This confirmation link has expired or was already used. You can request a new one from
              your Practitioner Profile.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-[22px] font-bold tracking-tight text-foreground">Recovery email confirmed</h1>
            <p className="mt-2 text-[13.5px] text-text-2">
              This address can now be used to recover access if {fullName} ever gets locked out of
              two-factor authentication.
            </p>
          </>
        )}
        <Link href="/login" className="mt-6 inline-block text-[13px] font-semibold text-brand-ink">
          Go to login
        </Link>
      </div>
    </div>
  );
}
