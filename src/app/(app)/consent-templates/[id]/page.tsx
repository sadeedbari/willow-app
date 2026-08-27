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
    redirect("/consent-templates");
  }

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("consent_form_templates")
    .select("id, title, body, active")
    .eq("id", id)
    .single();

  if (!template) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/consent-templates" className="text-[13px] font-semibold text-brand-ink">
        ← Back to templates
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        Edit template
      </h1>
      <p className="mt-1 text-[13.5px] text-text-2">
        Changes only affect forms sent from now on — forms already sent keep the text the client saw.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={updateTemplate} className="mt-5 space-y-4">
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
  );
}
