// "Designed and built by" credit shown at the bottom of every public marketing
// page footer. Kept as one component so the wording and link stay identical.
export function SiteCredit() {
  return (
    <p className="mx-auto max-w-6xl px-6 pb-8 text-center text-[11.5px] text-text-3">
      Designed and built by{" "}
      <a
        href="https://sulosystems.com"
        target="_blank"
        rel="noopener"
        className="underline transition hover:text-text-2"
      >
        sulosystems.com
      </a>
    </p>
  );
}
