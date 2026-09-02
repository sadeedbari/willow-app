import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTemplate, deleteTemplate } from "./actions";

export default async function ConsentTemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/forms");
  }

  const supabase = await createClient();
  const [{ data: template }, { data: practice }] = await Promise.all([
    supabase.from("consent_form_templates").select("id, title, body, active").eq("id", id).single(),
    supabase.from("practices").select("logo_url").eq("id", staff.practiceId).single(),
  ]);

  if (!template) notFound();

  return (
    <div className="max-w-5xl">
      <Link href="/forms" className="text-[13px] font-semibold text-brand-ink">
        ← Back to forms
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        Edit Form
      </h1>
      <p className="mt-1 text-[13.5px] text-text-2">
        Changes only affect forms sent from now on — forms already sent keep the text the client saw.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <form action={updateTemplate} className="space-y-4">
            <input type="hidden" name="templateId" value={template.id} />
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                Title
              </label>
              <input
                name="title"
                required
                defaultValue={template.title}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                Form text
              </label>
              <textarea
                name="body"
                required
                rows={16}
                defaultValue={template.body}
                className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] leading-relaxed outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-text-2">
              <input type="checkbox" name="active" defaultChecked={template.active} />
              Active — available to send to clients
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Save changes
              </button>
            </div>
          </form>

          <form action={deleteTemplate} className="mt-3">
            <input type="hidden" name="templateId" value={template.id} />
            <button type="submit" className="text-[12.5px] font-semibold text-bad">
              Delete template
            </button>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-bold uppercase tracking-wide text-text-3">
              Client preview
            </div>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-text-3">
              Preview only — not interactive
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-text-3">
            Shows the last saved version — save your changes above to update it.
          </p>

          <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-4 sm:p-6">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              {practice?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={practice.logo_url} alt="" className="mb-3 h-12 w-auto object-contain" />
              )}
              <h2 className="text-[20px] font-bold text-foreground">{template.title || "Untitled form"}</h2>
              <p className="mt-1 text-[13px] text-text-3">
                {staff.practiceName} · Prepared for [Client Name]
              </p>

              <div className="mt-5 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-2 p-4 text-[13.4px] leading-relaxed text-text-2">
                {template.body || "Form text will appear here."}
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-text-2">
                    Type your full name to sign
                  </label>
                  <input
                    disabled
                    placeholder="[Client Name]"
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] text-text-3 outline-none"
                  />
                </div>
                <p className="text-[11.5px] text-text-3">
                  By typing your name and submitting, you agree to the terms above and this
                  constitutes your electronic signature.
                </p>
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white opacity-60"
                >
                  Sign & submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
