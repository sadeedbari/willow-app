import { LiveSearchInput } from "@/components/live-search-input";
import { FAQS, FAQ_CATEGORIES } from "./faq-data";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Help &amp; FAQ</h1>
        <p className="mt-1 text-[13.5px] text-text-2">
          Answers to common questions about using Willow. Search below, or browse by topic.
        </p>
      </div>

      <div className="mb-6">
        <LiveSearchInput
          placeholder="Search, e.g. &quot;add a client&quot;, &quot;offboard staff&quot;…"
          itemSelector="[data-faq-item]"
          emptyStateSelector="[data-no-search-results]"
          groupSelector="[data-faq-group]"
        />
      </div>

      <div className="space-y-8">
        {FAQ_CATEGORIES.map((category) => {
          const items = FAQS.filter((f) => f.category === category);
          if (!items.length) return null;
          return (
            <div key={category} data-faq-group>
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-text-3">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <details
                    key={item.question}
                    data-faq-item
                    data-search={`${item.question} ${category}`.toLowerCase()}
                    className="group rounded-2xl border border-border bg-surface p-4 shadow-sm open:pb-5"
                  >
                    <summary className="cursor-pointer list-none text-[13.8px] font-semibold text-foreground marker:content-none">
                      <span className="flex items-center justify-between gap-3">
                        {item.question}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 flex-none text-text-3 transition group-open:rotate-180"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </summary>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13.4px] leading-relaxed text-text-2">
                      {item.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            </div>
          );
        })}

        <p
          data-no-search-results
          style={{ display: "none" }}
          className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3"
        >
          No matching questions. Try a different search, or contact us below.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface-2 p-5 text-center">
        <p className="text-[13.4px] text-text-2">
          Still need help?{" "}
          <a href="mailto:sulosystems@gmail.com" className="font-semibold text-brand-ink underline">
            Contact Sulo Systems
          </a>{" "}
          and we&apos;ll get back to you.
        </p>
      </div>
    </div>
  );
}
