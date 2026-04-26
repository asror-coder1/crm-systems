import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Users, GraduationCap, UserCog, Activity, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OrgInfo {
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [counts, setCounts] = useState({ teachers: 0, students: 0, admins: 0, events: 0 });

  useEffect(() => {
    (async () => {
      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }
      const orgId = profile.organization_id;
      const [orgRes, rolesRes, eventsRes] = await Promise.all([
        supabase.from("organizations").select("name, slug, description, address, phone, email").eq("id", orgId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("organization_id", orgId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      setOrg((orgRes.data as OrgInfo) ?? null);
      const list = (rolesRes.data ?? []).map((r: { role: string }) => r.role);
      setCounts({
        teachers: list.filter((r) => r === "teacher").length,
        students: list.filter((r) => r === "student").length,
        admins: list.filter((r) => r === "admin" || r === "administrator").length,
        events: eventsRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, [profile?.organization_id]);

  const stats: StatCard[] = [
    { label: "O'qituvchilar", value: counts.teachers, icon: GraduationCap, color: "primary" },
    { label: "Talabalar", value: counts.students, icon: Users, color: "accent" },
    { label: "Administratorlar", value: counts.admins, icon: UserCog, color: "secondary" },
    { label: "Tadbirlar", value: counts.events, icon: CalendarIcon, color: "success" },
  ];

  return (
    <RoleDashboard
      title="Tashkilot paneli"
      description={org ? `${org.name} boshqaruvi` : "Tashkilotingiz statistikasi"}
      stats={stats}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Tashkilot ma'lumotlari
            </h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : org ? (
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Nomi</dt>
                  <dd className="font-medium">{org.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Slug</dt>
                  <dd className="font-mono text-xs">{org.slug}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Email</dt>
                  <dd>{org.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">Telefon</dt>
                  <dd>{org.phone || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs uppercase">Manzil</dt>
                  <dd>{org.address || "—"}</dd>
                </div>
                {org.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs uppercase">Tavsif</dt>
                    <dd className="text-muted-foreground">{org.description}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Tashkilot biriktirilmagan</p>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 h-full">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" /> Tezkor amallar
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="p-3 rounded-lg bg-muted/40">O'qituvchi qo'shish</li>
              <li className="p-3 rounded-lg bg-muted/40">Talaba qo'shish</li>
              <li className="p-3 rounded-lg bg-muted/40">Tadbir yaratish</li>
              <li className="p-3 rounded-lg bg-muted/40">Hisob-faktura yuborish</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </RoleDashboard>
  );
}
