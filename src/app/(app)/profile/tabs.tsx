import Link from "next/link";

const TABS = [
  { href: "/profile", label: "Profile" },
  { href: "/profile/scheduling", label: "Scheduling" },
  { href: "/profile/security", label: "Security" },
];

export function ProfileTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 flex gap-4 overflow-x-auto overflow-y-hidden border-b border-border sm:gap-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`-mb-px flex-none whitespace-nowrap border-b-2 px-1 pb-2.5 text-[13.6px] font-semibold transition ${
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
