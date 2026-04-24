// admin-users edge function — SuperAdmin only
// Actions: create | update | delete | reset_password | list
// Verifies caller has super_admin role before performing privileged ops.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SYNTHETIC_DOMAIN = "asror.local";

const ROLES = ["super_admin", "admin", "administrator", "teacher", "student"] as const;
type Role = typeof ROLES[number];

function isValidUsername(u: string) {
  return typeof u === "string" && /^[a-z0-9_.-]{3,40}$/.test(u);
}
function isStrongPassword(p: string) {
  return typeof p === "string" && p.length >= 6 && p.length <= 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    // Verify JWT via getClaims (supports ES256 signing keys)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const user = { id: claimsData.claims.sub as string };

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roleList = (roles ?? []).map((r) => r.role);
    if (!roleList.includes("super_admin")) {
      return json({ error: "Forbidden: super_admin required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      const { data: allRoles } = await admin.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      (allRoles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const result = (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
      }));
      return json({ users: result });
    }

    if (action === "create") {
      const { username, password, full_name, email, phone, role, organization_id } = body;
      if (!isValidUsername(username)) return json({ error: "Username noto'g'ri (a-z, 0-9, _.-, 3-40)" }, 400);
      if (!isStrongPassword(password)) return json({ error: "Parol 6-100 belgi bo'lishi kerak" }, 400);
      if (!ROLES.includes(role)) return json({ error: "Role noto'g'ri" }, 400);
      const syntheticEmail = `${String(username).toLowerCase()}@${SYNTHETIC_DOMAIN}`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: String(username).toLowerCase(),
          full_name: full_name ?? username,
          role,
          organization_id: organization_id ?? null,
        },
      });
      if (createErr) return json({ error: createErr.message }, 400);
      // Trigger creates profile + role automatically; update extra fields:
      if (created.user) {
        await admin.from("profiles").update({
          email: email ?? null,
          phone: phone ?? null,
        }).eq("id", created.user.id);
      }
      return json({ ok: true, user_id: created.user?.id });
    }

    if (action === "update") {
      const { user_id, full_name, email, phone, organization_id, role, is_active } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const updates: Record<string, unknown> = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (organization_id !== undefined) updates.organization_id = organization_id;
      if (is_active !== undefined) updates.is_active = is_active;
      if (Object.keys(updates).length) {
        const { error } = await admin.from("profiles").update(updates).eq("id", user_id);
        if (error) return json({ error: error.message }, 400);
      }
      if (role && ROLES.includes(role)) {
        await admin.from("user_roles").delete().eq("user_id", user_id);
        await admin.from("user_roles").insert({ user_id, role, organization_id: organization_id ?? null });
      }
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !isStrongPassword(password)) return json({ error: "user_id va parol kerak" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "change_username") {
      const { user_id, username } = body;
      if (!user_id || !isValidUsername(username)) return json({ error: "Username noto'g'ri" }, 400);
      const newEmail = `${String(username).toLowerCase()}@${SYNTHETIC_DOMAIN}`;
      const { error: updErr } = await admin.auth.admin.updateUserById(user_id, { email: newEmail });
      if (updErr) return json({ error: updErr.message }, 400);
      const { error: profErr } = await admin.from("profiles").update({ username: String(username).toLowerCase() }).eq("id", user_id);
      if (profErr) return json({ error: profErr.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      if (user_id === user.id) return json({ error: "O'zingizni o'chira olmaysiz" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
