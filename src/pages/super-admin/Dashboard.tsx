import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Users,
  GraduationCap,
  UserCog,
  TrendingUp,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  organizations: number;
  totalUsers: number;
  teachers: number;
  students: number;
  admins: number;
  administrators: number;
}

interface MonthPoint {
  month: string;
  users: number;
}

interface OrgPoint {
  name: string;
  users: number;
}

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    organizations: 0,
    totalUsers: 0,
    teachers: 0,
    students: 0,
    admins: 0,
    administrators: 0,
  });
  const [growth, setGrowth] = useState<MonthPoint[]>([]);
  const [topOrgs, setTopOrgs] = useState<OrgPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; action: string; actor: string; entity: string; at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orgsRes, profilesRes, rolesRes, profilesAllRes, orgsAllRes, auditRes] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("profiles").select("id, created_at, organization_id"),
        supabase.from("organizations").select("id, name"),
        supabase.from("audit_logs").select("id, action, actor_username, entity_type, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const roles = (rolesRes.data ?? []).map((r: { role: string }) => r.role);
      setStats({
        organizations: orgsRes.count ?? 0,
        totalUsers: profilesRes.count ?? 0,
        teachers: roles.filter((r) => r === "teacher").length,
        students: roles.filter((r) => r === "student").length,
        admins: roles.filter((r) => r === "admin").length,
        administrators: roles.filter((r) => r === "administrator").length,
      });

      // Growth: count users per month for last 6 months
      const now = new Date();
      const months: MonthPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ month: MONTH_LABELS[d.getMonth()], users: 0 });
      }
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      let cumulative = (profilesAllRes.data ?? []).filter((p) => new Date(p.created_at) < cutoff).length;
      (profilesAllRes.data ?? []).forEach((p) => {
        const d = new Date(p.created_at);
        if (d < cutoff) return;
        const idx = months.findIndex((m, i) => {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          const nextMonth = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 1);
          return d >= monthDate && d < nextMonth;
        });
        if (idx >= 0) months[idx].users++;
      });
      // make cumulative
      const cum: MonthPoint[] = months.map((m) => {
        cumulative += m.users;
        return { month: m.month, users: cumulative };
      });
      setGrowth(cum);

      // Top orgs by user count
      const orgMap = new Map((orgsAllRes.data ?? []).map((o) => [o.id, o.name]));
      const counts = new Map<string, number>();
      (profilesAllRes.data ?? []).forEach((p) => {
        if (p.organization_id) counts.set(p.organization_id, (counts.get(p.organization_id) ?? 0) + 1);
      });
      const top = Array.from(counts.entries())
        .map(([id, n]) => ({ name: orgMap.get(id) ?? "—", users: n }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 5);
      setTopOrgs(top);

      setRecentActivity(
        (auditRes.data ?? []).map((r) => ({
          id: r.id,
          action: r.action,
          actor: r.actor_username ?? "tizim",
          entity: r.entity_type,
          at: r.created_at,
        }))
      );

      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Tashkilotlar", value: stats.organizations, icon: Building2, accent: "from-primary to-primary-glow" },
    { label: "Jami foydalanuvchilar", value: stats.totalUsers, icon: Users, accent: "from-secondary to-secondary-glow" },
    { label: "O'qituvchilar", value: stats.teachers, icon: GraduationCap, accent: "from-accent to-accent" },
    { label: "Talabalar", value: stats.students, icon: Users, accent: "from-primary to-secondary" },
    { label: "Adminlar", value: stats.admins, icon: UserCog, accent: "from-secondary to-accent" },
    { label: "Administratorlar", value: stats.administrators, icon: UserCog, accent: "from-primary to-accent" },
  ];

  const roleDistribution = [
    { name: "Talabalar", value: stats.students, color: "hsl(var(--primary))" },
    { name: "O'qituvchilar", value: stats.teachers, color: "hsl(var(--secondary))" },
    { name: "Adminlar", value: stats.admins, color: "hsl(var(--accent))" },
    { name: "Administratorlar", value: stats.administrators, color: "hsl(var(--warning))" },
  ].filter((r) => r.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Tizim bo'yicha real-time statistika</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 md:p-5 hover:border-primary/40 transition-smooth"
          >
            <div className="flex items-start justify-between">
              <div className={`h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br ${c.accent} grid place-items-center shadow-glow`}>
                <c.icon className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] md:text-xs text-success flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <p className="mt-3 md:mt-4 text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground line-clamp-1">{c.label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="font-display text-2xl md:text-3xl font-bold mt-1">{c.value}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold">O'sish dinamikasi</h3>
              <p className="text-xs text-muted-foreground">Foydalanuvchilarning kumulativ soni (oxirgi 6 oy)</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Rollar taqsimoti</h3>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : roleDistribution.length === 0 ? (
            <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold mb-4">Top tashkilotlar</h3>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : topOrgs.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">
              Tashkilotlarda hali foydalanuvchilar yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topOrgs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">So'nggi faollik</h3>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Hali faollik yo'q</p>
          ) : (
            <ul className="space-y-2.5">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="font-mono text-xs text-primary truncate">{a.action}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                    @{a.actor}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
