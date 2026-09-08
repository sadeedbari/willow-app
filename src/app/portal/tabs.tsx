import Link from "next/link";

const TABS = [
  { href: "/portal", label: "Messages" },
  { href: "/portal/appointments", label: "Appointments" },
  { href: "/portal/book", label: "Book Appointment" },
];

export function PortalTabs({ active, unreadMessages }: { active: string; unreadMessages?: boolean }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-[13.6px] font-semibold transition ${
            tab.href === active
              ? "border-brand text-foreground"
              : "border-transparent text-text-3 hover:text-foreground"
          }`}
        >
          {tab.label}
          {tab.href === "/portal" && unreadMessages && (
            <span className="h-2 w-2 flex-none rounded-full bg-brand" />
          )}
        </Link>
      ))}
    </div>
  );
}
