import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Receipt,
} from "lucide-react";

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  currency: string;
  status: string;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
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

export default function OrgPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "rejected">("pending");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: pays } = await supabase
      .from("payments")
      .select("id, student_id, amount, currency, status, note, receipt_url, created_at, reviewed_at")
      .order("created_at", { ascending: false });
    const list = (pays ?? []) as Payment[];
    setPayments(list);

    const studentIds = Array.from(new Set(list.map((p) => p.student_id)));
    if (studentIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, full_name, phone")
        .in("id", studentIds);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("org-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = async (p: Payment) => {
    setSelected(p);
    setSignedUrl(null);
    if (p.receipt_url) {
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(p.receipt_url, 60 * 60);
      setSignedUrl(data?.signedUrl ?? null);
    }
  };

  const decide = async (status: "paid" | "rejected") => {
    if (!selected || !user?.id) return;
    setActing(true);
    const { error } = await supabase
      .from("payments")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        performed_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", selected.id);
    if (error) {
      toast.error(error.message);
    } else {
      // Notify student
      await supabase.rpc("send_notification", {
        _user_id: selected.student_id,
        _title: status === "paid" ? "✅ To'lov tasdiqlandi" : "❌ To'lov rad etildi",
        _body: `${Number(selected.amount).toLocaleString("uz-UZ")} ${selected.currency}`,
        _type: status === "paid" ? "success" : "warning",
        _link: "/student/payment",
      });
      toast.success(status === "paid" ? "Tasdiqlandi" : "Rad etildi");
      setSelected(null);
      load();
    }
    setActing(false);
  };

  const filtered = payments.filter((p) => {
    if (filter === "all") return true;
    if (filter === "paid") return p.status === "paid" || p.status === "completed";
    if (filter === "rejected") return p.status === "rejected" || p.status === "failed";
    return p.status === filter;
  });

  const stats = {
    pending: payments.filter((p) => p.status === "pending").length,
    paid: payments.filter((p) => p.status === "paid" || p.status === "completed").length,
    total: payments
      .filter((p) => p.status === "paid" || p.status === "completed")
      .reduce((s, p) => s + Number(p.amount), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">To'lovlar</h1>
        <p className="text-muted-foreground">Talabalar to'lov cheklarini ko'ring va tasdiqlang</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Kutilmoqda</p>
            <p className="font-display text-2xl font-bold">{stats.pending}</p>
          </div>
          <Clock className="h-8 w-8 text-warning" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tasdiqlangan</p>
            <p className="font-display text-2xl font-bold">{stats.paid}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-success" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Jami summa</p>
            <p className="font-display text-xl font-bold">
              {stats.total.toLocaleString("uz-UZ")} UZS
            </p>
          </div>
          <Receipt className="h-8 w-8 text-primary" />
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["pending", "paid", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "pending" && "Kutilayotgan"}
            {f === "paid" && "Tasdiqlangan"}
            {f === "rejected" && "Rad etilgan"}
            {f === "all" && "Hammasi"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">To'lovlar yo'q</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const m = statusMeta(p.status);
            const Icon = m.icon;
            const student = profiles[p.student_id];
            return (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {student?.full_name || student?.username || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Number(p.amount).toLocaleString("uz-UZ")} {p.currency} ·{" "}
                      {new Date(p.created_at).toLocaleString("uz-UZ")}
                    </p>
                    {p.note && <p className="text-xs text-muted-foreground mt-1 italic">"{p.note}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={m.className}>
                    <Icon className="h-3 w-3 mr-1" />
                    {m.label}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openDetails(p)}>
                    <Eye className="h-4 w-4" /> Ko'rish
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>To'lov tafsilotlari</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Talaba</p>
                  <p className="font-medium">
                    {profiles[selected.student_id]?.full_name ||
                      profiles[selected.student_id]?.username ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Summa</p>
                  <p className="font-display font-bold text-lg">
                    {Number(selected.amount).toLocaleString("uz-UZ")} {selected.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Telefon</p>
                  <p>{profiles[selected.student_id]?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Sana</p>
                  <p>{new Date(selected.created_at).toLocaleString("uz-UZ")}</p>
                </div>
              </div>

              {selected.note && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Izoh</p>
                  <p className="text-sm italic">"{selected.note}"</p>
                </div>
              )}

              {signedUrl ? (
                <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img src={signedUrl} alt="Chek" className="w-full max-h-96 object-contain" />
                </div>
              ) : selected.receipt_url ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Chek yuklanmagan</p>
              )}

              {selected.status === "pending" && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => decide("rejected")}
                    disabled={acting}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4" /> Rad etish
                  </Button>
                  <Button variant="hero" onClick={() => decide("paid")} disabled={acting}>
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Tasdiqlash
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
