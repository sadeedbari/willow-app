import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./actions";
import { toggleTheme } from "./theme-actions";
import { NavLink } from "./nav-link";
import { ThemeToggleForm } from "./theme-toggle-form";
import { PushRegister } from "./push-register";
import { isThreadUnread } from "@/utils/messaging";
import { BrandMark } from "@/components/brand-mark";

const NAV = [
  {
    group: "My Practice",
    items: [
      {
        href: "/dashboard",
        label: "Home",
        color: "bg-brand",
        icon: (
          <path d="M3 11l9-7 9 7M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        ),
      },
      {
        href: "/calendar",
        label: "Calendar",
        color: "bg-hue-cal",
        icon: (
          <>
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </>
        ),
      },
      {
        href: "/clients",
        label: "Clients",
        color: "bg-hue-clients",
        icon: (
          <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
            <circle cx="17.5" cy="9" r="2.4" />
            <path d="M15.8 14.3c2.5.4 4.2 2.2 4.2 4.9" />
          </>
        ),
      },
      {
        href: "/notes",
        label: "Session Notes",
        color: "bg-hue-notes",
        icon: (
          <>
            <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
            <path d="M9 12h6M9 16h6M9 8h3" />
          </>
        ),
      },
      {
        href: "/forms",
        label: "Forms",
        color: "bg-hue-consent",
        roles: ["practice_admin", "front_desk"],
        icon: (
          <>
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
            <path d="M9 12l2 2 4-4" />
          </>
        ),
      },
      {
        href: "/invoices",
        label: "Billing",
        color: "bg-hue-bill",
        icon: (
          <>
            <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
            <path d="M2.5 10.5h19M6 15h4" />
          </>
        ),
      },
      {
        href: "/messages",
        label: "Messages",
        color: "bg-hue-msg",
        badge: "messages",
        icon: (
          <>
            <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" />
          </>
        ),
      },
      {
        href: "/booking-requests",
        label: "Requests",
        color: "bg-hue-consent",
        badge: "bookingRequests",
        icon: (
          <>
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M16 3v4M8 3v4M3 10h18M8 15l2.5 2.5L16 13" />
          </>
        ),
      },
    ],
  },
  {
    group: "Practice Admin",
    items: [
      {
        href: "/practice-overview",
        label: "Practice Overview",
        color: "bg-hue-admin",
        roles: ["practice_admin"],
        icon: (
          <>
            <path d="M4 20V10M11 20V4M18 20v-7" />
          </>
        ),
      },
    ],
  },
  {
    group: "My Account",
    items: [
      {
        href: "/profile",
        label: "Practitioner Profile",
        color: "bg-[#8C948E]",
        icon: (
          <>
            <circle cx="12" cy="8" r="3.6" />
            <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
          </>
        ),
      },
      {
        href: "/settings",
        label: "Settings",
        color: "bg-[#8C948E]",
        icon: (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.5-2-3.4-2.3.9a8 8 0 0 0-1.7-1L15 3h-4l-.4 2.4a8 8 0 0 0-1.7 1l-2.3-.9-2 3.4L6.6 11a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.7 1L11 21h4l.4-2.4c.6-.2 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5Z" />
          </>
        ),
      },
    ],
  },
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  practice_admin: "Practice Admin",
  clinician: "Clinician",
  front_desk: "Front Desk",
  billing_admin: "Billing Admin",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  const pendingBookingRequestsQuery = supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const [
    { data: threads },
    { count: unreadNotifCount },
    { count: pendingBookingRequestCount },
    { data: profileFields },
    { data: practiceFields },
    { data: factorsData },
  ] = await Promise.all([
    supabase.from("message_threads").select("id, staff_last_read_at, updated_at"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("staff_id", staff.id).is("read_at", null),
    staff.role === "clinician" ? pendingBookingRequestsQuery.eq("staff_id", staff.id) : pendingBookingRequestsQuery,
    supabase.from("staff").select("credential, license_number, license_province, phone, bio, specialty").eq("id", staff.id).single(),
    supabase
      .from("practices")
      .select("logo_url, address, business_number, primary_contact_email, primary_contact_phone")
      .eq("id", staff.practiceId)
      .single(),
    supabase.auth.mfa.listFactors(),
  ]);

  const mfaEnabled = !!factorsData?.totp?.some((f) => f.status === "verified");

  // Drives the profile-completion ring next to Help & FAQ -- practice fields
  // only count for a practice_admin, since only they can act on them (the
  // settings page itself gates editing the same way).
  const profileChecklist = [
    { key: "credential", label: "Credential (e.g. RP, LMFT)", href: "/profile", filled: !!profileFields?.credential },
    {
      key: "license",
      label: "License number & province",
      href: "/profile",
      filled: !!(profileFields?.license_number && profileFields?.license_province),
    },
    { key: "phone", label: "Contact phone", href: "/profile", filled: !!profileFields?.phone },
    { key: "bio", label: "Display bio", href: "/profile", filled: !!profileFields?.bio },
    { key: "specialty", label: "Specialty", href: "/profile", filled: !!profileFields?.specialty },
    { key: "mfa", label: "Two-factor authentication", href: "/profile/security", filled: mfaEnabled },
  ];
  const practiceChecklist =
    staff.role === "practice_admin"
      ? [
          { key: "logo", label: "Practice logo", href: "/settings", filled: !!practiceFields?.logo_url },
          { key: "address", label: "Practice address", href: "/settings", filled: !!practiceFields?.address },
          { key: "businessNumber", label: "Business number", href: "/settings", filled: !!practiceFields?.business_number },
          { key: "contactEmail", label: "Contact email", href: "/settings", filled: !!practiceFields?.primary_contact_email },
          { key: "contactPhone", label: "Contact phone", href: "/settings", filled: !!practiceFields?.primary_contact_phone },
        ]
      : [];
  const completionFields = [...profileChecklist, ...practiceChecklist];
  const missingFieldCount = completionFields.filter((f) => !f.filled).length;
  const completionPercent =
    completionFields.length === 0
      ? 100
      : Math.round(((completionFields.length - missingFieldCount) / completionFields.length) * 100);
  const ringRadius = 12;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = (completionPercent / 100) * ringCircumference;

  const unreadMessages = (threads ?? []).filter((t) =>
    isThreadUnread(t.staff_last_read_at, t.updated_at)
  ).length;

  // Pending-signature nudges now live inside the Forms page itself (a
  // dedicated tab), not as a sidebar badge -- a sidebar count for "someone
  // hasn't signed yet" read as an error/notification rather than the
  // informational status it actually is.
  const badgeCounts: Record<string, number> = {
    messages: unreadMessages,
    bookingRequests: pendingBookingRequestCount ?? 0,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <PushRegister />
      {/* Pure-CSS mobile drawer toggle -- no client component needed. This
          Tailwind v4 setup doesn't generate the plain peer-checked: variant
          (see the working `peer-has-[:checked]` example in profile/page.tsx),
          so the checkbox, nav, and backdrop are wrapped in one `group`
          (display:contents so it doesn't affect layout) and reference it via
          group-has-[:checked]:, which does compile. NavLink (already a
          client component, for active-state highlighting) unchecks the
          checkbox on click so tapping a link closes the drawer instead of
          leaving it open over the new page. */}
      <div className="contents group">
      <input type="checkbox" id="mobile-nav" className="hidden" />
      <nav
        className="fixed inset-y-0 left-0 z-40 flex w-[248px] -translate-x-full flex-col gap-1 overflow-hidden border-r border-border p-3 transition-transform duration-200 group-has-[:checked]:translate-x-0 md:static md:flex-none md:translate-x-0"
        style={{ background: "linear-gradient(175deg,var(--sidebar-from) 0%,var(--sidebar-to) 100%)" }}
      >
        <div className="flex items-center gap-2.5 px-2.5 pb-4.5 pt-1.5">
          <BrandMark size={34} />
          <div>
            <div className="text-[16.5px] font-bold tracking-tight text-foreground">
              Willow
            </div>
            <div className="-mt-0.5 truncate text-[11.5px] text-text-3">
              {staff.practiceName}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || (item.roles as string[]).includes(staff.role)
            );
            if (!visibleItems.length) return null;

            return (
              <div key={section.group}>
                <div className="px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.06em] text-text-3">
                  {section.group}
                </div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    color={item.color}
                    icon={item.icon}
                    label={item.label}
                    count={item.badge ? badgeCounts[item.badge] : 0}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="mt-auto border-t border-border pt-2.5">
          <div className="flex items-center gap-2.5 rounded-[10px] p-2">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand to-hue-cal text-[12.5px] font-bold text-white">
              {initialsOf(staff.fullName)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {staff.fullName}
              </div>
              <div className="text-[11px] text-text-3">
                {ROLE_LABEL[staff.role]}
              </div>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-[10px] px-2 py-1.5 text-left text-[12.5px] font-medium text-text-3 transition hover:bg-black/5 hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>

      {/* Backdrop: tapping outside the open drawer closes it (unchecking the
          same checkbox via the native label/for behavior). md:hidden since
          the drawer itself is always open (static) from md up. */}
      <label
        htmlFor="mobile-nav"
        aria-hidden="true"
        className="fixed inset-0 z-30 hidden bg-black/40 group-has-[:checked]:block md:hidden"
      />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-none items-center gap-2 border-b border-border bg-surface/70 px-3 py-3 backdrop-blur sm:gap-0 sm:px-6">
          <label
            htmlFor="mobile-nav"
            aria-label="Open menu"
            className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[10px] border border-border bg-surface text-text-2 transition hover:bg-surface-2 hover:text-foreground md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>

          <form action="/search" method="GET" className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-text-3 transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand sm:w-70 sm:flex-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 flex-none">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              name="q"
              placeholder="Search clients, notes, invoices…"
              className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-text-3"
            />
          </form>

          <div className="ml-auto flex flex-none items-center gap-1.5 sm:gap-2.5">
            <div className="relative">
              <input type="checkbox" id="profile-completion-toggle" className="peer hidden" />
              <label
                htmlFor="profile-completion-toggle"
                aria-hidden="true"
                className="fixed inset-0 z-20 hidden peer-checked:block"
              />
              <label
                htmlFor="profile-completion-toggle"
                title={`Profile ${completionPercent}% complete`}
                className="relative z-30 flex h-8.5 w-8.5 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface text-text-2 transition hover:bg-surface-2"
              >
                <svg viewBox="0 0 34 34" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="17" cy="17" r={ringRadius} fill="none" stroke="var(--border)" strokeWidth="2.5" />
                  {completionPercent > 0 && (
                    <circle
                      cx="17"
                      cy="17"
                      r={ringRadius}
                      fill="none"
                      stroke={completionPercent === 100 ? "var(--ok)" : "var(--brand)"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${ringDash} ${ringCircumference}`}
                    />
                  )}
                </svg>
                <span className="relative text-[8.5px] font-bold text-foreground">{completionPercent}%</span>
              </label>

              <div className="invisible absolute right-0 top-full z-30 mt-2 w-72 origin-top-right scale-95 rounded-xl border border-border bg-surface p-4 opacity-0 shadow-lg transition peer-checked:visible peer-checked:scale-100 peer-checked:opacity-100">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-bold text-foreground">Profile completion</div>
                  <span className="text-[12px] font-semibold text-text-2">{completionPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${completionPercent === 100 ? "bg-ok" : "bg-brand"}`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                {profileChecklist.some((f) => !f.filled) && (
                  <div className="mt-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-text-3">
                      Practitioner Profile
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {profileChecklist
                        .filter((f) => !f.filled)
                        .map((f) => (
                          <li key={f.key}>
                            <Link
                              href={f.href}
                              className="flex items-center gap-1.5 text-[12.5px] text-text-2 transition hover:text-brand-ink"
                            >
                              <span className="h-1.5 w-1.5 flex-none rounded-full border border-text-3" />
                              {f.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {practiceChecklist.some((f) => !f.filled) && (
                  <div className="mt-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-text-3">
                      Practice Settings
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {practiceChecklist
                        .filter((f) => !f.filled)
                        .map((f) => (
                          <li key={f.key}>
                            <Link
                              href={f.href}
                              className="flex items-center gap-1.5 text-[12.5px] text-text-2 transition hover:text-brand-ink"
                            >
                              <span className="h-1.5 w-1.5 flex-none rounded-full border border-text-3" />
                              {f.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {missingFieldCount === 0 && (
                  <p className="mt-3 text-[12.5px] text-ok">Your profile is fully complete.</p>
                )}
              </div>
            </div>

            <Link
              href="/help"
              title="Help & FAQ"
              className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[10px] border border-border bg-surface text-text-2 transition hover:bg-surface-2 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9.2a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.5" />
                <path d="M12 17.5h.01" />
              </svg>
            </Link>

            <ThemeToggleForm theme={theme} toggleTheme={toggleTheme} />

            <Link
              href="/notifications"
              title="Notifications"
              className="relative flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[10px] border border-border bg-surface text-text-2 transition hover:bg-surface-2 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
              {!!unreadNotifCount && (
                <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-surface bg-bad" />
              )}
            </Link>

            <Link
              href="/calendar/new"
              title="New Appointment"
              className="flex flex-none items-center gap-1.5 rounded-[10px] bg-brand px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-ink sm:px-3.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3.5 w-3.5 flex-none">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">New Appointment</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-5 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
