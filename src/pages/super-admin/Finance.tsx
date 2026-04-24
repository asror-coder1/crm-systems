import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  TrendingUp,
  CircleCheck,
  Clock,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Org { id: string; name: string }
interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "draft", label: "Qoralama", color: "bg-muted text-muted-foreground", icon: FileText },
  { value: "sent", label: "Yuborilgan", color: "bg-primary/15 text-primary", icon: Clock },
  { value: "paid", label: "To'langan", color: "bg-success/15 text-success", icon: CircleCheck },
  { value: "overdue", label: "Muddati o'tgan", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
  { value: "cancelled", label: "Bekor qilingan", color: "bg-muted text-muted-foreground line-through", icon: Trash2 },
] as const;

const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

const schema = z.object({
  organization_id: z.string().uuid("Tashkilot tanlang"),
  invoice_number: z.string().trim().min(1, "Hisob raqami kerak").max(50),
  amount: z.coerce.number().min(0, "Manfiy bo'lmasin"),
  currency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  description: z.string().max(500).optional(),
  due_date: z.string().optional(),
});

const fmtAmount = (n: number, ccy: string) =>
  new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n) + " " + ccy;

export default function Finance() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Invoice["status"]>("all");
  const [form, setForm] = useState({
    organization_id: "",
    invoice_number: "",
    amount: "",
    currency: "UZS",
    status: "draft" as Invoice["status"],
    description: "",
    due_date: "",
  });

  const load = async () => {
    setLoading(true);
    const [invRes, orgRes] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name").order("name"),
    ]);
    if (invRes.error) toast.error(invRes.error.message);
    else setItems((invRes.data ?? []) as Invoice[]);
    if (orgRes.error) toast.error(orgRes.error.message);
    else setOrgs(orgRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      const orgName = (orgMap.get(i.organization_id) ?? "").toLowerCase();
      return (
        i.invoice_number.toLowerCase().includes(q) ||
        orgName.includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filter, orgMap]);

  const stats = useMemo(() => {
    const totalRevenue = items.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const pending = items.filter((i) => i.status === "sent").reduce((s, i) => s + Number(i.amount), 0);
    const overdue = items.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0);
    return { totalRevenue, pending, overdue, count: items.length };
  }, [items]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    const labels = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    items.filter((i) => i.status === "paid" && i.paid_at).forEach((i) => {
      const d = new Date(i.paid_at!);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + Number(i.amount));
    });
    return Array.from(map.entries()).map(([k, v]) => {
      const [, m] = k.split("-").map(Number);
      return { month: labels[m], amount: v };
    });
  }, [items]);

  const statusDistribution = useMemo(() => {
    const colors: Record<string, string> = {
      paid: "hsl(var(--success))",
      sent: "hsl(var(--primary))",
      overdue: "hsl(var(--destructive))",
      draft: "hsl(var(--muted-foreground))",
      cancelled: "hsl(var(--muted-foreground))",
    };
    return STATUSES.map((s) => ({
      name: s.label,
      value: items.filter((i) => i.status === s.value).length,
      color: colors[s.value],
    })).filter((s) => s.value > 0);
  }, [items]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      organization_id: "",
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      amount: "",
      currency: "UZS",
      status: "draft",
      description: "",
      due_date: "",
    });
  };

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      organization_id: inv.organization_id,
      invoice_number: inv.invoice_number,
      amount: String(inv.amount),
      currency: inv.currency,
      status: inv.status,
      description: inv.description ?? "",
      due_date: inv.due_date ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const payload = {
      organization_id: parsed.data.organization_id,
      invoice_number: parsed.data.invoice_number,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      status: parsed.data.status,
      description: parsed.data.description || null,
      due_date: parsed.data.due_date || null,
      paid_at: parsed.data.status === "paid" ? (editing?.paid_at ?? new Date().toISOString()) : null,
      created_by: user?.id ?? null,
    };
    const { error, data } = editing
      ? await supabase.from("invoices").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("invoices").insert(payload).select().single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("write_audit", {
      _action: editing ? "invoice.update" : "invoice.create",
      _entity_type: "invoice",
      _entity_id: data?.id ?? editing?.id ?? "",
      _meta: { invoice_number: payload.invoice_number, amount: payload.amount },
    });
    toast.success(editing ? "Yangilandi" : "Hisob qo'shildi");
    setOpen(false);
    resetForm();
    load();
  };

  const markPaid = async (inv: Invoice) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", inv.id);
    if (error) toast.error(error.message);
    else { toast.success("To'langan deb belgilandi"); load(); }
  };

  const remove = async (inv: Invoice) => {
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("write_audit", {
        _action: "invoice.delete",
        _entity_type: "invoice",
        _entity_id: inv.id,
        _meta: { invoice_number: inv.invoice_number },
      });
      toast.success("O'chirildi");
      load();
    }
  };

  const cards = [
    { label: "Jami daromad", value: fmtAmount(stats.totalRevenue, "UZS"), icon: TrendingUp, accent: "from-success to-success" },
    { label: "Kutilmoqda", value: fmtAmount(stats.pending, "UZS"), icon: Clock, accent: "from-primary to-primary-glow" },
    { label: "Muddati o'tgan", value: fmtAmount(stats.overdue, "UZS"), icon: AlertCircle, accent: "from-destructive to-destructive" },
    { label: "Hisoblar soni", value: stats.count.toString(), icon: FileText, accent: "from-secondary to-secondary-glow" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Moliya</h1>
          <p className="text-muted-foreground">Tashkilotlar uchun hisob-fakturalar</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi hisob
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Hisobni tahrirlash" : "Yangi hisob"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Tashkilot *</Label>
                <Select value={form.organization_id} onValueChange={(v) => setForm((f) => ({ ...f, organization_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Raqam *</Label>
                  <Input value={form.invoice_number} onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Holat</Label>
                  <Select value={form.status} onValueChange={(v: Invoice["status"]) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2 col-span-2">
                  <Label>Summa *</Label>
                  <Input type="number" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Valyuta</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UZS">UZS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="RUB">RUB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>To'lov muddati</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tavsif</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Hisob haqida..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
              <Button variant="hero" onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Saqlash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 md:p-5"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.accent} grid place-items-center shadow-glow`}>
              <c.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="mt-3 text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            {loading ? <Skeleton className="h-7 w-20 mt-1" /> : (
              <p className="font-display text-lg md:text-2xl font-bold mt-1 truncate">{c.value}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold mb-4">Oylik daromad (UZS)</h3>
          {loading ? <Skeleton className="h-[260px] w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  formatter={(v: number) => fmtAmount(v, "UZS")}
                />
                <Bar dataKey="amount" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Holatlar</h3>
          {loading ? <Skeleton className="h-[260px] w-full" /> : statusDistribution.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDistribution} innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value">
                  {statusDistribution.map((e, i) => <Cell key={i} fill={e.color} stroke="hsl(var(--background))" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters + table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9" />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Hammasi</TabsTrigger>
              <TabsTrigger value="sent">Kutilmoqda</TabsTrigger>
              <TabsTrigger value="paid">To'langan</TabsTrigger>
              <TabsTrigger value="overdue">Muddati o'tgan</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {loading ? (
          <div className="p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-display">Hisoblar topilmadi</p>
            <p className="text-sm text-muted-foreground">Yangi hisob qo'shing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raqam</TableHead>
                  <TableHead>Tashkilot</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Muddat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const m = statusMeta(inv.status);
                  const Icon = m.icon;
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium">{orgMap.get(inv.organization_id) ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtAmount(Number(inv.amount), inv.currency)}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", m.color)}>
                          <Icon className="h-3 w-3" />
                          {m.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {inv.status !== "paid" && (
                            <Button size="icon" variant="ghost" onClick={() => markPaid(inv)} title="To'landi" className="text-success">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                                <AlertDialogDescription>{inv.invoice_number} hisobi o'chiriladi.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Bekor</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(inv)} className="bg-destructive">O'chirish</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
