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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Pencil,
  Trash2,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Org { id: string; name: string }
interface EventItem {
  id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string;
  created_at: string;
}

const COLORS = [
  { name: "primary", bg: "bg-primary/15 text-primary border-primary/40", dot: "bg-primary" },
  { name: "secondary", bg: "bg-secondary/15 text-secondary border-secondary/40", dot: "bg-secondary" },
  { name: "accent", bg: "bg-accent/15 text-accent border-accent/40", dot: "bg-accent" },
  { name: "success", bg: "bg-success/15 text-success border-success/40", dot: "bg-success" },
  { name: "warning", bg: "bg-warning/15 text-warning border-warning/40", dot: "bg-warning" },
  { name: "destructive", bg: "bg-destructive/15 text-destructive border-destructive/40", dot: "bg-destructive" },
] as const;

const colorMeta = (c: string) => COLORS.find((x) => x.name === c) ?? COLORS[0];

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

const schema = z.object({
  title: z.string().trim().min(2, "Sarlavha kerak").max(150),
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  starts_at: z.string().min(1, "Boshlanish vaqti"),
  ends_at: z.string().min(1, "Tugash vaqti"),
  organization_id: z.string().optional(),
  color: z.string(),
  all_day: z.boolean(),
});

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    starts_at: "",
    ends_at: "",
    organization_id: "all",
    color: "primary",
    all_day: false,
  });

  const load = async () => {
    setLoading(true);
    const start = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString();
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString();
    const [evRes, orgRes] = await Promise.all([
      supabase.from("events").select("*").gte("starts_at", start).lte("starts_at", end).order("starts_at"),
      supabase.from("organizations").select("id, name").order("name"),
    ]);
    if (evRes.error) toast.error(evRes.error.message);
    else setEvents((evRes.data ?? []) as EventItem[]);
    if (orgRes.data) setOrgs(orgRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [cursor]);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  // Build calendar grid (Monday-first)
  const calendar = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const days: Date[] = [];
    for (let i = startOffset; i > 0; i--) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), 1 - i));
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (days.length % 7 !== 0 || days.length < 42) {
      const lastDay = days[days.length - 1];
      days.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
    }
    return days.slice(0, 42);
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((e) => {
      const d = new Date(e.starts_at);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    });
    return map;
  }, [events]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const today = new Date();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => new Date(e.starts_at).getTime() >= now).slice(0, 6);
  }, [events]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      location: "",
      starts_at: "",
      ends_at: "",
      organization_id: "all",
      color: "primary",
      all_day: false,
    });
  };

  const openCreate = (forDay?: Date) => {
    resetForm();
    if (forDay) {
      const start = new Date(forDay);
      start.setHours(9, 0, 0, 0);
      const end = new Date(forDay);
      end.setHours(10, 0, 0, 0);
      setForm((f) => ({ ...f, starts_at: toLocalInput(start.toISOString()), ends_at: toLocalInput(end.toISOString()) }));
    } else {
      const start = new Date();
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 1);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setForm((f) => ({ ...f, starts_at: toLocalInput(start.toISOString()), ends_at: toLocalInput(end.toISOString()) }));
    }
    setOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description ?? "",
      location: e.location ?? "",
      starts_at: toLocalInput(e.starts_at),
      ends_at: toLocalInput(e.ends_at),
      organization_id: e.organization_id ?? "all",
      color: e.color,
      all_day: e.all_day,
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (new Date(parsed.data.ends_at) < new Date(parsed.data.starts_at)) {
      toast.error("Tugash vaqti boshlanishdan keyin bo'lishi kerak"); return;
    }
    setSubmitting(true);
    const payload = {
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
      organization_id: parsed.data.organization_id === "all" ? null : parsed.data.organization_id,
      color: parsed.data.color,
      all_day: parsed.data.all_day,
      created_by: user?.id ?? null,
    };
    const { error, data } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("events").insert(payload).select().single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("write_audit", {
      _action: editing ? "event.update" : "event.create",
      _entity_type: "event",
      _entity_id: data?.id ?? editing?.id ?? "",
      _meta: { title: payload.title },
    });
    toast.success(editing ? "Yangilandi" : "Tadbir qo'shildi");
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (e: EventItem) => {
    const { error } = await supabase.from("events").delete().eq("id", e.id);
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("write_audit", { _action: "event.delete", _entity_type: "event", _entity_id: e.id, _meta: { title: e.title } });
      toast.success("O'chirildi");
      load();
    }
  };

  const selectedEvents = selectedDay ? eventsByDay.get(dayKey(selectedDay)) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Kalendar</h1>
          <p className="text-muted-foreground">Tadbirlar va rejalashtirish</p>
        </div>
        <Button variant="hero" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> Yangi tadbir
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="glass rounded-2xl p-4 md:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-2xl font-bold">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
              <p className="text-xs text-muted-foreground">{events.length} ta tadbir</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); }}>
                Bugun
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-[10px] uppercase tracking-wider text-muted-foreground py-1">{w}</div>
            ))}
          </div>

          {loading ? (
            <div className="h-[460px] grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = sameDay(d, today);
                const isSelected = selectedDay && sameDay(d, selectedDay);
                const dayEvents = eventsByDay.get(dayKey(d)) ?? [];
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(d)}
                    onDoubleClick={() => openCreate(d)}
                    className={cn(
                      "min-h-[72px] md:min-h-[88px] p-1.5 rounded-lg border text-left transition-smooth",
                      "hover:border-primary/40 hover:bg-muted/30",
                      inMonth ? "border-border bg-card/30" : "border-transparent text-muted-foreground/50",
                      isToday && "ring-1 ring-primary",
                      isSelected && "bg-primary/10 border-primary",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-medium", isToday && "h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center")}>
                        {d.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] text-muted-foreground">{dayEvents.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => {
                        const c = colorMeta(e.color);
                        return (
                          <div key={e.id} className={cn("text-[10px] truncate px-1 py-0.5 rounded border", c.bg)}>
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel: selected day or upcoming */}
        <div className="glass rounded-2xl p-6 space-y-4">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Tanlangan kun</p>
                  <p className="font-display text-lg font-semibold">
                    {selectedDay.getDate()} {MONTHS[selectedDay.getMonth()]}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedDay(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => openCreate(selectedDay)}>
                <Plus className="h-4 w-4" /> Bu kunga tadbir
              </Button>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Tadbirlar yo'q</p>
                ) : selectedEvents.map((e) => {
                  const c = colorMeta(e.color);
                  return (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-3", c.bg)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{e.title}</p>
                          {e.organization_id && <p className="text-[10px] opacity-70 truncate">{orgMap.get(e.organization_id)}</p>}
                        </div>
                        <div className="flex gap-0.5">
                          <button onClick={() => openEdit(e)} className="p-1 hover:bg-foreground/10 rounded"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => remove(e)} className="p-1 hover:bg-destructive/20 rounded"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[10px] opacity-80">
                        <Clock className="h-3 w-3" />
                        {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(e.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {e.location && <p className="mt-1 text-[10px] flex items-center gap-1 opacity-80"><MapPin className="h-3 w-3" />{e.location}</p>}
                      {e.description && <p className="mt-1.5 text-xs opacity-90 line-clamp-2">{e.description}</p>}
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Yaqin tadbirlar</p>
                <p className="font-display text-lg font-semibold">Keyingi 6 ta</p>
              </div>
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {upcoming.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    Hech qanday rejalashtirilgan tadbir yo'q
                  </div>
                ) : upcoming.map((e) => {
                  const c = colorMeta(e.color);
                  const d = new Date(e.starts_at);
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedDay(d)}
                      className={cn("w-full text-left rounded-xl border p-3 hover:border-primary/40 transition-smooth", c.bg)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center shrink-0">
                          <p className="text-[10px] uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                          <p className="font-display text-xl font-bold leading-none">{d.getDate()}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{e.title}</p>
                          <p className="text-[10px] opacity-70 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Tadbirni tahrirlash" : "Yangi tadbir"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Sarlavha *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Yig'ilish, dars..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Boshlanish *</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tugash *</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Tashkilot</Label>
                <Select value={form.organization_id} onValueChange={(v) => setForm((f) => ({ ...f, organization_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha (umumiy)</SelectItem>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Rang</Label>
                <div className="flex gap-1.5 h-10 items-center">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c.name }))}
                      className={cn("h-7 w-7 rounded-full border-2 transition-smooth", c.dot, form.color === c.name ? "border-foreground scale-110" : "border-transparent")}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Joy</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Onlayn, ofis..." />
            </div>
            <div className="grid gap-2">
              <Label>Tavsif</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Qisqacha..." />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Kun bo'yi</p>
                <p className="text-xs text-muted-foreground">Vaqt belgilanmagan tadbir</p>
              </div>
              <Switch checked={form.all_day} onCheckedChange={(v) => setForm((f) => ({ ...f, all_day: v }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive mr-auto">
                    <Trash2 className="h-4 w-4" /> O'chirish
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                    <AlertDialogDescription>"{editing.title}" tadbiri o'chiriladi.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Bekor</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { remove(editing); setOpen(false); }} className="bg-destructive">O'chirish</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button variant="hero" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
