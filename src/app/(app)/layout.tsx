import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./actions";
import { toggleTheme } from "./theme-actions";
import { NavLink } from "./nav-link";
import { ThemeToggleForm } from "./theme-toggle-form";

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
        adminOnly: true,
        badge: "consent",
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
    ],
  },
  {
    group: "Practice Admin",
    items: [
      {
        href: "/practice-overview",
        label: "Practice Overview",
        color: "bg-hue-admin",
        adminOnly: true,
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
        label: "Therapist Profile",
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

  const [{ data: threads }, { count: pendingConsent }, { count: unreadNotifCount }] = await Promise.all([
    supabase.from("message_threads").select("id, staff_last_read_at, updated_at"),
    staff.role === "practice_admin"
      ? supabase.from("consent_forms").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: null }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("staff_id", staff.id).is("read_at", null),
  ]);

  const unreadMessages = (threads ?? []).filter(
    (t) => !t.staff_last_read_at || new Date(t.updated_at) > new Date(t.staff_last_read_at)
  ).length;

  const badgeCounts: Record<string, number> = {
    messages: unreadMessages,
    consent: pendingConsent ?? 0,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <nav
        className="flex flex-none flex-col gap-1 overflow-hidden border-r border-border p-3"
        style={{ width: "248px", background: "linear-gradient(175deg,var(--sidebar-from) 0%,var(--sidebar-to) 100%)" }}
      >
        <div className="flex items-center gap-2.5 px-2.5 pb-4.5 pt-1.5">
          <div
            className="h-8.5 w-8.5 flex-none rounded-[10px] shadow-sm"
            style={{
              background:
                "conic-gradient(from 200deg, #4F9E8C, #6E93C9 30%, #9E8FD6 60%, #DB9179 85%, #4F9E8C)",
            }}
          />
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
              (item) => !item.adminOnly || staff.role === "practice_admin"
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-none items-center border-b border-border bg-surface/70 px-6 py-3 backdrop-blur">
          <form action="/search" method="GET" className="flex w-70 items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-text-3 transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 flex-none">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              name="q"
              placeholder="Search clients, notes, invoices…"
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-text-3"
            />
          </form>

          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggleForm theme={theme} toggleTheme={toggleTheme} />

            <Link
              href="/notifications"
              title="Notifications"
              className="relative flex h-8.5 w-8.5 items-center justify-center rounded-[10px] border border-border bg-surface text-text-2 transition hover:bg-surface-2 hover:text-foreground"
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
              className="flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Appointment
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
