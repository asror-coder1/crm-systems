import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Users, Calendar as CalendarIcon, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";

export default function AdministratorDashboard() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState({ teachers: 0, students: 0, events: 0 });

  useEffect(() => {
    (async () => {
      if (!profile?.organization_id) return;
      const orgId = profile.organization_id;
      const [tRes, sRes, evRes] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "teacher"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "student"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      setCounts({
        teachers: tRes.count ?? 0,
        students: sRes.count ?? 0,
        events: evRes.count ?? 0,
      });
    })();
  }, [profile?.organization_id]);

  const stats: StatCard[] = [
    { label: "O'qituvchilar", value: counts.teachers, icon: GraduationCap, color: "primary" },
    { label: "Talabalar", value: counts.students, icon: Users, color: "accent" },
    { label: "Tadbirlar", value: counts.events, icon: CalendarIcon, color: "secondary" },
    { label: "Kurslar", value: "—", icon: BookOpen, color: "success" },
  ];

  return (
    <RoleDashboard
      title="Administrator paneli"
      description="O'quv jarayoni boshqaruvi"
      stats={stats}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-3">O'quv rejasi</h3>
          <p className="text-sm text-muted-foreground">
            Kurslar va o'quv jarayoni moduli tez orada ishga tushiriladi.
          </p>
        </Card>
      </motion.div>
    </RoleDashboard>
  );
}
