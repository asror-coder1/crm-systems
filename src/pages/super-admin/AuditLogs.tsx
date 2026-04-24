import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Activity, Plus, Pencil, Trash2, KeyRound, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

const actionIcon: Record<string, { icon: typeof Plus; color: string }> = {
  create: { icon: Plus, color: "text-success" },
  update: { icon: Pencil, color: "text-primary" },
  delete: { icon: Trash2, color: "text-destructive" },
  reset_password: { icon: KeyRound, color: "text-warning" },
  change_username: { icon: UserPlus, color: "text-secondary" },
};

function getActionMeta(action: string) {
  const key = Object.keys(actionIcon).find((k) => action.includes(k));
  return key ? actionIcon[key] : { icon: Activity, color: "text-muted-foreground" };
}

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.action.toLowerCase().includes(q) ||
      r.entity_type.toLowerCase().includes(q) ||
      (r.actor_username ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Audit jurnali</h1>
        <p className="text-muted-foreground">Tizimdagi barcha muhim amallar tarixi</p>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Amal, obyekt yoki foydalanuvchi bo'yicha qidirish..."
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
                  <TableHead>Amal</TableHead>
                  <TableHead>Obyekt</TableHead>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead>Tafsilotlar</TableHead>
                  <TableHead className="text-right">Vaqt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Yozuv topilmadi
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const { icon: Icon, color } = getActionMeta(r.action);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-7 w-7 rounded-lg bg-muted grid place-items-center", color)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-mono text-xs">{r.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {r.entity_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">@{r.actor_username || "tizim"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {r.meta && Object.keys(r.meta).length > 0
                          ? Object.entries(r.meta).map(([k, v]) => `${k}: ${String(v)}`).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
