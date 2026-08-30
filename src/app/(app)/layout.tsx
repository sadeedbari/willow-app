import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./actions";

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
        href: "/consent-templates",
        label: "Consent Forms",
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
    group: "My Account",
    items: [
      {
        href: "/staff",
        label: "Staff",
        color: "bg-hue-admin",
        icon: (
          <>
            <circle cx="12" cy="8" r="3.6" />
            <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
          </>
        ),
      },
      {
        href: "/billing",
        label: "Subscription",
        color: "bg-brand-ink",
        adminOnly: true,
        icon: (
          <>
            <rect x="2.5" y="5.5" width="19" height="14" rx="2.5" />
            <path d="M2.5 10h19M6 15h4" />
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
  const pathname = (await headers()).get("x-pathname") ?? "";

  const [{ data: threads }, { count: pendingConsent }] = await Promise.all([
    supabase.from("message_threads").select("id, staff_last_read_at, updated_at"),
    staff.role === "practice_admin"
      ? supabase.from("consent_forms").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: null }),
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
        style={{ width: "248px", background: "linear-gradient(175deg,#f6f9f7 0%,#eef3f0 100%)" }}
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
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const count = item.badge ? badgeCounts[item.badge] : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-[11px] rounded-[10px] px-2.5 py-2 text-[13.6px] font-[560] transition ${
                        isActive
                          ? "bg-brand-tint text-brand-ink"
                          : "text-text-2 hover:bg-black/5 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-6.5 w-6.5 flex-none items-center justify-center rounded-[7.5px] shadow-[0_1px_3px_rgba(32,44,38,0.16)] ${item.color}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          {item.icon}
                        </svg>
                      </span>
                      {item.label}
                      {count > 0 && (
                        <span className="ml-auto min-w-[16px] rounded-full bg-brand px-1.5 py-[1.5px] text-center text-[10.5px] font-bold text-white">
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
