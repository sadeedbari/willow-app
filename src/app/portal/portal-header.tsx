import { portalLogout } from "./actions";

// Shared by every /portal/* page -- each used to inline this exact markup
// itself. Pulled out so the practice logo (added here) renders identically
// everywhere instead of needing the same edit repeated per page.
export function PortalHeader({
  practiceName,
  practiceLogoUrl,
  clientFullName,
}: {
  practiceName: string;
  practiceLogoUrl: string | null;
  clientFullName: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        {practiceLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={practiceLogoUrl} alt="" className="h-8 w-8 flex-none rounded-md object-contain" />
        )}
        <div>
          <div className="text-[14.5px] font-bold text-foreground">{practiceName}</div>
          <div className="text-[11.5px] text-text-3">Signed in as {clientFullName}</div>
        </div>
      </div>
      <form action={portalLogout}>
        <button type="submit" className="text-[12.5px] font-semibold text-text-3 hover:text-foreground">
          Log out
        </button>
      </form>
    </header>
  );
}
