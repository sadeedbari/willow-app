// Deployed via the Supabase MCP `deploy_edge_function` tool -- this file is
// the local source of truth, kept in sync manually. Runs with the platform's
// auto-injected SUPABASE_SERVICE_ROLE_KEY, which never leaves Supabase's own
// infrastructure and is never exposed to the Next.js app.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const VALID_ROLES = ["practice_admin", "clinician", "front_desk", "billing_admin"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Scoped to the caller's own session -- respects RLS. Used only to
    // verify who is calling and that they're a practice_admin.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: staffRow, error: staffError } = await userClient
      .from("staff")
      .select("id, practice_id, role")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staffRow || staffRow.role !== "practice_admin") {
      return json({ error: "Only practice admins can invite staff" }, 403);
    }

    const body = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const fullName = (body.fullName ?? "").trim();
    const role = body.role;
    const redirectTo = body.redirectTo;

    if (!email || !fullName || !role || !redirectTo) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    // Admin client -- bypasses RLS. Only reached after the authorization
    // check above, and never exposed to the caller.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    if (inviteError) {
      return json({ error: inviteError.message }, 400);
    }

    const { error: dbError } = await adminClient.from("staff_invitations").insert({
      practice_id: staffRow.practice_id,
      email,
      full_name: fullName,
      role,
      invited_by_staff_id: staffRow.id,
      status: "pending",
    });

    if (dbError) {
      return json({ error: dbError.message }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
