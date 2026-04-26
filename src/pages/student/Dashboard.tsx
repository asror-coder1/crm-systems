import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Calendar as CalendarIcon, Inbox, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState({ teachers: 0, events: 0, messages: 0 });

  useEffect(() => {
    (async () => {
      if (!profile?.organization_id) return;
      const orgId = profile.organization_id;
      const [tRes, evRes, msgRes] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "teacher"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", profile.id),
      ]);
      setCounts({
        teachers: tRes.count ?? 0,
        events: evRes.count ?? 0,
        messages: msgRes.count ?? 0,
      });
    })();
  }, [profile?.organization_id, profile?.id]);

  const stats: StatCard[] = [
    { label: "O'qituvchilar", value: counts.teachers, icon: GraduationCap, color: "primary" },
    { label: "Tadbirlar", value: counts.events, icon: CalendarIcon, color: "accent" },
    { label: "Xabarlar", value: counts.messages, icon: Inbox, color: "secondary" },
    { label: "Baholar", value: "—", icon: Award, color: "success" },
  ];

  return (
    <RoleDashboard
      title="Talaba paneli"
      description="Darslaringiz, jadvalingiz va baholaringiz"
      stats={stats}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-3">Bugungi jadval</h3>
          <p className="text-sm text-muted-foreground">
            Darslar va vazifalar moduli tez orada ishga tushiriladi.
          </p>
        </Card>
      </motion.div>
    </RoleDashboard>
  );
}
