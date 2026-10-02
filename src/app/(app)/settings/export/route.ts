import { createClient } from "@/utils/supabase/server";
import { getCurrentStaffAllowExpiredTrial } from "@/utils/supabase/current-staff";
import { rateLimit } from "@/utils/rate-limit";
import { buildExportFiles, fileSlug, zipFiles } from "@/utils/export/records";

// Deliberately reachable once a trial has run out or a subscription has
// ended: a practice that is leaving needs to be able to take its records
// with it, and the rest of the app is blocked for them by then.
export async function POST() {
  const staff = await getCurrentStaffAllowExpiredTrial();
  if (staff.role !== "practice_admin") {
    return new Response("Only a practice admin can export all practice data.", { status: 403 });
  }

  if (!(await rateLimit("data-export-practice", staff.id, 5, 3600))) {
    return new Response("Too many exports — please try again in an hour.", { status: 429 });
  }

  const supabase = await createClient();

  let files: Record<string, string>;
  try {
    ({ files } = await buildExportFiles(supabase, { kind: "practice" }, { practiceName: staff.practiceName }));
  } catch (err) {
    console.error("practice export failed:", err instanceof Error ? err.message : "unknown");
    return new Response("The export couldn't be completed. Please try again.", { status: 500 });
  }

  await supabase.rpc("log_data_export", { p_scope: "practice" });

  const filename = `${fileSlug(staff.practiceName)}-all-data-${new Date().toISOString().slice(0, 10)}.zip`;
  return new Response(zipFiles(files) as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
