// org-users edge function — Admin / Administrator only
// Manages teachers and students within their own organization.
// Actions: list | create | update | delete | reset_password

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

const ALLOWED_TARGET_ROLES = ["teacher", "student"] as const;
type TargetRole = typeof ALLOWED_TARGET_ROLES[number];

function isValidUsername(u: string) {
  return typeof u === "string" && /^[a-z0-9_.-]{3,40}$/.test(u);
}
function isStrongPassword(p: string) {
  return typeof p === "string" && p.length >= 6 && p.length <= 100;
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Caller must be admin or administrator of an org
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", callerId);
    const managerRow = (callerRoles ?? []).find(
      (r) => (r.role === "admin" || r.role === "administrator") && r.organization_id,
    );
    if (!managerRow) return json({ error: "Forbidden: tashkilot boshqaruvchisi emassiz" }, 403);
    const orgId = managerRow.organization_id as string;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // Helper: ensure target user belongs to caller's org
    async function assertSameOrgTarget(user_id: string) {
      const { data: prof } = await admin
        .from("profiles")
        .select("organization_id")
        .eq("id", user_id)
        .maybeSingle();
      if (!prof || prof.organization_id !== orgId) {
        return "Foydalanuvchi sizning tashkilotingizga tegishli emas";
      }
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id);
      const list = (roles ?? []).map((r) => r.role);
      if (list.includes("super_admin") || list.includes("admin")) {
        return "Bu foydalanuvchini boshqarish huquqingiz yo'q";
      }
      return null;
    }

    if (action === "list") {
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", orgId)
        .in("role", ALLOWED_TARGET_ROLES);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return json({ users: [] });
      const { data: profiles } = await admin
        .from("profiles")
        .select("*")
        .in("id", ids);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const users = (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
      }));
      return json({ users });
    }

    if (action === "create") {
      const { username, password, full_name, email, phone, role } = body;
      if (!isValidUsername(username)) return json({ error: "Username noto'g'ri" }, 400);
      if (!isStrongPassword(password)) return json({ error: "Parol 6-100 belgi" }, 400);
      if (!ALLOWED_TARGET_ROLES.includes(role as TargetRole)) {
        return json({ error: "Faqat teacher yoki student yaratish mumkin" }, 400);
      }
      const syntheticEmail = `${String(username).toLowerCase()}@${SYNTHETIC_DOMAIN}`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: String(username).toLowerCase(),
          full_name: full_name ?? username,
          role,
          organization_id: orgId,
        },
      });
      if (createErr) return json({ error: createErr.message }, 400);
      if (created.user) {
        await admin
          .from("profiles")
          .update({ email: email ?? null, phone: phone ?? null })
          .eq("id", created.user.id);
      }
      return json({ ok: true, user_id: created.user?.id });
    }

    if (action === "update") {
      const { user_id, full_name, email, phone, role, is_active } = body;
      if (!user_id) return json({ error: "user_id kerak" }, 400);
      const err = await assertSameOrgTarget(user_id);
      if (err) return json({ error: err }, 403);
      const updates: Record<string, unknown> = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (is_active !== undefined) updates.is_active = is_active;
      if (Object.keys(updates).length) {
        const { error } = await admin.from("profiles").update(updates).eq("id", user_id);
        if (error) return json({ error: error.message }, 400);
      }
      if (role && ALLOWED_TARGET_ROLES.includes(role as TargetRole)) {
        await admin.from("user_roles").delete().eq("user_id", user_id);
        await admin
          .from("user_roles")
          .insert({ user_id, role, organization_id: orgId });
      }
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !isStrongPassword(password)) {
        return json({ error: "user_id va parol kerak" }, 400);
      }
      const err = await assertSameOrgTarget(user_id);
      if (err) return json({ error: err }, 403);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id kerak" }, 400);
      if (user_id === callerId) return json({ error: "O'zingizni o'chira olmaysiz" }, 400);
      const err = await assertSameOrgTarget(user_id);
      if (err) return json({ error: err }, 403);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
