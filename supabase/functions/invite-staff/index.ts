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

// Willow's two plans cap how many staff accounts a practice can have.
// `null` (still trialing, no plan chosen yet) gets the generous Team cap so a
// prospective practice can fully evaluate multi-staff features before ever
// having to decide between the two -- the real cap only bites once they've
// actually subscribed to Solo.
const PLAN_STAFF_LIMITS: Record<string, number> = { solo: 1, team: 6 };
const DEFAULT_STAFF_LIMIT = 6;

const UPGRADE_CONTACT_EMAIL = "info@sulosystems.com";

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

    // Admin client -- bypasses RLS. Only reached after the authorization
    // check above, and never exposed to the caller.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: practice } = await adminClient
      .from("practices")
      .select("name, logo_url, subscription_plan")
      .eq("id", staffRow.practice_id)
      .single();

    const staffLimit = practice?.subscription_plan
      ? (PLAN_STAFF_LIMITS[practice.subscription_plan] ?? DEFAULT_STAFF_LIMIT)
      : DEFAULT_STAFF_LIMIT;

    const [{ count: activeStaffCount }, { count: pendingInviteCount }] = await Promise.all([
      adminClient
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("practice_id", staffRow.practice_id)
        .eq("active", true),
      adminClient
        .from("staff_invitations")
        .select("id", { count: "exact", head: true })
        .eq("practice_id", staffRow.practice_id)
        .eq("status", "pending"),
    ]);

    const currentCount = (activeStaffCount ?? 0) + (pendingInviteCount ?? 0);
    if (currentCount >= staffLimit) {
      const message =
        practice?.subscription_plan === "solo"
          ? "Your plan only supports 1 staff account. Upgrade to the Team plan to add more."
          : `Your subscription only allows up to ${staffLimit} staff accounts. To add more, contact Sulo Systems at ${UPGRADE_CONTACT_EMAIL}.`;
      return json({ error: message }, 403);
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

    // Carried as user_metadata so the (practice-agnostic, dashboard-configured)
    // Auth "Invite user" email template can render this practice's own
    // branding via {{ .Data.practice_name }} / {{ .Data.practice_logo_url }}
    // instead of a generic unbranded invite.
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        practice_name: practice?.name ?? "Your practice",
        practice_logo_url: practice?.logo_url ?? null,
        invite_type: "staff",
      },
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
