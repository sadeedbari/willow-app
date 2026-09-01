import Link from "next/link";

const TABS = [
  { href: "/portal", label: "Messages" },
  { href: "/portal/book", label: "Book Appointment" },
];

export function PortalTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`-mb-px border-b-2 px-1 pb-2.5 text-[13.6px] font-semibold transition ${
            tab.href === active
              ? "border-brand text-foreground"
              : "border-transparent text-text-3 hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
