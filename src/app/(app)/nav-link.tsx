"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  color,
  icon,
  label,
  count,
}: {
  href: string;
  color: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={() => {
        // Closes the mobile drawer (see (app)/layout.tsx) after navigating --
        // otherwise it stays open over the new page since the checkbox is an
        // uncontrolled DOM node that persists across client-side navigation.
        const mobileNav = document.getElementById("mobile-nav") as HTMLInputElement | null;
        if (mobileNav) mobileNav.checked = false;
      }}
      className={`flex items-center gap-[11px] rounded-[10px] px-2.5 py-2 text-[13.6px] font-[560] transition ${
        isActive
          ? "bg-brand-tint text-brand-ink"
          : "text-text-2 hover:bg-black/5 hover:text-foreground"
      }`}
    >
      <span
        className={`flex h-6.5 w-6.5 flex-none items-center justify-center rounded-[7.5px] shadow-[0_1px_3px_rgba(32,44,38,0.16)] ${color}`}
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
          {icon}
        </svg>
      </span>
      <span className={count ? "font-bold" : undefined}>{label}</span>
      {!!count && (
        <span className="ml-auto min-w-[16px] rounded-full bg-brand px-1.5 py-[1.5px] text-center text-[10.5px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
