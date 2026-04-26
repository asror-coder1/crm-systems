import { ComponentType } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCard {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  trend?: string;
  color?: "primary" | "secondary" | "accent" | "success" | "warning";
}

interface RoleDashboardProps {
  title: string;
  description: string;
  stats: StatCard[];
  children?: React.ReactNode;
}

const colorMap: Record<NonNullable<StatCard["color"]>, string> = {
  primary: "from-primary/20 to-primary/5 text-primary",
  secondary: "from-secondary/20 to-secondary/5 text-secondary",
  accent: "from-accent/20 to-accent/5 text-accent",
  success: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
  warning: "from-amber-500/20 to-amber-500/5 text-amber-500",
};

export default function RoleDashboard({ title, description, stats, children }: RoleDashboardProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          const cls = colorMap[s.color || "primary"];
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="relative overflow-hidden p-5">
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
                    cls,
                  )}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold">{s.value}</p>
                    {s.trend && (
                      <p className="mt-1 text-xs text-muted-foreground">{s.trend}</p>
                    )}
                  </div>
                  <div className={cn("h-10 w-10 rounded-lg grid place-items-center bg-background/60", cls)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {children}
    </div>
  );
}
