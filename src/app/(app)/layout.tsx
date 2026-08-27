import Link from "next/link";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { logout } from "./actions";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    color: "bg-brand",
    icon: (
      <path d="M3 11l9-7 9 7M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
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
    href: "/notes",
    label: "Notes",
    color: "bg-hue-notes",
    icon: (
      <>
        <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M9 12h6M9 16h6M9 8h3" />
      </>
    ),
  },
  {
    href: "/staff",
    label: "Staff",
    color: "bg-hue-staff",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
      </>
    ),
  },
  {
    href: "/invoices",
    label: "Invoices",
    color: "bg-warn",
    icon: (
      <>
        <path d="M7 3h10a1 1 0 0 1 1 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 0 1 1-1Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
  },
  {
    href: "/consent-templates",
    label: "Consent Forms",
    color: "bg-ok",
    adminOnly: true,
    icon: (
      <>
        <path d="M9 12.5l2 2 4-4.5" />
        <path d="M7 3h10a1 1 0 0 1 1 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 0 1 1-1Z" />
      </>
    ),
  },
  {
    href: "/billing",
    label: "Billing",
    color: "bg-brand-ink",
    adminOnly: true,
    icon: (
      <>
        <rect x="2.5" y="5.5" width="19" height="14" rx="2.5" />
        <path d="M2.5 10h19M6 15h4" />
      </>
    ),
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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <nav className="flex w-60 flex-none flex-col gap-1 border-r border-border bg-gradient-to-b from-[#f6f9f7] to-[#eef3f0] p-3">
        <div className="flex items-center gap-2.5 px-2 pb-4 pt-1.5">
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

        <div className="flex flex-1 flex-col gap-1">
          {NAV.filter((item) => !item.adminOnly || staff.role === "practice_admin").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.6px] font-medium text-text-2 transition hover:bg-black/5 hover:text-foreground"
            >
              <span
                className={`flex h-6.5 w-6.5 flex-none items-center justify-center rounded-[7.5px] shadow-sm ${item.color}`}
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
            </Link>
          ))}
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
