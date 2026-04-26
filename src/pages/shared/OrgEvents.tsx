import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  color: string;
  all_day: boolean;
  organization_id: string | null;
  created_by: string | null;
}

interface Props {
  /** Allow create/edit/delete (admin & administrator). */
  canManage?: boolean;
}

const COLORS = [
  { id: "primary", cls: "bg-primary text-primary-foreground" },
  { id: "accent", cls: "bg-accent text-accent-foreground" },
  { id: "secondary", cls: "bg-secondary text-secondary-foreground" },
  { id: "emerald", cls: "bg-emerald-500 text-white" },
  { id: "amber", cls: "bg-amber-500 text-white" },
  { id: "rose", cls: "bg-rose-500 text-white" },
];

const colorClass = (id: string) =>
  COLORS.find((c) => c.id === id)?.cls || COLORS[0].cls;

function toLocalDT(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
function fromLocalDT(v: string) {
  return new Date(v).toISOString();
}

export default function OrgEvents({ canManage }: Props) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [delTarget, setDelTarget] = useState<EventRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location: "",
    color: "primary",
    all_day: false,
  });

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: true });
    if (profile?.organization_id) {
      query.or(
        `organization_id.eq.${profile.organization_id},organization_id.is.null`,
      );
    }
    const { data } = await query;
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id]);

  // Calendar grid
  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() + 6) % 7; // Mon-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = startDay; i > 0; i--) {
      cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({
        date: new Date(year, month, daysInMonth + (cells.length % 7)),
        inMonth: false,
      });
    }
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    events.forEach((e) => {
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => new Date(e.ends_at) >= new Date())
        .slice(0, 6),
    [events],
  );

  const resetForm = () => {
    const now = new Date();
    const inHr = new Date(now.getTime() + 60 * 60 * 1000);
    setForm({
      title: "",
      description: "",
      starts_at: toLocalDT(now.toISOString()),
      ends_at: toLocalDT(inHr.toISOString()),
      location: "",
      color: "primary",
      all_day: false,
    });
    setEditing(null);
  };

  const openCreate = (date?: Date) => {
    resetForm();
    if (date) {
      const start = new Date(date);
      start.setHours(9, 0, 0, 0);
      const end = new Date(date);
      end.setHours(10, 0, 0, 0);
      setForm((f) => ({
        ...f,
        starts_at: toLocalDT(start.toISOString()),
        ends_at: toLocalDT(end.toISOString()),
      }));
    }
    setOpen(true);
  };

  const openEdit = (e: EventRow) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description || "",
      starts_at: toLocalDT(e.starts_at),
      ends_at: toLocalDT(e.ends_at),
      location: e.location || "",
      color: e.color,
      all_day: e.all_day,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Sarlavha kiriting");
      return;
    }
    if (new Date(form.ends_at) < new Date(form.starts_at)) {
      toast.error("Tugash vaqti boshlanishidan oldin bo'lmasligi kerak");
      return;
    }
    setSubmitting(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      starts_at: fromLocalDT(form.starts_at),
      ends_at: fromLocalDT(form.ends_at),
      location: form.location.trim() || null,
      color: form.color,
      all_day: form.all_day,
      organization_id: profile?.organization_id ?? null,
    };
    const { error } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase
          .from("events")
          .insert({ ...payload, created_by: user?.id ?? null });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Yangilandi" : "Tadbir yaratildi");
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async () => {
    if (!delTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", delTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("O'chirildi");
    setDelTarget(null);
    load();
  };

  const monthLabel = cursor.toLocaleDateString("uz", {
    month: "long",
    year: "numeric",
  });
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Kalendar</h1>
          <p className="text-sm text-muted-foreground">
            Tashkilot tadbirlari va jadval
          </p>
        </div>
        {canManage && (
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-1" /> Tadbir
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Month grid */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-display font-semibold capitalize">{monthLabel}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            {["Du", "Se", "Cho", "Pa", "Ju", "Sh", "Ya"].map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {grid.map((cell, i) => {
                const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
                const dayEvents = eventsByDay.get(key) ?? [];
                const isToday = sameDay(cell.date, today);
                return (
                  <button
                    key={i}
                    onClick={() => canManage && openCreate(cell.date)}
                    disabled={!canManage}
                    className={cn(
                      "min-h-[72px] rounded-lg border border-border p-1.5 text-left transition-smooth",
                      cell.inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                      isToday && "ring-2 ring-primary",
                      canManage && "hover:border-primary/50 cursor-pointer",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isToday && "text-primary font-bold",
                      )}
                    >
                      {cell.date.getDate()}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (canManage) openEdit(e);
                          }}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded truncate",
                            colorClass(e.color),
                          )}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming list */}
        <Card className="p-4">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Kelgusi tadbirlar
          </h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Kelgusi tadbirlar yo'q
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => {
                const start = new Date(e.starts_at);
                return (
                  <li
                    key={e.id}
                    className="p-3 rounded-lg border border-border hover:border-primary/40 transition-smooth"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {start.toLocaleString("uz", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {e.location && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(e)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDelTarget(e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Tadbirni tahrirlash" : "Yangi tadbir"}
            </DialogTitle>
            <DialogDescription>Tadbir tafsilotlari</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Sarlavha *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Boshlanishi</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Tugashi</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Joy</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Kun bo'yi</Label>
              <Switch
                checked={form.all_day}
                onCheckedChange={(v) => setForm({ ...form, all_day: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Rang</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.id })}
                    className={cn(
                      "h-8 w-8 rounded-full transition-transform",
                      c.cls,
                      form.color === c.id && "ring-2 ring-offset-2 ring-primary scale-110",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Bekor
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Saqlash" : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tadbirni o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{delTarget?.title}</span> butunlay
              o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
