import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Copy,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Send,
  Receipt,
} from "lucide-react";

const CARD_NUMBER = "9860 1701 0590 7738";
const CARD_OWNER = "Ahror Fayzullayev";
const CARD_RAW = "9860170105907738";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const statusMeta = (s: string) => {
  switch (s) {
    case "pending":
      return { label: "Kutilmoqda", icon: Clock, className: "bg-warning/15 text-warning border-warning/30" };
    case "completed":
    case "paid":
      return { label: "Tasdiqlandi", icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" };
    case "rejected":
    case "failed":
      return { label: "Rad etildi", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" };
    default:
      return { label: s, icon: Clock, className: "bg-muted text-muted-foreground border-border" };
  }
};

export default function StudentPayment() {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("id, amount, currency, status, note, receipt_url, created_at, reviewed_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setPayments((data ?? []) as Payment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const copyCard = async () => {
    await navigator.clipboard.writeText(CARD_RAW);
    toast.success("Karta raqami nusxalandi");
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Faqat rasm yuklang");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Rasm 5MB dan kichik bo'lishi kerak");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user?.id || !profile?.organization_id) {
      toast.error("Tashkilot aniqlanmadi");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt < 1000) {
      toast.error("To'g'ri summa kiriting (kamida 1 000)");
      return;
    }
    if (!file) {
      toast.error("Chek rasmini yuklang");
      return;
    }

    setSubmitting(true);
    try {
      // Upload receipt: {org_id}/{user_id}/{ts}.jpg
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${profile.organization_id}/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;

      // Insert payment row
      const { data: inserted, error: insErr } = await supabase
        .from("payments")
        .insert({
          student_id: user.id,
          organization_id: profile.organization_id,
          amount: amt,
          currency: "UZS",
          status: "pending",
          provider: "card_manual",
          note: note || null,
          receipt_url: path,
        })
        .select("id")
        .maybeSingle();
      if (insErr) throw insErr;

      // Trigger Telegram notification
      const { error: nErr } = await supabase.functions.invoke("telegram-notify", {
        body: { payment_id: inserted!.id },
      });
      if (nErr) {
        console.warn("Telegram notify error:", nErr);
        toast.warning("To'lov saqlandi, lekin Telegramga yuborilmadi");
      } else {
        toast.success("Chek yuborildi! Admin tasdiqlashini kuting.");
      }

      setAmount("");
      setNote("");
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">To'lov</h1>
        <p className="text-muted-foreground">Karta orqali to'lang va chekni yuklang</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Card display */}
        <Card className="p-6 bg-gradient-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <CreditCard className="h-8 w-8" />
              <Badge className="bg-white/20 border-0 text-primary-foreground">UZCARD</Badge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80 mb-1">Karta raqami</p>
              <p className="font-mono text-2xl tracking-wider">{CARD_NUMBER}</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-80 mb-1">Egasi</p>
                <p className="font-display font-semibold uppercase">{CARD_OWNER}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={copyCard}
                className="bg-white/15 hover:bg-white/25 border-0 text-primary-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> Nusxalash
              </Button>
            </div>
          </div>
        </Card>

        {/* Submission form */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Chekni yuborish</h2>
          </div>

          <div className="grid gap-2">
            <Label>Summa (UZS) *</Label>
            <Input
              type="number"
              min="1000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="masalan: 500000"
            />
          </div>

          <div className="grid gap-2">
            <Label>Izoh (ixtiyoriy)</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qaysi oy uchun, qaysi guruh va h.k."
            />
          </div>

          <div className="grid gap-2">
            <Label>Chek rasmi *</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={preview} alt="Chek" className="w-full max-h-64 object-contain bg-muted/30" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => fileRef.current?.click()}
                >
                  Almashtirish
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 hover:border-primary hover:bg-muted/30 transition-smooth flex flex-col items-center gap-2 text-muted-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Chek rasmini tanlang</span>
                <span className="text-xs">(JPG/PNG, 5MB gacha)</span>
              </button>
            )}
          </div>

          <Button
            variant="hero"
            className="w-full"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Telegramga yuborish
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Chek tashkilot adminining Telegramiga avtomatik yuboriladi
          </p>
        </Card>
      </div>

      {/* Payment history */}
      <div>
        <h2 className="font-display font-semibold text-xl mb-3">Mening to'lovlarim</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Hali to'lovlar yo'q
          </Card>
        ) : (
          <div className="grid gap-3">
            {payments.map((p) => {
              const m = statusMeta(p.status);
              const Icon = m.icon;
              return (
                <Card key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold">
                        {Number(p.amount).toLocaleString("uz-UZ")} {p.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("uz-UZ")}
                      </p>
                      {p.note && <p className="text-xs text-muted-foreground mt-1">{p.note}</p>}
                    </div>
                  </div>
                  <Badge className={m.className}>
                    <Icon className="h-3 w-3 mr-1" />
                    {m.label}
                  </Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
