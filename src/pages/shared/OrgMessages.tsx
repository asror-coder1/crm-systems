import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, Megaphone } from "lucide-react";

interface Message {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  recipient_id: string | null;
  is_broadcast: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
}

export default function OrgMessages() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<Message | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const list = (msgs as Message[]) ?? [];
      setMessages(list);
      const ids = Array.from(new Set(list.map((m) => m.sender_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .in("id", ids);
        const map: Record<string, Profile> = {};
        (profs as Profile[] | null)?.forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const senderName = (id: string) => {
    const p = profiles[id];
    return p ? p.full_name || p.username : "Noma'lum";
  };

  const stats = useMemo(
    () => ({
      total: messages.length,
      broadcasts: messages.filter((m) => m.is_broadcast).length,
    }),
    [messages],
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Xabarlar</h1>
        <p className="text-sm text-muted-foreground">Sizga kelgan xabarlar va e'lonlar</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Jami</p>
            <p className="font-display font-bold text-2xl">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">E'lonlar</p>
            <p className="font-display font-bold text-2xl">{stats.broadcasts}</p>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Hech qanday xabar yo'q
            </div>
          ) : (
            <ul className="space-y-1">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelected(m)}
                    className={`w-full text-left p-3 rounded-lg transition-smooth ${
                      selected?.id === m.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate flex-1">{m.subject}</p>
                      {m.is_broadcast && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          E'lon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {senderName(m.sender_id)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleString("uz")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">{selected.subject}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {senderName(selected.sender_id)} •{" "}
                  {new Date(selected.created_at).toLocaleString("uz")}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</p>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-12">
              Xabarni o'qish uchun tanlang
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
