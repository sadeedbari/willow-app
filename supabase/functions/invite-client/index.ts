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
    const force = body.force === true;

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

    let userId: string;

    if (inviteError || !inviteData.user) {
      const alreadyRegistered =
        inviteError?.code === "email_exists" ||
        (inviteError?.message ?? "").toLowerCase().includes("already been registered");

      if (!alreadyRegistered) {
        console.error("inviteUserByEmail failed:", inviteError?.message, JSON.stringify(inviteError));
        return json({ error: inviteError?.message ?? "Could not send invite" }, 400);
      }

      // This email already belongs to an auth user. clients.portal_user_id
      // is unique platform-wide (one portal login = exactly one client
      // record everywhere), so we can't just link both -- figure out what
      // already holds this login and decide what's safe to do.
      const { data: existingUserId, error: lookupError } = await adminClient.rpc(
        "find_auth_user_by_email",
        { p_email: clientRow.email },
      );

      if (lookupError || !existingUserId) {
        console.error("find_auth_user_by_email failed:", lookupError?.message);
        return json({ error: "A user with this email already exists, but couldn't be linked. Contact support." }, 400);
      }

      const { data: existingClientRow } = await adminClient
        .from("clients")
        .select("id, full_name, practice_id")
        .eq("portal_user_id", existingUserId)
        .maybeSingle();

      if (existingClientRow && existingClientRow.practice_id !== staffRow.practice_id) {
        // Cross-tenant: never silently move access another practice granted
        // to their own client -- that practice has no visibility into this
        // action and would lose access to their own record with no warning.
        return json(
          {
            error:
              "This email already has portal access at a different practice on Willow. A single email can only be linked to one portal account platform-wide right now -- use a different email for this client, or contact support.",
          },
          400,
        );
      }

      if (existingClientRow && existingClientRow.id !== clientId && !force) {
        // Same practice, different client record -- plausibly the same
        // person (e.g. returning after time away, or a duplicate profile).
        // Moving portal access away from that record is a real side effect
        // for whoever holds it today, so require an explicit confirmation
        // from the admin rather than silently transferring it.
        return json({
          conflict: true,
          existingClientId: existingClientRow.id,
          existingClientName: existingClientRow.full_name,
        });
      }

      if (existingClientRow && existingClientRow.id !== clientId && force) {
        // Confirmed -- release the old record's portal link first since
        // portal_user_id is unique, then link it to this one instead.
        const { error: unlinkError } = await adminClient
          .from("clients")
          .update({ portal_user_id: null })
          .eq("id", existingClientRow.id);
        if (unlinkError) {
          return json({ error: unlinkError.message }, 400);
        }
      }

      userId = existingUserId;

      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(clientRow.email, { redirectTo });
      if (resetError) {
        return json({ error: resetError.message ?? "Could not send invite" }, 400);
      }
    } else {
      userId = inviteData.user.id;
    }

    const { error: linkError } = await adminClient
      .from("clients")
      .update({ portal_user_id: userId })
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
