// Deployed via the Supabase MCP `deploy_edge_function` tool -- this file is
// the local source of truth, kept in sync manually. Mirrors invite-staff's
// structure: verify the caller via their own session (RLS-respecting), then
// use the service-role client only for the admin.inviteUserByEmail call and
// the resulting clients.portal_user_id link.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

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

    if (staffError || !staffRow || !["practice_admin", "front_desk"].includes(staffRow.role)) {
      return json({ error: "Only practice admins or front desk can invite clients to the portal" }, 403);
    }

    const body = await req.json();
    const clientId = body.clientId;
    const redirectTo = body.redirectTo;

    if (!clientId || !redirectTo) {
      return json({ error: "Missing required fields" }, 400);
    }

    // RLS-respecting -- also confirms the client belongs to the caller's practice.
    const { data: clientRow, error: clientError } = await userClient
      .from("clients")
      .select("id, email, full_name, portal_user_id")
      .eq("id", clientId)
      .single();

    if (clientError || !clientRow) return json({ error: "Client not found" }, 404);
    if (!clientRow.email) return json({ error: "This client has no email on file" }, 400);
    if (clientRow.portal_user_id) return json({ error: "This client already has portal access" }, 400);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      clientRow.email,
      { redirectTo },
    );

    if (inviteError || !inviteData.user) {
      console.error("inviteUserByEmail failed:", inviteError?.message, JSON.stringify(inviteError));
      return json({ error: inviteError?.message ?? "Could not send invite" }, 400);
    }

    const { error: linkError } = await adminClient
      .from("clients")
      .update({ portal_user_id: inviteData.user.id })
      .eq("id", clientId);

    if (linkError) {
      return json({ error: linkError.message }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("invite-client crashed:", e instanceof Error ? e.stack : e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
