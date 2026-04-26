// telegram-notify edge function
// Sends a payment receipt photo to org admins' Telegram chat IDs
// Body: { payment_id: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendPhoto(chatId: string, photoUrl: string, caption: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
    }),
  });
  return await res.json();
}

async function sendMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.payment_id ?? "");
    if (!paymentId) return json({ error: "payment_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load payment + student profile + org
    const { data: payment, error: pErr } = await admin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (pErr || !payment) return json({ error: "Payment not found" }, 404);

    // Only the student who owns it (or org manager) can trigger
    if (payment.student_id !== callerId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", callerId);
      const isManager = (roles ?? []).some(
        (r) => ["admin", "administrator", "super_admin"].includes(r.role) &&
          (r.role === "super_admin" || r.organization_id === payment.organization_id)
      );
      if (!isManager) return json({ error: "Forbidden" }, 403);
    }

    const { data: student } = await admin
      .from("profiles")
      .select("full_name, username, phone")
      .eq("id", payment.student_id)
      .maybeSingle();

    const { data: org } = await admin
      .from("organizations")
      .select("name, telegram_chat_id")
      .eq("id", payment.organization_id)
      .maybeSingle();

    // Collect admin chat IDs (org managers in same org)
    const { data: orgAdmins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", payment.organization_id)
      .in("role", ["admin", "administrator"]);

    const adminIds = (orgAdmins ?? []).map((r) => r.user_id);
    const { data: adminProfiles } = adminIds.length
      ? await admin
          .from("profiles")
          .select("telegram_chat_id, full_name")
          .in("id", adminIds)
      : { data: [] as any[] };

    const chatIds = new Set<string>();
    (adminProfiles ?? []).forEach((p: any) => {
      if (p.telegram_chat_id) chatIds.add(String(p.telegram_chat_id));
    });
    if (org?.telegram_chat_id) chatIds.add(String(org.telegram_chat_id));

    if (chatIds.size === 0) {
      return json({
        ok: false,
        warning: "Tashkilot adminlarining Telegram chat ID si yo'q. Profile sozlamalaridan qo'shing.",
      });
    }

    // Build signed URL for receipt (private bucket)
    let photoUrl: string | null = null;
    if (payment.receipt_url) {
      // receipt_url is the storage path
      const { data: signed } = await admin.storage
        .from("receipts")
        .createSignedUrl(payment.receipt_url, 60 * 60 * 24 * 7); // 7 days
      photoUrl = signed?.signedUrl ?? null;
    }

    const studentName = student?.full_name || student?.username || "Talaba";
    const phone = student?.phone ? `\n📞 ${student.phone}` : "";
    const note = payment.note ? `\n📝 ${payment.note}` : "";
    const caption =
      `<b>💳 Yangi to'lov cheki</b>\n\n` +
      `🏫 ${org?.name ?? ""}\n` +
      `👤 ${studentName}${phone}\n` +
      `💰 <b>${Number(payment.amount).toLocaleString("uz-UZ")} ${payment.currency}</b>${note}\n\n` +
      `Tasdiqlash uchun saytga kiring.`;

    const results: any[] = [];
    for (const chatId of chatIds) {
      try {
        const r = photoUrl
          ? await sendPhoto(chatId, photoUrl, caption)
          : await sendMessage(chatId, caption);
        results.push({ chatId, ok: r.ok, description: r.description });
      } catch (e) {
        results.push({ chatId, ok: false, error: String((e as Error).message) });
      }
    }

    return json({ ok: true, sent: results.length, results });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
