import type { ReactNode } from "react";

export function MessagesFrame({
  left,
  right,
  mobileView = "list",
}: {
  left: ReactNode;
  right: ReactNode;
  // A two-pane master-detail layout has nowhere to put both panes on a
  // phone-width screen. Below sm, show only one at a time -- the thread
  // list until a conversation is picked, then just that conversation
  // (ThreadDetail carries its own "back to inbox" link for mobile).
  mobileView?: "list" | "detail";
}) {
  return (
    <div
      className="mt-6 flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      style={{ height: "calc(100vh - 220px)" }}
    >
      <div className={mobileView === "detail" ? "hidden sm:block" : "w-full sm:w-auto"}>{left}</div>
      <div className={`min-w-0 flex-1 flex-col ${mobileView === "list" ? "hidden sm:flex" : "flex"}`}>{right}</div>
    </div>
  );
}
