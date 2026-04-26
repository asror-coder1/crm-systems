import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AvatarUpload from "@/components/AvatarUpload";
import { roleLabel } from "@/lib/auth";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Ism kiritilishi shart").max(100),
  email: z.string().trim().email("Email noto'g'ri").max(255).or(z.literal("")),
  phone: z.string().trim().max(30).or(z.literal("")),
});

export default function SharedProfile() {
  const { profile, refresh, role, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil yangilandi");
    refresh();
  };

  const savePassword = async () => {
    if (pwd.next.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgi");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error("Parollar mos emas");
      return;
    }
    if (!user?.email) return;
    setSavingPwd(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwd.current,
    });
    if (signErr) {
      setSavingPwd(false);
      toast.error("Joriy parol noto'g'ri");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSavingPwd(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Parol o'zgartirildi");
    setPwd({ current: "", next: "", confirm: "" });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          {role && roleLabel[role]} • @{profile.username}
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <AvatarUpload
              userId={profile.id}
              currentUrl={profile.avatar_url}
              initials={(profile.full_name || profile.username).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              onUploaded={() => refresh()}
            />
            <div>
              <p className="font-display font-semibold text-lg">
                {profile.full_name || profile.username}
              </p>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>To'liq ism</Label>
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

          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Saqlash
          </Button>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 space-y-4">
          <h3 className="font-display font-semibold text-lg">Parolni o'zgartirish</h3>
          <div className="space-y-3">
            <div>
              <Label>Joriy parol</Label>
              <Input
                type="password"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Yangi parol</Label>
                <Input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                />
              </div>
              <div>
                <Label>Tasdiqlash</Label>
                <Input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                />
              </div>
            </div>
          </div>
          <Button onClick={savePassword} disabled={savingPwd} variant="secondary">
            {savingPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            O'zgartirish
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
