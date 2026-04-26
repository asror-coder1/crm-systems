import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Search, Plus, Pencil, Trash2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Member {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  roles: string[];
}

interface Props {
  role: "teacher" | "student";
  title: string;
  description: string;
  /** Allow create/edit/delete actions (admin & administrator only). */
  canManage?: boolean;
}

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9_.-]+$/, "Faqat a-z, 0-9, _ . -"),
  password: z.string().min(6).max(100),
  full_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).or(z.literal("")),
  phone: z.string().trim().max(30).or(z.literal("")),
});

export default function MembersList({ role, title, description, canManage }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Member | null>(null);
  const [delTarget, setDelTarget] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone: "",
  });
  const [newPwd, setNewPwd] = useState("");

  const load = async () => {
    setLoading(true);
    if (canManage) {
      const { data, error } = await supabase.functions.invoke("org-users", {
        body: { action: "list" },
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const all = ((data?.users as Member[]) ?? []).filter((u) => u.roles?.includes(role));
      setMembers(all);
    } else {
      if (!profile?.organization_id) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", profile.organization_id)
        .eq("role", role);
      const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, full_name, email, phone, is_active")
        .in("id", ids);
      setMembers(
        ((profs as Omit<Member, "roles">[]) ?? []).map((p) => ({ ...p, roles: [role] })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, profile?.organization_id, canManage]);

  const resetForm = () => {
    setForm({ username: "", password: "", full_name: "", email: "", phone: "" });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      username: m.username,
      password: "",
      full_name: m.full_name || "",
      email: m.email || "",
      phone: m.phone || "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (editing) {
      setSubmitting(true);
      const { error } = await supabase.functions.invoke("org-users", {
        body: {
          action: "update",
          user_id: editing.id,
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          role,
        },
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Yangilandi");
      setDialogOpen(false);
      resetForm();
      load();
      return;
    }
    const parsed = createSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("org-users", {
      body: {
        action: "create",
        username: form.username.toLowerCase(),
        password: form.password,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        role,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foydalanuvchi yaratildi");
    setDialogOpen(false);
    resetForm();
    load();
  };

  const remove = async () => {
    if (!delTarget) return;
    const { error } = await supabase.functions.invoke("org-users", {
      body: { action: "delete", user_id: delTarget.id },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("O'chirildi");
    setDelTarget(null);
    load();
  };

  const resetPassword = async () => {
    if (!pwdTarget) return;
    if (newPwd.length < 6) {
      toast.error("Parol kamida 6 ta belgi");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("org-users", {
      body: { action: "reset_password", user_id: pwdTarget.id, password: newPwd },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Parol yangilandi");
    setPwdTarget(null);
    setNewPwd("");
  };

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.username.toLowerCase().includes(q) ||
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Qo'shish
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {members.length === 0 ? "Hech kim topilmadi" : "Qidiruv natijasi yo'q"}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const initials = (m.full_name || m.username)
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <Card
                key={m.id}
                className="p-4 flex flex-col gap-3 hover:shadow-glow transition-smooth"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-primary/30">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {m.full_name || m.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{m.username}
                    </p>
                    {m.email && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {m.email}
                      </p>
                    )}
                    {m.phone && (
                      <p className="text-xs text-muted-foreground truncate">
                        {m.phone}
                      </p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Tahrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setPwdTarget(m)}
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1" /> Parol
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDelTarget(m)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Tahrirlash" : "Yangi qo'shish"}</DialogTitle>
            <DialogDescription>
              {role === "teacher" ? "O'qituvchi" : "Talaba"} ma'lumotlari
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <>
                <div>
                  <Label>Username *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value.toLowerCase() })
                    }
                    placeholder="masalan: ali_v"
                  />
                </div>
                <div>
                  <Label>Parol *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </>
            )}
            {editing && (
              <div>
                <Label>Username</Label>
                <Input value={editing.username} disabled />
              </div>
            )}
            <div>
              <Label>To'liq ism *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Bekor
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Saqlash" : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={!!pwdTarget}
        onOpenChange={(v) => {
          if (!v) {
            setPwdTarget(null);
            setNewPwd("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Parolni almashtirish</DialogTitle>
            <DialogDescription>@{pwdTarget?.username}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Yangi parol</Label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Kamida 6 ta belgi"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdTarget(null)}>
              Bekor
            </Button>
            <Button onClick={resetPassword} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              O'zgartirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">@{delTarget?.username}</span> butunlay
              o'chiriladi. Bu amalni qaytarib bo'lmaydi.
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
