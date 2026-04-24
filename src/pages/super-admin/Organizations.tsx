import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Building2, Plus, Pencil, Trash2, MapPin, Mail, Phone, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import LogoUpload from "@/components/LogoUpload";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

const orgSchema = z.object({
  name: z.string().trim().min(2, "Nom kamida 2 ta belgi").max(100),
  slug: z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/, "Faqat kichik harflar, raqam va '-'"),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("Email noto'g'ri").max(100).optional().or(z.literal("")),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 50);

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "" as string,
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setOrgs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", address: "", phone: "", email: "", logo_url: "", is_active: true });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (o: Organization) => {
    setEditing(o);
    setForm({
      name: o.name,
      slug: o.slug,
      description: o.description ?? "",
      address: o.address ?? "",
      phone: o.phone ?? "",
      email: o.email ?? "",
      logo_url: o.logo_url ?? "",
      is_active: o.is_active,
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = orgSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const payload = {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      logo_url: form.logo_url || null,
      is_active: form.is_active,
    };
    const { error, data } = editing
      ? await supabase.from("organizations").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("organizations").insert(payload).select().single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // audit log
    await supabase.rpc("write_audit", {
      _action: editing ? "org.update" : "org.create",
      _entity_type: "organization",
      _entity_id: data?.id ?? editing?.id ?? null,
      _meta: { name: parsed.data.name },
    });
    toast.success(editing ? "Yangilandi" : "Qo'shildi");
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (o: Organization) => {
    const { error } = await supabase.from("organizations").delete().eq("id", o.id);
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("write_audit", {
        _action: "org.delete",
        _entity_type: "organization",
        _entity_id: o.id,
        _meta: { name: o.name },
      });
      toast.success("O'chirildi");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">O'quv markazlarini boshqarish</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi tashkilot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Tashkilotni tahrirlash" : "Yangi tashkilot"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <LogoUpload
                orgId={editing?.id}
                currentUrl={form.logo_url || null}
                onUploaded={(url) => setForm((f) => ({ ...f, logo_url: url }))}
              />
              <div className="grid gap-2">
                <Label>Nomi *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : slugify(name),
                    }));
                  }}
                  placeholder="PDP Academy"
                />
              </div>
              <div className="grid gap-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="pdp-academy"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tavsif</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Qisqacha tavsif"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+998..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="info@..."
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Manzil</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Toshkent, ..."
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Faol</p>
                  <p className="text-xs text-muted-foreground">Tashkilot tizimda ishlay oladimi</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
              <Button variant="hero" onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Saqlash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-lg">Hali tashkilot yo'q</p>
          <p className="text-sm text-muted-foreground mb-6">Birinchi o'quv markazingizni qo'shing</p>
          <Button variant="hero" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tashkilot qo'shish
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-5 hover:border-primary/40 transition-smooth group">
              <div className="flex items-start justify-between mb-3">
                {o.logo_url ? (
                  <div className="h-12 w-12 rounded-xl overflow-hidden border border-primary/30 shadow-glow">
                    <img src={o.logo_url} alt={o.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(o)}>
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
                        <AlertDialogDescription>
                          "{o.name}" tashkiloti va unga bog'liq ma'lumotlar o'chiriladi.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Bekor</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(o)} className="bg-destructive">
                          O'chirish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold">{o.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">/{o.slug}</p>
              {o.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{o.description}</p>
              )}
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {o.address && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {o.address}</p>}
                {o.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {o.phone}</p>}
                {o.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {o.email}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                <span className={`text-xs px-2 py-1 rounded-full ${o.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {o.is_active ? "Faol" : "Faolsiz"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
