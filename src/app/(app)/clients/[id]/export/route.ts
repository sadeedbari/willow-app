import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { rateLimit } from "@/utils/rate-limit";
import { buildExportFiles, fileSlug, zipFiles } from "@/utils/export/records";

// POST rather than GET: it writes an audit-log entry and does real work, so
// link prefetching or a crawler must never trigger it.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // RLS scopes this to the staff member's own practice and caseload.
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, assigned_staff_id")
    .eq("id", id)
    .single();
  if (!client) return new Response("Client not found", { status: 404 });

  // Same "own client" rule as the rest of the client page: unassigned clients
  // count as the clinician's own in a solo practice.
  const isOwnClient = client.assigned_staff_id === staff.id || client.assigned_staff_id === null;
  const allowed = staff.role === "practice_admin" || (staff.role === "clinician" && isOwnClient);
  if (!allowed) return new Response("You don't have access to export this record.", { status: 403 });

  if (!(await rateLimit("data-export", staff.id, 10, 3600))) {
    return new Response("Too many exports — please try again in an hour.", { status: 429 });
  }

  let files: Record<string, string>;
  try {
    ({ files } = await buildExportFiles(supabase, { kind: "client", clientId: id }, { practiceName: staff.practiceName }));
  } catch (err) {
    console.error("client export failed:", err instanceof Error ? err.message : "unknown");
    return new Response("The export couldn't be completed. Please try again.", { status: 500 });
  }

  await supabase.rpc("log_data_export", { p_scope: "client", p_client_id: id });

  const filename = `${fileSlug(client.full_name)}-records-${new Date().toISOString().slice(0, 10)}.zip`;
  return new Response(zipFiles(files) as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
