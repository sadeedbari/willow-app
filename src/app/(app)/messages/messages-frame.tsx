import type { ReactNode } from "react";

export function MessagesFrame({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div
      className="mt-6 flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      style={{ height: "calc(100vh - 220px)" }}
    >
      {left}
      <div className="flex min-w-0 flex-1 flex-col">{right}</div>
    </div>
  );
}
