import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, roleLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Loader2, KeyRound, Search } from "lucide-react";

interface UserRow {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  is_active: boolean;
  roles: AppRole[];
  created_at: string;
}

interface Org {
  id: string;
  name: string;
}

const createSchema = z.object({
  username: z.string().regex(/^[a-z0-9_.-]{3,40}$/, "Username 3-40 belgi (a-z, 0-9, _.-)"),
  password: z.string().min(6, "Parol kamida 6 ta belgi").max(100),
  full_name: z.string().min(2, "F.I.O kiriting").max(100),
  role: z.enum(["super_admin", "admin", "administrator", "teacher", "student"]),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().max(30).optional(),
  organization_id: z.string().uuid().optional().or(z.literal("")),
});

interface Props {
  filterRole?: AppRole;
  title: string;
  description: string;
}

export default function UsersManager({ filterRole, title, description }: Props) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: (filterRole ?? "student") as AppRole,
    email: "",
    phone: "",
    organization_id: "",
  });

  const load = async () => {
    setLoading(true);
    const [usersRes, orgsRes] = await Promise.all([
      supabase.functions.invoke("admin-users", { body: { action: "list" } }),
      supabase.from("organizations").select("id, name").order("name"),
    ]);
    if (usersRes.error) toast.error(usersRes.error.message);
    else setUsers((usersRes.data?.users ?? []) as UserRow[]);
    setOrgs((orgsRes.data ?? []) as Org[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setEditing(null);
    setForm({
      username: "",
      password: "",
      full_name: "",
      role: (filterRole ?? "student") as AppRole,
      email: "",
      phone: "",
      organization_id: "",
    });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: "",
      full_name: u.full_name ?? "",
      role: (u.roles[0] ?? "student") as AppRole,
      email: u.email ?? "",
      phone: u.phone ?? "",
      organization_id: u.organization_id ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    if (editing) {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update",
          user_id: editing.id,
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          organization_id: form.organization_id || null,
          role: form.role,
        },
      });
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      // optional username change
      if (form.username && form.username !== editing.username) {
        const { error: ue } = await supabase.functions.invoke("admin-users", {
          body: { action: "change_username", user_id: editing.id, username: form.username },
        });
        if (ue) { toast.error(ue.message); setSubmitting(false); return; }
      }
      await supabase.rpc("write_audit", {
        _action: "user.update",
        _entity_type: "user",
        _entity_id: editing.id,
        _meta: { username: editing.username, role: form.role },
      });
      toast.success("Yangilandi");
    } else {
      const parsed = createSchema.safeParse(form);
      if (!parsed.success) { toast.error(parsed.error.errors[0].message); setSubmitting(false); return; }
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "create", ...parsed.data, organization_id: parsed.data.organization_id || null },
      });
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      await supabase.rpc("write_audit", {
        _action: "user.create",
        _entity_type: "user",
        _entity_id: null,
        _meta: { username: parsed.data.username, role: parsed.data.role },
      });
      toast.success("Foydalanuvchi qo'shildi");
    }
    setSubmitting(false);
    setOpen(false);
    reset();
    load();
  };

  const remove = async (u: UserRow) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", user_id: u.id },
    });
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("write_audit", {
        _action: "user.delete",
        _entity_type: "user",
        _entity_id: u.id,
        _meta: { username: u.username },
      });
      toast.success("O'chirildi");
      load();
    }
  };

  const resetPwd = async () => {
    if (!pwdTarget || newPassword.length < 6) { toast.error("Parol kamida 6 ta belgi"); return; }
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "reset_password", user_id: pwdTarget.id, password: newPassword },
    });
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("write_audit", {
        _action: "user.reset_password",
        _entity_type: "user",
        _entity_id: pwdTarget.id,
        _meta: { username: pwdTarget.username },
      });
      toast.success("Parol yangilandi");
      setPwdOpen(false);
      setNewPassword("");
    }
  };

  const filtered = users
    .filter((u) => !filterRole || u.roles.includes(filterRole))
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi foydalanuvchi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Tahrirlash" : "Yangi foydalanuvchi"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Username *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                    placeholder="username"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{editing ? "Parol (bo'sh — o'zgarmaydi)" : "Parol *"}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    disabled={!!editing}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>F.I.O *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ism Familiya"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Role *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}
                    disabled={!!filterRole}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["super_admin","admin","administrator","teacher","student"] as AppRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{roleLabel[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tashkilot</Label>
                  <Select
                    value={form.organization_id || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, organization_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Yo'q —</SelectItem>
                      {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="real@email.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+998..."
                  />
                </div>
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

      <div className="glass rounded-2xl p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Username, F.I.O yoki email bo'yicha qidirish..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email / Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Foydalanuvchi topilmadi</TableCell></TableRow>
                ) : filtered.map((u) => {
                  const initials = (u.full_name || u.username).split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-primary/20">
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                              {roleLabel[r]}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <p>{u.email || "—"}</p>
                        <p className="text-xs">{u.phone || ""}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                          {u.is_active ? "Faol" : "Faolsiz"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setPwdTarget(u); setPwdOpen(true); }} title="Parolni o'zgartirish">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.id !== me?.id && (
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
                                    "{u.full_name || u.username}" foydalanuvchi tizimdan o'chiriladi.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Bekor</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove(u)} className="bg-destructive">O'chirish</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parolni yangilash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Yangi parol</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kamida 6 ta belgi" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)}>Bekor</Button>
            <Button variant="hero" onClick={resetPwd}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
