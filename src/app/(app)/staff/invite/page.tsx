import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { inviteStaff } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InviteStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/staff");
  }

  return (
    <div className="max-w-lg">
      <Link href="/staff" className="text-[13px] font-semibold text-brand-ink">
        ← Back to staff
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        Invite team member
      </h1>
      <p className="mt-1 text-[13px] text-text-2">
        They&apos;ll get an email with a link to set their password and join{" "}
        {staff.practiceName}.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={inviteStaff} className="mt-5 space-y-4">
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Full name
          </label>
          <input
            name="fullName"
            required
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Role
          </label>
          <select
            name="role"
            defaultValue="clinician"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="clinician">Clinician</option>
            <option value="front_desk">Front Desk</option>
            <option value="billing_admin">Billing Admin</option>
            <option value="practice_admin">Practice Admin</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Send invite
        </button>
      </form>
    </div>
  );
}
