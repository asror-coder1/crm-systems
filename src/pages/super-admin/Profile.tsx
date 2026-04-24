import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User as UserIcon, Lock, AtSign } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "F.I.O kamida 2 ta belgi").max(100),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().max(30).optional(),
});

const usernameSchema = z.string().regex(/^[a-z0-9_.-]{3,40}$/, "Username 3-40 belgi (a-z, 0-9, _.-)");

export default function Profile() {
  const { profile, refresh, user } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
      });
      setUsername(profile.username);
    }
  }, [profile]);

  const saveProfile = async () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    }).eq("id", profile!.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else { toast.success("Profil saqlandi"); refresh(); }
  };

  const saveUsername = async () => {
    const parsed = usernameSchema.safeParse(username.toLowerCase());
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (parsed.data === profile?.username) { toast.info("Username o'zgarmadi"); return; }
    setSavingUsername(true);
    // Use admin-users edge function (super_admin only) — for self, fallback to direct update of email + profile is not allowed here.
    // We use the same endpoint with our own user_id — RLS in edge function checks super_admin, which works for super admin.
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "change_username", user_id: profile!.id, username: parsed.data },
    });
    setSavingUsername(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Username yangilandi. Qayta kiring.");
    await supabase.auth.signOut();
  };

  const savePassword = async () => {
    if (pwd.next.length < 6) { toast.error("Yangi parol kamida 6 ta belgi"); return; }
    if (pwd.next !== pwd.confirm) { toast.error("Parollar mos emas"); return; }
    setSavingPwd(true);
    // Re-auth with current password for safety
    if (!profile) return;
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(profile.username),
      password: pwd.current,
    });
    if (signInErr) { toast.error("Joriy parol noto'g'ri"); setSavingPwd(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSavingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("Parol yangilandi"); setPwd({ current: "", next: "", confirm: "" }); }
  };

  const initials = (profile?.full_name || profile?.username || "S A").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  if (!profile) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Shaxsiy ma'lumotlaringizni boshqaring</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <AvatarUpload
            userId={profile.id}
            currentUrl={profile.avatar_url}
            initials={initials}
            onUploaded={() => refresh()}
            size="lg"
          />
          <div>
            <p className="font-display text-xl font-semibold">{profile.full_name || profile.username}</p>
            <p className="text-sm text-muted-foreground font-mono">@{profile.username}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" /> F.I.O</Label>
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+998..." />
          </div>
        </div>
        <div className="mt-5">
          <Button variant="hero" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Profilni saqlash
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AtSign className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Username</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="font-mono" />
          <Button variant="hero" onClick={saveUsername} disabled={savingUsername}>
            {savingUsername && <Loader2 className="h-4 w-4 animate-spin" />} Yangilash
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Username o'zgartirilsa qayta kirish talab qilinadi.</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Parolni o'zgartirish</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>Joriy parol</Label>
            <Input type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Yangi parol</Label>
            <Input type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Tasdiqlash</Label>
            <Input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>
        <div className="mt-5">
          <Button variant="hero" onClick={savePassword} disabled={savingPwd}>
            {savingPwd && <Loader2 className="h-4 w-4 animate-spin" />} Parolni saqlash
          </Button>
        </div>
      </div>
    </div>
  );
}
