"use client";

// The one deliberate exception to this app's zero-client-component rule:
// instant filter-as-you-type fundamentally needs JS to intercept
// keystrokes. Kept as narrow as possible -- plain DOM show/hide against
// server-rendered rows, no client-side state, no re-render of the list.
export function LiveSearchInput({
  placeholder,
  itemSelector,
  emptyStateSelector,
  groupSelector,
}: {
  placeholder: string;
  itemSelector: string;
  emptyStateSelector?: string;
  // Optional: a selector for section/category containers (each wrapping
  // some subset of items) that should hide themselves once every item
  // inside them is filtered out -- otherwise a search leaves behind empty
  // section headings with nothing underneath.
  groupSelector?: string;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={(e) => {
        const query = e.target.value.trim().toLowerCase();
        const items = document.querySelectorAll<HTMLElement>(itemSelector);
        let visibleCount = 0;
        items.forEach((el) => {
          const haystack = (el.dataset.search ?? el.textContent ?? "").toLowerCase();
          const isMatch = haystack.includes(query);
          el.style.display = isMatch ? "" : "none";
          if (isMatch) visibleCount++;
        });
        if (emptyStateSelector) {
          const emptyState = document.querySelector<HTMLElement>(emptyStateSelector);
          if (emptyState) emptyState.style.display = visibleCount === 0 && items.length > 0 ? "" : "none";
        }
        if (groupSelector) {
          document.querySelectorAll<HTMLElement>(groupSelector).forEach((group) => {
            const hasVisibleItem = Array.from(group.querySelectorAll<HTMLElement>(itemSelector)).some(
              (el) => el.style.display !== "none",
            );
            group.style.display = hasVisibleItem ? "" : "none";
          });
        }
      }}
      className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
    />
  );
}
